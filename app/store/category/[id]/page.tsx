"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, Sparkles, Filter } from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import { createClient } from "@/lib/supabase/client";
import { Product, Category } from "@/types/database";
import { resolveActiveShopId } from "@/lib/tenant";
import { isProductOnline, STORE_PRODUCT_SELECT} from "@/lib/product-online";

export default function CategoryCatalogPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const categoryId = params?.id as string;
  const shopParam = searchParams.get("shop");

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategoryData() {
      if (!categoryId) return;
      try {
        setLoading(true);
        const supabase = createClient();

        // 1. Fetch category info
        const { data: cat } = await supabase
          .from("categories")
          .select("*")
          .eq("id", categoryId)
          .maybeSingle();

        setCategory(cat);

        // 2. Fetch products in this category
        const targetShopId = resolveActiveShopId(shopParam || cat?.shop_id);
        const { data: prods } = await supabase
          .from("products")
          .select(STORE_PRODUCT_SELECT)
          .eq("shop_id", targetShopId)
          .eq("category_id", categoryId)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        setProducts((prods || []).filter(isProductOnline) as unknown as Product[]);
      } catch (err) {
        console.error("Failed to load category catalog:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCategoryData();
  }, [categoryId, shopParam]);

  const categoryName = category?.name || "Category Products";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
      {/* Back Link */}
      <Link
        href="/store"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-purple-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Store Home</span>
      </Link>

      {/* Category Banner Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-lg">
        <div className="space-y-1 relative z-10 max-w-xl">
          <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
            Category Catalog
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
            {categoryName}
          </h1>
          <p className="text-xs text-purple-200">
            Browse authentic products with fast town and village delivery.
          </p>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="h-64 bg-gray-200/70 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-gray-200 text-center space-y-3">
          <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="text-base font-bold text-gray-900">No products in this category yet</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Products added to {categoryName} in the ERP will automatically appear here.
          </p>
          <Link
            href="/store"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-purple-700"
          >
            Explore All Categories
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
