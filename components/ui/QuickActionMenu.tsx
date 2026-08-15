"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Plus, ShoppingCart, PackagePlus, UserPlus, Truck, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function QuickActionMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const actions = [
    { label: "New POS Sale", href: "/pos", icon: ShoppingCart, shortcut: "N" },
    { label: "Add Product", href: "/products?action=new", icon: PackagePlus },
    { label: "Add Customer", href: "/customers?action=new", icon: UserPlus },
    { label: "New Purchase Order", href: "/purchases?action=new", icon: Truck },
    { label: "Customer Request", href: "/requests?action=new", icon: MessageSquarePlus },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <Button
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-1.5 font-semibold shadow-sm bg-brand-600 hover:bg-brand-700 text-white"
      >
        <Plus className="w-4 h-4" />
        <span>Quick Add</span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Quick Actions
          </div>
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <Link
                key={act.label}
                href={act.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-gray-400 group-hover:text-brand-600" />
                  <span>{act.label}</span>
                </div>
                {act.shortcut && (
                  <span className="text-[10px] font-bold text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded">
                    {act.shortcut}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
