/**
 * Falcon Master Indian Retail & FMCG Product Catalog Database
 * Provides instant 0.01s offline matching by barcode or product title without external AI APIs.
 */

export interface MasterCatalogProduct {
  barcode?: string;
  name: string;
  brand: string;
  category: string;
  mrp: number;
  purchasePrice: number;
  wholesalePrice: number;
  unit: string;
  description?: string;
  keywords?: string[];
}

export const INDIAN_RETAIL_CATALOG: MasterCatalogProduct[] = [
  // --- OILS & GHEE ---
  {
    barcode: "8901088001004",
    name: "Parachute 100% Pure Coconut Oil 100ml",
    brand: "Parachute",
    category: "Hair Care",
    mrp: 46,
    purchasePrice: 35,
    wholesalePrice: 40,
    unit: "bottle",
    description: "Pure coconut oil made from naturally sun-dried coconuts.",
    keywords: ["coconut", "oil", "parachute", "marico", "hair oil"],
  },
  {
    barcode: "8901088001028",
    name: "Parachute 100% Pure Coconut Oil 200ml",
    brand: "Parachute",
    category: "Hair Care",
    mrp: 90,
    purchasePrice: 68,
    wholesalePrice: 78,
    unit: "bottle",
    description: "Parachute 200ml pure coconut oil bottle.",
    keywords: ["parachute", "200ml", "coconut oil"],
  },
  {
    barcode: "8901088001059",
    name: "Parachute 100% Pure Coconut Oil 500ml",
    brand: "Parachute",
    category: "Hair Care",
    mrp: 215,
    purchasePrice: 165,
    wholesalePrice: 185,
    unit: "bottle",
    description: "Parachute 500ml pure coconut oil bottle.",
    keywords: ["parachute", "500ml", "coconut oil"],
  },
  {
    barcode: "8906007280014",
    name: "Fortune Sunlite Refined Sunflower Oil 1L Pouch",
    brand: "Fortune",
    category: "Edible Oils",
    mrp: 145,
    purchasePrice: 118,
    wholesalePrice: 130,
    unit: "pouch",
    description: "Light and healthy refined sunflower cooking oil.",
    keywords: ["fortune", "sunflower", "oil", "refined", "cooking oil", "1l"],
  },
  {
    barcode: "8906007280021",
    name: "Fortune Premium Kachi Ghani Mustard Oil 1L",
    brand: "Fortune",
    category: "Edible Oils",
    mrp: 160,
    purchasePrice: 130,
    wholesalePrice: 145,
    unit: "pouch",
    description: "Traditional cold-pressed pungent mustard oil for cooking.",
    keywords: ["fortune", "mustard", "sarson", "kachi ghani", "tel"],
  },
  {
    barcode: "8901262010015",
    name: "Amul Pure Ghee 1L Pouch",
    brand: "Amul",
    category: "Dairy & Ghee",
    mrp: 620,
    purchasePrice: 540,
    wholesalePrice: 575,
    unit: "pouch",
    description: "Aromatic pure cow & buffalo milk clarified butter ghee.",
    keywords: ["amul", "ghee", "pure ghee", "1l", "dairy"],
  },

  // --- NOODLES, PASTA & INSTANT FOODS ---
  {
    barcode: "8901058852339",
    name: "Maggi 2-Minute Masala Instant Noodles 70g",
    brand: "Maggi",
    category: "Packaged Food",
    mrp: 14,
    purchasePrice: 11,
    wholesalePrice: 12.5,
    unit: "packet",
    description: "India's favorite delicious instant masala noodles.",
    keywords: ["maggi", "noodles", "masala", "nestle", "2 minute"],
  },
  {
    barcode: "8901058852346",
    name: "Maggi 2-Minute Masala Noodles 4-Pack (280g)",
    brand: "Maggi",
    category: "Packaged Food",
    mrp: 56,
    purchasePrice: 44,
    wholesalePrice: 49,
    unit: "pack",
    description: "Maggi family 4 in 1 multipack noodles.",
    keywords: ["maggi 4 pack", "multipack", "maggi family"],
  },
  {
    barcode: "8901725181220",
    name: "Yippee Magic Masala Noodles 65g",
    brand: "Sunfeast Yippee",
    category: "Packaged Food",
    mrp: 14,
    purchasePrice: 11,
    wholesalePrice: 12.5,
    unit: "packet",
    description: "Non-sticky round block masala instant noodles.",
    keywords: ["yippee", "noodles", "sunfeast", "magic masala"],
  },

  // --- SOAPS, SHAMPOOS & BATH ---
  {
    barcode: "8901030383401",
    name: "Dettol Original Germ Protection Bathing Soap 75g",
    brand: "Dettol",
    category: "Personal Care",
    mrp: 40,
    purchasePrice: 31,
    wholesalePrice: 35,
    unit: "piece",
    description: "Antibacterial germ protection bathing bar.",
    keywords: ["dettol", "soap", "bathing soap", "germ protection"],
  },
  {
    barcode: "8901030015500",
    name: "Lifebuoy Total 10 Germ Protection Soap 100g",
    brand: "Lifebuoy",
    category: "Personal Care",
    mrp: 35,
    purchasePrice: 27,
    wholesalePrice: 30,
    unit: "piece",
    description: "Strong germ protection red soap bar.",
    keywords: ["lifebuoy", "soap", "total 10"],
  },
  {
    barcode: "8901030366602",
    name: "Dove Cream Beauty Bathing Bar 75g",
    brand: "Dove",
    category: "Personal Care",
    mrp: 65,
    purchasePrice: 50,
    wholesalePrice: 56,
    unit: "piece",
    description: "1/4 moisturizing cream beauty bathing soap bar.",
    keywords: ["dove", "soap", "cream", "moisturizing"],
  },
  {
    barcode: "8901030048102",
    name: "Clinic Plus Strong & Long Shampoo 175ml",
    brand: "Clinic Plus",
    category: "Hair Care",
    mrp: 120,
    purchasePrice: 92,
    wholesalePrice: 104,
    unit: "bottle",
    description: "Nourishing milk protein shampoo for strong hair.",
    keywords: ["clinic plus", "shampoo", "strong and long", "175ml"],
  },
  {
    barcode: "8901030048003",
    name: "Clinic Plus Shampoo Sachet (6ml)",
    brand: "Clinic Plus",
    category: "Hair Care",
    mrp: 1,
    purchasePrice: 0.75,
    wholesalePrice: 0.85,
    unit: "sachet",
    description: "Clinic plus 1 rupee single use shampoo sachet.",
    keywords: ["clinic plus sachet", "pouch", "1 rs shampoo"],
  },
  {
    barcode: "4902430733854",
    name: "Head & Shoulders Anti-Dandruff Smooth & Silky Shampoo 180ml",
    brand: "Head & Shoulders",
    category: "Hair Care",
    mrp: 185,
    purchasePrice: 142,
    wholesalePrice: 160,
    unit: "bottle",
    description: "Clinically proven anti-dandruff smoothing shampoo.",
    keywords: ["head and shoulders", "dandruff", "shampoo", "180ml"],
  },

  // --- ORAL CARE & TOOTHPASTE ---
  {
    barcode: "8901314010529",
    name: "Colgate Strong Teeth Dental Cream 100g",
    brand: "Colgate",
    category: "Oral Care",
    mrp: 62,
    purchasePrice: 48,
    wholesalePrice: 54,
    unit: "tube",
    description: "Calcium and fluoride cavity protection toothpaste.",
    keywords: ["colgate", "toothpaste", "strong teeth", "100g"],
  },
  {
    barcode: "8901314010536",
    name: "Colgate Strong Teeth Dental Cream 200g",
    brand: "Colgate",
    category: "Oral Care",
    mrp: 120,
    purchasePrice: 92,
    wholesalePrice: 105,
    unit: "tube",
    description: "Colgate 200g family pack toothpaste.",
    keywords: ["colgate 200g", "colgate family", "toothpaste"],
  },
  {
    barcode: "8901314010581",
    name: "Colgate MaxFresh Peppermint Ice Gel 150g",
    brand: "Colgate",
    category: "Oral Care",
    mrp: 130,
    purchasePrice: 100,
    wholesalePrice: 112,
    unit: "tube",
    description: "Cooling crystals freshness blue gel toothpaste.",
    keywords: ["colgate maxfresh", "maxfresh", "blue gel", "toothpaste"],
  },
  {
    barcode: "8904000900018",
    name: "Vicco Turmeric Ayurvedic Skin Cream 50g",
    brand: "Vicco",
    category: "Skin Care",
    mrp: 95,
    purchasePrice: 74,
    wholesalePrice: 82,
    unit: "tube",
    description: "Pure turmeric and sandalwood oil ayurvedic antiseptic cream.",
    keywords: ["vicco", "turmeric", "skin cream", "ayurvedic", "vicco turmeric"],
  },

  // --- GROCERIES, FLOUR & SPICES ---
  {
    barcode: "8901030012011",
    name: "Tata Salt Vacuum Evaporated Iodized Salt 1kg",
    brand: "Tata",
    category: "Groceries",
    mrp: 28,
    purchasePrice: 22,
    wholesalePrice: 24.5,
    unit: "packet",
    description: "Desh Ka Namak purest vacuum evaporated iodized salt.",
    keywords: ["tata salt", "namak", "salt", "iodized", "1kg"],
  },
  {
    barcode: "8901725182104",
    name: "Aashirvaad Shuddh Chakki Whole Wheat Atta 5kg",
    brand: "Aashirvaad",
    category: "Staples & Flour",
    mrp: 245,
    purchasePrice: 198,
    wholesalePrice: 218,
    unit: "bag",
    description: "100% whole wheat chakki ground fresh flour.",
    keywords: ["aashirvaad", "atta", "wheat", "flour", "5kg"],
  },
  {
    barcode: "8901725182111",
    name: "Aashirvaad Shuddh Chakki Whole Wheat Atta 10kg",
    brand: "Aashirvaad",
    category: "Staples & Flour",
    mrp: 475,
    purchasePrice: 385,
    wholesalePrice: 425,
    unit: "bag",
    description: "10kg whole wheat atta family bag.",
    keywords: ["aashirvaad 10kg", "atta 10kg", "wheat"],
  },
  {
    barcode: "8901512001017",
    name: "MDH Deggi Mirch Red Chilli Powder 100g",
    brand: "MDH",
    category: "Spices & Masala",
    mrp: 95,
    purchasePrice: 75,
    wholesalePrice: 83,
    unit: "box",
    description: "Rich natural red color mild spicy Deggi Mirch powder.",
    keywords: ["mdh", "deggi mirch", "chilli", "mirch powder", "masala"],
  },
  {
    barcode: "8901512001055",
    name: "MDH Garam Masala 100g",
    brand: "MDH",
    category: "Spices & Masala",
    mrp: 110,
    purchasePrice: 86,
    wholesalePrice: 96,
    unit: "box",
    description: "Aromatic blend of roasted Indian spices.",
    keywords: ["mdh", "garam masala", "spices"],
  },
  {
    barcode: "8901712001016",
    name: "Everest Turmeric / Haldi Powder 100g",
    brand: "Everest",
    category: "Spices & Masala",
    mrp: 40,
    purchasePrice: 31,
    wholesalePrice: 35,
    unit: "box",
    description: "Pure aromatic turmeric haldi powder.",
    keywords: ["everest", "haldi", "turmeric powder", "masala"],
  },

  // --- BISCUITS, SNACKS & BEVERAGES ---
  {
    barcode: "8901719101016",
    name: "Parle-G Original Gluco Biscuits 250g",
    brand: "Parle",
    category: "Snacks & Biscuits",
    mrp: 25,
    purchasePrice: 19.5,
    wholesalePrice: 22,
    unit: "pack",
    description: "India's highest selling glucose tea biscuits.",
    keywords: ["parle g", "parleg", "biscuit", "glucose"],
  },
  {
    barcode: "8901063012211",
    name: "Britannia Good Day Butter Cookies 200g",
    brand: "Britannia",
    category: "Snacks & Biscuits",
    mrp: 45,
    purchasePrice: 35,
    wholesalePrice: 39,
    unit: "pack",
    description: "Rich crunchy butter cookies with smiles.",
    keywords: ["good day", "britannia", "butter cookies", "biscuit"],
  },
  {
    barcode: "8901491101824",
    name: "Lays India's Magic Masala Potato Chips 50g",
    brand: "Lays",
    category: "Snacks & Biscuits",
    mrp: 20,
    purchasePrice: 15.5,
    wholesalePrice: 17.5,
    unit: "packet",
    description: "Crispy ridged potato chips with spicy Indian magic masala.",
    keywords: ["lays", "chips", "magic masala", "blue lays"],
  },
  {
    barcode: "8901491101831",
    name: "Kurkure Masala Munch Crispy Snacks 85g",
    brand: "Kurkure",
    category: "Snacks & Biscuits",
    mrp: 20,
    purchasePrice: 15.5,
    wholesalePrice: 17.5,
    unit: "packet",
    description: "Crunchy spicy puffed corn and rice curls.",
    keywords: ["kurkure", "masala munch", "snacks", "tedha hai par mera hai"],
  },
  {
    barcode: "8901030018501",
    name: "Tata Tea Premium Desh Ki Chai 250g",
    brand: "Tata Tea",
    category: "Beverages",
    mrp: 140,
    purchasePrice: 110,
    wholesalePrice: 122,
    unit: "packet",
    description: "Unique blend of fine leaf and strong dust tea.",
    keywords: ["tata tea", "chai", "tea", "premium", "desh ki chai"],
  },
  {
    barcode: "8901058851011",
    name: "Nescafe Classic 100% Pure Instant Coffee Jar 50g",
    brand: "Nescafe",
    category: "Beverages",
    mrp: 195,
    purchasePrice: 152,
    wholesalePrice: 170,
    unit: "jar",
    description: "Rich aroma pure roasted coffee granules.",
    keywords: ["nescafe", "coffee", "classic", "instant coffee", "50g"],
  },

  // --- DETERGENTS & HOUSEHOLD CLEANING ---
  {
    barcode: "8901030005013",
    name: "Surf Excel Easy Wash Detergent Powder 1kg",
    brand: "Surf Excel",
    category: "Household & Cleaning",
    mrp: 145,
    purchasePrice: 114,
    wholesalePrice: 128,
    unit: "packet",
    description: "Fast stain removing laundry detergent powder.",
    keywords: ["surf excel", "detergent", "easy wash", "powder", "1kg", "washing"],
  },
  {
    barcode: "8901030005020",
    name: "Surf Excel Quick Wash Detergent Powder 500g",
    brand: "Surf Excel",
    category: "Household & Cleaning",
    mrp: 80,
    purchasePrice: 62,
    wholesalePrice: 70,
    unit: "packet",
    description: "500g quick stain dissolving detergent powder.",
    keywords: ["surf excel 500g", "detergent", "washing powder"],
  },
  {
    barcode: "8901030007017",
    name: "Vim Dishwash Liquid Gel Lemon 250ml Bottle",
    brand: "Vim",
    category: "Household & Cleaning",
    mrp: 65,
    purchasePrice: 50,
    wholesalePrice: 56,
    unit: "bottle",
    description: "Degreasing lemon power dishwashing gel.",
    keywords: ["vim", "dishwash", "liquid gel", "lemon", "vim bar"],
  },
  {
    barcode: "8901030007055",
    name: "Vim Dishwash Bar 300g (Tub/Bar)",
    brand: "Vim",
    category: "Household & Cleaning",
    mrp: 30,
    purchasePrice: 23,
    wholesalePrice: 26,
    unit: "piece",
    description: "Vim green lemon dishwashing bar.",
    keywords: ["vim bar", "dishwash bar", "bartan soap"],
  },
  {
    barcode: "8901396001018",
    name: "Harpic Power Plus Toilet Cleaner Original 500ml",
    brand: "Harpic",
    category: "Household & Cleaning",
    mrp: 99,
    purchasePrice: 78,
    wholesalePrice: 87,
    unit: "bottle",
    description: "10x max power disinfectant toilet cleaning liquid.",
    keywords: ["harpic", "toilet cleaner", "bathroom", "500ml"],
  },
  {
    barcode: "8901396002015",
    name: "Lizol Disinfectant Surface & Floor Cleaner Citrus 500ml",
    brand: "Lizol",
    category: "Household & Cleaning",
    mrp: 110,
    purchasePrice: 86,
    wholesalePrice: 96,
    unit: "bottle",
    description: "99.9% germ kill floor disinfectant fragrance cleaner.",
    keywords: ["lizol", "floor cleaner", "disinfectant", "citrus"],
  },
];

/**
 * Multi-Result Search for Master Indian Retail Catalog
 */
export function searchIndianRetailCatalog(
  query: string,
  limit: number = 8
): MasterCatalogProduct[] {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  const digitsOnly = q.replace(/[^0-9]/g, "");

  const results: MasterCatalogProduct[] = [];

  for (const item of INDIAN_RETAIL_CATALOG) {
    if (digitsOnly.length >= 4 && item.barcode && item.barcode.includes(digitsOnly)) {
      results.push(item);
      continue;
    }
    if (item.name.toLowerCase().includes(q)) {
      results.push(item);
      continue;
    }
    if (item.brand.toLowerCase().includes(q)) {
      results.push(item);
      continue;
    }
    if (item.keywords && item.keywords.some((k) => k.includes(q) || q.includes(k))) {
      results.push(item);
      continue;
    }
    if (results.length >= limit) break;
  }

  return results.slice(0, limit);
}

/**
 * Instant 0.01s Offline Matcher
 */
export function findInIndianRetailCatalog(queryOrBarcode: string): MasterCatalogProduct | null {
  const matches = searchIndianRetailCatalog(queryOrBarcode, 1);
  return matches.length > 0 ? matches[0] : null;
}
