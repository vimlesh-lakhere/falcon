import React from "react";
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

export interface EmojiGroup {
  name: string;
  icon: string;
  emojis: string[];
}

/**
 * Curated Emoji Collections tailored for Indian retail, cosmetics, kirana & general stores
 */
export const CURATED_EMOJI_GROUPS: EmojiGroup[] = [
  {
    name: "Beauty, Cosmetics & Hair",
    icon: "💄",
    emojis: [
      "💄", "🧴", "💅", "💋", "🪞", "💇", "🌸", "🧼", "🫧", "🪥",
      "🪒", "💆", "✨", "💎", "🎀", "👑", "🧴", "💐", "🌺", "🌹",
      "👄", "🕶️", "💍", "👒", "👙"
    ],
  },
  {
    name: "Kirana, Grocery & Grains",
    icon: "🛒",
    emojis: [
      "🛒", "🌾", "🍚", "🛢️", "🧂", "🥔", "🧅", "🍅", "🥦", "🌶️",
      "🍋", "🫘", "🍯", "🫙", "📦", "🏷️", "🌽", "🧄", "🥕", "🥑",
      "🥒", "🥥", "🥜", "🌰", "🍞"
    ],
  },
  {
    name: "Snacks, Sweets & Bakery",
    icon: "🍫",
    emojis: [
      "🍫", "🍪", "🍿", "🍬", "🍭", "🍞", "🥐", "🧁", "🎂", "🥞",
      "🥨", "🍦", "🍩", "🥜", "🍟", "🍕", "🍔", "🥪", "🧇", "🍮",
      "🍯", "🥧", "🍡", "🍧", "🍨"
    ],
  },
  {
    name: "Drinks, Tea, Coffee & Dairy",
    icon: "🥤",
    emojis: [
      "🥤", "🧃", "🥛", "☕", "🍵", "🍼", "🧊", "🥥", "🍶", "🧋",
      "🫖", "🍹", "🫗", "🍾", "🍻", "🍺", "🥂", "🍸", "🧉"
    ],
  },
  {
    name: "Health, Medicine & Baby Care",
    icon: "💊",
    emojis: [
      "💊", "🩹", "🩺", "🧴", "👶", "🍼", "🧸", "🧷", "🩱", "🧻",
      "🧬", "🌿", "🍵", "🌡️", "💉", "🦽", "🦯", "🪥", "🦷", "👁️"
    ],
  },
  {
    name: "Home, Cleaning & Puja",
    icon: "🧹",
    emojis: [
      "🧹", "🧼", "🧺", "🪣", "🪥", "🧽", "🪔", "🕯️", "🌺", "🌸",
      "🪵", "🔔", "🧴", "🧻", "🪙", "🪴", "🚿", "🪞", "🧯", "📦"
    ],
  },
  {
    name: "Fashion, Garments & Accessories",
    icon: "👕",
    emojis: [
      "👕", "👗", "👔", "👖", "🧥", "🥻", "🩱", "👠", "👜", "🎒",
      "🕶️", "💍", "🧢", "🧦", "🧣", "👛", "👝", "👟", "🥿", "🩴"
    ],
  },
  {
    name: "Electronics, Stationery & General",
    icon: "⚡",
    emojis: [
      "⚡", "🔋", "💡", "🔌", "📱", "🎧", "💻", "✏️", "✂️", "📎",
      "📒", "📏", "📦", "🏷️", "🎁", "⭐", "🔥", "🛡️", "🔑", "🔒"
    ],
  },
];

export interface CategoryIconOption {
  key: string;
  label: string;
  icon: LucideIcon;
  keywords: string[];
}

