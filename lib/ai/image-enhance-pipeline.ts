/**
 * Falcon AI Image Enhancement Pipeline (Server-Side)
 *
 * Orchestrates the complete 7-step enhancement chain:
 * 1. Validate → 2. Background removal → 3. Auto-straighten → 4. Cleanup →
 * 5. Light correction → 6. Crop & center → 7. Format conversion
 *
 * Uses the existing background removal cascade from /api/ai/remove-background
 * and new sharp-based utilities from sharp-cropper.ts.
 *
 * Designed to run on the server (Node.js runtime) for access to sharp and
 * @imgly/background-removal-node. The client calls this through
 * /api/ai/enhance-image.
 */

import sharp from "sharp";
import {
  cleanupSurface,
  autoStraighten,
  normalizeExposure,
  cropAndCenterSquare,
  convertFormats,
  type BackgroundPreset,
  type EnhancedImageOutputs,
} from "./sharp-cropper";

export interface EnhancePipelineOptions {
  /** Target output size in pixels (square canvas). Default: 1080 */
  targetSize?: number;
  /** Background preset after removal. Default: "white" */
  backgroundPreset?: BackgroundPreset;
  /** Skip background removal step. Default: false */
  skipBgRemoval?: boolean;
  /** Skip surface cleanup step. Default: false */
  skipCleanup?: boolean;
  /** Skip exposure normalization. Default: false */
  skipLightCorrection?: boolean;
  /** Thumbnail size in pixels. Default: 200 */
  thumbnailSize?: number;
  /** Remove.bg API key (optional, for premium tier bg removal) */
  removeBgApiKey?: string;
  /** HuggingFace token (optional, for HF inference fallback) */
  hfToken?: string;
}

export interface EnhancePipelineResult {
  success: boolean;
  /** Base64 data URL of original image (untouched) */
  originalUrl: string;
  /** Base64 data URL of enhanced image in WebP format */
  enhancedWebpUrl: string;
  /** Base64 data URL of enhanced image in PNG format */
  enhancedPngUrl: string;
  /** Base64 data URL of thumbnail in WebP format */
  thumbnailUrl: string;
  /** Base64 data URL of transparent cutout (if bg removal succeeded) */
  transparentUrl: string | null;
  /** Background preset used */
  backgroundPreset: BackgroundPreset;
  /** Processing metadata */
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
    bgRemovalProvider: string | null;
    stepsCompleted: string[];
    stepsFailed: string[];
  };
  /** Non-fatal warnings during processing */
  warnings: string[];
  /** Error message if success is false */
  error?: string;
}

/**
 * Validate image buffer: check magic bytes, dimensions, and file size.
 * Returns a descriptive error string or null if valid.
 */
export async function validateImageBuffer(
  buffer: Buffer,
  maxSizeMb: number = 10,
  maxDimension: number = 6000
): Promise<string | null> {
  // Check file size
  const sizeMb = buffer.length / (1024 * 1024);
  if (sizeMb > maxSizeMb) {
    return `Image file is too large (${sizeMb.toFixed(1)}MB). Maximum allowed is ${maxSizeMb}MB.`;
  }

  if (buffer.length < 100) {
    return "Image file appears to be corrupt or empty.";
  }

  // Check magic bytes for supported formats
  const header = buffer.subarray(0, 12);
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng =
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47;
  const isWebp =
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50;
  // HEIC: check for ftyp box with heic/heix/mif1 brand
  const ftypStr = header.subarray(4, 8).toString("ascii");
  const isHeic = ftypStr === "ftyp";

  if (!isJpeg && !isPng && !isWebp && !isHeic) {
    return "Unsupported image format. Please upload JPEG, PNG, WebP, or HEIC.";
  }

  // Check dimensions via sharp metadata
  try {
    const metadata = await sharp(buffer).metadata();
    const w = metadata.width || 0;
    const h = metadata.height || 0;

    if (w < 50 || h < 50) {
      return `Image is too small (${w}×${h}px). Minimum dimensions are 50×50px.`;
    }

    if (w > maxDimension || h > maxDimension) {
      return `Image is too large (${w}×${h}px). Maximum dimension is ${maxDimension}px.`;
    }
  } catch {
    return "Could not read image metadata. The file may be corrupt.";
  }

  return null;
}

/**
 * Run the full AI image enhancement pipeline on a raw image buffer.
 * Each step is wrapped in its own try/catch so a single failure doesn't
 * break the entire pipeline — it degrades gracefully and logs the warning.
 */
