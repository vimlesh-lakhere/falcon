import sharp, { type Sharp } from "sharp";

export interface SharpCropResult {
  croppedDataUrl: string;
  posWhiteDataUrl: string;
  transparentCutoutUrl?: string;
}

/**
 * Intelligent Neural Background Removal & Pure White Stager
 * Removes hands, fingers, and background clutter using On-Device Neural RMBG,
 * enhances contrast & vibrancy, and stages the product on an Amazon/e-commerce grade pure white (#FFFFFF) canvas.
 */
export async function cropProductWithSharp(
  base64OrBuffer: string | Buffer,
  boundingBox?: [number, number, number, number] | number[],
  clientRemoveBgKey?: string,
  clientHfToken?: string
): Promise<SharpCropResult | null> {
  try {
    let inputBuffer: Buffer;
    if (typeof base64OrBuffer === "string") {
      const clean = base64OrBuffer.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
      inputBuffer = Buffer.from(clean, "base64");
    } else {
      inputBuffer = base64OrBuffer;
    }

    let transparentBuffer: Buffer | null = null;

    // TIER 0: Rembg Microservice (Local / LAN)
    const rembgUrl = process.env.REMBG_SERVICE_URL || process.env.NEXT_PUBLIC_REMBG_SERVICE_URL;
    if (rembgUrl) {
      try {
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(inputBuffer)], { type: "image/png" });
        formData.append("file", blob, "product.png");
        formData.append("model", process.env.REMBG_MODEL || "u2net");

        const rembgRes = await fetch(`${rembgUrl.replace(/\/+$/, "")}/api/remove`, {
          method: "POST",
          body: formData,
          signal: AbortSignal.timeout(4000),
        });

        if (rembgRes.ok) {
          const rBuf = Buffer.from(await rembgRes.arrayBuffer());
          if (rBuf && rBuf.length > 100) {
            transparentBuffer = rBuf;
          }
        }
      } catch {}
    }

    // TIER 1: Remove.bg Commercial Studio API
    const removeBgKey =
      clientRemoveBgKey ||
      process.env.REMOVE_BG_API_KEY ||
      process.env.NEXT_PUBLIC_REMOVE_BG_API_KEY;

    if (!transparentBuffer && removeBgKey && !removeBgKey.startsWith("AIza") && !removeBgKey.startsWith("hf_")) {
      try {
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(inputBuffer)], { type: "image/jpeg" });
        formData.append("image_file", blob, "product.jpg");
        formData.append("size", "auto");
        formData.append("format", "png");

        const rbgRes = await fetch("https://api.remove.bg/v1.0/removebg", {
          method: "POST",
          headers: { "X-Api-Key": removeBgKey.trim() },
          body: formData,
          signal: AbortSignal.timeout(6000),
        });

        if (rbgRes.ok) {
          const rbgBuf = await rbgRes.arrayBuffer();
          transparentBuffer = Buffer.from(rbgBuf);
        } else {
          const errText = await rbgRes.text().catch(() => "");
          console.warn("Remove.bg API notice in cropper:", rbgRes.status, errText);
        }
      } catch (rbgErr) {
        console.warn("Remove.bg in cropper notice:", rbgErr);
      }
    }

    // TIER 2: Hugging Face Cloud RMBG-1.4 / RMBG-2.0
    const token = clientHfToken || process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;
    if (!transparentBuffer && token) {
      try {
        const scaledBuffer = await sharp(inputBuffer)
          .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
          .png()
          .toBuffer();

        const hfRes = await fetch(
          "https://router.huggingface.co/hf-inference/models/briaai/RMBG-1.4",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              Authorization: `Bearer ${token.trim()}`,
            },
            body: scaledBuffer,
            signal: AbortSignal.timeout(8000),
          }
        );

        if (hfRes.ok) {
          const hfBuf = Buffer.from(await hfRes.arrayBuffer());
          if (hfBuf && hfBuf.length > 100) {
            transparentBuffer = hfBuf;
          }
        }
      } catch (hfErr) {
        console.warn("HuggingFace RMBG in cropper notice:", hfErr);
      }
    }

    // TIER 3: Local Node Neural RMBG Engine (if onnx runtime is available in environment)
    if (!transparentBuffer) {
      try {
        const scaledBuffer = await sharp(inputBuffer)
          .resize(800, 800, { fit: "inside", withoutEnlargement: true })
          .png()
          .toBuffer();
        const scaledBlob = new Blob([new Uint8Array(scaledBuffer)], { type: "image/png" });

        const { removeBackground } = await import("@imgly/background-removal-node");
        const rmbgPromise = removeBackground(scaledBlob);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("On-device RMBG in cropper exceeded 15s limit")), 15000)
        );

        const cutoutBlob = await Promise.race([rmbgPromise, timeoutPromise]);
        const arrayBuf = await cutoutBlob.arrayBuffer();
        const resBuf = Buffer.from(arrayBuf);
        if (resBuf && resBuf.length > 100) {
          transparentBuffer = resBuf;
        }
      } catch (rmbgErr) {
        // Expected on serverless environments where native binary is excluded
      }
    }

    let productLayer: Buffer;
    if (transparentBuffer) {
      // Trim empty transparent edges
      const trimmed = await sharp(transparentBuffer).trim().toBuffer();
      // Enhance colors, brightness and sharpen typography
      const targetH = Math.round(1080 * 0.82);
      productLayer = await sharp(trimmed)
        .resize({ height: targetH, fit: "inside" })
        .modulate({
          brightness: 1.05,
          saturation: 1.18,
        })
        .sharpen({ sigma: 1.3, m1: 1.2, m2: 0.5 })
        .toBuffer();
    } else {
      // Fallback: Crop to bounding box
      const metadata = await sharp(inputBuffer).metadata();
      const origW = metadata.width || 1080;
      const origH = metadata.height || 1080;

      let left = 0;
      let top = 0;
      let cropW = origW;
      let cropH = origH;

      if (
        Array.isArray(boundingBox) &&
        boundingBox.length === 4 &&
        boundingBox[2] > boundingBox[0] &&
        boundingBox[3] > boundingBox[1]
      ) {
        const [ymin, xmin, ymax, xmax] = boundingBox;
        top = Math.max(0, Math.floor((ymin / 1000) * origH));
        left = Math.max(0, Math.floor((xmin / 1000) * origW));
        cropW = Math.min(origW - left, Math.ceil(((xmax - xmin) / 1000) * origW));
        cropH = Math.min(origH - top, Math.ceil(((ymax - ymin) / 1000) * origH));
      } else {
        top = Math.round(origH * 0.05);
        left = Math.round(origW * 0.15);
        cropW = Math.round(origW * 0.70);
        cropH = Math.round(origH * 0.90);
      }

      const croppedBuffer = await sharp(inputBuffer)
        .extract({ left, top, width: cropW, height: cropH })
        .toBuffer();

      const targetH = Math.round(1080 * 0.84);
      productLayer = await sharp(croppedBuffer)
        .resize({ height: targetH, fit: "inside" })
        .modulate({
          brightness: 1.05,
          saturation: 1.15,
        })
        .sharpen({ sigma: 1.2, m1: 1.0, m2: 0.5 })
        .toBuffer();
    }

    const prodMeta = await sharp(productLayer).metadata();
    const prodW = prodMeta.width || 600;
    const prodH = prodMeta.height || 880;
    const prodX = Math.round((1080 - prodW) / 2);
    const prodY = Math.round((1080 - prodH) / 2);

    // Composite onto 1080x1080 pure white canvas
    const posWhiteBuffer = await sharp({
      create: {
        width: 1080,
        height: 1080,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .composite([{ input: productLayer, top: prodY, left: prodX }])
      .jpeg({ quality: 95 })
      .toBuffer();

    const croppedDataUrl = transparentBuffer
      ? `data:image/png;base64,${transparentBuffer.toString("base64")}`
      : `data:image/jpeg;base64,${productLayer.toString("base64")}`;

    const posWhiteDataUrl = `data:image/jpeg;base64,${posWhiteBuffer.toString("base64")}`;

    return {
      croppedDataUrl,
      posWhiteDataUrl,
      transparentCutoutUrl: transparentBuffer ? croppedDataUrl : undefined,
    };
  } catch (err) {
    console.warn("Sharp crop product failed:", err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Image Enhancement Pipeline Utilities
// ─────────────────────────────────────────────────────────────────────────────

export type BackgroundPreset = "transparent" | "white" | "light_grey" | "soft_gradient";

export interface EnhancedImageOutputs {
  originalBuffer: Buffer;
  enhancedWebpBuffer: Buffer;
  enhancedPngBuffer: Buffer;
  thumbnailWebpBuffer: Buffer;
  transparentBuffer: Buffer | null;
  metadata: {
    originalWidth: number;
    originalHeight: number;
    outputWidth: number;
    outputHeight: number;
    originalSizeBytes: number;
    webpSizeBytes: number;
    pngSizeBytes: number;
    thumbnailSizeBytes: number;
    processingTimeMs: number;
  };
}

/**
 * Remove dust specks, sensor noise, lint, and small scratches from the product surface
 * without destroying real texture or fine detail like text labels.
 * Uses a gentle 3×3 median filter followed by adaptive sharpening to restore crispness.
 */
export async function cleanupSurface(inputBuffer: Buffer): Promise<Buffer> {
  try {
    // Gentle median filter removes isolated bright/dark specks (dust, sensor noise)
    // while preserving edges and texture. Kernel size 3 is minimal — safe for labels.
    const cleaned = await sharp(inputBuffer)
      .median(3)
      .toBuffer();

    // Re-sharpen to restore any slight softening from median, preserving text/logo crispness
    const sharpened = await sharp(cleaned)
      .sharpen({
        sigma: 1.0,
        m1: 1.0,   // flat area sharpening (mild)
        m2: 0.6,   // jagged area sharpening (stronger for text edges)
      })
      .toBuffer();

    return sharpened;
  } catch (err) {
    console.warn("Surface cleanup notice, returning original:", err);
    return inputBuffer;
  }
}

/**
 * Auto-straighten: fix EXIF rotation metadata and apply it to actual pixel data.
 * sharp's `.rotate()` with no angle argument reads EXIF orientation and applies it,
 * which handles 90° rotations and flips from phone cameras.
 * For slight sub-degree tilt (crooked product on table), we rely on the crop/center
 * step to normalize framing since edge-detection deskew requires OpenCV or Hough transforms
 * which aren't available in sharp alone.
 */
export async function autoStraighten(inputBuffer: Buffer): Promise<Buffer> {
  try {
    // rotate() with no angle = auto-orient from EXIF metadata
    const rotated = await sharp(inputBuffer)
      .rotate()
      .toBuffer();

    return rotated;
  } catch (err) {
    console.warn("Auto-straighten notice, returning original:", err);
    return inputBuffer;
  }
}

/**
 * Normalize exposure, white balance, and contrast.
 * Uses sharp's `normalize()` for histogram stretching (auto-levels),
 * followed by gentle brightness/saturation modulation to produce
 * consistent, well-lit product photos across the catalog.
 */
export async function normalizeExposure(inputBuffer: Buffer): Promise<Buffer> {
  try {
    const normalized = await sharp(inputBuffer)
      // Histogram normalization: stretches pixel values to full 0-255 range
      // This fixes both underexposed (dark) and overexposed (washed out) images
      .normalize()
      // Gentle color correction: slight brightness lift + saturation boost
      // to counteract yellowish indoor lighting typical of phone photos
      .modulate({
        brightness: 1.03,   // +3% brightness lift
        saturation: 1.08,   // +8% color vibrancy
      })
      .toBuffer();

    return normalized;
  } catch (err) {
    console.warn("Exposure normalization notice, returning original:", err);
    return inputBuffer;
  }
}

/**
 * Trim transparent/white edges, center the product on a square canvas with ~8% margin.
 * The output is always a perfect square ready for e-commerce grids.
 * @param bgPreset - Background fill: transparent (RGBA), white (#FFF), light_grey (#F0F0F0), soft_gradient
 */
export async function cropAndCenterSquare(
  inputBuffer: Buffer,
  targetSize: number = 1080,
  bgPreset: BackgroundPreset = "white"
): Promise<Buffer> {
  try {
    // 1. Trim transparent or near-white edges around the product
    const trimmed = await sharp(inputBuffer)
      .trim({ threshold: 20 })
      .toBuffer({ resolveWithObject: true });

    const { width: trimW, height: trimH } = trimmed.info;

    // 2. Calculate the content area within the square canvas
    // 8% margin on each side = product occupies 84% of canvas
    const contentArea = Math.round(targetSize * 0.84);

    // 3. Scale product to fit within the content area, preserving aspect ratio
    const scaled = await sharp(trimmed.data)
      .resize(contentArea, contentArea, {
        fit: "inside",
        withoutEnlargement: false,
      })
      .toBuffer({ resolveWithObject: true });

    const { width: scaledW, height: scaledH } = scaled.info;

    // 4. Calculate padding to center on square canvas
    const padLeft = Math.round((targetSize - scaledW) / 2);
    const padRight = targetSize - scaledW - padLeft;
    const padTop = Math.round((targetSize - scaledH) / 2);
    const padBottom = targetSize - scaledH - padTop;

    // 5. Determine background color based on preset
    let bgColor: { r: number; g: number; b: number; alpha: number };
    switch (bgPreset) {
      case "transparent":
        bgColor = { r: 0, g: 0, b: 0, alpha: 0 };
        break;
      case "light_grey":
        bgColor = { r: 240, g: 240, b: 240, alpha: 1 };
        break;
      case "soft_gradient":
        // For gradient we use a light base; the actual gradient is composited after
        bgColor = { r: 250, g: 250, b: 252, alpha: 1 };
        break;
      case "white":
      default:
        bgColor = { r: 255, g: 255, b: 255, alpha: 1 };
        break;
    }

    // 6. Extend canvas to square with centered product
    let result = await sharp(scaled.data)
      .extend({
        top: Math.max(0, padTop),
        bottom: Math.max(0, padBottom),
        left: Math.max(0, padLeft),
        right: Math.max(0, padRight),
        background: bgColor,
      })
      .toBuffer();

    // 7. For soft_gradient preset, composite a subtle radial gradient background
    if (bgPreset === "soft_gradient") {
      // Create a gradient SVG overlay
      const gradientSvg = Buffer.from(`
        <svg width="${targetSize}" height="${targetSize}">
          <defs>
            <radialGradient id="bg" cx="50%" cy="45%" r="70%">
              <stop offset="0%" stop-color="#FFFFFF"/>
              <stop offset="60%" stop-color="#FAFBFC"/>
              <stop offset="100%" stop-color="#E8ECF0"/>
            </radialGradient>
          </defs>
          <rect width="${targetSize}" height="${targetSize}" fill="url(#bg)"/>
        </svg>
      `);

      // Composite: gradient background underneath the product
      result = await sharp(gradientSvg)
        .resize(targetSize, targetSize)
        .composite([{ input: result, blend: "over" }])
        .toBuffer();
    }

    // Ensure exact target dimensions
    result = await sharp(result)
      .resize(targetSize, targetSize, { fit: "cover" })
      .toBuffer();

    return result;
  } catch (err) {
    console.warn("Crop & center notice, returning resized original:", err);
    // Fallback: just resize to target square
    return sharp(inputBuffer)
      .resize(targetSize, targetSize, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .toBuffer();
  }
}

/**
 * Convert a processed image buffer into all required output formats:
 * - WebP (primary, lossy, quality 90) — smallest file size for web
 * - PNG (fallback, lossless) — universal compatibility
 * - Thumbnail WebP (200×200, quality 80) — for grid listings
 *
 * Preserves alpha channel for transparent backgrounds.
 */
export async function convertFormats(
  inputBuffer: Buffer,
  thumbnailSize: number = 200
): Promise<{
  webpBuffer: Buffer;
  pngBuffer: Buffer;
  thumbnailBuffer: Buffer;
}> {
  const [webpBuffer, pngBuffer, thumbnailBuffer] = await Promise.all([
    sharp(inputBuffer)
      .webp({ quality: 90, effort: 4 })
      .toBuffer(),
    sharp(inputBuffer)
      .png({ compressionLevel: 6 })
      .toBuffer(),
    sharp(inputBuffer)
      .resize(thumbnailSize, thumbnailSize, { fit: "inside" })
      .webp({ quality: 80 })
      .toBuffer(),
  ]);

  return { webpBuffer, pngBuffer, thumbnailBuffer };
}
