"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Tag, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";

interface BannerSlide {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  bgGradient: string;
  badgeColor: string;
  highlightText: string;
}

const BANNERS: BannerSlide[] = [
  {
    id: "cosmetics",
    tag: "✨ BEAUTY & COSMETICS SALE",
    title: "100% Authentic Beauty & Hair Care",
    subtitle: "Glow & Lovely, Lakme, Herbal Tooth Powder, Shampoos & Hair Oils at Wholesale Prices.",
    ctaText: "Shop Cosmetics",
    ctaLink: "/store",
    bgGradient: "from-purple-900 via-indigo-900 to-slate-900",
    badgeColor: "bg-purple-500/30 text-purple-200 border-purple-400/40",
    highlightText: "UP TO 35% OFF",
  },
  {
    id: "fast_village_delivery",
    tag: "⚡ TOWN & VILLAGE FAST DELIVERY",
    title: "Order Online • Pay Cash or UPI at Doorstep",
    subtitle: "Same-day doorstep delivery to all local mohallas, colonies, and nearby villages.",
    ctaText: "Explore Essentials",
    ctaLink: "/store",
    bgGradient: "from-brand-900 via-purple-900 to-indigo-950",
    badgeColor: "bg-emerald-500/30 text-emerald-200 border-emerald-400/40",
    highlightText: "FREE DISPATCH",
  },
  {
    id: "festival_offers",
    tag: "🎁 FESTIVAL SPECIAL OFFERS",
    title: "Daily Essentials & Household Combos",
    subtitle: "Stock up on soaps, detergents, tooth care, and personal hygiene essentials.",
    ctaText: "View Offers",
    ctaLink: "/store/offers",
    bgGradient: "from-amber-950 via-red-950 to-slate-900",
    badgeColor: "bg-amber-500/30 text-amber-200 border-amber-400/40",
    highlightText: "BIG SAVINGS",
  },
];

export const HeroBannerCarousel: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BANNERS.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const slide = BANNERS[currentSlide];

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-xl">
      <div
        className={`bg-gradient-to-r ${slide.bgGradient} text-white p-6 sm:p-10 transition-all duration-700 min-h-[260px] sm:min-h-[300px] flex flex-col justify-between relative`}
      >
        {/* Ambient Glow */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Tag */}
        <div className="flex items-center justify-between z-10">
          <span
            className={`text-[10px] sm:text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border backdrop-blur-xs ${slide.badgeColor}`}
          >
            {slide.tag}
          </span>
          <span className="text-xs font-black text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-400/30">
            {slide.highlightText}
          </span>
        </div>

        {/* Main Content */}
        <div className="space-y-2 sm:space-y-3 my-4 z-10 max-w-2xl">
          <h2 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
            {slide.title}
          </h2>
          <p className="text-xs sm:text-sm text-purple-100/90 max-w-xl line-clamp-2 sm:line-clamp-none">
            {slide.subtitle}
          </p>
        </div>

        {/* CTA & Dots */}
        <div className="flex items-center justify-between z-10 pt-2">
          <Link
            href={slide.ctaLink}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-purple-50 text-purple-950 font-black text-xs sm:text-sm shadow-lg transition-all active:scale-95 group"
          >
            <span>{slide.ctaText}</span>
            <ArrowRight className="w-4 h-4 text-purple-700 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Carousel Dots */}
          <div className="flex items-center gap-1.5">
            {BANNERS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentSlide(i)}
                className={`h-2 rounded-full transition-all ${
                  currentSlide === i ? "w-6 bg-white" : "w-2 bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
