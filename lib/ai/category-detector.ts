export interface CategoryMapping {
  categoryName: string;
  subCategoryName: string;
  suggestedMarginPercent: number;
  gstRate: number;
}

const CATEGORY_KEYWORDS: { [key: string]: CategoryMapping } = {
  shampoo: { categoryName: "Hair Care", subCategoryName: "Shampoo & Cleanser", suggestedMarginPercent: 35, gstRate: 18 },
  conditioner: { categoryName: "Hair Care", subCategoryName: "Conditioners & Masks", suggestedMarginPercent: 35, gstRate: 18 },
  serum: { categoryName: "Skin Care", subCategoryName: "Face Serums & Treatments", suggestedMarginPercent: 45, gstRate: 18 },
  moisturizer: { categoryName: "Skin Care", subCategoryName: "Face Creams & Lotions", suggestedMarginPercent: 40, gstRate: 18 },
  sunscreen: { categoryName: "Skin Care", subCategoryName: "Sun Protection (SPF)", suggestedMarginPercent: 40, gstRate: 18 },
  lipstick: { categoryName: "Cosmetics & Makeup", subCategoryName: "Lips", suggestedMarginPercent: 50, gstRate: 18 },
  foundation: { categoryName: "Cosmetics & Makeup", subCategoryName: "Face Makeup", suggestedMarginPercent: 45, gstRate: 18 },
  mascara: { categoryName: "Cosmetics & Makeup", subCategoryName: "Eye Makeup", suggestedMarginPercent: 45, gstRate: 18 },
  perfume: { categoryName: "Fragrances", subCategoryName: "Eau de Parfum", suggestedMarginPercent: 55, gstRate: 28 },
  deo: { categoryName: "Personal Care", subCategoryName: "Deodorants & Body Sprays", suggestedMarginPercent: 30, gstRate: 18 },
  soap: { categoryName: "Personal Care", subCategoryName: "Bathing & Cleansing", suggestedMarginPercent: 20, gstRate: 18 },
  oil: { categoryName: "Hair Care", subCategoryName: "Hair Oils & Tonics", suggestedMarginPercent: 30, gstRate: 18 },
  facewash: { categoryName: "Skin Care", subCategoryName: "Face Wash & Cleanser", suggestedMarginPercent: 35, gstRate: 18 },
  cream: { categoryName: "Skin Care", subCategoryName: "Day & Night Creams", suggestedMarginPercent: 40, gstRate: 18 },
  scrub: { categoryName: "Skin Care", subCategoryName: "Exfoliators & Scrubs", suggestedMarginPercent: 40, gstRate: 18 },
  toner: { categoryName: "Skin Care", subCategoryName: "Toners & Mists", suggestedMarginPercent: 40, gstRate: 18 },
  nail: { categoryName: "Cosmetics & Makeup", subCategoryName: "Nail Care & Polish", suggestedMarginPercent: 50, gstRate: 18 },
};

export const aiCategoryDetector = {
  detect(productName: string, brand: string = "", rawText: string = ""): CategoryMapping {
    const combined = `${productName} ${brand} ${rawText}`.toLowerCase();

    for (const [keyword, mapping] of Object.entries(CATEGORY_KEYWORDS)) {
      if (combined.includes(keyword)) {
        return mapping;
      }
    }

    // Default fallback category
    return {
      categoryName: "Cosmetics & Beauty",
      subCategoryName: "General Retail",
      suggestedMarginPercent: 30,
      gstRate: 18,
    };
  },
};
