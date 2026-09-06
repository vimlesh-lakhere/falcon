"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Store, Check, ChevronsUpDown, PlusCircle, Building2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export function StoreSwitcher() {
  const { currentStore, availableStores, switchStore, fetchSession } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeStoreName = currentStore?.name || "My Store";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2.5 w-full px-3 py-2 bg-gray-50/80 hover:bg-gray-100/80 border border-surface-border rounded-xl transition-all text-left group shadow-2xs"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            <Store className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-gray-900 truncate flex items-center gap-1.5">
              {activeStoreName}
            </div>
            <div className="text-[10px] text-gray-500 truncate">
              {currentStore?.business_type || "Retail & Wholesale"}
            </div>
          </div>
        </div>
        <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 shrink-0" />
      </button>

      {/* Store Switcher Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Select Active Store
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {availableStores.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-500">Loading stores...</div>
            ) : (
              availableStores.map((store) => {
                const isSelected = currentStore?.id === store.id;
                return (
                  <button
                    key={store.id}
                    onClick={() => {
                      switchStore(store.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left ${
                      isSelected
                        ? "bg-brand-50 text-brand-700 font-bold"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2
                        className={`w-4 h-4 shrink-0 ${
                          isSelected ? "text-brand-600" : "text-gray-400"
                        }`}
                      />
                      <span className="truncate">{store.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Quick Action: Register new store */}
          <div className="pt-1.5 mt-1.5 border-t border-gray-100">
            <Link
              href="/register"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-brand-600 hover:bg-brand-50 rounded-lg font-semibold transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create New Store</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
