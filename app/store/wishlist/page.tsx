"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Heart, ShoppingBag, Trash2 } from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import { useStoreCart } from "@/store/useStoreCart";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/types/database";

function WishlistLoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6 animate-pulse">
      <div className="h-5 w-24 bg-gray-200 rounded-md" />
      <div className="h-8 w-48 bg-gray-200 rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 bg-white rounded-3xl border border-gray-100" />
        ))}
      </div>
    </div>
  );
}

function WishlistContent() {
  const { wishlist } = useStoreCart();
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWishlistProducts = async () => {
      if (wishlist.length === 0) {
        setFavoriteProducts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const supabase = createClient();
        const { data } = await supabase
          .from("products")
          .select("*, category:categories(*)")
          .in("id", wishlist);

        setFavoriteProducts(data || []);
      } catch (err) {
        console.error("Failed to load wishlist items:", err);
      } finally {
        setLoading(false);
      }
    };

    loadWishlistProducts();
  }, [wishlist]);

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

      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <span>💖 Saved Favorites</span>
          <span className="text-xs font-bold text-pink-600 bg-pink-100 px-2.5 py-0.5 rounded-full">
            {wishlist.length} {wishlist.length === 1 ? "Item" : "Items"}
          </span>
        </h1>
        <p className="text-xs text-gray-500">
          Products you have saved for easy reordering and quick access.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-64 bg-gray-200/70 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : favoriteProducts.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-gray-200 text-center space-y-3 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-900">Your Wishlist is Empty</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Tap the heart icon on any product in our store to save it here for later.
          </p>
          <Link
            href="/store"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-purple-700"
          >
            Explore Store
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
          {favoriteProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

export default dynamic(() => Promise.resolve(WishlistContent), {
  ssr: false,
  loading: () => <WishlistLoadingSkeleton />,
});
