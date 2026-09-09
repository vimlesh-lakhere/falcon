export interface CategoryMapping {
  categoryName: string;
  subCategoryName: string;
  suggestedMarginPercent: number;
  gstRate: number;
}

const CATEGORY_KEYWORDS: { [key: string]: CategoryMapping } = {
  // Feminine Hygiene & Sanitary Protection
  sofy: { categoryName: "Personal Care", subCategoryName: "Feminine Hygiene & Sanitary Pads", suggestedMarginPercent: 25, gstRate: 0 },
  pad: { categoryName: "Personal Care", subCategoryName: "Feminine Hygiene & Sanitary Pads", suggestedMarginPercent: 25, gstRate: 0 },
  pads: { categoryName: "Personal Care", subCategoryName: "Feminine Hygiene & Sanitary Pads", suggestedMarginPercent: 25, gstRate: 0 },
  sanitary: { categoryName: "Personal Care", subCategoryName: "Feminine Hygiene & Sanitary Pads", suggestedMarginPercent: 25, gstRate: 0 },
  whisper: { categoryName: "Personal Care", subCategoryName: "Feminine Hygiene & Sanitary Pads", suggestedMarginPercent: 25, gstRate: 0 },
  stayfree: { categoryName: "Personal Care", subCategoryName: "Feminine Hygiene & Sanitary Pads", suggestedMarginPercent: 25, gstRate: 0 },
  napkin: { categoryName: "Personal Care", subCategoryName: "Feminine Hygiene & Sanitary Pads", suggestedMarginPercent: 25, gstRate: 0 },
  tampon: { categoryName: "Personal Care", subCategoryName: "Feminine Hygiene & Sanitary Pads", suggestedMarginPercent: 25, gstRate: 0 },
  carefree: { categoryName: "Personal Care", subCategoryName: "Feminine Hygiene & Sanitary Pads", suggestedMarginPercent: 25, gstRate: 0 },
  unicharm: { categoryName: "Personal Care", subCategoryName: "Feminine Hygiene & Sanitary Pads", suggestedMarginPercent: 25, gstRate: 0 },

  // Baby Care
  diaper: { categoryName: "Baby Care", subCategoryName: "Diapers & Nappies", suggestedMarginPercent: 20, gstRate: 12 },
  pampers: { categoryName: "Baby Care", subCategoryName: "Diapers & Nappies", suggestedMarginPercent: 20, gstRate: 12 },
  huggies: { categoryName: "Baby Care", subCategoryName: "Diapers & Nappies", suggestedMarginPercent: 20, gstRate: 12 },
  "mamy poko": { categoryName: "Baby Care", subCategoryName: "Diapers & Nappies", suggestedMarginPercent: 20, gstRate: 12 },
  "baby wipes": { categoryName: "Baby Care", subCategoryName: "Baby Wipes & Cleansing", suggestedMarginPercent: 25, gstRate: 18 },
  cerelac: { categoryName: "Baby Care", subCategoryName: "Baby Food & Nutrition", suggestedMarginPercent: 15, gstRate: 18 },
  lactogen: { categoryName: "Baby Care", subCategoryName: "Baby Food & Nutrition", suggestedMarginPercent: 15, gstRate: 18 },

  // Hair Care
  shampoo: { categoryName: "Hair Care", subCategoryName: "Shampoo & Cleanser", suggestedMarginPercent: 30, gstRate: 18 },
  conditioner: { categoryName: "Hair Care", subCategoryName: "Conditioners & Masks", suggestedMarginPercent: 30, gstRate: 18 },
  oil: { categoryName: "Hair Care", subCategoryName: "Hair Oils & Tonics", suggestedMarginPercent: 25, gstRate: 18 },
  parachute: { categoryName: "Hair Care", subCategoryName: "Coconut & Hair Oils", suggestedMarginPercent: 20, gstRate: 5 },
  "hair color": { categoryName: "Hair Care", subCategoryName: "Hair Color & Dyes", suggestedMarginPercent: 35, gstRate: 18 },

  // Skin Care & Cosmetics
  serum: { categoryName: "Skin Care", subCategoryName: "Face Serums & Treatments", suggestedMarginPercent: 40, gstRate: 18 },
  moisturizer: { categoryName: "Skin Care", subCategoryName: "Face Creams & Lotions", suggestedMarginPercent: 35, gstRate: 18 },
  sunscreen: { categoryName: "Skin Care", subCategoryName: "Sun Protection (SPF)", suggestedMarginPercent: 35, gstRate: 18 },
  facewash: { categoryName: "Skin Care", subCategoryName: "Face Wash & Cleanser", suggestedMarginPercent: 30, gstRate: 18 },
  cream: { categoryName: "Skin Care", subCategoryName: "Day & Night Creams", suggestedMarginPercent: 35, gstRate: 18 },
  scrub: { categoryName: "Skin Care", subCategoryName: "Exfoliators & Scrubs", suggestedMarginPercent: 35, gstRate: 18 },
  toner: { categoryName: "Skin Care", subCategoryName: "Toners & Mists", suggestedMarginPercent: 35, gstRate: 18 },
  lipstick: { categoryName: "Cosmetics & Makeup", subCategoryName: "Lips", suggestedMarginPercent: 45, gstRate: 18 },
  foundation: { categoryName: "Cosmetics & Makeup", subCategoryName: "Face Makeup", suggestedMarginPercent: 40, gstRate: 18 },
  mascara: { categoryName: "Cosmetics & Makeup", subCategoryName: "Eye Makeup", suggestedMarginPercent: 40, gstRate: 18 },
  nail: { categoryName: "Cosmetics & Makeup", subCategoryName: "Nail Care & Polish", suggestedMarginPercent: 45, gstRate: 18 },
  perfume: { categoryName: "Fragrances", subCategoryName: "Eau de Parfum", suggestedMarginPercent: 50, gstRate: 28 },

  // Bath & Body
  soap: { categoryName: "Personal Care", subCategoryName: "Bathing Soaps & Cleansing", suggestedMarginPercent: 20, gstRate: 18 },
  bodywash: { categoryName: "Personal Care", subCategoryName: "Body Wash & Shower Gel", suggestedMarginPercent: 25, gstRate: 18 },
  deo: { categoryName: "Personal Care", subCategoryName: "Deodorants & Body Sprays", suggestedMarginPercent: 25, gstRate: 18 },
  dettol: { categoryName: "Personal Care", subCategoryName: "Antiseptic & Hygiene", suggestedMarginPercent: 18, gstRate: 18 },
  lifebuoy: { categoryName: "Personal Care", subCategoryName: "Bathing Soaps & Hygiene", suggestedMarginPercent: 18, gstRate: 18 },

  // Oral Care
  toothpaste: { categoryName: "Oral Care", subCategoryName: "Toothpaste", suggestedMarginPercent: 22, gstRate: 18 },
  toothbrush: { categoryName: "Oral Care", subCategoryName: "Toothbrushes", suggestedMarginPercent: 30, gstRate: 18 },
  colgate: { categoryName: "Oral Care", subCategoryName: "Toothpaste & Oral Hygiene", suggestedMarginPercent: 20, gstRate: 18 },
  closeup: { categoryName: "Oral Care", subCategoryName: "Toothpaste", suggestedMarginPercent: 20, gstRate: 18 },

  // Household & Laundry
  detergent: { categoryName: "Household Goods", subCategoryName: "Laundry Detergent", suggestedMarginPercent: 18, gstRate: 18 },
  surf: { categoryName: "Household Goods", subCategoryName: "Laundry Detergent", suggestedMarginPercent: 18, gstRate: 18 },
  ariel: { categoryName: "Household Goods", subCategoryName: "Laundry Detergent", suggestedMarginPercent: 18, gstRate: 18 },
  tide: { categoryName: "Household Goods", subCategoryName: "Laundry Detergent", suggestedMarginPercent: 18, gstRate: 18 },
  dishwash: { categoryName: "Household Goods", subCategoryName: "Dishwashing Liquid & Bar", suggestedMarginPercent: 20, gstRate: 18 },
  vim: { categoryName: "Household Goods", subCategoryName: "Dishwashing Liquid & Bar", suggestedMarginPercent: 20, gstRate: 18 },
  harpic: { categoryName: "Household Goods", subCategoryName: "Toilet & Bathroom Cleaners", suggestedMarginPercent: 20, gstRate: 18 },

  // Food, Snacks & Beverages
  biscuit: { categoryName: "Snacks & Confectionery", subCategoryName: "Biscuits & Cookies", suggestedMarginPercent: 18, gstRate: 18 },
  parle: { categoryName: "Snacks & Confectionery", subCategoryName: "Biscuits", suggestedMarginPercent: 15, gstRate: 18 },
  britannia: { categoryName: "Snacks & Confectionery", subCategoryName: "Biscuits & Bakery", suggestedMarginPercent: 18, gstRate: 18 },
  noodle: { categoryName: "Packaged Food", subCategoryName: "Instant Noodles", suggestedMarginPercent: 18, gstRate: 18 },
  maggi: { categoryName: "Packaged Food", subCategoryName: "Instant Noodles & Soups", suggestedMarginPercent: 18, gstRate: 18 },
  tea: { categoryName: "Beverages", subCategoryName: "Tea Leaves & Bags", suggestedMarginPercent: 18, gstRate: 5 },
  coffee: { categoryName: "Beverages", subCategoryName: "Instant Coffee", suggestedMarginPercent: 20, gstRate: 18 },
  atta: { categoryName: "Groceries & Staples", subCategoryName: "Flour & Atta", suggestedMarginPercent: 12, gstRate: 5 },
  rice: { categoryName: "Groceries & Staples", subCategoryName: "Rice & Grains", suggestedMarginPercent: 12, gstRate: 5 },
  dal: { categoryName: "Groceries & Staples", subCategoryName: "Pulses & Lentils", suggestedMarginPercent: 12, gstRate: 5 },
};

export const aiCategoryDetector = {
  detect(productName: string = "", brand: string = "", rawText: string = ""): CategoryMapping {
    const combined = `${productName} ${brand} ${rawText}`.toLowerCase().trim();

    if (!combined) {
      return {
        categoryName: "General Goods",
        subCategoryName: "General Retail",
        suggestedMarginPercent: 25,
        gstRate: 18,
      };
    }

    for (const [keyword, mapping] of Object.entries(CATEGORY_KEYWORDS)) {
      // Word boundary check or substring match
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      if (regex.test(combined) || combined.includes(keyword)) {
        return mapping;
      }
    }

    // Default fallback category for unclassified items
    return {
      categoryName: "General Goods",
      subCategoryName: "General Retail",
      suggestedMarginPercent: 25,
      gstRate: 18,
    };
  },
};
