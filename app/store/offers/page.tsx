"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Tag, Sparkles, ShoppingBag, Zap } from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/types/database";

import { useSearchParams } from "next/navigation";
import { resolveActiveShopId } from "@/lib/tenant";
import { isProductOnline, getProductOnlineConfig, STORE_PRODUCT_SELECT} from "@/lib/product-online";

export default function StoreOffersPage() {
  const searchParams = useSearchParams();
  const shopParam = searchParams.get("shop");
  const [discountProducts, setDiscountProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOffers = async () => {
      try {
        setLoading(true);
        const targetShopId = resolveActiveShopId(shopParam);
        const supabase = createClient();
        const { data } = await supabase
          .from("products")
          .select(STORE_PRODUCT_SELECT)
          .eq("shop_id", targetShopId)
          .eq("is_active", true);

        const list = (data || []).filter(isProductOnline) as unknown as Product[];
        // Filter products with discounts or special deals
        const filtered = list.filter((p) => {
          const cfg = getProductOnlineConfig(p);
          const hasOnlineDeal = typeof cfg.onlinePrice === "number" && cfg.onlinePrice < (Number(p.selling_price) || 0);
          const hasMrpDiscount = Number((p as any).mrp) > Number(p.selling_price);
          return hasOnlineDeal || hasMrpDiscount;
        });
        setDiscountProducts(filtered.length > 0 ? filtered : list.slice(0, 12));
      } catch (err) {
        console.error("Failed to load offers:", err);
      } finally {
        setLoading(false);
      }
    };

    loadOffers();
  }, [shopParam]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
      {/* Back Link */}
      <Link
        href="/store"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-purple-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Store</span>
      </Link>

      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-red-900 to-purple-950 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-lg">
        <div className="space-y-2 relative z-10 max-w-xl">
          <div className="flex items-center gap-1.5 text-amber-300 text-xs font-black uppercase tracking-wider">
            <Tag className="w-4 h-4 text-amber-400" />
            <span>Today&apos;s Special Discounts</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
            Festival & Mega Savings Offers
          </h1>
          <p className="text-xs text-amber-100/90">
            Enjoy exclusive discounts on cosmetics, creams, shampoos, soaps, and daily home essentials.
          </p>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="h-64 bg-gray-200/70 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : discountProducts.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-gray-200 text-center space-y-3">
          <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="text-base font-bold text-gray-900">No Special Discounts Active Right Now</h3>
          <p className="text-xs text-gray-500">
            Check back soon or browse all regular products in our store.
          </p>
          <Link
            href="/store"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-md"
          >
            Browse All Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
          {discountProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
