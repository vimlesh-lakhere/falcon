import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client for administrative tasks such as full database
 * backups, bulk restores, and maintenance scripts.
 * 
 * Requires SUPABASE_SERVICE_ROLE_KEY (bypasses RLS). It intentionally does NOT
 * fall back to the anon key: server routes that call this (checkout, order
 * history, cron, backups) rely on privileged access, and once RLS is enabled an
 * anon fallback would silently return no rows / block writes instead of failing
 * loudly. Missing config is a deploy error, not something to paper over.
 */
export function getAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing from environment variables.");
  }
  if (!supabaseKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing. Set it in the deployment environment; " +
        "the admin client must not fall back to the public anon key."
    );
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
