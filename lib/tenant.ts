export const DEFAULT_FALLBACK_SHOP_ID = "a0000000-0000-0000-0000-000000000001";
export const DEFAULT_FALLBACK_SHOP_SLUG = "ags-store";

// Platform owners (same list middleware.ts uses for trial/subscription exemption).
export const MASTER_OWNER_EMAILS = [
  "vimlesh.lakhere@gmail.com",
  "vlakhere@gmail.com",
  "owner_1786762700828@agsstore.com",
];

/** Root domain that tenant stores live under: <slug>.falcon360.in */
export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "falcon360.in";

/** Sub-domains reserved for the platform itself; they can never be a store slug. */
export const RESERVED_SUBDOMAINS = [
  "www", "app", "api", "admin", "mail", "email", "ftp", "smtp", "ns1", "ns2",
  "cdn", "static", "assets", "status", "support", "blog", "help", "docs",
  "store", "shop", "pay", "login", "register", "dashboard", "pos",
];

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/; // 3-40 chars

export function isValidStoreSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && !RESERVED_SUBDOMAINS.includes(slug);
}

/**
 * Returns the store sub-domain for hosts like "raj-store.falcon360.in"
 * (or "raj-store.localhost:3000" for local testing), otherwise null.
 */
export function getTenantSubdomain(host: string | null | undefined): string | null {
  if (!host) return null;
  const bare = host.toLowerCase().split(":")[0];
  for (const root of [ROOT_DOMAIN, "localhost"]) {
    const suffix = `.${root}`;
    if (bare.endsWith(suffix)) {
      const sub = bare.slice(0, -suffix.length);
      return isValidStoreSlug(sub) ? sub : null;
    }
  }
  return null;
}

/** "Raj's Kirana Store" -> "rajs-kirana-store" (max 30 chars, URL safe). */
export function slugifyStoreName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
  return isValidStoreSlug(base) ? base : `store-${base || "new"}`.slice(0, 30);
}

export function randomSlugSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

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

    // 2. Storefront pages: the shop of the ADDRESS wins. middleware.ts puts it in the
    //    falcon_store_shop_id cookie (for <slug>.falcon360.in and ?shop= links). This must beat a
    //    stale ERP login / test registration left in this browser's localStorage, otherwise the
    //    store of the address (e.g. ags.falcon360.in) would show another shop's empty catalog.
    try {
      const isStorefront =
        window.location.pathname.startsWith("/store") ||
        (window.location.pathname === "/" && getTenantSubdomain(window.location.host) !== null);
      if (isStorefront) {
        const m = document.cookie.match(/(?:^|;\s*)falcon_store_shop_id=([^;]+)/);
        const fromAddress = m ? decodeURIComponent(m[1]).trim() : "";
        if (isUuid(fromAddress)) return fromAddress;
      }
    } catch {}

    // 3. Check local storage active store (ERP)
    try {
      const stored = localStorage.getItem("falcon_active_store_id");
      if (stored && stored.trim() !== "" && isUuid(stored)) return stored.trim();
    } catch {}

    // 4. Check cookies
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

