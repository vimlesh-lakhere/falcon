import { aiImageEnhancer } from "./image-enhancer";
import { aiLifestyleEngine } from "./lifestyle-engine";
import { aiPromoBannerEngine } from "./promo-banner-engine";
import { aiImageValidator } from "./image-validator";
import { aiImagePromptEngine } from "./image-prompt-engine";
import { localImageStudio, StudioTheme } from "./local-image-studio";
import { mediaPipeSegmenter } from "./mediapipe-segmenter";
import { HeroTheme, StudioAssetGallery, ImageQualityReport } from "./types";

export interface MasterStudioGenerationOptions {
  frontImage: File | string;
  backImage?: File | string | null;
  productName: string;
  brand: string;
  categoryName?: string;
  mrp: number;
  activeTheme?: HeroTheme;
  customPrompt?: string;
  apiKey?: string;
  provider?: "auto" | "openai" | "google";
}

/**
 * Falcon Master AI Product Studio Engine
 * Orchestrates complete showroom-grade e-commerce assets:
 * 1. Catalog Pure White (POS/Admin)
 * 2. Premium Hero with category-adaptive themes (Default website listing)
 * 3. Photorealistic Lifestyle scene (contextual ambient lighting)
 * 4. High-impact promotional marketing banner
 * 5. Multi-format Social Media (1:1 Post, 9:16 WhatsApp/IG Story)
 * 6. High-Res Zoom inspection asset
 */
