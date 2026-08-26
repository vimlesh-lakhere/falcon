"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Receipt,
  Users,
  MessageSquare,
  Building2,
  BarChart3,
  Sparkles,
  Settings,
  Store,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StoreSwitcher } from "@/components/layout/StoreSwitcher";
import { useAuthStore } from "@/store/useAuthStore";

const navigationItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, shortcut: "G D" },
  { name: "POS / Billing", href: "/pos", icon: ShoppingCart, shortcut: "G P", highlight: true },
  { name: "Online Orders", href: "/sales?tab=online", icon: Store, badge: "Live" },
  { name: "Products", href: "/products", icon: Package },
  { name: "Inventory", href: "/inventory", icon: Boxes, shortcut: "G I" },
  { name: "Purchases", href: "/purchases", icon: Truck },
  { name: "Sales & Invoices", href: "/sales", icon: Receipt, shortcut: "G S" },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Customer Requests", href: "/requests", icon: MessageSquare },
  { name: "Suppliers", href: "/suppliers", icon: Building2 },
  { name: "Reports & P&L", href: "/reports", icon: BarChart3, shortcut: "G R" },
  { name: "AI Center", href: "/ai-center", icon: Sparkles, badge: "AI" },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface AppSidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({ isMobileOpen = false, onMobileClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { currentStore, profile } = useAuthStore();

  const activeStoreName = currentStore?.name || "AGS Store";
  const userName = profile?.full_name || "Store Owner";
  const userInitials = userName.slice(0, 2).toUpperCase();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-surface-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-sm font-bold text-base">
              F
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm text-gray-900 leading-tight">
                Falcon ERP
              </span>
              <span className="text-[10px] text-gray-400 font-medium tracking-tight">
                Enterprise Store Suite
              </span>
            </div>
          </div>

          {/* Close button for Mobile Drawer */}
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="md:hidden p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Dynamic Multi-Store Switcher */}
        <StoreSwitcher />
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => onMobileClose?.()}
              className={cn(
                "group relative flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all",
                isActive
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                item.highlight && !isActive && "text-brand-600 bg-brand-50/40 hover:bg-brand-50"
              )}
            >
              {/* Active Indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-brand-600 rounded-r-md" />
              )}

              <div className="flex items-center gap-2.5">
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isActive ? "text-brand-600" : "text-gray-400 group-hover:text-gray-600",
                    item.badge && "text-brand-600 animate-pulse"
                  )}
                />
                <span>{item.name}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {item.badge && (
                  <span className="bg-brand-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-brand-600" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Store Location / User info footer */}
      <Link
        href="/profile"
        onClick={() => onMobileClose?.()}
        className="p-3.5 border-t border-surface-border bg-gray-50/60 hover:bg-gray-100/80 transition-colors block"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {userInitials}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs font-bold text-gray-900 truncate">{userName}</span>
            <span className="text-[10px] text-gray-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {activeStoreName}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (md+) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-surface-border flex-col shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-over Drawer (< md) */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={onMobileClose}
          />
          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
