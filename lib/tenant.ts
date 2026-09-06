export const DEFAULT_FALLBACK_SHOP_ID = "a0000000-0000-0000-0000-000000000001";
export const DEFAULT_FALLBACK_SHOP_SLUG = "ags-store";

/**
 * Catalog, POS, and inventory rows use `shop_id`.
 * In Falcon SaaS, every merchant has their own unique `shop_id`.
 */
export function getPublicShopId(): string {
  if (typeof window !== "undefined") {
    // 1. Check URL query param ?shop=
    try {
      const params = new URLSearchParams(window.location.search);
      const shopParam = params.get("shop");
      if (shopParam && shopParam.trim() !== "") {
        return shopParam.trim();
      }
    } catch {}

    // 2. Check local storage active store
    const stored = localStorage.getItem("falcon_active_store_id");
    if (stored && stored.trim() !== "") return stored.trim();

    // 3. Check cookies
    try {
      const cookies = document.cookie.split(";");
      for (const c of cookies) {
        const [key, val] = c.trim().split("=");
        if ((key === "falcon_active_store_id" || key === "falcon_store_shop_id") && val) {
          return decodeURIComponent(val).trim();
        }
      }
    } catch {}
  }
  return process.env.NEXT_PUBLIC_SHOP_ID || DEFAULT_FALLBACK_SHOP_ID;
}

export function tryGetPublicShopId(): string | null {
  return getPublicShopId();
}

export function resolveActiveShopId(shopId?: string | null): string {
  if (shopId && shopId.trim() !== "") return shopId.trim();
  return getPublicShopId();
}