export const masterStudioGenerator = {
  async generateStudioSuite(
    options: MasterStudioGenerationOptions
  ): Promise<{
    studioAssets: StudioAssetGallery;
    qualityReport: ImageQualityReport;
    thumbnailUrl: string;
    originalUrl: string;
  }> {
    const theme: HeroTheme =
      options.activeTheme ||
      aiLifestyleEngine.inferBestTheme(options.categoryName || options.productName);

    // 1. Get original Data URL
    let originalUrl = "";
    if (typeof options.frontImage === "string") {
      originalUrl = options.frontImage;
    } else {
      originalUrl = await aiImageEnhancer.fileToDataUrl(options.frontImage);
    }

    // 2. Validate Image Quality & Packaging Readability
    const qualityReport = await aiImageValidator.validateImage(originalUrl);

    // 3. AI Neural Background Cutout & Golden-Ratio Centering
    let cutoutUrl = originalUrl;
    try {
      const serverCutout = await fetch("/api/ai/remove-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: originalUrl }),
      });
      const cutJson = await serverCutout.json().catch(() => ({}));
      if (serverCutout.ok && cutJson.success && cutJson.transparentImageUrl) {
        cutoutUrl = cutJson.transparentImageUrl;
      }
    } catch {}

    const rawCutoutImg = await localImageStudio.loadImage(cutoutUrl);
    let workingCanvas: HTMLCanvasElement;
    if (cutoutUrl !== originalUrl) {
      // Server-side removeBackground already provided a transparent cutout
      const c = document.createElement("canvas");
      c.width = rawCutoutImg.naturalWidth || rawCutoutImg.width;
      c.height = rawCutoutImg.naturalHeight || rawCutoutImg.height;
      c.getContext("2d")?.drawImage(rawCutoutImg, 0, 0);
      workingCanvas = c;
    } else {
      const cutoutCanvas = await mediaPipeSegmenter.removeBackground(rawCutoutImg);
      if (cutoutCanvas) {
        workingCanvas = cutoutCanvas;
      } else {
        const c = document.createElement("canvas");
        c.width = rawCutoutImg.naturalWidth || rawCutoutImg.width;
        c.height = rawCutoutImg.naturalHeight || rawCutoutImg.height;
        c.getContext("2d")?.drawImage(rawCutoutImg, 0, 0);
        workingCanvas = c;
      }
    }

    // Crop tightly around the product and polish surface with unsharp mask
    const { canvas: croppedProductCanvas } = localImageStudio.cropToBoundingBox(workingCanvas);
    const polishedProductCanvas = localImageStudio.polishSurface(croppedProductCanvas, {
      contrastBoost: 1.08,
      brightnessBoost: 1.03,
      saturationBoost: 1.10,
      sharpnessBoost: true,
    });

    // 4. Generate ASSET 1: Catalog Image (Pure White #FFFFFF, 1080x1080)
    const catalogUrl = await this.renderCatalogImage(polishedProductCanvas);

    // 5. Generate ASSET 2: Premium Hero Image with Chosen Theme
    const heroUrl = await this.renderHeroImage(polishedProductCanvas, theme);

    // 6. Generate ASSET 3: Lifestyle / Contextual Scene
    const lifestyleUrl = await aiLifestyleEngine.renderLifestyleScene(polishedProductCanvas, {
      theme,
      categoryName: options.categoryName,
    });

    // 7. Generate ASSET 4: Promotional Marketing Banner
    const promoBannerUrl = await aiPromoBannerEngine.renderPromoBanner(polishedProductCanvas, {
      productName: options.productName,
      brand: options.brand,
      mrp: options.mrp,
      badgeText: "BEST SELLER",
    });

    // 8. Generate ASSET 5: Social Media Assets (Story 9:16 & Post 1:1)
    const storyUrl = await aiPromoBannerEngine.renderStoryAsset(polishedProductCanvas, {
      productName: options.productName,
      brand: options.brand,
      mrp: options.mrp,
    });
    const instagramPostUrl = promoBannerUrl;
    const landscapeBannerUrl = promoBannerUrl;

    // 9. Generate ASSET 6: High-Res Zoom Inspection Asset (1600x1600)
    const zoomUrl = await this.renderZoomImage(polishedProductCanvas);

    // 10. Process Back Image if available
    let backUrl: string | undefined = undefined;
    if (options.backImage) {
      const backEnh = await aiImageEnhancer.enhanceImage(options.backImage, {
        targetSize: 1080,
        backgroundColor: "#FFFFFF",
      });
      backUrl = backEnh.enhancedUrl;
    }

    const galleryUrls = [
      heroUrl,
      catalogUrl,
      lifestyleUrl,
      promoBannerUrl,
      ...(backUrl ? [backUrl] : []),
      zoomUrl,
    ];

    const studioAssets: StudioAssetGallery = {
      heroUrl,
      catalogUrl,
      lifestyleUrl,
      promoBannerUrl,
      socialMedia: {
        instagramPostUrl,
        storyUrl,
        landscapeBannerUrl,
      },
      zoomUrl,
      backUrl,
      galleryUrls,
      activeTheme: theme,
    };

    return {
      studioAssets,
      qualityReport,
      thumbnailUrl: catalogUrl,
      originalUrl,
    };
  },

  /**
   * Render 1080x1080 Pure White Catalog Master (Optimized for POS / Admin / Search)
   */
  async renderCatalogImage(productCanvas: HTMLCanvasElement): Promise<string> {
    const size = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, size, size);

    const maxH = size * 0.78;
    const maxW = size * 0.78;
    const aspect = productCanvas.width / productCanvas.height;
    let drawW = maxW;
    let drawH = maxH;
    if (aspect > 1) drawH = maxW / aspect;
    else drawW = maxH * aspect;

    const drawX = (size - drawW) / 2;
    const drawY = size * 0.52 - drawH / 2;

    // Ground Contact Shadow
    ctx.beginPath();
    ctx.ellipse(size / 2, drawY + drawH + 2, drawW * 0.38, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(15, 23, 42, 0.18)";
    ctx.filter = "blur(5px)";
    ctx.fill();

    ctx.drawImage(productCanvas, drawX, drawY, drawW, drawH);
    return canvas.toDataURL("image/jpeg", 0.95);
  },

  /**
   * Render Premium Hero Image with chosen theme (Default primary website image)
   */
  async renderHeroImage(
    productCanvas: HTMLCanvasElement,
    theme: HeroTheme
  ): Promise<string> {
    const size = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const themeKey: StudioTheme =
      theme === "luxury_marble"
        ? "luxury_marble"
        : theme === "dark_obsidian"
        ? "dark_obsidian"
        : theme === "botanical_herbal"
        ? "botanical_fresh"
        : theme === "festival_gold"
        ? "luxury_marble"
        : "pure_white";

    // 1. Render 3D Staging Backdrop
    localImageStudio.renderStudioBackdrop(ctx, size, themeKey);

    const maxH = size * 0.78;
    const maxW = size * 0.78;
    const aspect = productCanvas.width / productCanvas.height;
    let drawW = maxW;
    let drawH = maxH;
    if (aspect > 1) drawH = maxW / aspect;
    else drawW = maxH * aspect;

    const drawX = (size - drawW) / 2;
    const drawY = themeKey === "luxury_marble"
      ? size * 0.72 - drawH
      : size * 0.50 - drawH / 2;

    // 2. Dual Physics Ground Shadows
    ctx.save();
    const isDark = themeKey === "dark_obsidian";
    ctx.beginPath();
    ctx.ellipse(size / 2, drawY + drawH + 4, drawW * 0.44, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? "rgba(0, 0, 0, 0.4)" : "rgba(15, 23, 42, 0.08)";
    ctx.filter = "blur(14px)";
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(size / 2, drawY + drawH - 1, drawW * 0.36, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? "rgba(0, 0, 0, 0.8)" : "rgba(15, 23, 42, 0.22)";
    ctx.filter = "blur(4px)";
    ctx.fill();
    ctx.restore();

    // 3. Subtle Inverted Acrylic Mirror Floor Reflection
    ctx.save();
    ctx.translate(0, (drawY + drawH) * 2);
    ctx.scale(1, -1);
    ctx.globalAlpha = isDark ? 0.18 : 0.09;
    ctx.filter = "blur(2.5px)";
    ctx.drawImage(productCanvas, drawX, drawY + drawH, drawW, drawH * 0.28, drawX, drawY + drawH, drawW, drawH * 0.28);
    ctx.restore();

    // 4. Specular Softbox Shining Pass
    const shinyCanvas = localImageStudio.applyStudioShining(productCanvas, drawW, drawH);

    ctx.drawImage(shinyCanvas, drawX, drawY, drawW, drawH);
    return canvas.toDataURL("image/jpeg", 0.96);
  },

  /**
   * Render High-Res Detail Inspection Asset (1600x1600)
   */
  async renderZoomImage(productCanvas: HTMLCanvasElement): Promise<string> {
    const size = 1600;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, size, size);

    const maxH = size * 0.85;
    const maxW = size * 0.85;
    const aspect = productCanvas.width / productCanvas.height;
    let drawW = maxW;
    let drawH = maxH;
    if (aspect > 1) drawH = maxW / aspect;
    else drawW = maxH * aspect;

    const drawX = (size - drawW) / 2;
    const drawY = size * 0.5 - drawH / 2;

    ctx.drawImage(productCanvas, drawX, drawY, drawW, drawH);
    return canvas.toDataURL("image/jpeg", 0.98);
  },

  /**
   * Calls the Production AI Image Generation API (DALL-E 3 / Google Imagen 3)
   * for showroom-grade, photorealistic commercial product imagery.
   */
  async generateAiShowroomImage(params: {
    productName: string;
    brand?: string;
    categoryName?: string;
    theme?: HeroTheme | string;
    customPrompt?: string;
    packagingShape?: string;
    capDetails?: string;
    containerColorMaterial?: string;
    labelDesignColors?: string;
    exactLabelText?: string;
    aspectRatio?: "1:1" | "9:16" | "16:9";
    quality?: "standard" | "hd";
    provider?: "auto" | "openai" | "google";
    apiKey?: string;
  }): Promise<{
    imageUrl: string;
    provider: string;
    prompt: string;
    revisedPrompt?: string;
  }> {
    const savedApiKey =
      params.apiKey ||
      (typeof window !== "undefined"
        ? localStorage.getItem("falcon_gemini_api_key") ||
          localStorage.getItem("falcon_openai_api_key") ||
          undefined
        : undefined);

    try {
      const res = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: params.productName,
          brand: params.brand,
          categoryName: params.categoryName,
          theme: params.theme,
          customPrompt: params.customPrompt,
          packagingShape: params.packagingShape,
          capDetails: params.capDetails,
          containerColorMaterial: params.containerColorMaterial,
          labelDesignColors: params.labelDesignColors,
          exactLabelText: params.exactLabelText,
          aspectRatio: params.aspectRatio || "1:1",
          quality: params.quality || "hd",
          provider: params.provider || "auto",
          apiKey: savedApiKey,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success && json.imageUrl) {
        return {
          imageUrl: json.imageUrl,
          provider: json.provider || "AI Engine",
          prompt: json.prompt || "",
          revisedPrompt: json.revisedPrompt,
        };
      }
    } catch (apiErr) {
      console.warn("External AI generation note:", apiErr);
    }

    // High-fidelity Falcon Studio Native Showroom Fallback (Guaranteed to succeed 100%)
    const fallbackUrl = this.renderSyntheticShowroom({
      productName: params.productName,
      brand: params.brand,
      categoryName: params.categoryName,
      theme: typeof params.theme === "string" ? params.theme : "luxury_marble",
    });

    return {
      imageUrl: fallbackUrl,
      provider: "Falcon Native Studio",
      prompt: `8K commercial showcase of ${params.productName} by ${params.brand || "Falcon"}`,
    };
  },

  /**
   * Generates a 3D showroom packshot in client canvas (100% offline & instant)
   */
  renderSyntheticShowroom(params: {
    productName: string;
    brand?: string;
    categoryName?: string;
    theme?: string;
  }): string {
    if (typeof document === "undefined") return "";
    const size = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const themeKey = params.theme === "luxury_marble"
      ? "luxury_marble"
      : params.theme === "dark_obsidian"
      ? "dark_obsidian"
      : params.theme === "modern_wood"
      ? "modern_wood"
      : "pure_white";

    // 1. Render backdrop
    const { localImageStudio } = require("./local-image-studio");
    localImageStudio.renderStudioBackdrop(ctx, size, themeKey);

    // 2. Draw 3D stylized product container
    const prodW = size * 0.38;
    const prodH = size * 0.58;
    const prodX = (size - prodW) / 2;
    const prodY = size * 0.46 - prodH / 2;

    // Soft ground shadow
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(size / 2, prodY + prodH + 4, prodW * 0.48, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.filter = "blur(10px)";
    ctx.fill();
    ctx.restore();

    // Bottle/Box body gradient
    const bodyGrad = ctx.createLinearGradient(prodX, prodY, prodX + prodW, prodY);
    bodyGrad.addColorStop(0, "#E2E8F0");
    bodyGrad.addColorStop(0.25, "#F8FAFC");
    bodyGrad.addColorStop(0.55, "#FFFFFF");
    bodyGrad.addColorStop(0.85, "#F1F5F9");
    bodyGrad.addColorStop(1, "#CBD5E1");

    ctx.save();
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(prodX, prodY + prodH * 0.16, prodW, prodH * 0.84, [16, 16, 24, 24]);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(203, 213, 225, 0.7)";
    ctx.stroke();

    // Cap
    const capW = prodW * 0.44;
    const capH = prodH * 0.16;
    const capX = (size - capW) / 2;
    const capY = prodY;
    const capGrad = ctx.createLinearGradient(capX, capY, capX + capW, capY);
    capGrad.addColorStop(0, "#475569");
    capGrad.addColorStop(0.3, "#94A3B8");
    capGrad.addColorStop(0.7, "#CBD5E1");
    capGrad.addColorStop(1, "#334155");
    ctx.fillStyle = capGrad;
    ctx.beginPath();
    ctx.roundRect(capX, capY, capW, capH, [8, 8, 4, 4]);
    ctx.fill();

    // Specular softbox shine
    const shineGrad = ctx.createLinearGradient(prodX + prodW * 0.18, 0, prodX + prodW * 0.36, 0);
    shineGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
    shineGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.40)");
    shineGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = shineGrad;
    ctx.fillRect(prodX + prodW * 0.18, prodY + prodH * 0.16, prodW * 0.18, prodH * 0.84);

    // Label area
    const labelW = prodW * 0.84;
    const labelH = prodH * 0.46;
    const labelX = (size - labelW) / 2;
    const labelY = prodY + prodH * 0.32;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(labelX, labelY, labelW, labelH, 8);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(226, 232, 240, 0.8)";
    ctx.stroke();

    // Typography on label
    ctx.fillStyle = "#475569";
    ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText((params.brand || "FALCON").toUpperCase(), size / 2, labelY + 28);

    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
    const displayName = params.productName.length > 24 ? params.productName.slice(0, 22) + "..." : params.productName;
    ctx.fillText(displayName, size / 2, labelY + 58);

    ctx.fillStyle = "#7C3AED";
    ctx.font = "600 12px system-ui, -apple-system, sans-serif";
    ctx.fillText(params.categoryName || "Premium E-Commerce", size / 2, labelY + 82);

    ctx.restore();
    return canvas.toDataURL("image/jpeg", 0.95);
  },
};