export const CATEGORY_ICON_LIST: CategoryIconOption[] = [
  { key: "droplet", label: "Oil / Liquid / Drops", icon: Droplet, keywords: ["oil", "tail", "tel", "liquid", "drops", "ghee", "तेल"] },
  { key: "sparkles", label: "Cream / Powder / Beauty", icon: Sparkles, keywords: ["powder", "cream", "lotion", "glow", "fairness", "beauty", "cosmetic", "face", "क्रीम", "सुंदरता"] },
  { key: "heart", label: "Baby Care / Health", icon: Heart, keywords: ["baby", "care", "health", "infant", "child", "kit", "himalaya", "बच्चे"] },
  { key: "bath", label: "Soap / Body Wash", icon: Bath, keywords: ["soap", "body", "bath", "wash", "dettol", "lifebuoy", "lux", "साबुन"] },
  { key: "waves", label: "Shampoo / Hair Care", icon: Waves, keywords: ["shampoo", "hair", "conditioner", "amla", "vatika", "clinic", "head", "शैम्पू", "बाल"] },
  { key: "pill", label: "Medicine / Health", icon: Pill, keywords: ["medicine", "tablet", "pharma", "capsule", "pain", "syrup", "balm", "iodex", "दवा", "गोली"] },
  { key: "shirt", label: "Clothing / Garments", icon: Shirt, keywords: ["top", "tops", "shirt", "cloth", "garment", "wear", "pants", "dress", "कपड़े"] },
  { key: "coffee", label: "Tea / Coffee / Drinks", icon: Coffee, keywords: ["tea", "chai", "coffee", "drink", "beverage", "juice", "water", "चाय", "कॉफ़ी"] },
  { key: "cookie", label: "Biscuits / Snacks / Food", icon: Cookie, keywords: ["biscuit", "cookie", "snack", "namkeen", "chips", "food", "grocery", "बिस्कुट", "नमकीन"] },
  { key: "apple", label: "Fresh / Grocery / Kirana", icon: Apple, keywords: ["kirana", "ration", "flour", "atta", "rice", "dal", "sugar", "किराना", "अनाज"] },
  { key: "scissors", label: "Personal Grooming / Shave", icon: Scissors, keywords: ["shave", "razor", "blade", "grooming", "scissor", "salon", "शेव"] },
  { key: "feather", label: "Fragrance / Perfume / Deo", icon: Feather, keywords: ["perfume", "deo", "spray", "attar", "fragrance", "scent", "इत्र"] },
  { key: "flame", label: "Puja / Incense / Agarbatti", icon: Flame, keywords: ["puja", "agarbatti", "dhoop", "incense", "kapur", "match", "पूजा", "अगरबत्ती"] },
  { key: "zap", label: "Electronics / Battery", icon: Zap, keywords: ["battery", "electric", "cell", "bulb", "torch", "wire", "बिजली"] },
  { key: "shopping-bag", label: "Accessories / General", icon: ShoppingBag, keywords: ["bag", "accessory", "general", "plastic", "pack", "थैली"] },
  { key: "box", label: "Packets / Bulk Pack", icon: Box, keywords: ["box", "pack", "bundle", "carton", "combo", "डिब्बा"] },
  { key: "tag", label: "Other / General Items", icon: Tag, keywords: ["misc", "other", "item", "अन्य"] },
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
 * Checks if a string is a raw emoji character or sequence.
 */
export function isEmojiString(str: string): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  if (trimmed.length === 0) return false;
  const codePoint = trimmed.codePointAt(0) || 0;
  return (
    (codePoint >= 0x1f300 && codePoint <= 0x1faff) || // Symbols, Pictographs, Emoticons, Food, Objects
    (codePoint >= 0x2600 && codePoint <= 0x27bf) ||   // Misc Symbols & Dingbats (✨, ⚡, ⭐, ✂️)
    (codePoint >= 0x1f600 && codePoint <= 0x1f64f) || // Emoticons
    (codePoint >= 0x1f680 && codePoint <= 0x1f6ff) || // Transport
    (codePoint >= 0x1f900 && codePoint <= 0x1f9ff) || // Supplemental Symbols
    (codePoint >= 0x2300 && codePoint <= 0x23ff) ||   // Misc Technical
    (codePoint >= 0x2b50 && codePoint <= 0x2b55) ||   // Stars
    (codePoint >= 0x1fa00 && codePoint <= 0x1faff)    // Extended Pictographs (🪞, 🪒, 🪔, 🫧)
  );
}

/**
 * Automatically infers an Emoji from category name keywords in Hindi or English.
 */
