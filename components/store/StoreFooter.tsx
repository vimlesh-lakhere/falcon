"use client";

import React from "react";
import Link from "next/link";
import {
  Store,
  Phone,
  MessageCircle,
  Truck,
  ShieldCheck,
  Clock,
  MapPin,
  Heart,
  Sparkles,
} from "lucide-react";

interface StoreFooterProps {
  shopName?: string;
  shopPhone?: string;
  shopAddress?: string;
}

export const StoreFooter: React.FC<StoreFooterProps> = ({
  shopName = "Falcon Store",
  shopPhone = "",
  shopAddress = "",
}) => {
  return (
    <footer className="bg-slate-900 text-white pt-12 pb-8 border-t border-slate-800">
      {/* 4 Feature Badges for Customer Trust */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Local Village & Town Delivery</div>
              <div className="text-[10px] text-slate-400">Fast doorstep dispatch</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">100% Original Products</div>
              <div className="text-[10px] text-slate-400">Direct authentic brands</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Pay on Delivery</div>
              <div className="text-[10px] text-slate-400">Cash or UPI at doorstep</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">WhatsApp Support</div>
              <div className="text-[10px] text-slate-400">Direct shop owner contact</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Content Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
        {/* Col 1: Brand & Bio */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm">
              <Store className="w-4 h-4" />
            </div>
            <span className="font-black text-lg tracking-tight text-white">{shopName}</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your trusted local destination for authentic cosmetics, branded beauty products, hair care, personal grooming, and daily home essentials.
          </p>
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Open Today: 8:00 AM - 9:30 PM</span>
          </div>
        </div>

        {/* Col 2: Quick Links */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">Customer Links</h4>
          <ul className="space-y-1.5 text-xs text-slate-300">
            <li>
              <Link href="/store/products" className="hover:text-white transition-colors">
                All Products Catalog
              </Link>
            </li>
            <li>
              <Link href="/store/offers" className="hover:text-white transition-colors">
                Today&apos;s Offers & Deals
              </Link>
            </li>
            <li>
              <Link href="/store/orders" className="hover:text-white transition-colors">
                My Orders & 1-Click Repeat Order
              </Link>
            </li>
            <li>
              <Link href="/store/wishlist" className="hover:text-white transition-colors">
                Saved Favorites
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Popular Categories */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">Categories</h4>
          <ul className="space-y-1.5 text-xs text-slate-300">
            <li>Cosmetics & Face Makeup</li>
            <li>Hair Oil, Shampoo & Accessories</li>
            <li>Skin Care & Body Lotions</li>
            <li>Ayurvedic & Herbal Dental Care</li>
            <li>Daily Grocery & Home Essentials</li>
          </ul>
        </div>

        {/* Col 4: Shop Contact */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">Shop Location & Contact</h4>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span>{shopAddress}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-purple-400 shrink-0" />
              <span>+91 {shopPhone}</span>
            </div>
          </div>

          <a
            href={`https://wa.me/${shopPhone}?text=${encodeURIComponent("Hello, I want to inquire about products.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp Helpline
          </a>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
        <div className="flex items-center gap-2">
          <span>&copy; {new Date().getFullYear()} {shopName}.</span>
          <span className="inline-flex items-center gap-1.5 text-slate-400">
            Powered by{" "}
            <img src="/falcon-icon.png" alt="Falcon 360" className="w-3.5 h-3.5 object-contain inline-block" />
            <strong className="text-slate-300 font-mono font-bold">FALCON 360</strong>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>Town & Village Delivery Guaranteed</span>
          <span>•</span>
          <span>100% Genuine Quality</span>
        </div>
      </div>
    </footer>
  );
};
