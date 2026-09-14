import sharp from "sharp";

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
  clientRemoveBgKey?: string
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

    // TIER 0: Remove.bg Commercial Studio API (Gold Standard - 50 Free Cuts/Month)
    const removeBgKey =
      clientRemoveBgKey ||
      process.env.REMOVE_BG_API_KEY ||
      process.env.NEXT_PUBLIC_REMOVE_BG_API_KEY;

    if (removeBgKey && !removeBgKey.startsWith("AIza") && !removeBgKey.startsWith("hf_")) {
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
          signal: AbortSignal.timeout(6000), // Strict 6s timeout so it never hangs
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

    // TIER 1: On-Device Falcon Neural RMBG Engine (Pre-scaled to 800px for ultra-fast ~5s inference)
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
          setTimeout(() => reject(new Error("On-device RMBG in cropper exceeded 18s limit")), 18000)
        );

        const cutoutBlob = await Promise.race([rmbgPromise, timeoutPromise]);
        const arrayBuf = await cutoutBlob.arrayBuffer();
        const resBuf = Buffer.from(arrayBuf);
        if (resBuf && resBuf.length > 100) {
          transparentBuffer = resBuf;
        }
      } catch (rmbgErr) {
        console.warn("On-device neural RMBG in cropper notice:", rmbgErr);
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