export async function runEnhancePipeline(
  inputBuffer: Buffer,
  options: EnhancePipelineOptions = {}
): Promise<EnhancePipelineResult> {
  const startTime = Date.now();
  const targetSize = options.targetSize || 1080;
  const bgPreset = options.backgroundPreset || "white";
  const thumbnailSize = options.thumbnailSize || 200;

  const stepsCompleted: string[] = [];
  const stepsFailed: string[] = [];
  const warnings: string[] = [];
  let bgRemovalProvider: string | null = null;

  // Preserve the original buffer untouched
  const originalBuffer: Buffer = Buffer.from(inputBuffer);
  const originalMeta = await sharp(originalBuffer).metadata();
  const originalWidth = originalMeta.width || 0;
  const originalHeight = originalMeta.height || 0;

  let workingBuffer: Buffer = Buffer.from(inputBuffer);
  let transparentBuffer: Buffer | null = null;

  // ── Step 1: Auto-Straighten (EXIF rotation fix) ──────────────────────────
  try {
    workingBuffer = await autoStraighten(workingBuffer);
    stepsCompleted.push("auto_straighten");
  } catch (err) {
    stepsFailed.push("auto_straighten");
    warnings.push("Auto-straighten skipped: " + (err as Error).message);
  }

  // ── Step 2: Background Removal ───────────────────────────────────────────
  if (!options.skipBgRemoval) {
    try {
      const bgResult = await performBackgroundRemoval(
        workingBuffer,
        options.removeBgApiKey,
        options.hfToken
      );
      if (bgResult.transparentBuffer) {
        transparentBuffer = bgResult.transparentBuffer;
        workingBuffer = bgResult.transparentBuffer;
        bgRemovalProvider = bgResult.provider;
        stepsCompleted.push("bg_removal");
      } else {
        warnings.push("Background removal returned no result; using original background.");
        stepsFailed.push("bg_removal");
      }
    } catch (err) {
      stepsFailed.push("bg_removal");
      warnings.push("Background removal failed: " + (err as Error).message);
    }
  }

  // ── Step 3: Surface Cleanup (dust, specks, noise) ────────────────────────
  if (!options.skipCleanup) {
    try {
      workingBuffer = await cleanupSurface(workingBuffer);
      stepsCompleted.push("surface_cleanup");
    } catch (err) {
      stepsFailed.push("surface_cleanup");
      warnings.push("Surface cleanup skipped: " + (err as Error).message);
    }
  }

  // ── Step 4: Light Correction (exposure, white balance, contrast) ─────────
  if (!options.skipLightCorrection) {
    try {
      workingBuffer = await normalizeExposure(workingBuffer);
      stepsCompleted.push("light_correction");
    } catch (err) {
      stepsFailed.push("light_correction");
      warnings.push("Light correction skipped: " + (err as Error).message);
    }
  }

  // ── Step 5: Crop & Center on square canvas with 8% margin ────────────────
  try {
    workingBuffer = await cropAndCenterSquare(workingBuffer, targetSize, bgPreset);
    stepsCompleted.push("crop_center");
  } catch (err) {
    stepsFailed.push("crop_center");
    warnings.push("Crop & center skipped: " + (err as Error).message);
    // Fallback: resize to target square
    workingBuffer = await sharp(workingBuffer)
      .resize(targetSize, targetSize, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .toBuffer();
  }

  // ── Step 6: Format Conversion (WebP + PNG + Thumbnail) ───────────────────
  let webpBuffer: Buffer;
  let pngBuffer: Buffer;
  let thumbnailBuffer: Buffer;

  try {
    const formats = await convertFormats(workingBuffer, thumbnailSize);
    webpBuffer = formats.webpBuffer;
    pngBuffer = formats.pngBuffer;
    thumbnailBuffer = formats.thumbnailBuffer;
    stepsCompleted.push("format_conversion");
  } catch (err) {
    stepsFailed.push("format_conversion");
    warnings.push("Format conversion partially failed: " + (err as Error).message);
    // Fallback: use working buffer as both webp and png
    webpBuffer = await sharp(workingBuffer).webp({ quality: 85 }).toBuffer();
    pngBuffer = await sharp(workingBuffer).png().toBuffer();
    thumbnailBuffer = await sharp(workingBuffer)
      .resize(thumbnailSize, thumbnailSize, { fit: "inside" })
      .webp({ quality: 75 })
      .toBuffer();
  }

  const processingTimeMs = Date.now() - startTime;

  // ── Build data URLs ──────────────────────────────────────────────────────
  const originalUrl = `data:image/jpeg;base64,${originalBuffer.toString("base64")}`;
  const enhancedWebpUrl = `data:image/webp;base64,${webpBuffer.toString("base64")}`;
  const enhancedPngUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`;
  const thumbnailUrl = `data:image/webp;base64,${thumbnailBuffer.toString("base64")}`;
  const transparentUrl = transparentBuffer
    ? `data:image/png;base64,${transparentBuffer.toString("base64")}`
    : null;

  const outputMeta = await sharp(webpBuffer).metadata();

  return {
    success: true,
    originalUrl,
    enhancedWebpUrl,
    enhancedPngUrl,
    thumbnailUrl,
    transparentUrl,
    backgroundPreset: bgPreset,
    metadata: {
      originalWidth,
      originalHeight,
      outputWidth: outputMeta.width || targetSize,
      outputHeight: outputMeta.height || targetSize,
      originalSizeBytes: originalBuffer.length,
      webpSizeBytes: webpBuffer.length,
      pngSizeBytes: pngBuffer.length,
      thumbnailSizeBytes: thumbnailBuffer.length,
      processingTimeMs,
      bgRemovalProvider,
      stepsCompleted,
      stepsFailed,
    },
    warnings,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: Background removal using the existing multi-tier cascade
// ─────────────────────────────────────────────────────────────────────────────

interface BgRemovalResult {
  transparentBuffer: Buffer | null;
  provider: string | null;
}

async function performBackgroundRemoval(
  inputBuffer: Buffer,
  removeBgApiKey?: string,
  hfToken?: string
): Promise<BgRemovalResult> {
  // Pre-scale to 1024×1024 for faster neural processing
  const scaledBuffer = await sharp(inputBuffer)
    .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();

  // TIER 0: Rembg Local / Self-Hosted AI Microservice (danielgatis/rembg)
  const rembgUrl =
    process.env.REMBG_SERVICE_URL ||
    process.env.NEXT_PUBLIC_REMBG_SERVICE_URL ||
    "http://127.0.0.1:7000";

  if (rembgUrl) {
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(scaledBuffer)], { type: "image/png" });
      formData.append("file", blob, "product.png");
      formData.append("model", process.env.REMBG_MODEL || "u2net");

      const res = await fetch(`${rembgUrl.replace(/\/+$/, "")}/api/remove`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 100) {
          return { transparentBuffer: buf, provider: "Rembg Local Neural AI (Offline & Unlimited)" };
        }
      }
    } catch {
      // Rembg local service not active, silently cascade to next tier
    }
  }

  // TIER 1: Remove.bg Commercial API
  const rbgKey =
    removeBgApiKey ||
    process.env.REMOVE_BG_API_KEY ||
    process.env.NEXT_PUBLIC_REMOVE_BG_API_KEY;

  if (rbgKey && !rbgKey.startsWith("AIza") && !rbgKey.startsWith("hf_")) {
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(scaledBuffer)], { type: "image/png" });
      formData.append("image_file", blob, "product.png");
      formData.append("size", "auto");
      formData.append("format", "png");

      const res = await fetchWithRetry("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": rbgKey.trim() },
        body: formData,
      });

      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 100) {
          return { transparentBuffer: buf, provider: "Remove.bg Commercial Studio" };
        }
      }
    } catch (err) {
      console.warn("Remove.bg enhance notice:", err);
    }
  }

  // TIER 1: On-Device Neural RMBG (imgly-node)
  try {
    const scaledBlob = new Blob([new Uint8Array(scaledBuffer)], { type: "image/png" });
    const { removeBackground } = await import("@imgly/background-removal-node");

    const rmbgPromise = removeBackground(scaledBlob);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("On-device RMBG exceeded 30s limit")), 30000)
    );

    const cutoutBlob = await Promise.race([rmbgPromise, timeoutPromise]);
    const arrayBuf = await cutoutBlob.arrayBuffer();
    const resultBuf = Buffer.from(arrayBuf);

    if (resultBuf.length > 100) {
      return { transparentBuffer: resultBuf, provider: "Falcon Neural RMBG (On-Device)" };
    }
  } catch (err) {
    console.warn("On-device RMBG enhance notice:", err);
  }

  // TIER 2: HuggingFace Inference
  const token = hfToken || process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;
  if (token) {
    const models = ["briaai/RMBG-2.0", "briaai/RMBG-1.4"];
    for (const model of models) {
      try {
        const res = await fetchWithRetry(
          `https://router.huggingface.co/hf-inference/models/${model}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              Authorization: `Bearer ${token}`,
            },
            body: new Uint8Array(scaledBuffer),
          }
        );

        if (res.ok) {
          const resultBuf = Buffer.from(await res.arrayBuffer());
          if (resultBuf.length > 100) {
            return { transparentBuffer: resultBuf, provider: `${model} (HuggingFace)` };
          }
        }
      } catch (err) {
        console.warn(`HF ${model} enhance notice:`, err);
      }
    }
  }

  return { transparentBuffer: null, provider: null };
}

/**
 * Fetch with exponential backoff retry (max 3 attempts).
 * Retries on network errors and 5xx responses. Does NOT retry on 4xx.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Don't retry on client errors (4xx)
      if (res.status >= 400 && res.status < 500) {
        return res;
      }

      // Retry on server errors (5xx)
      if (res.status >= 500 && attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      return res;
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error("Fetch failed after retries");
}
