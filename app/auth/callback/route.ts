import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const targetOrigin = origin.includes("localhost") ? origin : "https://www.falcon360.in";
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const response = NextResponse.redirect(new URL(next, targetOrigin));

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://knbabffighhuguxsdtzj.supabase.co";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYmFiZmZpZ2hodWd1eHNkdHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NDI5NzYsImV4cCI6MjEwMjMxODk3Nn0.AEXQwmXuHcv2l4jQklvNe-U-jauTLD4AsTvVjWXlVPA";

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

      // Ensure profile and store exist for ERP access
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, store_id, role, is_active")
          .eq("id", user.id)
          .maybeSingle();

        const isMasterOwner =
          user.email === "vimlesh.lakhere@gmail.com" ||
          user.email === "vlakhere@gmail.com" ||
          user.email === "owner_1786762700828@agsstore.com";

        const needsNewStore =
          !profile ||
          !profile.store_id ||
          (!isMasterOwner && profile.store_id === "a0000000-0000-0000-0000-000000000001");

        if (needsNewStore) {
          const userName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "My Store";
          const storeName = `${userName}'s Store`;
          const newStoreId = crypto.randomUUID();

          // 1. Create dedicated store in both shops and stores tables
          await supabase.from("shops").insert([
            {
              id: newStoreId,
              name: storeName,
              currency: "INR",
            },
          ]);

          await supabase.from("stores").insert([
            {
              id: newStoreId,
              name: storeName,
              currency: "INR",
            },
          ]);

          // 2. Upsert profile with dedicated store_id
          await supabase
            .from("profiles")
            .upsert({
              id: user.id,
              email: user.email || "",
              full_name: userName,
              avatar_url: user.user_metadata?.avatar_url || null,
              role: "Owner",
              store_id: newStoreId,
              is_active: true,
            });
        }
      } catch (profileErr) {
        console.error("Error setting up profile during OAuth callback:", profileErr);
      }

      return response;
    }
  }

  // If code exchange failed, redirect to login with error
  return NextResponse.redirect(new URL("/login?error=Google+sign-in+failed", targetOrigin));
}
