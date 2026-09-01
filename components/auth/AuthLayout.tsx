"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Sparkles, Store, CheckCircle2, ArrowRight } from "lucide-react";

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-surface-canvas font-sans selection:bg-brand-500 selection:text-white">
      {/* Left Ambient SaaS Hero Panel (visible on lg+) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-950 via-brand-900 to-slate-950 p-12 text-white flex-col justify-between relative overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-white/20 shrink-0">
            <img src="/icons/icon-192x192.png" alt="Falcon Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
              Falcon ERP
              <span className="bg-brand-500/30 text-indigo-200 text-xs px-2 py-0.5 rounded-full border border-indigo-400/30">
                AGS Store
              </span>
            </h1>
            <p className="text-xs text-indigo-200">Enterprise Retail & Wholesale Platform</p>
          </div>
        </div>

        {/* Center Testimonial / Value Prop */}
        <div className="relative z-10 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-xs font-semibold text-indigo-100">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            Empowering Indian Wholesale & Retail Stores
          </div>

          <h2 className="text-3xl font-extrabold leading-tight text-white">
            High-Speed POS Billing, Real-Time Inventory & Multi-Branch Management.
          </h2>

          <div className="space-y-3 pt-2">
            {[
              "Sub-second POS checkout with barcode scanner integration",
              "Automated PostgreSQL ledger triggers for real-time stock sync",
              "Customer-specific wholesale price contracts & credit tracking",
              "Full role-based access control with audited security logs",
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs text-indigo-100 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Security Badge */}
        <div className="relative z-10 flex items-center justify-between text-xs text-indigo-300 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>256-bit Encrypted Session • Supabase Auth</span>
          </div>
          <span>v1.0 Production</span>
        </div>
      </div>

      {/* Right Interactive Auth Form Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-lg overflow-hidden shadow-xs shrink-0">
              <img src="/icons/icon-192x192.png" alt="Falcon Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-bold text-gray-900 leading-tight block">Falcon ERP</span>
              <span className="text-[11px] text-gray-500">AGS Store Management</span>
            </div>
          </div>

          {/* Form Titles */}
          <div className="space-y-1 text-left">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h2>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>

          {/* Form Content Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            {children}
          </div>

          {/* Global Footer Help Links */}
          <div className="text-center text-xs text-gray-400 space-x-4">
            <Link href="/" className="hover:text-gray-600 transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/" className="hover:text-gray-600 transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <Link href="/" className="hover:text-gray-600 transition-colors">
              Store Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
