import sharp from "sharp";

export interface SharpCropResult {
  croppedDataUrl: string;
  posWhiteDataUrl: string;
}

/**
 * Intelligent Sharp Product Cropper & Pure White Stager
 * Crops product using normalized bounding box [ymin, xmin, ymax, xmax] (0-1000)
 * to cleanly isolate the product from human hands, fingers, and background clutter.
 */
export async function cropProductWithSharp(
  base64OrBuffer: string | Buffer,
  boundingBox?: [number, number, number, number] | number[]
): Promise<SharpCropResult | null> {
  try {
    let inputBuffer: Buffer;
    if (typeof base64OrBuffer === "string") {
      const clean = base64OrBuffer.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
      inputBuffer = Buffer.from(clean, "base64");
    } else {
      inputBuffer = base64OrBuffer;
    }

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
      // Default: tight center crop
      top = Math.round(origH * 0.05);
      left = Math.round(origW * 0.15);
      cropW = Math.round(origW * 0.70);
      cropH = Math.round(origH * 0.90);
    }

    // 1. Crop to bounding box
    const croppedBuffer = await sharp(inputBuffer)
      .extract({ left, top, width: cropW, height: cropH })
      .jpeg({ quality: 92 })
      .toBuffer();

    const croppedDataUrl = `data:image/jpeg;base64,${croppedBuffer.toString("base64")}`;

    // 2. Center product onto square 1080x1080 pure white canvas
    const targetProductH = Math.round(1080 * 0.84);
    const resizedProduct = await sharp(croppedBuffer)
      .resize({ height: targetProductH, fit: "inside" })
      .toBuffer();

    const posWhiteBuffer = await sharp({
      create: {
        width: 1080,
        height: 1080,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .composite([{ input: resizedProduct, gravity: "center" }])
      .jpeg({ quality: 92 })
      .toBuffer();

    const posWhiteDataUrl = `data:image/jpeg;base64,${posWhiteBuffer.toString("base64")}`;

    return { croppedDataUrl, posWhiteDataUrl };
  } catch (err) {
    console.warn("Sharp crop product failed:", err);
    return null;
  }
}
