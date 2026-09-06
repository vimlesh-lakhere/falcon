import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const response = NextResponse.redirect(new URL(next, origin));

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://knbabffighhuguxsdtzj.supabase.co";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYmFiZmZpZ2hodWd1eHNkdHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NDI5NzYsImV4cCI6MjEwMjMxODk3Nn0.AEXQwmXuHcv2l4jQklvNe-U-jauTLD4AsTvVjWXlVPA";

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
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

        if (!profile || !profile.store_id) {
          const userName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "My Store";
          const storeName = `${userName}'s Store`;

          // 1. Create a dedicated store for this user
          const { data: newStore } = await supabase
            .from("stores")
            .insert([
              {
                name: storeName,
                business_type: "Cosmetics & Retail",
                currency: "INR",
                timezone: "Asia/Kolkata",
              },
            ])
            .select()
            .single();

          if (newStore) {
            // 2. Create main branch
            const { data: newBranch } = await supabase
              .from("branches")
              .insert([
                {
                  store_id: newStore.id,
                  name: `${storeName} (Main Branch)`,
                  is_main_branch: true,
                  is_active: true,
                },
              ])
              .select()
              .single();

            // 3. Upsert profile
            await supabase
              .from("profiles")
              .upsert({
                id: user.id,
                email: user.email || "",
                full_name: userName,
                avatar_url: user.user_metadata?.avatar_url || null,
                role: "Owner",
                store_id: newStore.id,
                branch_id: newBranch?.id || null,
                is_active: true,
              });
          }
        }
      } catch (profileErr) {
        console.error("Error setting up profile during OAuth callback:", profileErr);
      }

      return response;
    }
  }

  // If code exchange failed, redirect to login with error
  return NextResponse.redirect(new URL("/login?error=Google+sign-in+failed", origin));
}
