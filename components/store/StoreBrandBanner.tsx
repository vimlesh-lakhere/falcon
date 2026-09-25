"use client";

import React from "react";
import { MapPin, Navigation, Phone } from "lucide-react";
import { phoneDigits, useStoreProfile } from "@/components/store/StoreProfileContext";

/**
 * Home-page welcome banner: the shop name in Hindi + English, its address and one-tap
 * "Directions" / "Call" buttons. Also carries the page's single <h1> (the shop name), which is
 * what search engines read first for queries like "Aarti General Store Chhatarpur".
 */
export function StoreBrandBanner() {
  const p = useStoreProfile();
  if (!p) return null;
  const tel = phoneDigits(p.phone);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-rose-600 to-purple-800 text-white shadow-xl">
      <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-amber-300/25 blur-3xl pointer-events-none" />
      <div className="relative p-5 sm:p-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-amber-200">
            🙏 स्वागत है
          </p>
          <h1 className="font-black leading-tight">
            {p.brandNameHi && (
              <span lang="hi" className="block text-3xl sm:text-5xl tracking-tight drop-shadow-sm">
                {p.brandNameHi}
              </span>
            )}
            <span className="block text-base sm:text-2xl text-white/95 mt-1">
              {p.brandName}
              {p.city ? `, ${p.city}` : ""}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-white/90">
            {p.taglineHi && (
              <span lang="hi" className="block font-semibold">
                {p.taglineHi}
              </span>
            )}
            <span className="block">{p.tagline}</span>
          </p>
          {p.fullAddress && (
            <p className="flex items-start gap-1.5 text-xs sm:text-sm text-white/95 pt-1">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-amber-200" />
              <span>{p.fullAddress}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <a
            href={p.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-rose-700 font-black text-xs sm:text-sm shadow-md active:scale-95 transition-transform"
          >
            <Navigation className="w-4 h-4" /> दुकान का रास्ता
          </a>
          {tel && (
            <a
              href={`tel:+${tel}`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/15 border border-white/40 text-white font-black text-xs sm:text-sm active:scale-95 transition-transform"
            >
              <Phone className="w-4 h-4" /> Call
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
