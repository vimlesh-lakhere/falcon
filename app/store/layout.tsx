import React from "react";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreFooter } from "@/components/store/StoreFooter";
import { CartDrawer } from "@/components/store/CartDrawer";
import { createClient } from "@/lib/supabase/client";

export const metadata = {
  title: "AGS Store & Cosmetics | Online Shopping & Local Delivery",
  description: "Authentic Cosmetics, Beauty Products, Hair Care, Herbal Oral Care, and Daily Essentials with fast local town & village delivery.",
};

const SHOP_ID = process.env.DEFAULT_SHOP_ID || "a0000000-0000-0000-0000-000000000001";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  let categories: any[] = [];
  let shop: any = null;

  try {
    const [{ data: cats }, { data: sh }] = await Promise.all([
      supabase.from("categories").select("*").eq("shop_id", SHOP_ID).eq("is_active", true).limit(10),
      supabase.from("shops").select("*").eq("id", SHOP_ID).maybeSingle(),
    ]);

    categories = cats || [];
    shop = sh;
  } catch (err) {
    console.error("Store layout data fetch failed:", err);
  }

  const shopName = shop?.name || "AGS Store & Cosmetics";
  const shopPhone = shop?.phone || "919876543210";
  const shopAddress = shop?.address || "Main Market, Town Centre, Near Bus Stand";

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
