import type { SupabaseClient } from "@supabase/supabase-js";
import { randomSlugSuffix, slugifyStoreName } from "@/lib/tenant";

/**
 * Inserts a row into `shops` together with a unique store slug, which becomes the shop's
 * own address: <slug>.falcon360.in.
 *
 * - retries with a random suffix if the slug is already taken
 * - falls back to inserting without a slug when the `slug` column does not exist yet
 *   (database/migrations/011_shops_store_slug.sql), so sign-up never breaks
 */
export async function insertShopWithSlug(
  client: SupabaseClient,
  row: Record<string, unknown>,
  storeName: string
) {
  const base = slugifyStoreName(storeName);

  for (let attempt = 0; attempt < 4; attempt++) {
    const slug = attempt === 0 ? base : `${base.slice(0, 34)}-${randomSlugSuffix()}`;
    const res = await client.from("shops").insert([{ ...row, slug }]).select().single();
    if (!res.error) return { data: res.data, error: null, slug };

    if (res.error.code === "23505") continue; // slug already taken -> try another
    if (/slug/i.test(res.error.message ?? "")) break; // column not created yet -> no slug
    return { data: null, error: res.error, slug: null as string | null };
  }

  const res = await client.from("shops").insert([row]).select().single();
  return { data: res.data, error: res.error, slug: null as string | null };
}
