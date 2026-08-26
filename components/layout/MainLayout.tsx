"use client";

import React, { useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

export function MainLayout({
  children,
  title,
  subtitle,
  hideHeader = false,
  hideMobileNav = false,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  hideHeader?: boolean;
  hideMobileNav?: boolean;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-surface-canvas text-gray-900 font-sans antialiased">
      {/* Sidebar (Desktop Persistent + Mobile Drawer) */}
      <AppSidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!hideHeader && (
          <AppHeader
            title={title}
            subtitle={subtitle}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          />
        )}
        <main className="flex-1 p-3 sm:p-6 pb-20 md:pb-6 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Home, Products, POS, Sales, More) */}
      {!hideMobileNav && (
        <MobileBottomNav onOpenMenu={() => setIsMobileMenuOpen(true)} />
      )}
    </div>
  );
}
