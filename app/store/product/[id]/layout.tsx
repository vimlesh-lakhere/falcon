import React from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/client";
import { getStoreProfile } from "@/lib/store-profile";
import { getProductEffectiveOnlinePrice } from "@/lib/product-online";

/** Per-product title, description and share image, e.g. "Lakme Sun Cream – Aarti General Store, Chhatarpur". */
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const supabase = createClient();
    const { data: p } = await supabase
      .from("products")
      .select("id, shop_id, name, name_hindi, brand, image_url, selling_price, online_price, description")
      .eq("id", params.id)
      .maybeSingle();
    if (!p) return {};

    const profile = getStoreProfile(p.shop_id);
    const where = profile.city ? `${profile.brandName}, ${profile.city}` : profile.brandName;
    const price = getProductEffectiveOnlinePrice(p);
    const hindi = p.name_hindi ? ` (${p.name_hindi})` : "";
    const title = `${p.name} – ${where}`;
    const description = `Buy ${p.brand ? `${p.brand} ` : ""}${p.name}${hindi}${price > 0 ? ` at ₹${price}` : ""} from ${where}. Wholesale & retail rates, order online for home delivery.`;
    const image = (p.image_url || "").split("|||")[0]?.trim();

    return {
      title,
      description,
      ...(profile.siteUrl ? { alternates: { canonical: `${profile.siteUrl}/store/product/${p.id}` } } : {}),
      openGraph: {
        title,
        description,
        siteName: profile.brandName,
        ...(image ? { images: [{ url: image }] } : {}),
      },
    };
  } catch {
    return {};
  }
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
