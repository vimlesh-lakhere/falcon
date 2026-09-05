"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Tag,
  ArrowRight,
  TrendingUp,
  Award,
  Zap,
  ShoppingBag,
  Store,
  ShieldCheck,
  Truck,
  Heart,
  MessageCircle,
} from "lucide-react";
import { HeroBannerCarousel } from "@/components/store/HeroBannerCarousel";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CategoryGrid } from "@/components/store/CategoryGrid";
import { ProductCard } from "@/components/store/ProductCard";
import { createClient } from "@/lib/supabase/client";
import { Product, Category } from "@/types/database";
import { resolveActiveShopId, DEFAULT_FALLBACK_SHOP_ID } from "@/lib/tenant";

function StoreHomeContent() {
  const searchParams = useSearchParams();
  const shopParam = searchParams.get("shop");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStorefrontData() {
      try {
        setLoading(true);
        const supabase = createClient();

        let targetShopId = resolveActiveShopId();

        if (shopParam) {
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shopParam)) {
            targetShopId = shopParam;
          } else {
            const { data: matchedShop } = await supabase
              .from("shops")
              .select("id")
              .eq("slug", shopParam)
              .maybeSingle();
            if (matchedShop?.id) {
              targetShopId = matchedShop.id;
            }
          }
        }

        const [{ data: prodList }, { data: catList }] = await Promise.all([
          supabase
            .from("products")
            .select("*, category:categories(*)")
            .eq("shop_id", targetShopId)
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(40),
          supabase
            .from("categories")
            .select("*")
            .eq("shop_id", targetShopId)
            .eq("is_active", true)
            .limit(12),
        ]);

        setProducts(prodList || []);
        setCategories(catList || []);
      } catch (err) {
        console.error("Failed to load storefront products:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStorefrontData();
  }, [shopParam]);

  // Filter sections
  const featuredProducts = products.slice(0, 8);
  const bestSellers = products.slice(8, 16).length > 0 ? products.slice(8, 16) : products.slice(0, 8);
  const todaysOffers = products.filter(
    (p) => Number((p as any).mrp) > Number(p.selling_price)
  ).slice(0, 8);

  return (
    <div className="space-y-10 sm:space-y-14 max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
      {/* 1. Hero Promotional Banner Carousel */}
      <HeroBannerCarousel />

      {/* 2. Visual Indian Categories */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>Explore Categories</span>
              <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2.5 py-0.5 rounded-full">
                Popular
              </span>
            </h2>
            <p className="text-xs text-gray-500">
              Cosmetics, Hair Care, Daily Essentials & More
            </p>
          </div>
        </div>

        <CategoryGrid categories={categories} />
      </section>

      {/* 3. Fast Village Delivery Value Banner */}
      <section className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black">
              Same-Day Town & Village Delivery Guaranteed
            </h3>
            <p className="text-xs text-emerald-100">
              Cash on delivery & UPI accepted at your doorstep. Order in under 1 minute!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Link
            href="/store/offers"
            className="w-full md:w-auto px-5 py-2.5 bg-white text-emerald-900 rounded-xl text-xs font-black text-center shadow-md hover:bg-emerald-50 transition-colors"
          >
            Explore Deals &rarr;
          </Link>
        </div>
      </section>

      {/* 4. Falcon AI Studio Showroom Spotlight */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-purple-700 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span>Falcon AI Showroom</span>
            </div>
            <h2 className="text-base sm:text-xl font-black text-gray-900 tracking-tight">
              Featured Beauty & Cosmetics
            </h2>
          </div>
          <Link
            href="/store/offers"
            className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 group"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="h-64 bg-gray-200/70 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white border border-gray-200 text-center space-y-2">
            <ShoppingBag className="w-10 h-10 text-gray-400 mx-auto" />
            <h3 className="text-sm font-bold text-gray-800">No Products Available Yet</h3>
            <p className="text-xs text-gray-500">
              Products added in the Falcon ERP system will instantly appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
            {featuredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* 5. Today's Special Deals & Offers */}
      {todaysOffers.length > 0 && (
        <section className="space-y-4 bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-pink-500/10 p-5 sm:p-7 rounded-3xl border border-amber-200/60">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-amber-700 text-xs font-black uppercase tracking-wider">
                <Tag className="w-4 h-4 text-amber-600" />
                <span>Today&apos;s Discount Deals</span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-gray-900 tracking-tight">
                Top Savings on Daily Essentials
              </h2>
            </div>
            <Link
              href="/store/offers"
              className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1"
            >
              <span>See All Offers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
            {todaysOffers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* 6. Best Sellers Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-black uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Customer Favorites</span>
            </div>
            <h2 className="text-base sm:text-xl font-black text-gray-900 tracking-tight">
              Best Sellers & Repeat Purchases
            </h2>
          </div>
          <Link
            href="/store/orders"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
          >
            <span>Repeat Past Order</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
          {bestSellers.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* 7. WhatsApp Quick Order Floating Banner */}
      <section className="p-6 rounded-3xl bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-400 text-xs font-bold">
            <MessageCircle className="w-4 h-4" />
            <span>Need Help Finding Something?</span>
          </div>
          <h3 className="text-base sm:text-lg font-black">
            Send your shopping list or photo on WhatsApp!
          </h3>
          <p className="text-xs text-slate-400">
            We will pack your order and send it right to your village or town doorstep.
          </p>
        </div>

        <a
          href="https://wa.me/919876543210?text=Hello%20AGS%20Store,%20I%20want%20to%20send%20my%20order%20list."
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 shrink-0 transition-all"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Send List on WhatsApp</span>
        </a>
      </section>
    </div>
  );
}

export default function StoreHomePage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-sm font-semibold text-gray-500">Loading storefront...</div>}>
      <StoreHomeContent />
    </Suspense>
  );
}
