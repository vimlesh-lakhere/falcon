"use client";

import React from "react";
import { Store, Menu } from "lucide-react";
import { NotificationsDropdown } from "@/components/ui/NotificationsDropdown";
import { QuickActionMenu } from "@/components/ui/QuickActionMenu";
import { useAuthStore } from "@/store/useAuthStore";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  onOpenMobileMenu?: () => void;
}

export function AppHeader({ title, subtitle, onOpenMobileMenu }: AppHeaderProps) {
  const { currentStore, currentBranch, profile } = useAuthStore();
  const shopId = currentStore?.id || profile?.store_id || "";
  const storeName = currentStore?.name || (profile ? "My Store" : "Falcon Store");

  const isMasterOwner =
    profile?.email === "vimlesh.lakhere@gmail.com" ||
    profile?.email === "vlakhere@gmail.com" ||
    profile?.email === "owner_1786762700828@agsstore.com";

  return (
    <header className="h-14 sm:h-16 border-b border-surface-border bg-white px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile Hamburger & Title / Breadcrumb section */}
      <div className="flex items-center gap-2.5 min-w-0">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-sm sm:text-lg font-bold text-gray-900 leading-tight truncate">
            {title || "Falcon ERP"}
          </h1>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-gray-500 truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Action icons & utilities */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Branch / Status badge (Desktop) */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="truncate max-w-[120px]">{storeName}</span>
          <span className="text-[10px] text-emerald-600 bg-emerald-100/80 px-1.5 py-0.5 rounded font-mono">
            {currentBranch?.name ? currentBranch.name.replace(`${storeName} `, "") : "Main"}
          </span>
        </div>

        {/* View Customer Storefront Button (Only for Master Owner) */}
        {isMasterOwner && (
          <a
            href={shopId ? `/store?shop=${shopId}` : "/store"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition-all shadow-2xs"
            title="Open Customer Storefront in new tab"
          >
            <Store className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden sm:inline">Store</span>
            <span className="text-[10px] text-purple-500">↗</span>
          </a>
        )}

        {/* Quick Add Menu */}
        <QuickActionMenu />

        {/* Notifications Dropdown */}
        <NotificationsDropdown shopId={shopId} />
      </div>
    </header>
  );
}
