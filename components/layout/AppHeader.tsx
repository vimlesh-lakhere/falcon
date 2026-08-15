"use client";

import React from "react";
import { Search, Store } from "lucide-react";
import { NotificationsDropdown } from "@/components/ui/NotificationsDropdown";
import { QuickActionMenu } from "@/components/ui/QuickActionMenu";

import { useAuthStore } from "@/store/useAuthStore";

export function AppHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { currentStore, currentBranch } = useAuthStore();
  const shopId = currentStore?.id || "a0000000-0000-0000-0000-000000000001";
  const storeName = currentStore?.name || "AGS Store";

  return (
    <header className="h-16 border-b border-surface-border bg-white px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Title / Breadcrumb section */}
      <div>
        <h1 className="text-lg font-bold text-gray-900 leading-tight">{title || "Falcon ERP"}</h1>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>

      {/* Action icons & utilities */}
      <div className="flex items-center gap-3">
        {/* Branch / Status badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{storeName}</span>
          <span className="text-[10px] text-emerald-600 bg-emerald-100/80 px-1.5 py-0.5 rounded font-mono">
            {currentBranch?.name ? currentBranch.name.replace(`${storeName} `, "") : "Main"}
          </span>
        </div>

        {/* View Customer Storefront Button */}
        <a
          href="/store"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition-all shadow-2xs"
          title="Open Customer Storefront in new tab"
        >
          <Store className="w-3.5 h-3.5 text-purple-600" />
          <span className="hidden sm:inline">Online Store</span>
          <span className="text-[10px] text-purple-500">↗</span>
        </a>

        {/* Quick Add Menu */}
        <QuickActionMenu />

        {/* Notifications Dropdown */}
        <NotificationsDropdown shopId={shopId} />
      </div>
    </header>
  );
}
