import { aiImageEnhancer } from "./image-enhancer";
import { aiLifestyleEngine } from "./lifestyle-engine";
import { aiPromoBannerEngine } from "./promo-banner-engine";
import { aiImageValidator } from "./image-validator";
import { aiImagePromptEngine } from "./image-prompt-engine";
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

    // 3. AI Neural Background Cutout & Tight Bounding Box Auto-Crop
    const enhancedBase = await aiImageEnhancer.enhanceImage(options.frontImage, {
      targetSize: 1200,
      backgroundColor: "#FFFFFF",
      addGlossShine: true,
      cleanSurfaceBlemishes: true,
      addStudioReflection: true,
    });

    const rawCutoutImg = await aiImageEnhancer.loadImage(enhancedBase.originalUrl);
    // Crop tightly around the product
    const croppedProductCanvas = aiImageEnhancer.cropToBoundingBox(rawCutoutImg);
    const polishedProductCanvas = aiImageEnhancer.polishProductSurface(croppedProductCanvas, {
      cleanBlemishes: true,
      addGloss: true,
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
      thumbnailUrl: enhancedBase.thumbnailUrl,
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

    // Background Gradient based on theme
    if (theme === "luxury_marble") {
      const grad = ctx.createRadialGradient(size / 2, size * 0.38, 20, size / 2, size * 0.45, size * 0.7);
      grad.addColorStop(0, "#FFFFFF");
      grad.addColorStop(0.5, "#F8FAFC");
      grad.addColorStop(1, "#E2E8F0");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    } else if (theme === "botanical_herbal") {
      const grad = ctx.createRadialGradient(size / 2, size * 0.38, 20, size / 2, size * 0.45, size * 0.7);
      grad.addColorStop(0, "#FCFDF9");
      grad.addColorStop(0.5, "#F4F7EE");
      grad.addColorStop(1, "#E8EFE0");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    } else if (theme === "dark_obsidian") {
      const grad = ctx.createRadialGradient(size / 2, size * 0.42, 20, size / 2, size * 0.5, size * 0.75);
      grad.addColorStop(0, "#1E293B");
      grad.addColorStop(0.6, "#0F172A");
      grad.addColorStop(1, "#020617");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    } else if (theme === "festival_gold") {
      const grad = ctx.createRadialGradient(size / 2, size * 0.4, 20, size / 2, size * 0.48, size * 0.75);
      grad.addColorStop(0, "#FFFDF5");
      grad.addColorStop(0.5, "#FEF3C7");
      grad.addColorStop(1, "#FDE68A");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    } else {
      // Minimal Clean Studio
      const grad = ctx.createRadialGradient(size / 2, size * 0.38, 20, size / 2, size * 0.45, size * 0.7);
      grad.addColorStop(0, "#FFFFFF");
      grad.addColorStop(0.6, "#FAFAFC");
      grad.addColorStop(1, "#F1F5F9");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }

    const maxH = size * 0.76;
    const maxW = size * 0.76;
    const aspect = productCanvas.width / productCanvas.height;
    let drawW = maxW;
    let drawH = maxH;
    if (aspect > 1) drawH = maxW / aspect;
    else drawW = maxH * aspect;

    const drawX = (size - drawW) / 2;
    const drawY = size * 0.52 - drawH / 2;

    // Acrylic Reflection
    ctx.save();
    ctx.translate(0, (drawY + drawH) * 2);
    ctx.scale(1, -1);
    ctx.globalAlpha = theme === "dark_obsidian" ? 0.2 : 0.12;
    ctx.filter = "blur(2px)";
    ctx.drawImage(productCanvas, drawX, drawY + drawH, drawW, drawH * 0.35, drawX, drawY + drawH, drawW, drawH * 0.35);
    ctx.restore();

    // Dual Ground Shadows
    ctx.beginPath();
    ctx.ellipse(size / 2, drawY + drawH + 5, drawW * 0.46, 15, 0, 0, Math.PI * 2);
    ctx.fillStyle = theme === "dark_obsidian" ? "rgba(0, 0, 0, 0.4)" : "rgba(15, 23, 42, 0.08)";
    ctx.filter = "blur(12px)";
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(size / 2, drawY + drawH - 1, drawW * 0.36, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = theme === "dark_obsidian" ? "rgba(0, 0, 0, 0.8)" : "rgba(15, 23, 42, 0.25)";
    ctx.filter = "blur(4px)";
    ctx.fill();

    ctx.drawImage(productCanvas, drawX, drawY, drawW, drawH);
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

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to generate AI image");
    }

    return {
      imageUrl: json.imageUrl,
      provider: json.provider || "AI Engine",
      prompt: json.prompt,
      revisedPrompt: json.revisedPrompt,
    };
  },
};

