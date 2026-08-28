"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  ArrowUpDown,
  MoveUp,
  MoveDown,
  Sparkles,
  Check,
  X,
  Tag,
  Grid,
  ChevronRight,
} from "lucide-react";
import { Category, Product } from "@/types/database";
import { Button } from "@/components/ui/Button";

interface PosCategorySidebarProps {
  categories: Category[];
  products: Product[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  shopId: string;
}

export const PosCategorySidebar: React.FC<PosCategorySidebarProps> = ({
  categories,
  products,
  selectedCategoryId,
  onSelectCategory,
  shopId,
}) => {
  const [orderedCategories, setOrderedCategories] = useState<Category[]>([]);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

  const storageKey = `falcon_pos_cat_order_${shopId}`;

  // Load custom category order
  useEffect(() => {
    try {
      const savedOrder = localStorage.getItem(storageKey);
      if (savedOrder) {
        const orderIds: string[] = JSON.parse(savedOrder);
        const map = new Map(categories.map((c) => [c.id, c]));
        const sorted: Category[] = [];

        // First add categories in saved order
        orderIds.forEach((id) => {
          if (map.has(id)) {
            sorted.push(map.get(id)!);
            map.delete(id);
          }
        });

        // Add any new categories not yet in order
        map.forEach((c) => sorted.push(c));
        setOrderedCategories(sorted);
        return;
      }
    } catch (e) {
      console.warn("Failed to load category order:", e);
    }
    setOrderedCategories(categories);
  }, [categories, storageKey]);

  // Compute product count per category
  const productCountMap = React.useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      if (p.category_id) {
        counts[p.category_id] = (counts[p.category_id] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  // Move category up or down in reorder modal
  const moveCategory = (index: number, direction: "up" | "down") => {
    const updated = [...orderedCategories];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= updated.length) return;

    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setOrderedCategories(updated);
    try {
      const orderIds = updated.map((c) => c.id);
      localStorage.setItem(storageKey, JSON.stringify(orderIds));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <aside className="w-48 xl:w-52 bg-gray-50/90 border-r border-gray-200 flex flex-col shrink-0 h-full overflow-hidden select-none">
        {/* Header & Reorder Trigger */}
        <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white/60">
          <div className="flex items-center gap-1.5 text-xs font-black text-gray-800">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>Categories</span>
          </div>
          <button
            type="button"
            onClick={() => setIsReorderModalOpen(true)}
            className="p-1 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
            title="Reorder Category Order"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Categories Vertical List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {/* All Products Item */}
          <button
            type="button"
            onClick={() => onSelectCategory("all")}
            className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between group cursor-pointer ${
              selectedCategoryId === "all"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20"
                : "text-gray-700 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200"
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <Grid className={`w-3.5 h-3.5 ${selectedCategoryId === "all" ? "text-amber-300" : "text-gray-400"}`} />
              <span className="truncate">All Products</span>
            </div>
            <span
              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                selectedCategoryId === "all"
                  ? "bg-white/20 text-white"
                  : "bg-gray-200/80 text-gray-600 group-hover:bg-gray-200"
              }`}
            >
              {products.length}
            </span>
          </button>

          {/* Categorized Items */}
          {orderedCategories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            const count = productCountMap[cat.id] || 0;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between group cursor-pointer ${
                  isSelected
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20"
                    : "text-gray-700 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  <Tag className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-amber-300" : "text-gray-400"}`} />
                  <span className="truncate">{cat.name}</span>
                </div>
                <span
                  className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 ml-1 ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-gray-200/80 text-gray-600 group-hover:bg-gray-200"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Reorder Categories Modal */}
      {isReorderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 bg-gradient-to-r from-purple-600 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="text-base font-black">Arrange Category Priority</h3>
                  <p className="text-xs text-purple-100">Set which category appears on top for faster billing</p>
                </div>
              </div>
              <button
                onClick={() => setIsReorderModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-gray-100">
              {orderedCategories.map((cat, idx) => (
                <div
                  key={cat.id}
                  className="pt-2 first:pt-0 flex items-center justify-between gap-2 p-2 hover:bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-gray-800 truncate">{cat.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveCategory(idx, "up")}
                      className="p-1.5 bg-gray-100 hover:bg-purple-100 hover:text-purple-700 disabled:opacity-30 disabled:pointer-events-none rounded-lg text-gray-600 transition-all cursor-pointer"
                      title="Move Up"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === orderedCategories.length - 1}
                      onClick={() => moveCategory(idx, "down")}
                      className="p-1.5 bg-gray-100 hover:bg-purple-100 hover:text-purple-700 disabled:opacity-30 disabled:pointer-events-none rounded-lg text-gray-600 transition-all cursor-pointer"
                      title="Move Down"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
              <Button
                onClick={() => setIsReorderModalOpen(false)}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-5 rounded-xl shadow-xs"
              >
                <Check className="w-4 h-4 mr-1" /> Done Arranging
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
