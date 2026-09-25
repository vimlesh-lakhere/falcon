import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";
import { DEFAULT_FALLBACK_SHOP_ID, ROOT_DOMAIN, getTenantSubdomain } from "@/lib/tenant";

const PUBLIC_PATHS = [
  "/",
  "/store",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth",
  "/trial-expired",
  "/pay",
  "/store-not-found",
  "/sitemap.xml",
];

const ERP_ROLES = new Set([
  "Owner",
  "Admin",
  "Manager",
  "Cashier",
  "Inventory Staff",
  "Accountant",
  "Sales Staff",
]);

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) =>
    path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`)
  );
}

// ---------------------------------------------------------------------------
// ERP access-gate cache
// The ERP role check (profiles) and the trial/subscription check (shops) run on
// every navigation, which is 2 Supabase reads per page on top of auth.getUser().
// We cache a PASS in a short-lived, HMAC-signed httpOnly cookie so warm
// navigations skip both reads. The signature makes the cookie unforgeable, so a
// user cannot fabricate it to bypass the paywall. If FALCON_SESSION_SECRET is not
// set we simply never cache (full checks every time) — fail open, never insecure.
const GATE_COOKIE = "falcon_erp_gate";
const GATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function signGateValue(secret: string, userId: string, exp: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${userId}.${exp}`));
  return `${exp}.${toHex(sig)}`;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hasValidGate(secret: string, userId: string, cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  const exp = Number(cookieValue.split(".")[0]);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = await signGateValue(secret, userId, exp);
  return constantTimeEqual(expected, cookieValue);
}

// <slug>.falcon360.in -> the shop that owns that slug. Cached briefly per server instance.
const tenantCache = new Map<string, { shopId: string | null; exp: number }>();
const TENANT_TTL_MS = 60_000;

