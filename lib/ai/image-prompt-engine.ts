import { HeroTheme } from "./types";

export interface ImagePromptOptions {
  productName: string;
  brand?: string;
  categoryName?: string;
  theme?: HeroTheme | string;
  customPrompt?: string;
  packagingDetails?: string;
  packagingShape?: string;
  capDetails?: string;
  containerColorMaterial?: string;
  labelDesignColors?: string;
  exactLabelText?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16";
}

/**
 * Falcon AI Product Studio - Exact Product Reconstruction & Studio Engine
 * 
 * Rules:
 * • Preserve exact product shape, packaging, bottle size, cap, label colors, text placement and design elements.
 * • Improve only: Remove hands, remove reflections/glare, remove room background, remove blur, make label crisp and 100% readable.
 * • Studio lighting, pure white seamless background (#FFFFFF), realistic subtle contact drop-shadow.
 * • 4K ultra-sharp Amazon catalog e-commerce quality, front-facing, centered.
 * • Never redesign the packaging, never invent a new label, never change colors.
 */
export const aiImagePromptEngine = {
  /**
   * Builds an exact product reconstruction prompt following strict catalog rules
   */
  buildCommercialStudioPrompt(options: ImagePromptOptions): string {
    const {
      productName,
      brand = "",
      categoryName = "Product",
      customPrompt,
      packagingShape = "rectangular bottle container with smooth rounded shoulders",
      capDetails = "black screw top cap",
      containerColorMaterial = "clear transparent container showing the product powder inside",
      labelDesignColors = "matte black rectangular front label with crisp white border and white typography",
      exactLabelText = productName,
    } = options;

    if (customPrompt && customPrompt.trim()) {
      return this.enhanceCustomPrompt(customPrompt, productName, brand);
    }

    const brandPrefix = brand ? `${brand} ` : "";

    return `Professional Amazon e-commerce catalog studio photograph of one single exact product: ${brandPrefix}${productName}.
Product packaging specifications:
- Container: Exact ${packagingShape}, ${containerColorMaterial}.
- Cap: Exact ${capDetails}.
- Front Label: Exact ${labelDesignColors}.
- Typography & Branding: Exact text "${exactLabelText}" perfectly centered and crystal clear, ultra-sharp readable font.
- View: Straight-on front-facing centered view, perfectly vertical, eye-level angle.

Strict Studio Requirements:
- Pure seamless clean white background (Hex #FFFFFF, RGB 255, 255, 255).
- Balanced diffused professional studio softbox lighting with zero harsh glare or reflections.
- Realistic subtle ground contact drop-shadow directly underneath the base.
- NO human hands, NO fingers, NO room background, NO clutter, NO blur.
- Ultra-sharp 4K commercial retail catalog photography, pristine e-commerce showroom quality. Single isolated product only.`;
  },

  /**
   * Enhances a user's natural language input (ChatGPT/Gemini style) while preserving exact product identity
   */
  enhanceCustomPrompt(userPrompt: string, productName: string, brand?: string): string {
    const brandPrefix = brand ? `${brand} ` : "";
    return `Professional high-end commercial e-commerce product photograph featuring ${brandPrefix}${productName} centered in the frame.
Art Direction & Scene: ${userPrompt.trim()}.
Product preservation: Preserve exact packaging shape, exact cap, original label colors and branding. Sharp foreground focus on the product label with crystal-clear readable typography.
Lighting & Quality: Master studio lighting, crisp zero-glare reflections, authentic textures, ultra-sharp 4K commercial advertising grade, clean composition.`;
  },

  /**
   * Resolves theme descriptions to photorealistic photography settings
   */
  getThemeEnvironment(theme: string): string {
    switch (theme) {
      case "luxury_marble":
        return "Staged on a polished Italian Carrara white marble vanity countertop, soft neutral warm grey background, subtle elegant architectural morning light casting soft diagonal shadows.";
      case "botanical_herbal":
        return "Staged on a rich polished natural teakwood wooden surface, decorated with fresh organic green botanical leaves and Ayurvedic natural herbs softly blurred in the background, warm spa sunlight.";
      case "minimal_studio":
        return "Staged in an immaculate ultra-minimalist pure white photo studio, smooth seamless white backdrop, soft subtle gradient lighting, modern clean geometric pedestal.";
      case "dark_obsidian":
        return "Staged on a sleek dark obsidian stone surface with dark smoked glass accents, dramatic low-key studio lighting with subtle neon purple and cyan rim light highlighting the product silhouette.";
      case "festival_gold":
        return "Staged on a warm golden podium with ambient golden bokeh sparkles, rich festive Indian festival aesthetic, warm glowing diyas and marigold accents softly blurred in the backdrop.";
      case "water_splash":
        return "Staged with dynamic crystal-clear water droplets, fresh water splash freezing in mid-air around the base, high-speed macro commercial beverage/skincare photography, crisp refraction.";
      case "tropical_summer":
        return "Staged on warm golden beach sand with a tropical palm leaf shadow overlay, warm golden hour sunlight, refreshing exotic summer vibe.";
      case "floral_spa":
        return "Staged on a pastel ceramic tray surrounded by delicate fresh pastel rose and jasmine flower petals, soft morning diffused window light, luxury beauty salon aesthetic.";
      default:
        return "Pure seamless clean white background (#FFFFFF) with soft studio lighting and realistic ground contact shadow.";
    }
  },

  /**
   * List of popular quick-prompt chips for the UI
   */
  getQuickPromptPresets(): { id: string; label: string; icon: string; prompt: string }[] {
    return [
      {
        id: "pure_studio",
        label: "Amazon Pure White Catalog",
        icon: "📸",
        prompt: "Ultra-clean pure white commercial studio background (#FFFFFF) with soft natural contact drop shadow and crisp readable label.",
      },
      {
        id: "luxury_marble",
        label: "Luxury Marble Vanity",
        icon: "🌟",
        prompt: "Place the product on a luxury Italian Carrara white marble countertop with soft warm morning sunlight and a modern mirror reflection in the background.",
      },
      {
        id: "botanical_teak",
        label: "Botanical Teakwood & Herbs",
        icon: "🌿",
        prompt: "Stage the product on a warm rustic teakwood wooden table surrounded by fresh organic green leaves, Ayurvedic herbal roots, and natural spa lighting.",
      },
      {
        id: "water_splash",
        label: "Water Splash & Fresh Dew",
        icon: "💧",
        prompt: "Dynamic commercial shot with crystal clear water splash in motion around the base, fresh dew drops on the surface, bright crisp high-speed studio flash.",
      },
      {
        id: "dark_obsidian",
        label: "Dark Obsidian & Rim Light",
        icon: "🖤",
        prompt: "Dark obsidian stone pedestal with subtle atmospheric smoke, dramatic cyan and purple rim lighting, premium luxury cosmetic aesthetic.",
      },
      {
        id: "festival_gold",
        label: "Festive Gold & Glow",
        icon: "✨",
        prompt: "Festive Indian festival backdrop with warm golden glow, fairy lights bokeh, traditional brass accents and rich celebratory ambiance.",
      },
      {
        id: "tropical_summer",
        label: "Sunny Tropical Vacation",
        icon: "🏖️",
        prompt: "Placed on warm golden beach sand with gentle seafoam in background, palm leaf shadows and bright sunny tropical lighting.",
      },
      {
        id: "floral_spa",
        label: "Floral Spa & Petals",
        icon: "🌸",
        prompt: "Surrounded by soft pink and white flower petals on a pastel aesthetic vanity, gentle diffuse morning window light, high-end skincare magazine style.",
      },
    ];
  },
};
