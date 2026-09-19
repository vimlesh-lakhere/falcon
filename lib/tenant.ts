export const DEFAULT_FALLBACK_SHOP_ID = "a0000000-0000-0000-0000-000000000001";
export const DEFAULT_FALLBACK_SHOP_SLUG = "ags-store";

export function isUuid(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

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
        const clean = shopParam.trim();
        if (isUuid(clean)) return clean;
        // If it's a known fallback slug or non-uuid, map to default shop
        if (clean === "ags-store" || clean === "ags") return DEFAULT_FALLBACK_SHOP_ID;
      }
    } catch {}

    // 2. Check local storage active store
    try {
      const stored = localStorage.getItem("falcon_active_store_id");
      if (stored && stored.trim() !== "" && isUuid(stored)) return stored.trim();
    } catch {}

    // 3. Check cookies
    try {
      const cookies = document.cookie.split(";");
      for (const c of cookies) {
        const [key, val] = c.trim().split("=");
        if ((key === "falcon_active_store_id" || key === "falcon_store_shop_id") && val) {
          const decoded = decodeURIComponent(val).trim();
          if (isUuid(decoded)) return decoded;
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
  if (shopId && shopId.trim() !== "") {
    const clean = shopId.trim();
    if (isUuid(clean)) return clean;
    if (clean === "ags-store" || clean === "ags") return DEFAULT_FALLBACK_SHOP_ID;
  }
  return getPublicShopId();
}

/**
 * Generates an internal store URL preserving the active shop query param if custom.
 */
export function getStoreHref(path: string, shopId?: string | null): string {
  const activeShop = resolveActiveShopId(shopId);
  if (!activeShop || activeShop === DEFAULT_FALLBACK_SHOP_ID) {
    return path;
  }
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}shop=${encodeURIComponent(activeShop)}`;
}

