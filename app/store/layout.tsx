import React from "react";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreFooter } from "@/components/store/StoreFooter";
import { CartDrawer } from "@/components/store/CartDrawer";
import { createClient } from "@/lib/supabase/client";
import { cookies, headers } from "next/headers";

import { MobileStoreBottomNav } from "@/components/store/MobileStoreBottomNav";
import { StoreProfileProvider } from "@/components/store/StoreProfileContext";
import { getStoreProfile, storeJsonLd } from "@/lib/store-profile";
import type { Metadata } from "next";

/** Same shop resolution as the layout below: sub-domain header, then cookies, then the default shop. */
function resolveStoreShopId(): string {
  const cookieStore = cookies();
  return (
    headers().get("x-store-shop-id") ||
    cookieStore.get("falcon_store_shop_id")?.value ||
    cookieStore.get("falcon_active_store_id")?.value ||
    process.env.DEFAULT_SHOP_ID ||
    "a0000000-0000-0000-0000-000000000001"
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const profile = getStoreProfile(resolveStoreShopId());
  return {
    title: profile.seoTitle,
    description: profile.seoDescription,
    keywords: profile.keywords,
    ...(profile.siteUrl ? { metadataBase: new URL(profile.siteUrl) } : {}),
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: profile.brandName,
      title: profile.seoTitle,
      description: profile.seoDescription,
      ...(profile.siteUrl ? { url: profile.siteUrl } : {}),
    },
    robots: { index: true, follow: true },
    // Google Search Console ownership check (profile code, or GOOGLE_SITE_VERIFICATION env override).
    ...((process.env.GOOGLE_SITE_VERIFICATION || profile.googleVerification)
      ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION || profile.googleVerification } }
      : {}),
  };
}

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const cookieStore = cookies();
  const headerList = headers();

  // The shop chosen by the address (falcon_store_shop_id) beats the ERP's active-store cookie.
  const shopCookie =
    cookieStore.get("falcon_store_shop_id")?.value ||
    cookieStore.get("falcon_active_store_id")?.value;

  // middleware.ts resolves <slug>.falcon360.in to a shop and passes it on this header.
  // Otherwise fall back to the cookie (?shop= links on www) and finally the default shop.
  const targetShopId =
    headerList.get("x-store-shop-id") ||
    shopCookie ||
    process.env.DEFAULT_SHOP_ID ||
    "a0000000-0000-0000-0000-000000000001";

  let categories: any[] = [];
  let shop: any = null;

  try {
    const [{ data: cats }, { data: sh }] = await Promise.all([
      supabase
        .from("categories")
        .select("*")
        .eq("shop_id", targetShopId)
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase.from("shops").select("name, phone, address, logo_url").eq("id", targetShopId).maybeSingle(),
    ]);

    categories = cats || [];
    shop = sh;
  } catch (err) {
    console.error("Store layout data fetch failed:", err);
  }

  const profile = getStoreProfile(targetShopId, shop);
  const shopName = profile.brandName;
  const shopPhone = profile.phone;
  const shopAddress = profile.fullAddress;

  return (
    <StoreProfileProvider profile={profile}>
    {/* Structured data: lets Google show the shop's name, address, phone and map for local searches. */}
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd(profile)).replace(/</g, "\\u003c") }}
    />
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-purple-600 selection:text-white font-sans antialiased">
      {/* Customer Header */}
      <StoreHeader categories={categories} shopName={shopName} shopPhone={shopPhone} />

      {/* Main Store Viewport */}
      <main className="flex-1 pb-24 sm:pb-16">{children}</main>

      {/* Customer Footer */}
      <StoreFooter shopName={shopName} shopPhone={shopPhone} shopAddress={shopAddress} />

      {/* Slide-over Cart Drawer */}
      <CartDrawer />

      {/* Mobile Fixed Bottom Navigation */}
      <MobileStoreBottomNav />
    </div>
    </StoreProfileProvider>
  );
}
