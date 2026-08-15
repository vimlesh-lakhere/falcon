import { Product } from "@/types/database";

export type HeroTheme =
  | "luxury_marble"
  | "botanical_herbal"
  | "minimal_studio"
  | "dark_obsidian"
  | "bright_retail"
  | "festival_gold";

export interface StudioAssetGallery {
  heroUrl: string; // Default primary e-commerce image
  catalogUrl: string; // 1080x1080 pure white for POS / Admin / Search
  lifestyleUrl: string; // Realistic contextual scene (marble / wood / countertop)
  promoBannerUrl: string; // Marketing promotional discount card
  socialMedia: {
    instagramPostUrl: string; // 1080x1080 (1:1)
    storyUrl: string; // 1080x1920 (9:16) WhatsApp Status / IG Story
    landscapeBannerUrl: string; // 1200x630 (16:9)
  };
  zoomUrl: string; // High-res inspection asset
  backUrl?: string; // Enhanced back packaging
  galleryUrls: string[]; // Aggregated array of all assets
  activeTheme: HeroTheme;
}

export interface ImageQualityReport {
  score: number; // 0 - 100
  isClear: boolean;
  isHighRes: boolean;
  lightingStatus: "optimal" | "dim" | "overexposed";
  packagingReadability: "sharp" | "acceptable" | "blurry";
  warnings: string[];
  passedChecks: string[];
}

export interface ExtractedAttributes {
  brand?: string;
  netVolume?: string;
  netWeight?: string;
  variant?: string;
  packagingType?: string;
  countryOfOrigin?: string;
  manufacturer?: string;
  gender?: string;
  ageGroup?: string;
  ingredientsList?: string[];
  directionsOfUse?: string;
  benefitsList?: string[];
  storageInstructions?: string;
  warningsList?: string;
}

export interface CategoryDetectionResult {
  categoryId?: string;
  categoryName: string;
  subCategoryName: string;
  gstRate?: number;
  confidence: number;
}

export interface AiDescriptions {
  shortDescription: string;
  longDescription: string;
  seoDescription?: string;
  seoKeywords?: string[];
  highlights?: string[];
  keyBenefits?: string[];
  directionsForUse?: string;
  warnings?: string;
  ingredients?: string;
  suitableFor?: string;
  storageInstructions?: string;
  seoTags?: string[];
  suggestedBulletPoints?: string[];
}

export type GeneratedDescriptions = AiDescriptions;

export interface AiImageEnhancementResult {
  originalUrl: string;
  enhancedUrl: string;
  thumbnailUrl: string;
  galleryUrls: string[];
  aspectRatio?: string;
  dimensions?: { width: number; height: number };
  studioAssets?: StudioAssetGallery;
  qualityReport?: ImageQualityReport;
}

export interface AiProductAnalysisResult {
  productName: string;
  brandName: string;
  category: string | CategoryDetectionResult;
  subCategory?: string;
  suggestedCategoryId?: string;
  mrp: number;
  suggestedPurchasePrice: number;
  suggestedSellingPrice: number;
  suggestedWholesalePrice: number;
  gstRate?: number;
  sku: string;
  barcode: string;
  manufacturer?: string;
  countryOfOrigin?: string;
  confidenceScore: number;
  provider?: string;
  attributes: ExtractedAttributes;
  descriptions: AiDescriptions;
  images: AiImageEnhancementResult;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedProductId?: string;
  matchedProductName?: string;
  matchedProduct?: Product;
  matchType?: "barcode" | "sku" | "name" | "brand";
  confidence: number;
  message?: string;
}
