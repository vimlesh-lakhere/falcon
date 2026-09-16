import { createClient } from "@/lib/supabase/client";

export interface BarcodeLookupResult {
  found: boolean;
  productName?: string;
  brand?: string;
  categoryName?: string;
  netWeight?: string;
  mrp?: number;
  ingredients?: string[];
  directions?: string;
  description?: string;
  existingProduct?: any;
}

/**
 * Falcon AI Barcode Catalog Lookup Service
 * Resolves standard 890 (India), EAN-13, and UPC barcodes into product information.
 */
export const aiBarcodeLookup = {
  async lookupBarcode(
    barcode: string,
    storeId?: string
  ): Promise<BarcodeLookupResult> {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return { found: false };

    // 1. Check if product already exists in current store's inventory
    const supabase = createClient();
    try {
      let query = supabase
        .from("products")
        .select("*, category:categories(name)")
        .eq("barcode", cleanBarcode);

      if (storeId) {
        query = query.eq("shop_id", storeId);
      }

      const { data: existing, error } = await query.maybeSingle();

      if (existing && !error) {
        return {
          found: true,
          productName: existing.name,
          brand: existing.brand || "",
          categoryName: (existing as any).category?.name || (existing as any).categories?.name || "",
          mrp: Number(existing.mrp) || Number(existing.selling_price) || 50,
          description: existing.description || "",
          existingProduct: existing,
        };
      }
    } catch (err) {
      console.warn("DB Barcode lookup error:", err);
    }

    // 2. Query Global Open Facts Catalog (Open Beauty Facts & Open Food Facts)
    try {
      const openSources = [
        `https://world.openbeautyfacts.org/api/v0/product/${cleanBarcode}.json`,
        `https://world.openfoodfacts.org/api/v0/product/${cleanBarcode}.json`,
        `https://world.openproductsfacts.org/api/v0/product/${cleanBarcode}.json`,
      ];

      for (const endpoint of openSources) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2500);
          const res = await fetch(endpoint, {
            headers: { "User-Agent": "Falcon-Retail-ERP/1.0" },
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (res.ok) {
            const data = await res.json();
            if (data.status === 1 && data.product) {
              const p = data.product;
              const name = p.product_name || p.product_name_en || "";
              const brand = p.brands || "";
              const categories = p.categories || "";
              const netWeight = p.quantity || "";

              if (name) {
                return {
                  found: true,
                  productName: name,
                  brand: brand ? brand.split(",")[0].trim() : "",
                  categoryName: categories ? categories.split(",")[0].trim() : "Personal Care",
                  netWeight: netWeight || undefined,
                  mrp: 0, // Keep 0 so user enters exact store MRP
                  description: p.generic_name || name,
                };
              }
            }
          }
        } catch {
          // Continue to next catalog source
        }
      }
    } catch (openErr) {
      console.warn("Open facts catalog lookup error:", openErr);
    }

    return {
      found: false,
    };
  },
};
