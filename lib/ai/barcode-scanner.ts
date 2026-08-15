import { BrowserMultiFormatReader } from "@zxing/browser";

/**
 * Optical Barcode Scanner for Uploaded Images
 * Accurately decodes 1D/2D barcodes (EAN-13, EAN-8, UPC-A, Code 128, etc.) directly from image pixels.
 */
export const barcodeImageScanner = {
  async scanBarcodeFromImage(imageSrc: string | HTMLImageElement): Promise<string | null> {
    if (typeof window === "undefined") return null;

    try {
      let imgElement: HTMLImageElement;
      if (typeof imageSrc === "string") {
        imgElement = await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = imageSrc;
        });
      } else {
        imgElement = imageSrc;
      }

      // Method 1: Use Native Browser BarcodeDetector if available
      if ("BarcodeDetector" in window) {
        try {
          const BarcodeDetectorClass = (window as any).BarcodeDetector;
          const detector = new BarcodeDetectorClass({
            formats: [
              "ean_13",
              "ean_8",
              "upc_a",
              "upc_e",
              "code_128",
              "code_39",
              "itf",
              "qr_code",
            ],
          });
          const barcodes = await detector.detect(imgElement);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            return barcodes[0].rawValue.trim();
          }
        } catch (e) {
          // Fall through to ZXing
        }
      }

      // Method 2: Robust ZXing MultiFormat Decoder
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeFromImageElement(imgElement);
      if (result && result.getText()) {
        return result.getText().trim();
      }
    } catch (err) {
      // No barcode found in image
    }

    return null;
  },
};
