"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onOpenMenu: () => void;
}

export function MobileBottomNav({ onOpenMenu }: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/dashboard", icon: LayoutDashboard },
    { name: "Products", href: "/products", icon: Package },
    { name: "POS", href: "/pos", icon: ShoppingCart, isPos: true },
    { name: "Sales", href: "/sales", icon: Receipt },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl px-2 py-1.5 flex items-center justify-around">
      {navItems.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard" || pathname === "/"
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        if (item.isPos) {
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex flex-col items-center -mt-5 group"
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95",
                  isActive
                    ? "bg-gradient-to-tr from-brand-600 to-indigo-600 text-white ring-4 ring-brand-100"
                    : "bg-brand-600 text-white hover:bg-brand-700"
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={cn(
                  "text-[10px] font-bold mt-1 tracking-tight",
                  isActive ? "text-brand-600" : "text-gray-600"
                )}
              >
                POS Bill
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex flex-col items-center py-1 px-3 rounded-lg transition-all",
              isActive
                ? "text-brand-600 font-bold"
                : "text-gray-500 hover:text-gray-800"
            )}
          >
            <Icon
              className={cn(
                "w-5 h-5 transition-transform active:scale-90",
                isActive ? "text-brand-600 scale-105" : "text-gray-400"
              )}
            />
            <span className="text-[10px] mt-0.5">{item.name}</span>
          </Link>
        );
      })}

      {/* More / Menu Drawer Trigger */}
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex flex-col items-center py-1 px-3 text-gray-500 hover:text-gray-800 rounded-lg transition-all cursor-pointer"
      >
        <Menu className="w-5 h-5 text-gray-400" />
        <span className="text-[10px] mt-0.5">More</span>
      </button>
    </nav>
  );
}
