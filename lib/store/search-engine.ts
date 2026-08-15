import { Product } from "@/types/database";

// Common Indian retail and FMCG synonyms & phonetic mappings
const SYNONYM_MAP: Record<string, string[]> = {
  "fair and lovely": ["glow & lovely", "glow and lovely", "fair & lovely", "face cream"],
  "glow and lovely": ["fair & lovely", "fair and lovely", "glow & lovely", "face cream"],
  "dant kanti": ["tooth paste", "toothpaste", "tooth powder", "patanjali"],
  "manjan": ["tooth powder", "dant manjan", "herbal tooth powder", "oral care"],
  "tooth powder": ["manjan", "dant manjan", "herbal tooth powder", "isha life"],
  "tel": ["hair oil", "oil", "coconut oil", "sarson tel", "mustard oil"],
  "sabun": ["soap", "body wash", "bathing soap"],
  "kajal": ["eye liner", "kohl", "surma", "eye makeup"],
  "shampoo": ["hair wash", "cleanser", "conditioner"],
  "cream": ["moisturizer", "cold cream", "body lotion", "fairness cream"],
  "lipstic": ["lipstick", "lip balm", "lip gloss"],
  "mehendi": ["henna", "mehndi", "hair color"],
  "atta": ["flour", "wheat flour", "chakki atta"],
  "chawal": ["rice", "basmati"],
  "dal": ["pulses", "toor dal", "moong dal", "chana dal"],
};

export const storeSearchEngine = {
  searchProducts(query: string, products: Product[]): Product[] {
    const cleanQ = query.trim().toLowerCase();
    if (!cleanQ) return products;

    // 1. Check if query matches known synonyms
    const expandedKeywords: string[] = [cleanQ];
    for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
      if (cleanQ.includes(key) || key.includes(cleanQ)) {
        expandedKeywords.push(...synonyms);
      }
    }

    // 2. Score and filter products
    const scored = products
      .map((product) => {
        let score = 0;
        const name = (product.name || "").toLowerCase();
        const brand = (product.brand || "").toLowerCase();
        const category = (product.category?.name || "").toLowerCase();
        const barcode = (product.barcode || "").toLowerCase();
        const description = (product.description || "").toLowerCase();

        // Exact Matches
        if (barcode === cleanQ) score += 100;
        if (name === cleanQ) score += 80;
        if (name.startsWith(cleanQ)) score += 50;
        if (name.includes(cleanQ)) score += 35;
        if (brand.includes(cleanQ)) score += 30;
        if (category.includes(cleanQ)) score += 25;
        if (description.includes(cleanQ)) score += 10;

        // Expanded Synonym Matches
        for (const syn of expandedKeywords) {
          if (name.includes(syn)) score += 20;
          if (brand.includes(syn)) score += 15;
          if (category.includes(syn)) score += 15;
        }

        // Word-level partial matching
        const words = cleanQ.split(" ").filter((w) => w.length > 1);
        words.forEach((w) => {
          if (name.includes(w)) score += 10;
          if (brand.includes(w)) score += 8;
        });

        return { product, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.product);

    return scored;
  },
};
