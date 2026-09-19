"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  Heart,
  Package,
  Phone,
  MessageCircle,
  Menu,
  X,
  Sparkles,
  Tag,
  Store,
  ChevronRight,
  User,
  LogOut,
  CheckCircle2,
} from "lucide-react";
import { useStoreCart } from "@/store/useStoreCart";
import { CustomerAuthModal } from "@/components/store/CustomerAuthModal";
import { createClient } from "@/lib/supabase/client";
import { Category } from "@/types/database";

interface StoreHeaderProps {
  categories?: Category[];
  shopName?: string;
  shopPhone?: string;
}

export const StoreHeader: React.FC<StoreHeaderProps> = ({
  categories = [],
  shopName = "Falcon Store",
  shopPhone = "",
}) => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { cart, wishlist, setIsCartOpen, getCartTotal, customerUser, loginCustomer, logoutCustomer } = useStoreCart();

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Auto-restore customer session from persistent cookie if available
    try {
      const match = document.cookie.match(/(?:^|;\s*)falcon_customer_phone=([^;]+)/);
      const savedPhone = match ? decodeURIComponent(match[1]) : null;
      if (savedPhone && !customerUser) {
        const supabase = createClient();
        supabase
          .from("customers")
          .select("*")
          .eq("phone", savedPhone)
          .maybeSingle()
          .then(({ data }: any) => {
            if (data) {
              let parsedAddr: any = null;
              if (data.address && data.address !== "Town / Local Area") {
                try {
                  parsedAddr = JSON.parse(data.address);
                } catch {
                  parsedAddr = {
                    fullName: data.name,
                    mobileNumber: data.phone,
                    villageOrColony: data.address,
                    tehsilOrTown: "Town Area",
                    landmark: "",
                    pincode: "483501",
                  };
                }
              }
              loginCustomer({
                id: data.id,
                name: data.name,
                phone: data.phone,
                isVerified: true,
                authProvider: "phone",
                address: parsedAddr,
              });
            }
          });
      }
    } catch {
      // Non-blocking
    }

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { itemCount, subtotal } = getCartTotal();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/store/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-2xs transition-all duration-200">
      {/* Top Announcement Bar for Town/Village Delivery (Collapses on mobile on scroll) */}
      <div
        className={`bg-gradient-to-r from-purple-700 via-indigo-700 to-brand-700 text-white text-[11px] font-semibold py-1.5 px-4 text-center items-center justify-between transition-all duration-300 ${
          isScrolled ? "hidden sm:flex" : "flex"
        }`}
      >
        <div className="hidden sm:block">
          📍 Fast Delivery in Local Town & Surrounding Villages • Pay on Delivery (Cash/UPI)
        </div>
        <div className="sm:hidden mx-auto">
          ⚡ Pay on Delivery • Local Town & Village Dispatch
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[10px]">
          <a
            href={`https://wa.me/${shopPhone}?text=${encodeURIComponent("Hello AGS Store, I want to inquire about products.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:underline text-emerald-200"
          >
            <MessageCircle className="w-3 h-3" />
            WhatsApp Order
          </a>
          <span>•</span>
          <Link href="/store/orders" className="hover:underline">
            Track Order
          </Link>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 transition-all duration-200 ${isScrolled ? "py-2 sm:py-3" : "py-2.5 sm:py-3"}`}>
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Store Name */}
          <Link href="/store" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
              <Store className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm sm:text-lg tracking-tight text-gray-900 leading-none">
                  {shopName}
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] font-semibold text-purple-700 uppercase tracking-wider">
                Beauty • Cosmetics • Daily Needs
              </p>
            </div>
          </Link>

          {/* AI Search Bar (Desktop) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-xl relative items-center"
          >
            <div className="relative w-full">
              <Search className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search cosmetics, cream, oil, soap, shampoo, brand, or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-24 py-2.5 text-xs bg-gray-100/80 hover:bg-gray-100 focus:bg-white border border-transparent focus:border-purple-500 rounded-full focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all text-gray-900"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-xs font-bold transition-colors shadow-xs"
              >
                Search
              </button>
            </div>
          </form>

          {/* Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* WhatsApp Quick Order Button */}
            <a
              href={`https://wa.me/${shopPhone}?text=${encodeURIComponent("Hello! I want to order from your shop.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all shadow-2xs"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp Help</span>
            </a>

            {/* My Orders / Tracking */}
            <Link
              href="/store/orders"
              className="p-2 text-gray-700 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors relative flex items-center gap-1 text-xs font-semibold"
              title="My Orders"
            >
              <Package className="w-5 h-5" />
              <span className="hidden xl:inline">Orders</span>
            </Link>

            {/* Wishlist */}
            <Link
              href="/store/wishlist"
              className="p-2 text-gray-700 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors relative"
              title="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {mounted && wishlist.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-pink-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-xs">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* Customer Account Button */}
            {mounted && customerUser ? (
              <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-xl px-2.5 py-1.5 text-xs text-purple-900 font-bold shadow-2xs">
                {customerUser.avatarUrl ? (
                  <img src={customerUser.avatarUrl} alt="" loading="lazy" decoding="async" className="w-4 h-4 rounded-full" />
                ) : (
                  <User className="w-3.5 h-3.5 text-purple-600" />
                )}
                <span className="max-w-[80px] sm:max-w-[110px] truncate">{customerUser.name.split(" ")[0]}</span>
                {customerUser.isVerified && (
                  <span title="Verified Customer">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    logoutCustomer();
                    document.cookie = "falcon_customer_phone=; path=/; max-age=0";
                    window.location.reload();
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 rounded ml-0.5 cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-all shadow-2xs"
              >
                <User className="w-3.5 h-3.5 text-purple-600" />
                <span>Sign In</span>
              </button>
            )}

            {/* Cart Button */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 active:scale-95 transition-all"
            >
              <span className="relative inline-flex items-center">
                <ShoppingCart className="w-4 h-4" />
                {mounted && itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-4 h-4 bg-amber-400 text-black text-[9px] font-black rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </span>
              <span className="hidden sm:inline">₹{mounted ? subtotal : 0}</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-xl md:hidden"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-2.5 md:hidden">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search cosmetics, cream, oil, soap, shampoo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-20 py-2 text-xs bg-gray-100/80 hover:bg-gray-100 focus:bg-white border border-transparent focus:border-purple-500 rounded-full focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all text-gray-900"
            />
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-bold"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Category Pills Strip with mobile scroll fade cue */}
      <div className="relative border-t border-gray-100 bg-gray-50/70">
        <div className="overflow-x-auto scrollbar-none py-2 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center gap-2 min-w-max pr-6">
            <Link
              href="/store/products"
              className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 shrink-0 hover:bg-purple-200 transition-colors"
            >
              🔥 All Products
            </Link>
            <Link
              href="/store/offers"
              className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shrink-0 hover:bg-amber-200 transition-colors flex items-center gap-1"
            >
              <Tag className="w-3 h-3 text-amber-700" />
              Today&apos;s Offers
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/store/category/${cat.id}`}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-gray-700 border border-gray-200 hover:border-purple-300 hover:text-purple-700 shrink-0 transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
        {/* Subtle Right Fade Gradient to signal horizontal scroll */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 via-gray-50/80 to-transparent sm:hidden" />
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-4 space-y-3 animate-in slide-in-from-top duration-200">
          {/* Mobile User Profile Section */}
          <div className="pb-3 border-b border-gray-100">
            {mounted && customerUser ? (
              <div className="flex items-center justify-between bg-purple-50 p-3 rounded-2xl border border-purple-100">
                <div className="flex items-center gap-2">
                  {customerUser.avatarUrl ? (
                    <img src={customerUser.avatarUrl} alt="" loading="lazy" decoding="async" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                      {customerUser.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs text-gray-900">{customerUser.name}</span>
                      {customerUser.isVerified && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500">
                      {customerUser.phone ? `+91 ${customerUser.phone}` : customerUser.email}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logoutCustomer();
                    document.cookie = "falcon_customer_phone=; path=/; max-age=0";
                    window.location.reload();
                  }}
                  className="px-2.5 py-1 text-rose-600 bg-white rounded-lg border border-rose-200 text-xs font-bold cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsAuthModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Sign In with Mobile Number</span>
              </button>
            )}
          </div>

          <div className="space-y-1 font-semibold text-xs text-gray-800">
            <Link
              href="/store"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block p-2 rounded-lg hover:bg-purple-50 hover:text-purple-700"
            >
              🏠 Home
            </Link>
            <Link
              href="/store/products"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block p-2 rounded-lg hover:bg-purple-50 hover:text-purple-700 text-purple-700 font-bold"
            >
              🛍️ All Products Catalog (View All)
            </Link>
            <Link
              href="/store/offers"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block p-2 rounded-lg hover:bg-purple-50 hover:text-purple-700"
            >
              🏷️ Today&apos;s Offers & Discounts
            </Link>
            <Link
              href="/store/orders"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block p-2 rounded-lg hover:bg-purple-50 hover:text-purple-700"
            >
              📦 My Orders & 1-Click Repeat Order
            </Link>
            <Link
              href="/store/wishlist"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block p-2 rounded-lg hover:bg-purple-50 hover:text-purple-700"
            >
              💖 Saved Favorites
            </Link>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <a
              href={`https://wa.me/${shopPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              <MessageCircle className="w-4 h-4" />
              Chat / Order on WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* Customer Login / Auth Modal */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </header>
  );
};
