export const DEFAULT_FALLBACK_SHOP_ID = "a0000000-0000-0000-0000-000000000001";
export const DEFAULT_FALLBACK_SHOP_SLUG = "ags-store";

/**
 * Catalog, POS, and inventory rows use `shop_id`.
 * In Falcon SaaS, every merchant has their own unique `shop_id`.
 */
export function getPublicShopId(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("falcon_active_store_id");
    if (stored && stored.trim() !== "") return stored;
  }
  return process.env.NEXT_PUBLIC_SHOP_ID || DEFAULT_FALLBACK_SHOP_ID;
}

export function tryGetPublicShopId(): string | null {
  return getPublicShopId();
}

export function resolveActiveShopId(shopId?: string | null): string {
  if (shopId && shopId.trim() !== "") return shopId;
  return getPublicShopId();
}
