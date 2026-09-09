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
    // TIER 0: REMOVE.BG COMMERCIAL STUDIO API (50 Free High-Res Products / Month)
    // -----------------------------------------------------------------
    const removeBgKey =
      body.removeBgApiKey ||
      apiKey ||
      process.env.REMOVE_BG_API_KEY ||
      process.env.NEXT_PUBLIC_REMOVE_BG_API_KEY;

    if (removeBgKey && !removeBgKey.startsWith("AIza") && !removeBgKey.startsWith("hf_")) {
      try {
        const formData = new FormData();
        formData.append("image_file", imageBlob, "product.png");
        formData.append("size", "auto");
        formData.append("format", "png");

        const rbgRes = await fetch("https://api.remove.bg/v1.0/removebg", {
          method: "POST",
          headers: {
            "X-Api-Key": removeBgKey.trim(),
          },
          body: formData,
        });

        if (rbgRes.ok) {
          const rbgBuf = await rbgRes.arrayBuffer();
          const rbgBase64 = Buffer.from(rbgBuf).toString("base64");
          return NextResponse.json({
            success: true,
            provider: "Remove.bg Commercial Studio (Gold Standard)",
            transparentImageUrl: `data:image/png;base64,${rbgBase64}`,
          });
        } else {
          const errText = await rbgRes.text().catch(() => "");
          console.warn("Remove.bg API notice:", rbgRes.status, errText);
        }
      } catch (rbgErr) {
        console.warn("Remove.bg connection notice:", rbgErr);
      }
    }

    // -----------------------------------------------------------------
    // TIER 1: ON-DEVICE / ON-PREMISE NEURAL RMBG (100% Free, Unlimited, No API Key)
    // -----------------------------------------------------------------
    try {
      const { removeBackground } = await import("@imgly/background-removal-node");
      const cutoutBlob = await removeBackground(imageBlob);
      const arrayBuf = await cutoutBlob.arrayBuffer();
      const outputBuffer = Buffer.from(arrayBuf);
      if (outputBuffer && outputBuffer.length > 500) {
        return NextResponse.json({
          success: true,
          provider: "Falcon Neural RMBG Engine (Free On-Device AI)",
          transparentImageUrl: `data:image/png;base64,${outputBuffer.toString("base64")}`,
        });
      }
    } catch (imglyErr) {
      console.warn("On-device neural background removal fallback to cloud:", imglyErr);
    }

    // -----------------------------------------------------------------
    // TIER 2: HUGGING FACE INFERENCE (RMBG-2.0 & RMBG-1.4)
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
    // TIER 3: SMART FALLBACK (DO NOT MUTILATE USER PHOTO WITH CRUDE FLOOD-FILL)
    // -----------------------------------------------------------------
    return NextResponse.json({
      success: false,
      provider: "Falcon Direct Clean Engine",
      transparentImageUrl: null,
      notice: "Cloud segmentation unavailable. Using clean original photo and browser on-device segmentation.",
      fallbackUsed: true,
    });
  } catch (error: any) {
    console.error("Remove background API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process background removal" },
      { status: 500 }
    );
  }
}
