import { Product } from "@/types/database";

/**
 * Column list for PUBLIC storefront product queries.
 *
 * Deliberately excludes cost/margin and internal fields (purchase_price,
 * minimum_selling_price, minimum_stock, supplier_id) so they are never sent to a customer's
 * browser, and trims egress on every catalog load. Use this instead of select("*") anywhere the
 * public store reads products.
 */
export const STORE_PRODUCT_SELECT =
  "id, shop_id, category_id, name, name_hindi, sku, barcode, brand, unit_id, selling_price, wholesale_price, wholesale_min_qty, mrp, online_price, is_online, current_stock, image_url, back_image_url, description, is_active, created_at, category:categories(*)";

export interface ProductOnlineConfig {
  isOnline: boolean;
  onlinePrice?: number | null;
  is_online: boolean;
  online_price: number | null;
}

/**
 * Strips <!--online:...--> metadata tags from product description
 */
export function stripOnlineConfigFromDescription(description: string | null | undefined): string {
  if (!description) return "";
  return description.replace(/<!--online:[\s\S]*?-->/g, "").trim();
}

/**
 * Parses online visibility and pricing from product object.
 * Checks direct columns first (is_online, online_price), then fallback description metadata.
 * Defaults to isOnline: true if not specified anywhere (all products default to online).
 */
export function getProductOnlineConfig(product: Product | any): ProductOnlineConfig {
  if (!product) return { isOnline: true, onlinePrice: null, is_online: true, online_price: null };

  let isOnline: boolean | undefined = product.is_online;
  let onlinePrice: number | null | undefined = product.online_price;

  // If column is missing or null, parse embedded metadata from description
  if (product.description && typeof product.description === "string") {
    const match = product.description.match(/<!--online:([\s\S]*?)-->/);
    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1]);
        if (typeof parsed.is_online === "boolean" && isOnline === undefined) {
          isOnline = parsed.is_online;
        }
        if (typeof parsed.online_price === "number" && (onlinePrice === undefined || onlinePrice === null)) {
          onlinePrice = parsed.online_price;
        }
      } catch {}
    }
  }

  const effectiveIsOnline = isOnline !== false;
  const effectiveOnlinePrice = onlinePrice && Number(onlinePrice) > 0 ? Number(onlinePrice) : null;

  return {
    isOnline: effectiveIsOnline, // Defaults to true unless explicitly toggled false
    onlinePrice: effectiveOnlinePrice,
    is_online: effectiveIsOnline,
    online_price: effectiveOnlinePrice,
  };
}

/**
 * Returns whether a product is visible on the public online store
 */
export function isProductOnline(product: Product | any): boolean {
  if (!product) return false;
  if (product.is_active === false) return false;
  return getProductOnlineConfig(product).isOnline;
}

/**
 * Returns the effective online selling price for a product
 */
export function getProductEffectiveOnlinePrice(product: Product | any): number {
  if (!product) return 0;
  const cfg = getProductOnlineConfig(product);
  if (cfg.onlinePrice && cfg.onlinePrice > 0) {
    return cfg.onlinePrice;
  }
  return Number(product.selling_price) || 0;
}

/**
 * Embeds online visibility metadata into description string
 */
export function attachOnlineConfigToDescription(
  cleanDescription: string,
  isOnline: boolean,
  onlinePrice?: number | null
): string {
  const stripped = stripOnlineConfigFromDescription(cleanDescription);
  const payload = {
    is_online: isOnline,
    online_price: onlinePrice && onlinePrice > 0 ? onlinePrice : null,
  };
  return `${stripped.trim()}\n\n<!--online:${JSON.stringify(payload)}-->`.trim();
}
