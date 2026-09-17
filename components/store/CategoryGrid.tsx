"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, X, Grid, Sparkles, ArrowRight, ChevronRight } from "lucide-react";
import { Category } from "@/types/database";

interface CategoryGridProps {
  categories: Category[];
  loading?: boolean;
  priorityCategoryIds?: string[];
}

const CATEGORY_KEYWORD_ICONS: Array<{ keywords: string[]; icon: string }> = [
  { keywords: ["lipstick", "lip", "lips"], icon: "💄" },
  { keywords: ["nail", "polish", "nailpaint"], icon: "💅" },
  { keywords: ["makeup", "cosmetic", "cosmetics"], icon: "💄" },
  { keywords: ["mehendi", "mehndi", "cone"], icon: "🌿" },
  { keywords: ["shindoor", "sindoor", "kumkum"], icon: "✨" },
  { keywords: ["perfume", "deo", "deodorant", "fragrance", "scent", "attar", "spray", "body spray"], icon: "🌸" },
  { keywords: ["hair oil", "oil", "tel", "tel|"], icon: "💆" },
  { keywords: ["hair color", "color", "dye", "rang"], icon: "🎨" },
  { keywords: ["hair accessories", "rubber", "clip", "band", "accessories", "saman"], icon: "🎀" },
  { keywords: ["hair", "haircare", "shampoo", "conditioner"], icon: "💇‍♀️" },
  { keywords: ["face cream", "skincare", "skin", "cream", "lotion", "moisturizer"], icon: "🧴" },
  { keywords: ["facewash", "scrub", "mask", "gel", "cleanser"], icon: "🧖" },
  { keywords: ["facial", "bleach", "glow"], icon: "✨" },
  { keywords: ["medical", "pharma", "medicine", "ointment", "cream"], icon: "💊" },
  { keywords: ["soap", "wash", "bathing", "bath", "sabun"], icon: "🧼" },
  { keywords: ["powder", "talc", "powder|"], icon: "🌸" },
  { keywords: ["sanitary", "pad", "hygiene", "napkin"], icon: "🌸" },
  { keywords: ["razor", "blade", "shav", "ustra"], icon: "🪒" },
  { keywords: ["baby", "infant", "child", "shishu"], icon: "🍼" },
  { keywords: ["toy", "toys", "khelona", "khilona", "game"], icon: "🧸" },
  { keywords: ["purse", "bag", "wallet", "batua"], icon: "👛" },
  { keywords: ["kitchen", "cook", "bartan", "utensil", "rasoi"], icon: "🍳" },
  { keywords: ["cloth", "garment", "housery", "hosiery", "wear", "dress", "textile"], icon: "👗" },
  { keywords: ["dental", "tooth", "oral", "brush", "paste", "dant"], icon: "🪥" },
  { keywords: ["grocery", "groceries", "ration", "kirana", "rice", "atta", "dal"], icon: "🌾" },
  { keywords: ["snack", "chips", "namkeen", "biscuit"], icon: "🍿" },
  { keywords: ["tea", "coffee", "beverage", "drink"], icon: "☕" },
  { keywords: ["sweet", "mithai", "chocolate"], icon: "🍫" },
  { keywords: ["stationery", "pen", "book", "copy"], icon: "📚" },
  { keywords: ["electronic", "mobile", "charger", "cable"], icon: "🔌" },
];

function resolveCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const entry of CATEGORY_KEYWORD_ICONS) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.icon;
    }
  }
  return "🛍️";
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  loading = false,
  priorityCategoryIds = [],
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sort categories: priority categories first, then alphabetical
  const sortedCategories = useMemo(() => {
    if (!categories || categories.length === 0) return [];
    if (!priorityCategoryIds || priorityCategoryIds.length === 0) return categories;

    const prioritySet = new Set(priorityCategoryIds);
    const highPriority: Category[] = [];
    const normalPriority: Category[] = [];

    categories.forEach((cat) => {
      if (prioritySet.has(cat.id)) {
        highPriority.push(cat);
      } else {
        normalPriority.push(cat);
      }
    });

    return [...highPriority, ...normalPriority];
  }, [categories, priorityCategoryIds]);

  const displayCategories =
    sortedCategories.length > 0
      ? sortedCategories
      : [
          { id: "cat-cosmetics", name: "Cosmetics & Makeup" },
          { id: "cat-hair", name: "Hair Oil & Care" },
          { id: "cat-skin", name: "Face & Skin Care" },
          { id: "cat-accessories", name: "Hair Accessories" },
          { id: "cat-oral", name: "Ayurvedic Dental Care" },
          { id: "cat-daily", name: "Daily Essentials" },
        ];

  // Up to 12 categories for the 2-row preview:
  // Mobile (grid-cols-3): items 0..5 (2 rows)
  // Tablet (sm:grid-cols-4): items 0..7 (2 rows)
  // Desktop (md:grid-cols-6): items 0..11 (2 rows)
  const previewCategories = displayCategories.slice(0, 12);

  // Filtered categories in full modal
  const filteredModalCategories = useMemo(() => {
    if (!modalSearch.trim()) return sortedCategories;
    const q = modalSearch.toLowerCase().trim();
    return sortedCategories.filter((c) => c.name.toLowerCase().includes(q));
  }, [sortedCategories, modalSearch]);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Exactly 2 Rows Preview Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 sm:gap-3.5">
        {previewCategories.map((cat: any, idx: number) => {
          const icon = resolveCategoryIcon(cat.name || "");
          // Mobile shows 0..5 (first 6). Tablet shows 0..7. Desktop shows 0..11.
          const visibilityClass =
            idx >= 8 ? "hidden md:flex" : idx >= 6 ? "hidden sm:flex" : "flex";

          return (
            <Link
              key={cat.id || idx}
              href={`/store/category/${cat.id}`}
              className={`${visibilityClass} flex-col items-center justify-between text-center p-2.5 sm:p-3 rounded-2xl bg-white border border-gray-100 hover:border-purple-300 hover:shadow-md hover:bg-purple-50/40 transition-all duration-200 group`}
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 group-hover:from-purple-200 group-hover:to-pink-100 flex items-center justify-center text-xl sm:text-2xl mb-2 shadow-2xs group-hover:scale-105 transition-transform overflow-hidden">
                {cat.image_url ? (
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="w-full h-full object-cover rounded-2xl"
                    loading="lazy"
                  />
                ) : (
                  <span>{icon}</span>
                )}
              </div>
              <div className="w-full">
                <span className="text-[11px] sm:text-xs font-bold text-gray-800 group-hover:text-purple-700 line-clamp-2 leading-tight">
                  {cat.name}
                </span>
                <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium block mt-0.5">
                  Explore &rarr;
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Action Bar: View All Categories & View All Products */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold transition-all shadow-2xs active:scale-98"
        >
          <Grid className="w-3.5 h-3.5 text-purple-600" />
          <span>View All Categories</span>
          {mounted && sortedCategories.length > 0 && (
            <span className="text-[10px] bg-purple-200 text-purple-900 px-1.5 py-0.5 rounded-full font-black">
              {sortedCategories.length}
            </span>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-purple-600" />
        </button>

        <Link
          href="/store/products"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-sm active:scale-98"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>View All Products</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Full "View All Categories" Modal / Bottom Sheet */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fadeIn">
          <div
            className="bg-white w-full max-w-2xl max-h-[85vh] sm:max-h-[80vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Grid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-gray-900 leading-tight">
                    All Categories ({sortedCategories.length})
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Explore items by category or search below
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-200/80 hover:bg-gray-300 flex items-center justify-center text-gray-700 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search within Categories */}
            <div className="p-4 border-b border-gray-100 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search category (e.g. Mehndi, Oil, Cream, Powder)..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-gray-100/80 hover:bg-gray-100 focus:bg-white border border-transparent focus:border-purple-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all text-gray-900"
                  autoFocus
                />
                {modalSearch && (
                  <button
                    type="button"
                    onClick={() => setModalSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Categories Scroll Grid */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              {filteredModalCategories.length === 0 ? (
                <div className="py-12 text-center text-gray-500 space-y-2">
                  <p className="text-sm font-bold">No category matched &ldquo;{modalSearch}&rdquo;</p>
                  <p className="text-xs text-gray-400">
                    Try searching for something else or view all products.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  {filteredModalCategories.map((cat: any) => {
                    const icon = resolveCategoryIcon(cat.name || "");
                    return (
                      <Link
                        key={cat.id}
                        href={`/store/category/${cat.id}`}
                        onClick={() => setIsModalOpen(false)}
                        className="flex flex-col items-center justify-between text-center p-3 rounded-2xl bg-gray-50/70 hover:bg-purple-50/60 border border-gray-100 hover:border-purple-300 transition-all group"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-2xl mb-1.5 shadow-2xs group-hover:scale-105 transition-transform overflow-hidden">
                          {cat.image_url ? (
                            <img
                              src={cat.image_url}
                              alt={cat.name}
                              className="w-full h-full object-cover rounded-2xl"
                              loading="lazy"
                            />
                          ) : (
                            <span>{icon}</span>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-gray-800 group-hover:text-purple-700 line-clamp-2 leading-tight">
                          {cat.name}
                        </span>
                        <span className="text-[9px] text-gray-400 font-medium block mt-0.5">
                          View &rarr;
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between gap-3">
              <Link
                href="/store/products"
                onClick={() => setIsModalOpen(false)}
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Explore Full Store Catalog (All Products)</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


