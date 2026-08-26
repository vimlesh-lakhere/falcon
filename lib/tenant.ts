export const DEFAULT_FALLBACK_SHOP_ID = "a0000000-0000-0000-0000-000000000001";

/**
 * Catalog, POS, and inventory rows use `shop_id`.
 * Auth uses `stores.id`. In Falcon these map to the same tenant UUID.
 */
export function getPublicShopId(): string {
  return process.env.NEXT_PUBLIC_SHOP_ID || DEFAULT_FALLBACK_SHOP_ID;
}

export function tryGetPublicShopId(): string | null {
  return process.env.NEXT_PUBLIC_SHOP_ID || DEFAULT_FALLBACK_SHOP_ID;
}

export function resolveActiveShopId(shopId?: string | null): string {
  return shopId || process.env.NEXT_PUBLIC_SHOP_ID || DEFAULT_FALLBACK_SHOP_ID;
}
