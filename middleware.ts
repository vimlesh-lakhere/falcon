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
  if (host.includes(".vercel.app")) {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.host = "www.falcon360.in";
    canonicalUrl.protocol = "https";
    canonicalUrl.port = "";
    return NextResponse.redirect(canonicalUrl, 308);
  }

  // Customer OTP & Storefront Checkout are intentionally public endpoints.
  const PUBLIC_API_PATHS = ["/api/auth/otp", "/api/store/checkout"];
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

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
