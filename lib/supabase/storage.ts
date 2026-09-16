import { supabase } from "./client";

export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
}

/**
 * Compresses an image to high-fidelity WebP format in the browser.
 * Maintains crisp text, labels, and barcodes while reducing file size by ~80-90% (~40-70 KB).
 */
export async function compressImageToWebpBlob(
  fileOrDataUrl: File | Blob | string,
  options: CompressOptions = {}
): Promise<Blob> {
  const maxDimension = options.maxDimension || 1080;
  const quality = options.quality !== undefined ? options.quality : 0.82;

  // If running in Node/SSR, return as Blob if possible
  if (typeof window === "undefined" || typeof document === "undefined") {
    if (fileOrDataUrl instanceof Blob) return fileOrDataUrl;
    return new Blob([]);
  }

  // Load image into HTMLImageElement
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = (e) => reject(e);

    if (typeof fileOrDataUrl === "string") {
      image.src = fileOrDataUrl;
    } else {
      image.src = URL.createObjectURL(fileOrDataUrl);
    }
  });

  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not create 2D canvas context for compression");
  }

  // Enable high-quality bicubic smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  // Clean up object URL if created
  if (typeof fileOrDataUrl !== "string" && img.src.startsWith("blob:")) {
    URL.revokeObjectURL(img.src);
  }

  // Export as WebP Blob (fallback to JPEG if browser doesn't support WebP export)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          // Fallback to JPEG
          canvas.toBlob(
            (jpegBlob) => {
              if (jpegBlob) resolve(jpegBlob);
              else reject(new Error("Canvas toBlob failed"));
            },
            "image/jpeg",
            quality
          );
        }
      },
      "image/webp",
      quality
    );
  });
}

/**
 * Uploads a single image (File, Blob, or base64 data URL) to Supabase Storage "products" bucket.
 * Returns the public URL.
 * If the image is already an external URL (http/https) and not base64, returns it untouched.
 */
export async function uploadSingleProductImage(
  imageSource: File | Blob | string,
  customPrefix = "prod"
): Promise<string> {
  if (!imageSource) return "";

  // If already an external HTTP URL, no upload needed
  if (typeof imageSource === "string" && (imageSource.startsWith("http://") || imageSource.startsWith("https://"))) {
    return imageSource;
  }

  try {
    // Compress to high-fidelity WebP
    const webpBlob = await compressImageToWebpBlob(imageSource, {
      maxDimension: 1080,
      quality: 0.82,
    });

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const fileName = `${customPrefix}_${timestamp}_${random}.webp`;

    const { data, error } = await supabase.storage
      .from("products")
      .upload(fileName, webpBlob, {
        contentType: "image/webp",
        upsert: true,
        cacheControl: "31536000", // Cache for 1 year in CDN/browser
      });

    if (error) {
      console.warn("Supabase storage upload error:", error);
      // If upload fails and imageSource is a string, fallback to original to avoid blocking user
      return typeof imageSource === "string" ? imageSource : "";
    }

    const { data: publicUrlData } = supabase.storage
      .from("products")
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.warn("Failed to compress and upload product image:", err);
    return typeof imageSource === "string" ? imageSource : "";
  }
}

/**
 * Handles uploading compound product images (e.g. front and back separated by "|||").
 * Automatically skips already uploaded external URLs and only uploads new Base64/Files.
 */
export async function uploadProductImageCompound(
  compoundImageUrl: string,
  customPrefix = "prod"
): Promise<string> {
  if (!compoundImageUrl) return "";

  const parts = compoundImageUrl.split("|||");
  const uploadedParts = await Promise.all(
    parts.map(async (part, idx) => {
      const trimmed = part.trim();
      if (!trimmed) return "";
      // If it's a data URL, upload it
      if (trimmed.startsWith("data:image/")) {
        const prefix = idx === 0 ? `${customPrefix}_front` : `${customPrefix}_back`;
        return await uploadSingleProductImage(trimmed, prefix);
      }
      return trimmed;
    })
  );

  return uploadedParts.filter(Boolean).join("|||");
}
