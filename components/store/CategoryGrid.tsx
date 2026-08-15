"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Heart, Zap, Package, Scissors, ShieldAlert, Coffee } from "lucide-react";
import { Category } from "@/types/database";

interface CategoryGridProps {
  categories: Category[];
}

const CATEGORY_ICONS: Record<string, string> = {
  cosmetics: "💄",
  beauty: "✨",
  "hair care": "💇‍♀️",
  "skin care": "🧴",
  "hair accessories": "🎀",
  groceries: "🌾",
  "daily essentials": "🧼",
  "oral care": "🪥",
  kitchen: "🍳",
  "baby care": "🍼",
};

export const CategoryGrid: React.FC<CategoryGridProps> = ({ categories }) => {
  // If no dynamic categories are available, provide standard default tiles
  const displayCategories =
    categories.length > 0
      ? categories
      : [
          { id: "cat-cosmetics", name: "Cosmetics & Makeup" },
          { id: "cat-hair", name: "Hair Oil & Care" },
          { id: "cat-skin", name: "Face & Skin Care" },
          { id: "cat-accessories", name: "Hair Accessories" },
          { id: "cat-oral", name: "Ayurvedic Dental Care" },
          { id: "cat-daily", name: "Daily Essentials" },
        ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
      {displayCategories.map((cat, idx) => {
        const iconKey = Object.keys(CATEGORY_ICONS).find((k) =>
          cat.name.toLowerCase().includes(k)
        );
        const icon = iconKey ? CATEGORY_ICONS[iconKey] : "🛍️";

        return (
          <Link
            key={cat.id || idx}
            href={`/store/category/${cat.id}`}
            className="group flex flex-col items-center text-center p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-100 hover:border-purple-300 hover:shadow-md hover:bg-purple-50/40 transition-all duration-200"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 group-hover:from-purple-200 group-hover:to-pink-100 flex items-center justify-center text-2xl sm:text-3xl mb-2.5 shadow-2xs group-hover:scale-105 transition-transform">
              {icon}
            </div>
            <span className="text-xs font-bold text-gray-800 group-hover:text-purple-700 line-clamp-1">
              {cat.name}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">Explore &rarr;</span>
          </Link>
        );
      })}
    </div>
  );
};
