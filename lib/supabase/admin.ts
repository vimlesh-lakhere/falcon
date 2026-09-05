import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client for administrative tasks such as full database
 * backups, bulk restores, and maintenance scripts.
 * 
 * Uses SUPABASE_SERVICE_ROLE_KEY if set in environment variables (bypassing RLS),
 * or falls back safely to NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export function getAdminSupabaseClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://knbabffighhuguxsdtzj.supabase.co";

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL or Key is missing from environment variables.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
