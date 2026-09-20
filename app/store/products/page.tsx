"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  Tag,
  ShoppingBag,
  Sparkles,
  Check,
  X,
  Filter,
} from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import { createClient } from "@/lib/supabase/client";
import { Product, Category } from "@/types/database";
import { resolveActiveShopId } from "@/lib/tenant";
import { isProductOnline, getProductEffectiveOnlinePrice, STORE_PRODUCT_SELECT} from "@/lib/product-online";

function AllProductsCatalogContent() {
  const searchParams = useSearchParams();
  const initialCatParam = searchParams.get("category") || "all";
  const shopParam = searchParams.get("shop");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialCatParam);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc" | "discount">("newest");

  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true);
        const targetShopId = resolveActiveShopId(shopParam);
        const supabase = createClient();

        const [{ data: prodList }, { data: catList }] = await Promise.all([
          supabase
            .from("products")
            .select(STORE_PRODUCT_SELECT)
            .eq("shop_id", targetShopId)
            .eq("is_active", true)
            .order("created_at", { ascending: false }),
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
        console.error("Failed to load catalog products:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCatalog();
  }, [shopParam]);

  // Update selected category if URL query changes
  useEffect(() => {
    if (initialCatParam) {
      setSelectedCategoryId(initialCatParam);
    }
  }, [initialCatParam]);

  // Category product count lookup map
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    products.forEach((p) => {
      const cId = p.category_id || "uncategorized";
      counts[cId] = (counts[cId] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    // 1. Filter by category
    if (selectedCategoryId !== "all") {
      result = result.filter((p) => p.category_id === selectedCategoryId);
    }

    // 2. Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.category?.name && p.category.name.toLowerCase().includes(q))
      );
    }

    // 3. Sort
    result.sort((a, b) => {
      const priceA = getProductEffectiveOnlinePrice(a);
      const priceB = getProductEffectiveOnlinePrice(b);

      if (sortBy === "price_asc") {
        return priceA - priceB;
      }
      if (sortBy === "price_desc") {
        return priceB - priceA;
      }
      if (sortBy === "discount") {
        const mrpA = Number((a as any).mrp) || priceA;
        const mrpB = Number((b as any).mrp) || priceB;
        const discA = mrpA > priceA ? mrpA - priceA : 0;
        const discB = mrpB > priceB ? mrpB - priceB : 0;
        return discB - discA;
      }
      // default: newest
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [products, selectedCategoryId, searchQuery, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 space-y-6">
      {/* Back Link */}
      <Link
        href="/store"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-purple-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Store Home</span>
      </Link>

      {/* Hero Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10 max-w-2xl">
          <div className="flex items-center gap-1.5 text-purple-300 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span>Complete Store Inventory</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
            All Products & Categories Catalog
          </h1>
          <p className="text-xs sm:text-sm text-purple-200 leading-relaxed">
            Browse all genuine branded cosmetics, skin care, hair oils, dental care, and daily home essentials.
          </p>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-4 sm:p-5 space-y-4 shadow-xs">
        {/* Search and Sort Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Quick Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in all products..."
              className="w-full pl-10 pr-8 py-2.5 bg-gray-50 hover:bg-gray-100/80 focus:bg-white border border-gray-200 focus:border-purple-500 rounded-2xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-4 focus:ring-purple-500/10 font-medium transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector Dropdown */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
              <span>Sort:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              aria-label="Sort products by"
              className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="newest">Newest Arrivals</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="discount">Biggest Savings / Deals</option>
            </select>
          </div>
        </div>

        {/* Category Horizontal Filter Pills */}
        <div className="relative pt-1 border-t border-gray-100">
          <div className="overflow-x-auto scrollbar-none py-1">
            <div className="flex items-center gap-2 min-w-max pr-6">
              {/* All Categories Pill */}
              <button
                type="button"
                onClick={() => setSelectedCategoryId("all")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                  selectedCategoryId === "all"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All Products ({categoryCounts["all"] || products.length})
              </button>

              {/* Dynamic Category Pills */}
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                const count = categoryCounts[cat.id] || 0;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-purple-600 text-white shadow-xs"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        isSelected ? "bg-white/25 text-white" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Subtle Right Fade Gradient */}
          <div className="pointer-events-none absolute right-0 top-1 bottom-0 w-8 bg-gradient-to-l from-white to-transparent sm:hidden" />
        </div>
      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between text-xs text-gray-600 px-1">
        <div>
          Showing <strong className="text-gray-900">{filteredAndSortedProducts.length}</strong> products
          {selectedCategoryId !== "all" && (
            <span>
              {" "}
              in <span className="text-purple-700 font-bold">{categories.find((c) => c.id === selectedCategoryId)?.name}</span>
            </span>
          )}
        </div>

        {(selectedCategoryId !== "all" || searchQuery) && (
          <button
            type="button"
            onClick={() => {
              setSelectedCategoryId("all");
              setSearchQuery("");
            }}
            className="text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Product Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="h-64 bg-gray-200/70 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filteredAndSortedProducts.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-gray-200 text-center space-y-3 shadow-xs">
          <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="text-base font-bold text-gray-900">No products found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {searchQuery
              ? `No products match "${searchQuery}". Try a different search term or clear filters.`
              : "No products available in this category yet."}
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategoryId("all");
              setSearchQuery("");
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-purple-700 transition-colors"
          >
            Show All Products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
          {filteredAndSortedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AllProductsCatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center text-sm font-semibold text-gray-500">
          Loading catalog...
        </div>
      }
    >
      <AllProductsCatalogContent />
    </Suspense>
  );
}
