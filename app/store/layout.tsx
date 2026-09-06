import React from "react";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreFooter } from "@/components/store/StoreFooter";
import { CartDrawer } from "@/components/store/CartDrawer";
import { createClient } from "@/lib/supabase/client";
import { cookies, headers } from "next/headers";

export const metadata = {
  title: "Online Store & Catalog | Falcon 360",
  description: "Shop quality products with convenient local delivery and direct WhatsApp ordering.",
};

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const cookieStore = cookies();
  const headerList = headers();

  const shopCookie =
    cookieStore.get("falcon_active_store_id")?.value ||
    cookieStore.get("falcon_store_shop_id")?.value;
  const host = headerList.get("host") || "";

  // If host is ags.falcon360.in, use AGS Store
  // Otherwise use cookie if available, or fallback to default
  const targetShopId = host.startsWith("ags.")
    ? (process.env.DEFAULT_SHOP_ID || "a0000000-0000-0000-0000-000000000001")
    : (shopCookie || process.env.DEFAULT_SHOP_ID || "a0000000-0000-0000-0000-000000000001");

  let categories: any[] = [];
  let shop: any = null;

  try {
    const [{ data: cats }, { data: sh }] = await Promise.all([
      supabase.from("categories").select("*").eq("shop_id", targetShopId).eq("is_active", true).limit(10),
      supabase.from("shops").select("*").eq("id", targetShopId).maybeSingle(),
    ]);

    categories = cats || [];
    shop = sh;
  } catch (err) {
    console.error("Store layout data fetch failed:", err);
  }

  const shopName = shop?.name || "Online Store";
  const shopPhone = shop?.phone || "";
  const shopAddress = shop?.address || "";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-purple-600 selection:text-white font-sans antialiased">
      {/* Customer Header */}
      <StoreHeader categories={categories} shopName={shopName} shopPhone={shopPhone} />

      {/* Main Store Viewport */}
      <main className="flex-1 pb-16">{children}</main>

      {/* Customer Footer */}
      <StoreFooter shopName={shopName} shopPhone={shopPhone} shopAddress={shopAddress} />

      {/* Slide-over Cart Drawer */}
      <CartDrawer />
    </div>
  );
}
