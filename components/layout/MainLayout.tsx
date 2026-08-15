"use client";

import React from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";

export function MainLayout({
  children,
  title,
  subtitle,
  hideHeader = false,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  hideHeader?: boolean;
}) {
  return (
    <div className="min-h-screen flex bg-surface-canvas text-gray-900 font-sans">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {!hideHeader && <AppHeader title={title} subtitle={subtitle} />}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
