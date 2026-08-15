export interface PromoBannerOptions {
  productName: string;
  brand: string;
  mrp: number;
  badgeText?: "BEST SELLER" | "NEW ARRIVAL" | "LIMITED OFFER" | "FESTIVAL SALE" | "PREMIUM PICK";
  tagline?: string;
}

/**
 * Falcon AI Promotional Banner & Social Media Asset Studio
 * Generates ready-to-use e-commerce promotional cards, 1:1 Instagram posts, and 9:16 WhatsApp / IG Stories.
 */
export const aiPromoBannerEngine = {
  /**
   * Generates a 1200x1200 high-impact e-commerce promotional banner card with price tag and discount badge
   */
  async renderPromoBanner(
    productCanvas: HTMLCanvasElement,
    options: PromoBannerOptions
  ): Promise<string> {
    const size = 1200;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // 1. Premium Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, size, size);
    bgGrad.addColorStop(0, "#FAF5FF");
    bgGrad.addColorStop(0.5, "#F3E8FF");
    bgGrad.addColorStop(1, "#E9D5FF");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, size, size);

    // Decorative geometric rings
    ctx.save();
    ctx.beginPath();
    ctx.arc(size * 0.72, size * 0.5, 380, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(168, 85, 247, 0.08)";
    ctx.fill();
    ctx.restore();

    // 2. Promotional Badge (Top Left)
    const badgeText = options.badgeText || "BEST SELLER";
    ctx.save();
    ctx.fillStyle = "#7E22CE";
    this.roundRect(ctx, 60, 60, 220, 48, 24);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`✨ ${badgeText}`, 170, 84);
    ctx.restore();

    // 3. Product Title & Brand
    ctx.save();
    ctx.fillStyle = "#581C87";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(options.brand.toUpperCase() || "PREMIUM BRAND", 60, 160);

    ctx.fillStyle = "#1E1B4B";
    ctx.font = "900 42px sans-serif";
    const truncatedTitle =
      options.productName.length > 28
        ? options.productName.slice(0, 26) + "..."
        : options.productName;
    ctx.fillText(truncatedTitle, 60, 215);

    // Subtitle / Tagline
    ctx.fillStyle = "#6B7280";
    ctx.font = "500 22px sans-serif";
    ctx.fillText(options.tagline || "Showroom Quality • 100% Authentic", 60, 260);
    ctx.restore();

    // 4. Draw Product in Center Right
    const maxH = size * 0.58;
    const maxW = size * 0.58;
    const aspect = productCanvas.width / productCanvas.height;
    let drawW = maxW;
    let drawH = maxH;
    if (aspect > 1) drawH = maxW / aspect;
    else drawW = maxH * aspect;

    const drawX = size * 0.55 - drawW / 2;
    const drawY = size * 0.58 - drawH / 2;

    // Contact shadow
    ctx.beginPath();
    ctx.ellipse(size * 0.55, drawY + drawH + 4, drawW * 0.42, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
    ctx.filter = "blur(12px)";
    ctx.fill();

    ctx.drawImage(productCanvas, drawX, drawY, drawW, drawH);

    // 5. Price Card (Bottom Left)
    ctx.save();
    ctx.fillStyle = "#FFFFFF";
    this.roundRect(ctx, 60, size - 200, 360, 140, 20);
    ctx.fill();
    ctx.strokeStyle = "rgba(147, 51, 234, 0.2)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#6B7280";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("SPECIAL OFFER", 90, size - 158);

    ctx.fillStyle = "#16A34A";
    ctx.font = "900 46px sans-serif";
    ctx.fillText(`₹${options.mrp}`, 90, size - 105);

    ctx.fillStyle = "#9333EA";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("INSTOCK • FAST DISPATCH", 90, size - 78);
    ctx.restore();

    return canvas.toDataURL("image/jpeg", 0.94);
  },

  /**
   * Generates a 9:16 WhatsApp Status / Instagram Story (1080x1920)
   */
  async renderStoryAsset(
    productCanvas: HTMLCanvasElement,
    options: PromoBannerOptions
  ): Promise<string> {
    const w = 1080;
    const h = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Background Gradient
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#0F172A");
    bg.addColorStop(0.65, "#1E1B4B");
    bg.addColorStop(1, "#3B0764");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Top Header Badge
    ctx.save();
    ctx.fillStyle = "#F59E0B";
    this.roundRect(ctx, w / 2 - 130, 160, 260, 52, 26);
    ctx.fill();

    ctx.fillStyle = "#000000";
    ctx.font = "900 20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🔥 FEATURED PRODUCT", w / 2, 186);

    // Title
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 48px sans-serif";
    ctx.fillText(
      options.productName.length > 24
        ? options.productName.slice(0, 22) + "..."
        : options.productName,
      w / 2,
      280
    );

    ctx.fillStyle = "#CBD5E1";
    ctx.font = "500 24px sans-serif";
    ctx.fillText(options.brand.toUpperCase() || "STORE EXCLUSIVE", w / 2, 330);
    ctx.restore();

    // Center Product Showcase with Glow
    const maxProductH = 750;
    const aspect = productCanvas.width / productCanvas.height;
    let pW = maxProductH * aspect;
    let pH = maxProductH;
    if (aspect > 1) {
      pW = 750;
      pH = 750 / aspect;
    }

    const pX = (w - pW) / 2;
    const pY = h * 0.48 - pH / 2;

    // Glowing halo behind product
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.48, 380, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(168, 85, 247, 0.25)";
    ctx.filter = "blur(60px)";
    ctx.fill();

    // Product image
    ctx.drawImage(productCanvas, pX, pY, pW, pH);

    // Bottom Action Card
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    this.roundRect(ctx, 80, h - 380, w - 160, 220, 32);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.stroke();

    ctx.fillStyle = "#FBBF24";
    ctx.font = "900 64px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`₹${options.mrp}`, w / 2, h - 280);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText("Order Now • Limited Quantity", w / 2, h - 210);
    ctx.restore();

    return canvas.toDataURL("image/jpeg", 0.94);
  },

  roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },
};
