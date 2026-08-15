import { HeroTheme } from "./types";

export interface LifestyleRenderOptions {
  theme?: HeroTheme;
  categoryName?: string;
  targetSize?: number;
}

/**
 * Falcon AI Lifestyle & Contextual Scene Compositor
 * Places isolated product bottles onto realistic contextual backgrounds
 * tailored to product taxonomy (Teakwood Herbal Table, Carrara Marble Vanity, Kitchen Countertop, Minimalist Podium).
 */
export const aiLifestyleEngine = {
  async renderLifestyleScene(
    productCanvas: HTMLCanvasElement,
    options: LifestyleRenderOptions = {}
  ): Promise<string> {
    const size = options.targetSize || 1080;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    if (!ctx) return "";

    const cat = (options.categoryName || "").toLowerCase();
    const theme = options.theme || this.inferBestTheme(cat);

    // 1. Render Photorealistic Contextual Backdrop
    this.drawBackgroundScene(ctx, size, theme);

    // 2. Draw Ground Reflection & Contact Shadows
    const maxH = size * 0.62;
    const maxW = size * 0.62;
    const aspect = productCanvas.width / productCanvas.height;

    let drawW = maxW;
    let drawH = maxH;
    if (aspect > 1) {
      drawH = maxW / aspect;
    } else {
      drawW = maxH * aspect;
    }

    const drawX = (size - drawW) / 2;
    const groundY = size * 0.76;
    const drawY = groundY - drawH;

    // 2.1 Surface Reflection
    ctx.save();
    ctx.translate(0, groundY * 2);
    ctx.scale(1, -1);
    ctx.globalAlpha = theme === "luxury_marble" ? 0.16 : 0.08;
    ctx.filter = "blur(3px)";
    ctx.drawImage(productCanvas, drawX, groundY, drawW, drawH * 0.32, drawX, groundY, drawW, drawH * 0.32);
    ctx.restore();

    // 2.2 Realistic Ground Shadows
    ctx.save();
    // Ambient spread shadow
    ctx.beginPath();
    ctx.ellipse(size / 2, groundY + 4, drawW * 0.48, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(15, 23, 42, 0.18)";
    ctx.filter = "blur(12px)";
    ctx.fill();

    // Crisp contact shadow
    ctx.beginPath();
    ctx.ellipse(size / 2, groundY - 1, drawW * 0.38, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
    ctx.filter = "blur(4px)";
    ctx.fill();
    ctx.restore();

    // 3. Draw Product with Scene Lighting Integration
    ctx.save();
    ctx.drawImage(productCanvas, drawX, drawY, drawW, drawH);
    ctx.restore();

    // 4. Subtle Atmospheric Lighting Overlays (Sunbeams / Soft Bokeh)
    this.drawAtmosphericLight(ctx, size, theme);

    return canvas.toDataURL("image/jpeg", 0.95);
  },

  inferBestTheme(categoryName: string): HeroTheme {
    const c = categoryName.toLowerCase();
    if (c.includes("ayurved") || c.includes("herb") || c.includes("oral") || c.includes("hair") || c.includes("natural")) {
      return "botanical_herbal";
    }
    if (c.includes("cosmetic") || c.includes("skin") || c.includes("beauty") || c.includes("perfume") || c.includes("fragrance")) {
      return "luxury_marble";
    }
    if (c.includes("dark") || c.includes("men") || c.includes("luxury")) {
      return "dark_obsidian";
    }
    if (c.includes("gold") || c.includes("festiv") || c.includes("diwali") || c.includes("gift")) {
      return "festival_gold";
    }
    return "minimal_studio";
  },

  drawBackgroundScene(ctx: CanvasRenderingContext2D, size: number, theme: HeroTheme) {
    const groundY = size * 0.76;

    if (theme === "botanical_herbal") {
      // Warm Botanical Scene: Warm earthy background + Polished Teakwood Table
      const wallGrad = ctx.createLinearGradient(0, 0, 0, groundY);
      wallGrad.addColorStop(0, "#F7F4EB");
      wallGrad.addColorStop(0.6, "#EFECE1");
      wallGrad.addColorStop(1, "#E4DFC9");
      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, 0, size, groundY);

      // Teakwood surface
      const woodGrad = ctx.createLinearGradient(0, groundY, 0, size);
      woodGrad.addColorStop(0, "#8B5A2B");
      woodGrad.addColorStop(0.08, "#6B4423");
      woodGrad.addColorStop(0.5, "#523318");
      woodGrad.addColorStop(1, "#38200C");
      ctx.fillStyle = woodGrad;
      ctx.fillRect(0, groundY, size, size - groundY);

      // Wood edge highlight line
      ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
      ctx.fillRect(0, groundY, size, 2);

      // Soft botanical foliage shadow in background corner
      this.drawLeafShadow(ctx, size * 0.85, size * 0.25, 140);
      this.drawLeafShadow(ctx, size * 0.15, size * 0.35, 110);
    } else if (theme === "luxury_marble") {
      // Luxury Vanity: Soft warm grey wall + Italian Carrara Marble surface
      const wallGrad = ctx.createLinearGradient(0, 0, 0, groundY);
      wallGrad.addColorStop(0, "#F8FAFC");
      wallGrad.addColorStop(0.7, "#E2E8F0");
      wallGrad.addColorStop(1, "#CBD5E1");
      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, 0, size, groundY);

      // Marble Floor
      const marbleGrad = ctx.createLinearGradient(0, groundY, 0, size);
      marbleGrad.addColorStop(0, "#F1F5F9");
      marbleGrad.addColorStop(0.4, "#E2E8F0");
      marbleGrad.addColorStop(1, "#94A3B8");
      ctx.fillStyle = marbleGrad;
      ctx.fillRect(0, groundY, size, size - groundY);

      // Marble surface edge bevel
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fillRect(0, groundY, size, 3);
    } else if (theme === "dark_obsidian") {
      // Dark Luxury Studio
      const bgGrad = ctx.createRadialGradient(size / 2, size * 0.45, 20, size / 2, size * 0.5, size * 0.8);
      bgGrad.addColorStop(0, "#1E293B");
      bgGrad.addColorStop(0.5, "#0F172A");
      bgGrad.addColorStop(1, "#020617");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, size, size);

      // Acrylic podium platform
      ctx.beginPath();
      ctx.ellipse(size / 2, groundY, size * 0.42, 18, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (theme === "festival_gold") {
      // Festive Warm Gold Glow
      const festGrad = ctx.createRadialGradient(size / 2, size * 0.42, 30, size / 2, size * 0.5, size * 0.75);
      festGrad.addColorStop(0, "#FFFBEB");
      festGrad.addColorStop(0.35, "#FEF3C7");
      festGrad.addColorStop(0.75, "#FDE68A");
      festGrad.addColorStop(1, "#D97706");
      ctx.fillStyle = festGrad;
      ctx.fillRect(0, 0, size, size);

      // Gold platform
      ctx.beginPath();
      ctx.ellipse(size / 2, groundY, size * 0.44, 20, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(245, 158, 11, 0.2)";
      ctx.fill();
    } else {
      // Minimal Clean Studio
      const minGrad = ctx.createLinearGradient(0, 0, 0, size);
      minGrad.addColorStop(0, "#FFFFFF");
      minGrad.addColorStop(0.65, "#F8FAFC");
      minGrad.addColorStop(1, "#E2E8F0");
      ctx.fillStyle = minGrad;
      ctx.fillRect(0, 0, size, size);

      // Geometric Studio Pedestal
      ctx.beginPath();
      ctx.ellipse(size / 2, groundY, size * 0.4, 16, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      ctx.strokeStyle = "rgba(203, 213, 225, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  },

  drawLeafShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.45, Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(40, 55, 30, 0.04)";
    ctx.filter = "blur(18px)";
    ctx.fill();
    ctx.restore();
  },

  drawAtmosphericLight(ctx: CanvasRenderingContext2D, size: number, theme: HeroTheme) {
    ctx.save();
    const sunbeam = ctx.createLinearGradient(0, 0, size, size);
    sunbeam.addColorStop(0, "rgba(255, 255, 255, 0.12)");
    sunbeam.addColorStop(0.4, "rgba(255, 255, 255, 0.04)");
    sunbeam.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = sunbeam;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
  },
};
