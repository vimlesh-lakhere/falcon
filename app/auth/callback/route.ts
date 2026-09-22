import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const targetOrigin = origin.includes("localhost") ? origin : "https://www.falcon360.in";
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const response = NextResponse.redirect(new URL(next, targetOrigin));

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in auth callback.");
      return NextResponse.redirect(new URL("/login?error=ConfigurationError", targetOrigin));
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError && exchangeData.user) {
      const user = exchangeData.user;

      // Auto-store-creation on OAuth (Google) sign-in is DISABLED — a login no longer provisions a
      // fresh 14-day trial store without the owner's approval. Signed-in users without their own
      // approved store just get no ERP store (the middleware routes them to the storefront). This was
      // the main source of junk trial stores from stray Google sign-ins.
      return response;
    }
  }

  // If code exchange failed, redirect to login with error
  return NextResponse.redirect(new URL("/login?error=Google+sign-in+failed", targetOrigin));
}
