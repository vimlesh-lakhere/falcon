"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LayoutGrid,
  Search,
  Package,
  ShoppingCart,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useStoreCart } from "@/store/useStoreCart";

export const MobileStoreBottomNav: React.FC = () => {
  const pathname = usePathname() || "";
  const [mounted, setMounted] = useState(false);
  const { cart, setIsCartOpen, getCartTotal } = useStoreCart();

  useEffect(() => {
    setMounted(true);
  }, []);

  const { itemCount, subtotal } = getCartTotal();

  // Don't show bottom nav on checkout or direct product detail if product detail has its own sticky buy bar
  const isCheckout = pathname.includes("/store/checkout");
  const isCartPage = pathname === "/store/cart";
  const isProductDetailPage = pathname.startsWith("/store/product/");

  if (isCheckout) return null;

  return (
    <aside aria-label="Mobile Navigation" className="fixed bottom-0 left-0 right-0 z-40 md:hidden pointer-events-none">
      {/* 1. Floating Mini Cart Bar (shows if items in cart and not on cart page) */}
      {mounted && itemCount > 0 && !isCartPage && !isProductDetailPage && (
        <div className="px-3 pb-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white px-4 py-2.5 rounded-2xl shadow-xl shadow-purple-900/30 flex items-center justify-between active:scale-[0.98] transition-transform animate-in slide-in-from-bottom-3 duration-200"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-white/20 text-white">
                <ShoppingCart className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              </div>
              <div className="text-left">
                <div className="text-xs font-black tracking-tight">₹{subtotal}</div>
                <div className="text-[10px] text-purple-200 font-medium leading-none">
                  {itemCount} {itemCount === 1 ? "item" : "items"} added
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-black bg-white/15 px-3 py-1.5 rounded-xl text-white">
              <span>View Cart</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* 2. Main Sticky Bottom Navigation Bar (Hidden on Product Detail page in favor of Sticky Buy Bar) */}
      {!isProductDetailPage && (
        <nav aria-label="Store Navigation Bar" className="pointer-events-auto bg-white/95 backdrop-blur-lg border-t border-gray-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          <div className="max-w-md mx-auto grid grid-cols-5 items-center">
            {/* Tab 1: Home */}
            <Link
              href="/store"
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                pathname === "/store"
                  ? "text-purple-700 font-black"
                  : "text-gray-500 hover:text-gray-900 font-medium"
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${pathname === "/store" ? "bg-purple-100" : ""}`}>
                <Home className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5">Home</span>
            </Link>

            {/* Tab 2: Categories */}
            <Link
              href="/store/offers"
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                pathname.includes("/store/offers") || pathname.includes("/store/category")
                  ? "text-purple-700 font-black"
                  : "text-gray-500 hover:text-gray-900 font-medium"
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${pathname.includes("/store/offers") ? "bg-purple-100" : ""}`}>
                <LayoutGrid className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5">Offers</span>
            </Link>

            {/* Tab 3: Search */}
            <Link
              href="/store/search"
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                pathname.includes("/store/search")
                  ? "text-purple-700 font-black"
                  : "text-gray-500 hover:text-gray-900 font-medium"
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${pathname.includes("/store/search") ? "bg-purple-100" : ""}`}>
                <Search className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5">Search</span>
            </Link>

            {/* Tab 4: Orders */}
            <Link
              href="/store/orders"
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                pathname.includes("/store/orders")
                  ? "text-purple-700 font-black"
                  : "text-gray-500 hover:text-gray-900 font-medium"
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${pathname.includes("/store/orders") ? "bg-purple-100" : ""}`}>
                <Package className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5">Orders</span>
            </Link>

            {/* Tab 5: Cart Drawer Trigger */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="flex flex-col items-center justify-center py-1 text-gray-500 hover:text-gray-900 font-medium relative"
            >
              <div className="p-1 rounded-xl relative">
                <ShoppingCart className="w-5 h-5" />
                {mounted && itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-xs">
                    {itemCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5">Cart</span>
            </button>
          </div>
        </nav>
      )}
    </aside>
  );
};
