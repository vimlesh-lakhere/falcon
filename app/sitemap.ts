import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/client";
import { getStoreProfile } from "@/lib/store-profile";
import { DEFAULT_FALLBACK_SHOP_ID } from "@/lib/tenant";

// Rebuilt at most once an hour so new products reach Google without a redeploy.
export const revalidate = 3600;

/** Sitemap of the AGS storefront (ags.falcon360.in): home, catalog, categories and every online product. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const shopId = process.env.DEFAULT_SHOP_ID || DEFAULT_FALLBACK_SHOP_ID;
  const site = getStoreProfile(shopId).siteUrl || "https://ags.falcon360.in";
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: `${site}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${site}/store/products`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${site}/store/offers`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
  ];

  try {
    const supabase = createClient();
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from("categories").select("id").eq("shop_id", shopId).eq("is_active", true),
      supabase
        .from("products")
        .select("id, created_at, is_online")
        .eq("shop_id", shopId)
        .eq("is_active", true)
        .limit(5000),
    ]);
    for (const c of cats || []) {
      entries.push({ url: `${site}/store/category/${c.id}`, lastModified: now, changeFrequency: "weekly", priority: 0.6 });
    }
    for (const p of prods || []) {
      if (p.is_online === false) continue;
      entries.push({
        url: `${site}/store/product/${p.id}`,
        lastModified: p.created_at ? new Date(p.created_at) : now,
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  } catch (err) {
    console.error("sitemap: catalog fetch failed", err);
  }
  return entries;
}
