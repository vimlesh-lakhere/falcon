import { AiDescriptions, ExtractedAttributes } from "./types";

export const aiDescriptionGenerator = {
  generate(
    name: string,
    brand: string,
    category: string,
    attributes: ExtractedAttributes = {}
  ): AiDescriptions {
    const brandPrefix = brand ? `${brand} ` : "";
    const cleanName = name || "Premium Cosmetic Product";
    const volumeOrWeight = attributes.netVolume || attributes.netWeight || "";

    const shortDescription = `${brandPrefix}${cleanName}${
      volumeOrWeight ? ` (${volumeOrWeight})` : ""
    } is formulated with high-performance ingredients to deliver radiant, long-lasting results. Ideal for daily professional and personal grooming.`;

    const longDescription = `Elevate your personal care routine with ${brandPrefix}${cleanName}. Specially crafted by beauty experts, this premium formulation combines dermatologist-tested actives with nourishing botanical extracts. Designed to offer superior texture, seamless application, and lasting efficacy without causing irritation or heaviness. Suitable for modern lifestyle needs and all skin/hair types.`;

    const seoDescription = `Buy ${brandPrefix}${cleanName} online at best price. 100% authentic ${category} product with fast delivery and exclusive store discounts.`;

    const seoKeywords = [
      brand.toLowerCase(),
      name.toLowerCase(),
      category.toLowerCase(),
      "buy online",
      "best cosmetic",
      "authentic beauty products",
      "daily skincare",
    ].filter(Boolean);

    const highlights = [
      `Dermatologically tested & 100% cruelty-free formulation`,
      `Infused with nourishing natural botanicals and active complexes`,
      `Non-greasy, fast-absorbing lightweight texture`,
      `Long-lasting formula designed for all-day comfort`,
      `Free from harmful parabens, sulphates, and synthetic heavy dyes`,
    ];

    const keyBenefits = [
      `Intensively nourishes and revitalizes from first application`,
      `Helps restore natural moisture balance and protective barrier`,
      `Leaves skin and hair visibly softer, smoother, and radiant`,
      `Provides antioxidant defense against environmental stressors`,
    ];

    const directionsForUse = `Apply an adequate quantity onto cleansed surface. Gently massage in upward circular motions until fully absorbed. Use twice daily for optimal results or as directed by your beauty specialist.`;

    const warnings = `For external use only. Avoid direct contact with eyes. In case of contact, rinse thoroughly with clean water. Perform a patch test 24 hours prior to initial use.`;

    const ingredients = `Aqua, Glycerin, Niacinamide, Sodium Hyaluronate, Tocopheryl Acetate (Vitamin E), Botanical Extracts, Ethylhexylglycerin, Phenoxyethanol, Fragrance.`;

    const suitableFor = `All Skin & Hair Types (including Sensitive & Combination)`;
    const storageInstructions = `Store in a cool, dry place away from direct sunlight. Keep cap tightly closed after each use.`;

    return {
      shortDescription,
      longDescription,
      seoDescription,
      seoKeywords,
      highlights,
      keyBenefits,
      directionsForUse,
      warnings,
      ingredients,
      suitableFor,
      storageInstructions,
    };
  },
};
