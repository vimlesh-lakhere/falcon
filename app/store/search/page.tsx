"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Sparkles, ShoppingBag, ArrowLeft, Filter } from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import { storeSearchEngine } from "@/lib/store/search-engine";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/types/database";
import { resolveActiveShopId } from "@/lib/tenant";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [searchInput, setSearchInput] = useState(query);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const targetShopId = resolveActiveShopId();
        const supabase = createClient();
        const { data } = await supabase
          .from("products")
          .select("*, category:categories(*)")
          .eq("shop_id", targetShopId)
          .eq("is_active", true);

        const list = data || [];
        setAllProducts(list);
        setFilteredProducts(storeSearchEngine.searchProducts(query, list));
      } catch (err) {
        console.error("Search fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilteredProducts(storeSearchEngine.searchProducts(searchInput, allProducts));
  };

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

      {/* Header & Live Query */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-purple-700 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span>AI Smart Search Results</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-gray-900">
              {query ? `Results for "${query}"` : "All Products"}
            </h1>
          </div>
          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full self-start md:self-auto">
            {filteredProducts.length} {filteredProducts.length === 1 ? "Product" : "Products"} Found
          </span>
        </div>

        {/* Search Bar Input */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="w-4 h-4 text-purple-600 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search cosmetics, cream, shampoo, oil, brand, or barcode..."
            className="w-full pl-11 pr-24 py-3 bg-gray-50 hover:bg-gray-100/80 focus:bg-white text-xs sm:text-sm border border-gray-200 focus:border-purple-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/10 text-gray-900 font-medium"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            Search
          </button>
        </form>

        {/* Quick Indian search suggestions */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1">
          <span className="text-gray-400 font-semibold text-[11px]">Popular:</span>
          {["Glow & Lovely", "Herbal Tooth Powder", "Hair Oil", "Bathing Soap", "Face Cream"].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                setSearchInput(tag);
                setFilteredProducts(storeSearchEngine.searchProducts(tag, allProducts));
              }}
              className="text-[11px] font-semibold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200/60 px-2.5 py-0.5 rounded-full transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Product Results Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="h-64 bg-gray-200/70 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-gray-200 text-center space-y-3">
          <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="text-base font-bold text-gray-900">No matching products found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Try searching for common names like &quot;cream&quot;, &quot;tel&quot;, &quot;soap&quot;, or request your product on WhatsApp.
          </p>
          <a
            href="https://wa.me/919876543210?text=Hello%20AGS%20Store,%20I%20am%20looking%20for%20a%20product."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md"
          >
            Ask on WhatsApp
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
          {filteredProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function StoreSearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