async function resolveTenantShopId(sub: string): Promise<string | null> {
  // The AGS store is the platform owner's own shop.
  if (sub === "ags") return process.env.DEFAULT_SHOP_ID || DEFAULT_FALLBACK_SHOP_ID;

  const hit = tenantCache.get(sub);
  if (hit && hit.exp > Date.now()) return hit.shopId;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    // `sub` is validated against a strict [a-z0-9-] pattern by getTenantSubdomain().
    const res = await fetch(
      `${url}/rest/v1/shops?select=id&slug=eq.${encodeURIComponent(sub)}&is_active=eq.true&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) return null; // do not cache failures (e.g. slug column not created yet)
    const rows = (await res.json()) as { id: string }[];
    const shopId = rows[0]?.id ?? null;
    tenantCache.set(sub, { shopId, exp: Date.now() + TENANT_TTL_MS });
    return shopId;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";

  // 1. Enforce canonical domain (Never expose vercel.app URL to user)
  // (Vercel preview builds are exempt so branch previews can be reviewed before going live.)
  if (host.includes(".vercel.app") && process.env.VERCEL_ENV !== "preview") {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.host = "www.falcon360.in";
    canonicalUrl.protocol = "https";
    canonicalUrl.port = "";
    return NextResponse.redirect(canonicalUrl, 308);
  }

  // 2. Old shared AGS link (www.../store?shop=<AGS id>) now lives on ags.falcon360.in.
  const tenantSub = getTenantSubdomain(host);
  const bareHost = host.toLowerCase().split(":")[0];
  if (
    !tenantSub &&
    (bareHost === ROOT_DOMAIN || bareHost === `www.${ROOT_DOMAIN}`) &&
    pathname.startsWith("/store") &&
    request.nextUrl.searchParams.get("shop") === DEFAULT_FALLBACK_SHOP_ID
  ) {
    const agsUrl = request.nextUrl.clone();
    agsUrl.host = `ags.${ROOT_DOMAIN}`;
    agsUrl.protocol = "https";
    agsUrl.port = "";
    agsUrl.searchParams.delete("shop");
    return NextResponse.redirect(agsUrl, 307);
  }

  // 3. Every shop gets its own store address: <slug>.falcon360.in (e.g. ags.falcon360.in).
  //    The sub-domain's home page IS that shop's storefront; www.falcon360.in keeps the marketing page.
  let tenantShopId: string | null = null;
  if (tenantSub) {
    tenantShopId = await resolveTenantShopId(tenantSub);
    if (!tenantShopId && !pathname.startsWith("/api/") && pathname !== "/store-not-found") {
      const missingUrl = request.nextUrl.clone();
      missingUrl.pathname = "/store-not-found";
      return NextResponse.rewrite(missingUrl, { status: 404 });
    }
  }
  const tenantHeaders = tenantShopId ? new Headers(request.headers) : null;
  if (tenantHeaders && tenantShopId) tenantHeaders.set("x-store-shop-id", tenantShopId);
  const tenantInit = tenantHeaders ? { request: { headers: tenantHeaders } } : undefined;
  const setTenantCookie = (res: NextResponse) => {
    if (tenantShopId) {
      res.cookies.set("falcon_store_shop_id", tenantShopId, { path: "/", maxAge: 2592000, sameSite: "lax" });
    }
    return res;
  };

  if (tenantShopId && pathname === "/") {
    const storeUrl = request.nextUrl.clone();
    storeUrl.pathname = "/store";
    return setTenantCookie(NextResponse.rewrite(storeUrl, tenantInit));
  }

  // Customer OTP, Storefront Checkout, Public Leads & Cron Maintenance are public endpoints.
  const PUBLIC_API_PATHS = [
    "/api/auth/otp",
    "/api/store/checkout",
    "/api/store/orders",
    "/api/leads",
    "/api/cron/trials-maintenance",
    "/api/billing/razorpay/order",
    "/api/billing/razorpay/verify",
    "/api/transliterate",
    "/api/ai/save-key",
    ...(process.env.NODE_ENV === "development" ? ["/api/ai/remove-background", "/api/ai/analyze-product"] : []),
  ];
  if (PUBLIC_API_PATHS.includes(pathname) || isPublicPath(pathname)) {
    const response = setTenantCookie(NextResponse.next(tenantInit));
    const shopParam = request.nextUrl.searchParams.get("shop");
    if (!tenantShopId && shopParam && shopParam.trim() !== "") {
      response.cookies.set("falcon_store_shop_id", shopParam.trim(), {
        path: "/",
        maxAge: 2592000,
        sameSite: "lax",
      });
    }
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Server authentication is not configured." }, { status: 500 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  // Individual route handlers enforce their narrower operation-specific roles.
  if (pathname.startsWith("/api/")) return response;

  // Warm-path fast lane: a recently issued, signed PASS lets us skip the two
  // Supabase reads below entirely. Revoking access (deactivating a staff member
  // or expiring a trial) takes effect within GATE_TTL_MS at worst.
  const gateSecret = process.env.FALCON_SESSION_SECRET;
  if (gateSecret && (await hasValidGate(gateSecret, user.id, request.cookies.get(GATE_COOKIE)?.value))) {
    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, store_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_active || !profile.store_id || !ERP_ROLES.has(profile.role)) {
    const storeUrl = request.nextUrl.clone();
    storeUrl.pathname = "/store";
    return NextResponse.redirect(storeUrl);
  }

  // Check 14-Day Free Trial & Paid Subscription expiration (Exempt Master Owners)
  const isMasterOwner =
    user.email === "vimlesh.lakhere@gmail.com" ||
    user.email === "vlakhere@gmail.com" ||
    user.email === "owner_1786762700828@agsstore.com";

  if (!isMasterOwner && profile.store_id) {
    const { data: shop } = await supabase
      .from("shops")
      .select("plan, trial_ends_at, subscription_ends_at, is_active, status")
      .eq("id", profile.store_id)
      .maybeSingle();

    if (shop) {
      const isTrial = shop.plan === "trial";
      const isPastTrial = isTrial && shop.trial_ends_at && new Date() > new Date(shop.trial_ends_at);
      const isPastSubscription = !isTrial && shop.subscription_ends_at && new Date() > new Date(shop.subscription_ends_at);
      const isDeactivated =
        !shop.is_active ||
        shop.status === "trial_expired" ||
        shop.status === "subscription_expired";

      if (isPastTrial || isPastSubscription || isDeactivated) {
        const expiredUrl = request.nextUrl.clone();
        expiredUrl.pathname = "/trial-expired";
        return NextResponse.redirect(expiredUrl);
      }
    }
  }

  // Passed every check — issue a short-lived signed PASS so the next few
  // navigations skip the two reads above.
  if (gateSecret) {
    const value = await signGateValue(gateSecret, user.id, Date.now() + GATE_TTL_MS);
    response.cookies.set(GATE_COOKIE, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: GATE_TTL_MS / 1000,
    });
  }

  return response;
}

export const config = {
  matcher: [
    // Exclude Next internals, PWA files (sw.js, manifest) and static assets so the service worker
    // and manifest are served directly — otherwise the auth redirect breaks PWA/offline registration.
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|json|webmanifest|txt|woff|woff2|ico)$).*)",
  ],
};
