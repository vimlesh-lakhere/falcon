import { Product } from "@/types/database";

export interface CleanVariant {
  id: string;
  size: string; // e.g. "10ml", "50ml", "100ml", "200ml", "500ml", "1L" or "10g", "50g", "100g", "250g", "500g", "1kg"
  price: number; // Selling Price (₹)
  mrp: number; // MRP (₹)
  purchasePrice?: number; // Cost Price (₹)
  wholesalePrice?: number;
  stock?: number;
  sku?: string;
  barcode?: string;
}

// Preset Indian retail variant maps for liquid volumes and weights
export const LIQUID_SIZE_PRESETS = ["10ml", "50ml", "100ml", "200ml", "500ml", "1L"];
export const WEIGHT_SIZE_PRESETS = ["10g", "50g", "100g", "250g", "500g", "1kg"];

/**
 * Generate standard pack sizes with realistic MRP and selling prices
 */
export function generateStandardVariants(
  productName: string,
  basePrice: number = 46,
  type: "liquid" | "weight" = "liquid"
): CleanVariant[] {
  const sizes = type === "liquid" ? LIQUID_SIZE_PRESETS : WEIGHT_SIZE_PRESETS;
  const nameLower = productName.toLowerCase();

  // Multiplier rates relative to 100ml / 100g
  const multipliers: { [key: string]: number } = {
    "10ml": 0.2,
    "50ml": 0.55,
    "60ml": 0.65,
    "100ml": 1.0,
    "175ml": 1.75,
    "200ml": 1.95,
    "250ml": 2.4,
    "500ml": 4.6,
    "600ml": 5.4,
    "1L": 8.8,
    "10g": 0.22,
    "30g": 0.5,
    "50g": 0.6,
    "75g": 0.85,
    "100g": 1.0,
    "150g": 1.45,
    "200g": 1.9,
    "250g": 2.35,
    "500g": 4.5,
    "1kg": 8.5,
  };

  const cleanBase = basePrice > 0 ? basePrice : 50;

  return sizes.map((size, idx) => {
    const mult = multipliers[size] || (idx + 1) * 0.8;
    const mrp = Math.round((cleanBase * mult) / 5) * 5;
    const price = Math.round(mrp * 0.95);
    const purchasePrice = Math.round(mrp * 0.72);

    return {
      id: `var-${size.toLowerCase().replace(/\s+/g, "")}-${idx}`,
      size,
      mrp,
      price,
      purchasePrice,
      stock: 15 + idx * 5,
      sku: `SKU-${size.toUpperCase()}`,
    };
  });
}

/**
 * Extract structured variants from a product
 */
export function extractProductVariants(product: Product): CleanVariant[] {
  if (!product) return [];

  // 1. Check description metadata tag <!--variants:[...]-->
  const desc = product.description || "";
  const match = desc.match(/<!--variants:([\s\S]*?)-->/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // If there's only 1 variant and its size is "Standard Pack", treat as standard single product
        const valid = parsed.filter(
          (v) => v && v.size && v.size !== "Standard Pack"
        );
        const listToUse = valid.length > 0 ? valid : (parsed.length > 1 ? parsed : []);

        if (listToUse.length > 0) {
          return listToUse.map((v, i) => ({
            id: v.id || `var-${i}`,
            size: v.size || `Pack ${i + 1}`,
            price: Number(v.price) || Number(product.selling_price) || 0,
            mrp: Number(v.mrp) || Number(v.price) || Number(product.selling_price) || 0,
            purchasePrice: Number(v.purchasePrice) || Math.round(Number(v.price) * 0.72),
            wholesalePrice: Number(v.wholesalePrice) || Math.round(Number(v.price) * 0.86),
            stock: Number(v.stock) ?? 10,
            sku: v.sku || product.sku,
            barcode: v.barcode || product.barcode,
          }));
        }
      }
    } catch (e) {
      console.warn("Failed to parse variants JSON:", e);
    }
  }

  // Never auto-generate synthetic fake variants from titles/keywords.
  // Single products must cleanly remain single products without fake options.
  return [];
}

/**
 * Attach structured variants array to product description string
 */
export function attachVariantsToDescription(
  cleanDescription: string,
  variants: CleanVariant[]
): string {
  const stripped = stripVariantsFromDescription(cleanDescription);
  if (!variants || variants.length <= 1) return stripped;
  return `${stripped.trim()}\n\n<!--variants:${JSON.stringify(variants)}-->`;
}

/**
 * Strip metadata tags from product description for clean user presentation
 */
export function stripVariantsFromDescription(description: string | null | undefined): string {
  if (!description) return "";
  return description
    .replace(/<!--variants:[\s\S]*?-->/g, "")
    .replace(/<!--online:[\s\S]*?-->/g, "")
    .trim();
}
