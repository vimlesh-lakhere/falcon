import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";

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

  // 2. ags.falcon360.in is the AGS store's own online store: its home page IS the storefront.
  //    (www.falcon360.in keeps the Falcon 360 marketing home page.)
  if (host.startsWith("ags.") && pathname === "/") {
    const storeUrl = request.nextUrl.clone();
    storeUrl.pathname = "/store";
    return NextResponse.rewrite(storeUrl);
  }

  // Customer OTP, Storefront Checkout, Public Leads & Cron Maintenance are public endpoints.
  const PUBLIC_API_PATHS = [
    "/api/auth/otp",
    "/api/store/checkout",
    "/api/leads",
    "/api/cron/trials-maintenance",
    "/api/billing/razorpay/order",
    "/api/billing/razorpay/verify",
    "/api/transliterate",
    "/api/ai/save-key",
    ...(process.env.NODE_ENV === "development" ? ["/api/ai/remove-background", "/api/ai/analyze-product"] : []),
  ];
  if (PUBLIC_API_PATHS.includes(pathname) || isPublicPath(pathname)) {
    const response = NextResponse.next();
    const shopParam = request.nextUrl.searchParams.get("shop");
    if (shopParam && shopParam.trim() !== "") {
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

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
