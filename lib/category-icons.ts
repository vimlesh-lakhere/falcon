import {
  Droplet,
  Sparkles,
  Heart,
  Bath,
  Waves,
  Pill,
  ShoppingBag,
  Shirt,
  Zap,
  Tag,
  Box,
  LayoutGrid,
  Layers,
  Baby,
  Smile,
  Scissors,
  Coffee,
  Apple,
  Cookie,
  Flame,
  Feather,
  Shield,
  CircleDot,
  type LucideIcon,
} from "lucide-react";

export interface CategoryIconOption {
  key: string;
  label: string;
  icon: LucideIcon;
  keywords: string[];
}

export const CATEGORY_ICON_LIST: CategoryIconOption[] = [
  { key: "droplet", label: "Oil / Liquid / Drops", icon: Droplet, keywords: ["oil", "tail", "tel", "liquid", "drops", "ghee"] },
  { key: "sparkles", label: "Cream / Powder / Beauty", icon: Sparkles, keywords: ["powder", "cream", "lotion", "glow", "fairness", "beauty", "cosmetic", "face"] },
  { key: "heart", label: "Baby Care / Health", icon: Heart, keywords: ["baby", "care", "health", "infant", "child", "kit", "himalaya"] },
  { key: "bath", label: "Soap / Body Wash", icon: Bath, keywords: ["soap", "body", "bath", "wash", "dettol", "lifebuoy", "lux"] },
  { key: "waves", label: "Shampoo / Hair Care", icon: Waves, keywords: ["shampoo", "hair", "conditioner", "amla", "vatika", "clinic", "head"] },
  { key: "pill", label: "Medicine / Health", icon: Pill, keywords: ["medicine", "tablet", "pharma", "capsule", "pain", "syrup", "balm", "iodex"] },
  { key: "shirt", label: "Clothing / Garments", icon: Shirt, keywords: ["top", "tops", "shirt", "cloth", "garment", "wear", "pants", "dress"] },
  { key: "coffee", label: "Tea / Coffee / Drinks", icon: Coffee, keywords: ["tea", "chai", "coffee", "drink", "beverage", "juice", "water"] },
  { key: "cookie", label: "Biscuits / Snacks / Food", icon: Cookie, keywords: ["biscuit", "cookie", "snack", "namkeen", "chips", "food", "grocery"] },
  { key: "apple", label: "Fresh / Grocery / Kirana", icon: Apple, keywords: ["kirana", "ration", "flour", "atta", "rice", "dal", "sugar"] },
  { key: "scissors", label: "Personal Grooming / Shave", icon: Scissors, keywords: ["shave", "razor", "blade", "grooming", "scissor", "salon"] },
  { key: "feather", label: "Fragrance / Perfume / Deo", icon: Feather, keywords: ["perfume", "deo", "spray", "attar", "fragrance", "scent"] },
  { key: "flame", label: "Puja / Incense / Agarbatti", icon: Flame, keywords: ["puja", "agarbatti", "dhoop", "incense", "kapur", "match"] },
  { key: "zap", label: "Electronics / Battery", icon: Zap, keywords: ["battery", "electric", "cell", "bulb", "torch", "wire"] },
  { key: "shopping-bag", label: "Accessories / General", icon: ShoppingBag, keywords: ["bag", "accessory", "general", "plastic", "pack"] },
  { key: "box", label: "Packets / Bulk Pack", icon: Box, keywords: ["box", "pack", "bundle", "carton", "combo"] },
  { key: "tag", label: "Other / General Items", icon: Tag, keywords: ["misc", "other", "item"] },
];

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  all: LayoutGrid,
  droplet: Droplet,
  sparkles: Sparkles,
  heart: Heart,
  bath: Bath,
  waves: Waves,
  pill: Pill,
  shirt: Shirt,
  coffee: Coffee,
  cookie: Cookie,
  apple: Apple,
  scissors: Scissors,
  feather: Feather,
  flame: Flame,
  zap: Zap,
  "shopping-bag": ShoppingBag,
  box: Box,
  tag: Tag,
  layers: Layers,
  baby: Baby,
  smile: Smile,
  shield: Shield,
  "circle-dot": CircleDot,
};

/**
 * Automatically infers an icon key from category name keywords in Hindi or English.
 */
export function inferCategoryIconKey(categoryName: string): string {
  if (!categoryName) return "tag";
  const nameLower = categoryName.toLowerCase();

  for (const option of CATEGORY_ICON_LIST) {
    for (const kw of option.keywords) {
      if (nameLower.includes(kw)) {
        return option.key;
      }
    }
  }

  return "tag";
}

/**
 * Resolves the Lucide icon component for a category.
 */
export function resolveCategoryIcon(
  categoryKeyOrId: string,
  categoryName: string,
  customMap: Record<string, string> = {}
): LucideIcon {
  if (categoryKeyOrId === "all") {
    return LayoutGrid;
  }

  // Check custom override
  const customKey = customMap[categoryKeyOrId];
  if (customKey && CATEGORY_ICON_MAP[customKey]) {
    return CATEGORY_ICON_MAP[customKey];
  }

  // Automatic inference from name
  const inferredKey = inferCategoryIconKey(categoryName);
  return CATEGORY_ICON_MAP[inferredKey] || Tag;
}
