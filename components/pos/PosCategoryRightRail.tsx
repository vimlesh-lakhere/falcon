"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  MoveUp,
  MoveDown,
  Sparkles,
  Check,
  X,
  Palette,
  Layers,
} from "lucide-react";
import { Category, Product } from "@/types/database";
import {
  CATEGORY_ICON_LIST,
  resolveCategoryIcon,
  inferCategoryIconKey,
} from "@/lib/category-icons";
import { Button } from "@/components/ui/Button";

interface PosCategoryRightRailProps {
  categories: Category[];
  products: Product[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  shopId: string;
}

export const PosCategoryRightRail: React.FC<PosCategoryRightRailProps> = ({
  categories,
  products,
  selectedCategoryId,
  onSelectCategory,
  shopId,
}) => {
  const [orderedCategories, setOrderedCategories] = useState<Category[]>([]);
  const [customIcons, setCustomIcons] = useState<Record<string, string>>({});
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedCatForIcon, setSelectedCatForIcon] = useState<Category | null>(null);

  const orderStorageKey = `falcon_pos_cat_order_${shopId}`;
  const iconStorageKey = `falcon_cat_icons_${shopId}`;

  // Load custom order & icons
  useEffect(() => {
    try {
      const savedIcons = localStorage.getItem(iconStorageKey);
      if (savedIcons) {
        setCustomIcons(JSON.parse(savedIcons));
      }

      const savedOrder = localStorage.getItem(orderStorageKey);
      if (savedOrder) {
        const orderIds: string[] = JSON.parse(savedOrder);
        const map = new Map(categories.map((c) => [c.id, c]));
        const sorted: Category[] = [];

        orderIds.forEach((id) => {
          if (map.has(id)) {
            sorted.push(map.get(id)!);
            map.delete(id);
          }
        });

        map.forEach((c) => sorted.push(c));
        setOrderedCategories(sorted);
        return;
      }
    } catch (e) {
      console.warn("Could not load category settings from localStorage", e);
    }
    setOrderedCategories(categories);
  }, [categories, shopId, orderStorageKey, iconStorageKey]);