export function inferCategoryEmoji(categoryName: string): string {
  if (!categoryName) return "🏷️";
  const nameLower = categoryName.toLowerCase();

  if (nameLower.includes("cosmetic") || nameLower.includes("beauty") || nameLower.includes("makeup") || nameLower.includes("lipstick") || nameLower.includes("सुंदरता")) return "💄";
  if (nameLower.includes("shampoo") || nameLower.includes("hair") || nameLower.includes("conditioner") || nameLower.includes("शैम्पू")) return "🧴";
  if (nameLower.includes("oil") || nameLower.includes("tail") || nameLower.includes("tel") || nameLower.includes("amla") || nameLower.includes("तेल")) return "🧴";
  if (nameLower.includes("soap") || nameLower.includes("bath") || nameLower.includes("wash") || nameLower.includes("साबुन")) return "🧼";
  if (nameLower.includes("cream") || nameLower.includes("lotion") || nameLower.includes("powder") || nameLower.includes("glow") || nameLower.includes("क्रीम")) return "✨";
  if (nameLower.includes("perfume") || nameLower.includes("deo") || nameLower.includes("spray") || nameLower.includes("attar") || nameLower.includes("इत्र")) return "🌸";
  if (nameLower.includes("chocolate") || nameLower.includes("sweet") || nameLower.includes("चॉकलेट")) return "🍫";
  if (nameLower.includes("biscuit") || nameLower.includes("cookie") || nameLower.includes("snack") || nameLower.includes("namkeen") || nameLower.includes("chips") || nameLower.includes("नमकीन")) return "🍪";
  if (nameLower.includes("tea") || nameLower.includes("chai") || nameLower.includes("coffee") || nameLower.includes("चाय")) return "☕";
  if (nameLower.includes("drink") || nameLower.includes("beverage") || nameLower.includes("juice") || nameLower.includes("cold drink")) return "🥤";
  if (nameLower.includes("milk") || nameLower.includes("dairy") || nameLower.includes("curd") || nameLower.includes("paneer") || nameLower.includes("दूध")) return "🥛";
  if (nameLower.includes("bread") || nameLower.includes("bakery") || nameLower.includes("cake") || nameLower.includes("ब्रेड")) return "🍞";
  if (nameLower.includes("kirana") || nameLower.includes("atta") || nameLower.includes("rice") || nameLower.includes("dal") || nameLower.includes("grain") || nameLower.includes("अनाज")) return "🌾";
  if (nameLower.includes("baby") || nameLower.includes("diaper") || nameLower.includes("infant") || nameLower.includes("बच्चे")) return "👶";
  if (nameLower.includes("medicine") || nameLower.includes("pharma") || nameLower.includes("tablet") || nameLower.includes("capsule") || nameLower.includes("दवा")) return "💊";
  if (nameLower.includes("puja") || nameLower.includes("agarbatti") || nameLower.includes("dhoop") || nameLower.includes("incense") || nameLower.includes("पूजा")) return "🪔";
  if (nameLower.includes("clean") || nameLower.includes("broom") || nameLower.includes("surf") || nameLower.includes("detergent") || nameLower.includes("सफ़ाई")) return "🧹";
  if (nameLower.includes("cloth") || nameLower.includes("shirt") || nameLower.includes("pant") || nameLower.includes("garment") || nameLower.includes("कपड़े")) return "👕";
  if (nameLower.includes("battery") || nameLower.includes("electronic") || nameLower.includes("bulb") || nameLower.includes("cell")) return "⚡";
  if (nameLower.includes("pen") || nameLower.includes("book") || nameLower.includes("stationery") || nameLower.includes("notebook")) return "✏️";

  return "🏷️";
}

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
 * Resolves whether the category has a custom emoji or Lucide icon.
 * Returns either an emoji string OR LucideIcon.
 */
export function resolveCategoryVisual(
  categoryKeyOrId: string,
  categoryName: string,
  customMap: Record<string, string> = {}
): { type: "emoji"; value: string } | { type: "icon"; icon: LucideIcon } {
  if (categoryKeyOrId === "all") {
    return { type: "icon", icon: LayoutGrid };
  }

  const customVal = customMap[categoryKeyOrId]?.trim();

  // 1. If user assigned a custom emoji
  if (customVal && isEmojiString(customVal)) {
    return { type: "emoji", value: customVal };
  }

  // 2. If user assigned a Lucide icon key
  if (customVal && CATEGORY_ICON_MAP[customVal]) {
    return { type: "icon", icon: CATEGORY_ICON_MAP[customVal] };
  }

  // 3. Fallback: Auto-infer smart Emoji based on category name
  const autoEmoji = inferCategoryEmoji(categoryName);
  if (autoEmoji && autoEmoji !== "🏷️") {
    return { type: "emoji", value: autoEmoji };
  }

  // 4. Default Lucide icon
  const inferredIconKey = inferCategoryIconKey(categoryName);
  return { type: "icon", icon: CATEGORY_ICON_MAP[inferredIconKey] || Tag };
}

/**
 * Resolves the Lucide icon component for a category (legacy compatibility).
 */
export function resolveCategoryIcon(
  categoryKeyOrId: string,
  categoryName: string,
  customMap: Record<string, string> = {}
): LucideIcon {
  if (categoryKeyOrId === "all") {
    return LayoutGrid;
  }

  const customKey = customMap[categoryKeyOrId];
  if (customKey && CATEGORY_ICON_MAP[customKey]) {
    return CATEGORY_ICON_MAP[customKey];
  }

  const inferredKey = inferCategoryIconKey(categoryName);
  return CATEGORY_ICON_MAP[inferredKey] || Tag;
}
