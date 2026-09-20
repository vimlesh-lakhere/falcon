"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  RotateCcw,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { HeroBannerCarousel } from "@/components/store/HeroBannerCarousel";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CategoryGrid } from "@/components/store/CategoryGrid";
import { ProductCard } from "@/components/store/ProductCard";
import { createClient } from "@/lib/supabase/client";
import { Product, Category } from "@/types/database";
import { resolveActiveShopId, DEFAULT_FALLBACK_SHOP_ID } from "@/lib/tenant";
import { isProductOnline, getProductOnlineConfig, STORE_PRODUCT_SELECT} from "@/lib/product-online";
import { useStoreCart } from "@/store/useStoreCart";

function StoreHomeContent() {
  const searchParams = useSearchParams();
  const shopParam = searchParams.get("shop");

  const { recentOrders } = useStoreCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadStorefrontData() {
      try {
        setLoading(true);
        const supabase = createClient();

        const targetShopId = resolveActiveShopId(shopParam);

        const [{ data: prodList }, { data: catList }] = await Promise.all([
          supabase
            .from("products")
            .select(STORE_PRODUCT_SELECT)
            .eq("shop_id", targetShopId)
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(40),
          supabase
            .from("categories")
            .select("*")
            .eq("shop_id", targetShopId)
            .eq("is_active", true)
            .order("name", { ascending: true }),
        ]);

        const onlineOnly = (prodList || []).filter(isProductOnline);
        setProducts(onlineOnly as unknown as Product[]);
        setCategories(catList || []);
      } catch (err) {
        console.error("Failed to load storefront products:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStorefrontData();
  }, [shopParam]);

  // Personalization 1: Active Order Tracking Banner
  const activeOrder = useMemo(() => {
    if (!recentOrders || recentOrders.length === 0) return null;
    const latest = recentOrders[0];
    if (latest && latest.status !== "delivered") {
      return latest;
    }
    return null;
  }, [recentOrders]);

  // Personalization 2: Frequently Ordered Products (Buy Again)
  const frequentlyOrderedProducts = useMemo(() => {
    if (!recentOrders || recentOrders.length === 0 || products.length === 0) return [];
    const freqMap = new Map<string, number>();
    recentOrders.forEach((order) => {
      order.items?.forEach((item) => {
        freqMap.set(item.productId, (freqMap.get(item.productId) || 0) + (item.quantity || 1));
      });
    });

    const matched: Product[] = [];
    products.forEach((p) => {
      if (freqMap.has(p.id)) {
        matched.push(p);
      }
    });

    matched.sort((a, b) => (freqMap.get(b.id) || 0) - (freqMap.get(a.id) || 0));
    return matched.slice(0, 8);
  }, [recentOrders, products]);

  // Personalization 3: Priority Category Boost based on customer orders
  const priorityCategoryIds = useMemo(() => {
    if (!recentOrders || recentOrders.length === 0 || products.length === 0) return [];
    const catFreqMap = new Map<string, number>();
    const prodMap = new Map<string, Product>();
    products.forEach((p) => prodMap.set(p.id, p));

    recentOrders.forEach((order) => {
      order.items?.forEach((item) => {
        const p = prodMap.get(item.productId);
        if (p?.category_id) {
          catFreqMap.set(p.category_id, (catFreqMap.get(p.category_id) || 0) + 1);
        }
      });
    });

    return Array.from(catFreqMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([catId]) => catId);
  }, [recentOrders, products]);

  // Filter sections
  const featuredProducts = products.slice(0, 8);
  const bestSellers = products.slice(8, 16).length > 0 ? products.slice(8, 16) : products.slice(0, 8);
  const todaysOffers = products.filter((p) => {
    const onlineCfg = getProductOnlineConfig(p);
    const hasOnlineOffer = onlineCfg.online_price !== null && onlineCfg.online_price < (Number(p.selling_price) || 0);
    const hasMrpDiscount = Number((p as any).mrp) > Number(p.selling_price);
    return hasOnlineOffer || hasMrpDiscount;
  }).slice(0, 8);

  return (
    <div className="space-y-10 sm:space-y-14 max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
      {/* 1. Hero Promotional Banner Carousel */}
      <HeroBannerCarousel />

      {/* Active Order Live Tracker Banner (If customer has a pending order) */}
      {mounted && activeOrder && (
        <section className="p-3.5 sm:p-4 rounded-3xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-900 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn border border-purple-500/30">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
              <Truck className="w-6 h-6 animate-pulse text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-wider uppercase bg-amber-400 text-purple-950 px-2 py-0.5 rounded-full">
                  Live Order
                </span>
                <span className="text-xs font-mono font-bold text-purple-200">
                  #{activeOrder.invoiceNumber}
                </span>
              </div>
              <p className="text-xs font-bold text-white mt-0.5">
                {activeOrder.status === "out_for_delivery"
                  ? "🚀 Out for Delivery - Package reaching your address soon!"
                  : activeOrder.status === "confirmed" || activeOrder.status === "packing"
                  ? "📦 Order Confirmed - Goods are being prepared & packed"
                  : "⏳ Order Placed - Store is processing your request"}
              </p>
            </div>
          </div>

          <Link
            href={`/store/orders/${activeOrder.orderId}`}
            className="w-full sm:w-auto px-4 py-2 bg-white text-purple-900 rounded-xl text-xs font-black text-center shadow-md hover:bg-purple-50 transition-colors shrink-0"
          >
            Track Status &rarr;
          </Link>
        </section>
      )}

      {/* Personalization: Buy Again / Frequently Ordered (If user has ordered items) */}
      {mounted && frequentlyOrderedProducts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <span>Buy Again</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" />
                  Frequently Ordered
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Your regular essentials, ready to reorder in 1 click
              </p>
            </div>

            <Link
              href="/store/orders"
              className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 group"
            >
              <span>Past Orders ({recentOrders.length})</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
            {frequentlyOrderedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 2. Visual Indian Categories (2-Row Compact View + All Categories Modal) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>Explore Categories</span>
              <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2.5 py-0.5 rounded-full">
                {categories.length > 0 ? `${categories.length} Categories` : "Popular"}
              </span>
            </h2>
            <p className="text-xs text-gray-500">
              Cosmetics, Hair Care, Daily Essentials & More
            </p>
          </div>

          <Link
            href="/store/products"
            className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 group"
          >
            <span>All Products</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <CategoryGrid
          categories={categories}
          loading={loading}
          priorityCategoryIds={mounted ? priorityCategoryIds : []}
        />
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
            href="/store/products"
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