  // Product count map
  const productCountMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      if (p.category_id) {
        map[p.category_id] = (map[p.category_id] || 0) + 1;
      }
    });
    return map;
  }, [products]);

  // Reorder handlers
  const moveCategory = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedCategories.length) return;

    const updated = [...orderedCategories];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setOrderedCategories(updated);
    try {
      localStorage.setItem(
        orderStorageKey,
        JSON.stringify(updated.map((c) => c.id))
      );
    } catch (e) {
      console.warn("Could not persist category order", e);
    }
  };

  // Change icon handler
  const setCategoryIcon = (categoryId: string, iconKey: string) => {
    const updated = { ...customIcons, [categoryId]: iconKey };
    setCustomIcons(updated);
    try {
      localStorage.setItem(iconStorageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn("Could not persist custom icons", e);
    }
    setSelectedCatForIcon(null);
  };

  return (
    <>
      {/* Right Slim Category Rail */}
      <aside className="w-14 sm:w-16 bg-white border-l border-gray-200 flex flex-col items-center py-2 h-full select-none shrink-0 shadow-xs z-10">
        {/* Settings Button */}
        <button
          type="button"
          onClick={() => setIsSettingsModalOpen(true)}
          className="w-10 h-10 mb-2 rounded-xl bg-gray-50 hover:bg-purple-50 text-gray-500 hover:text-purple-700 flex items-center justify-center transition-all cursor-pointer group shadow-2xs"
          title="Customize Category Icons & Priority Order"
        >
          <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
        </button>

        {/* Scrollable Icons Container */}
        <div className="flex-1 w-full overflow-y-auto space-y-2 px-1.5 flex flex-col items-center no-scrollbar">
          {/* ALL Products Icon */}
          <button
            type="button"
            onClick={() => onSelectCategory("all")}
            className={`w-full py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer relative group ${
              selectedCategoryId === "all"
                ? "bg-gradient-to-b from-purple-600 to-indigo-700 text-white shadow-md scale-105"
                : "bg-gray-50 hover:bg-gray-100 text-gray-700"
            }`}
            title={`All Products (${products.length})`}
          >
            {React.createElement(resolveCategoryIcon("all", "All", customIcons), {
              className: `w-5 h-5 ${selectedCategoryId === "all" ? "text-white" : "text-purple-600"}`,
            })}
            <span className="text-[9px] font-black truncate max-w-full mt-0.5 leading-none">
              All
            </span>
            <span
              className={`text-[8px] font-bold px-1 rounded-full mt-0.5 ${
                selectedCategoryId === "all"
                  ? "bg-purple-800/60 text-purple-100"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {products.length}
            </span>
          </button>

          {/* Category Icons List */}
          {orderedCategories.map((cat) => {
            const count = productCountMap[cat.id] || 0;
            const isSelected = selectedCategoryId === cat.id;
            const IconComp = resolveCategoryIcon(cat.id, cat.name, customIcons);

            // Extract short 1-word label (e.g. "Shanti Amla 20" -> "Amla" or first word)
            const shortLabel = cat.name.split(/[ |/-]/)[0].trim().slice(0, 7);

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`w-full py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer relative group ${
                  isSelected
                    ? "bg-gradient-to-b from-purple-600 to-indigo-700 text-white shadow-md scale-105"
                    : "bg-gray-50 hover:bg-purple-50 text-gray-700 hover:text-purple-900 border border-transparent hover:border-purple-200"
                }`}
                title={`${cat.name} (${count} items)`}
              >
                <IconComp
                  className={`w-5 h-5 ${
                    isSelected ? "text-white" : "text-purple-600 group-hover:scale-110"
                  } transition-transform`}
                />
                <span className="text-[9px] font-bold truncate max-w-full mt-0.5 leading-none">
                  {shortLabel}
                </span>
                {count > 0 && (
                  <span
                    className={`text-[8px] font-bold px-1 rounded-full mt-0.5 ${
                      isSelected
                        ? "bg-purple-800/60 text-purple-100"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Category Icons & Priority Management Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-purple-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black">Category Icons & Priority</h3>
                  <p className="text-[11px] text-purple-200">
                    Arrange categories and choose custom icons
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSettingsModalOpen(false);
                  setSelectedCatForIcon(null);
                }}
                className="p-1.5 hover:bg-white/20 rounded-xl transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedCatForIcon ? (
                /* Icon Picker Subview */
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-800">
                      Pick Icon for: <span className="text-purple-700">{selectedCatForIcon.name}</span>
                    </span>
                    <button
                      onClick={() => setSelectedCatForIcon(null)}
                      className="text-xs text-gray-500 hover:text-gray-800 font-bold"
                    >
                      Back to list
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORY_ICON_LIST.map((item) => {
                      const IconComp = item.icon;
                      const isCurrent =
                        customIcons[selectedCatForIcon.id] === item.key ||
                        (!customIcons[selectedCatForIcon.id] &&
                          inferCategoryIconKey(selectedCatForIcon.name) === item.key);

                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setCategoryIcon(selectedCatForIcon.id, item.key)}
                          className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                            isCurrent
                              ? "bg-purple-50 border-purple-600 text-purple-700 shadow-sm"
                              : "border-gray-200 hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          <IconComp className="w-6 h-6 text-purple-600" />
                          <span className="text-[10px] font-bold leading-tight line-clamp-1">
                            {item.label.split("/")[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Priority & Icon List */
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">
                    Use <span className="font-bold text-gray-700">▲ / ▼</span> to reorder top categories, or tap <span className="font-bold text-purple-700">Icon</span> to change icon:
                  </p>

                  <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                    {orderedCategories.map((cat, index) => {
                      const IconComp = resolveCategoryIcon(cat.id, cat.name, customIcons);
                      const count = productCountMap[cat.id] || 0;

                      return (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between p-2 bg-gray-50 hover:bg-purple-50/50 rounded-xl border border-gray-200 transition-all gap-2"
                        >
                          {/* Icon Trigger */}
                          <button
                            type="button"
                            onClick={() => setSelectedCatForIcon(cat)}
                            className="p-1.5 bg-white border border-gray-200 hover:border-purple-500 rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
                            title="Click to change icon"
                          >
                            <IconComp className="w-4 h-4 text-purple-600" />
                            <Palette className="w-3 h-3 text-gray-400" />
                          </button>

                          {/* Category Name & Count */}
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-gray-900 block truncate">
                              {cat.name}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {count} products
                            </span>
                          </div>

                          {/* Up / Down Controls */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => moveCategory(index, "up")}
                              className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-purple-100 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                              title="Move Up"
                            >
                              <MoveUp className="w-3.5 h-3.5 text-gray-700" />
                            </button>
                            <button
                              type="button"
                              disabled={index === orderedCategories.length - 1}
                              onClick={() => moveCategory(index, "down")}
                              className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-purple-100 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                              title="Move Down"
                            >
                              <MoveDown className="w-3.5 h-3.5 text-gray-700" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsSettingsModalOpen(false);
                  setSelectedCatForIcon(null);
                }}
                className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold"
              >
                <Check className="w-4 h-4 mr-1" /> Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
