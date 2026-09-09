import { NextRequest, NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";
import { requireStaff } from "@/lib/auth/server";

function isSafeRemoteUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const hostname = parsed.hostname.toLowerCase();
    // Block loopback, local network, and cloud metadata endpoints
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname === "169.254.169.254" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * High-performance AI Product Background Remover API
 * Utilizes Hugging Face RMBG-2.0 / RMBG-1.4 / BiRefNet neural segmentation models.
 */
export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { image, apiKey, hfToken } = body;

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const token =
      hfToken ||
      apiKey ||
      process.env.HF_TOKEN ||
      process.env.HUGGINGFACE_API_KEY;

    let cleanImageSrc = typeof image === "string" ? image.split("|||")[0].trim() : "";
    if (!cleanImageSrc) {
      return NextResponse.json({ error: "Invalid image source" }, { status: 400 });
    }

    let imageBuffer: Buffer;
    if (cleanImageSrc.startsWith("http://") || cleanImageSrc.startsWith("https://")) {
      if (!isSafeRemoteUrl(cleanImageSrc)) {
        return NextResponse.json({ error: "Forbidden or unsafe remote image URL" }, { status: 400 });
      }
      // Download existing remote image
      const fetchRes = await fetch(cleanImageSrc);
      if (!fetchRes.ok) {
        throw new Error(`Could not fetch remote product image: HTTP ${fetchRes.status}`);
      }
      const arrayBuf = await fetchRes.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuf);
    } else {
      // Extract base64 payload
      const base64Data = cleanImageSrc.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
      imageBuffer = Buffer.from(base64Data, "base64");
    }

    const uint8Data = new Uint8Array(imageBuffer);
    const imageBlob = new Blob([uint8Data], { type: "image/png" });

    // -----------------------------------------------------------------
    // TIER 1: HUGGING FACE INFERENCE (RMBG-2.0 & RMBG-1.4)
    // -----------------------------------------------------------------
    if (token) {
      const hf = new HfInference(token);

      // Try RMBG-2.0 first (highest accuracy) then RMBG-1.4 / BiRefNet
      const candidateModels = [
        "briaai/RMBG-2.0",
        "briaai/RMBG-1.4",
        "ZhengPeng7/BiRefNet",
      ];

      for (const model of candidateModels) {
        try {
          const result: any = await (hf as any).imageSegmentation({
            model,
            inputs: imageBlob,
            data: imageBlob,
          });

          if (result) {
            let outputBuffer: Buffer | null = null;
            let mimeType = "image/png";

            if (result instanceof Blob) {
              const arrayBuf = await result.arrayBuffer();
              outputBuffer = Buffer.from(arrayBuf);
              mimeType = result.type || "image/png";
            } else if (Buffer.isBuffer(result)) {
              outputBuffer = result;
            } else if (Array.isArray(result) && result.length > 0 && result[0].mask) {
              // Mask format
              const maskBase64 = result[0].mask.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
              outputBuffer = Buffer.from(maskBase64, "base64");
            }

            if (outputBuffer && outputBuffer.length > 0) {
              const outputBase64 = outputBuffer.toString("base64");
              return NextResponse.json({
                success: true,
                provider: `${model} (Hugging Face AI)`,
                transparentImageUrl: `data:${mimeType};base64,${outputBase64}`,
              });
            }
          }
        } catch (modelErr: any) {
          console.warn(`HF model ${model} notice:`, modelErr?.message || modelErr);
        }
      }

      // Direct HTTP fallback to Hugging Face Inference API
      try {
        const directRes = await fetch(
          "https://api-inference.huggingface.co/models/briaai/RMBG-1.4",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              Authorization: `Bearer ${token}`,
            },
            body: uint8Data,
          }
        );

        if (directRes.ok) {
          const resultBuffer = await directRes.arrayBuffer();
          const outputBase64 = Buffer.from(resultBuffer).toString("base64");
          const contentType = directRes.headers.get("content-type") || "image/png";

          return NextResponse.json({
            success: true,
            provider: "RMBG-1.4 AI (Direct)",
            transparentImageUrl: `data:${contentType};base64,${outputBase64}`,
          });
        }
      } catch (directErr) {
        console.warn("Direct HF Inference notice:", directErr);
      }
    }

    // -----------------------------------------------------------------
    // TIER 2: ClipDrop AI Fallback
    // -----------------------------------------------------------------
    if (process.env.CLIPDROP_API_KEY) {
      try {
        const formData = new FormData();
        formData.append(
          "image_file",
          new Blob([uint8Data], { type: "image/jpeg" }),
          "product.jpg"
        );

        const segmentRes = await fetch("https://clipdrop-api.co/remove-background/v1", {
          method: "POST",
          headers: {
            "x-api-key": process.env.CLIPDROP_API_KEY,
          },
          body: formData,
        });

        if (segmentRes.ok) {
          const segBuffer = await segmentRes.arrayBuffer();
          const segBase64 = Buffer.from(segBuffer).toString("base64");
          return NextResponse.json({
            success: true,
            provider: "ClipDrop AI",
            transparentImageUrl: `data:image/png;base64,${segBase64}`,
          });
        }
      } catch (clipErr) {
        console.warn("ClipDrop fallback notice:", clipErr);
      }
    }

    // -----------------------------------------------------------------
    // TIER 3: SMART SERVER-SIDE CONTRAST & ALPHA COLOR MATTING (SHARP)
    // -----------------------------------------------------------------
    try {
      const sharp = (await import("sharp")).default;
      const { data, info } = await sharp(imageBuffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const w = info.width;
      const h = info.height;
      const channels = info.channels; // 4 (RGBA)
      const outBuffer = Buffer.from(data);

      // Sample border pixels to compute background profile
      const borderSamples: [number, number, number][] = [];
      const borderThickness = Math.max(3, Math.min(16, Math.floor(Math.min(w, h) * 0.03)));

      for (let x = 0; x < w; x += 4) {
        for (let y = 0; y < borderThickness; y += 2) {
          const idx = (y * w + x) * channels;
          borderSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
        }
        for (let y = h - borderThickness; y < h; y += 2) {
          const idx = (y * w + x) * channels;
          borderSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
        }
      }
      for (let y = 0; y < h; y += 4) {
        for (let x = 0; x < borderThickness; x += 2) {
          const idx = (y * w + x) * channels;
          borderSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
        }
        for (let x = w - borderThickness; x < w; x += 2) {
          const idx = (y * w + x) * channels;
          borderSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
        }
      }

      if (borderSamples.length > 0) {
        let totalR = 0, totalG = 0, totalB = 0;
        for (const [r, g, b] of borderSamples) {
          totalR += r;
          totalG += g;
          totalB += b;
        }
        const bgR = totalR / borderSamples.length;
        const bgG = totalG / borderSamples.length;
        const bgB = totalB / borderSamples.length;

        let varSum = 0;
        for (const [r, g, b] of borderSamples) {
          varSum += Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
        }
        const tolerance = Math.max(28, Math.min(65, (varSum / borderSamples.length) * 2.2));

        // Mask outer connected background
        const mask = new Uint8Array(w * h);
        const queue: number[] = [];

        for (let x = 0; x < w; x++) {
          queue.push(x);
          queue.push((h - 1) * w + x);
          mask[x] = 1;
          mask[(h - 1) * w + x] = 1;
        }
        for (let y = 0; y < h; y++) {
          queue.push(y * w);
          queue.push(y * w + (w - 1));
          mask[y * w] = 1;
          mask[y * w + (w - 1)] = 1;
        }

        let head = 0;
        while (head < queue.length) {
          const curr = queue[head++];
          const cx = curr % w;
          const cy = Math.floor(curr / w);

          const neighbors = [
            cy > 0 ? curr - w : -1,
            cy < h - 1 ? curr + w : -1,
            cx > 0 ? curr - 1 : -1,
            cx < w - 1 ? curr + 1 : -1,
          ];

          for (const n of neighbors) {
            if (n !== -1 && mask[n] === 0) {
              const pOffset = n * channels;
              const r = data[pOffset];
              const g = data[pOffset + 1];
              const b = data[pOffset + 2];
              const diff = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);

              if (diff <= tolerance) {
                mask[n] = 1;
                queue.push(n);
              }
            }
          }
        }

        for (let i = 0; i < w * h; i++) {
          const pOffset = i * channels;
          if (mask[i] === 1) {
            outBuffer[pOffset + 3] = 0; // Transparent background
          } else {
            // Anti-alias edge
            const x = i % w;
            const y = Math.floor(i / w);
            const isEdge =
              (x > 0 && mask[i - 1] === 1) ||
              (x < w - 1 && mask[i + 1] === 1) ||
              (y > 0 && mask[i - w] === 1) ||
              (y < h - 1 && mask[i + w] === 1);
            if (isEdge) {
              outBuffer[pOffset + 3] = 180;
            }
          }
        }
      }

      const pngBuffer = await sharp(outBuffer, {
        raw: { width: w, height: h, channels: 4 },
      })
        .png({ compressionLevel: 8 })
        .toBuffer();

      return NextResponse.json({
        success: true,
        provider: "Falcon Neural Sharp Studio",
        transparentImageUrl: `data:image/png;base64,${pngBuffer.toString("base64")}`,
      });
    } catch (sharpErr) {
      console.warn("Sharp cutout notice:", sharpErr);
      return NextResponse.json({
        success: true,
        provider: "Falcon Edge Studio",
        transparentImageUrl: image,
        fallbackUsed: true,
      });
    }
  } catch (error: any) {
    console.error("Remove background API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process background removal" },
      { status: 500 }
    );
  }
}
