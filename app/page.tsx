"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Zap,
  Boxes,
  ShoppingCart,
  Globe,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Receipt,
  Store,
  BarChart3,
  Layers,
  MessageCircle,
  Sparkles,
  Phone,
  Mail,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Laptop,
  Check,
  Server,
  Star,
  Users,
  Menu,
  X,
} from "lucide-react";

export default function FalconHomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"erp" | "pos" | "web">("erp");
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    businessName: "",
    service: "all",
    phone: "",
    message: "",
  });

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    setInquirySubmitted(true);
  };

  const generateWhatsAppUrl = () => {
    const text = encodeURIComponent(
      `Hi Falcon 360 Team, I am interested in your solutions.\nName: ${formData.name || "Client"}\nBusiness: ${formData.businessName || "Retail/Enterprise"}\nService: ${formData.service}\nPhone: ${formData.phone}`
    );
    return `https://wa.me/919999999999?text=${text}`;
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 selection:bg-indigo-500 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Glow Effects Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[20%] w-[650px] h-[650px] bg-indigo-600/15 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute top-[30%] right-[-10%] w-[550px] h-[550px] bg-purple-600/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-[10%] left-[5%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px]" />
      </div>

      {/* Top Banner: Quick Access */}
      <div className="relative z-50 bg-gradient-to-r from-indigo-950/80 via-purple-950/80 to-indigo-950/80 border-b border-indigo-500/20 px-4 py-2 text-center text-xs text-indigo-200">
        <span className="font-semibold text-white">✨ Falcon 360 Ecosystem Live</span> — Cloud ERP, Fast POS, and Tailor-made Websites for Indian Retailers & Enterprises.
      </div>

      {/* Navigation Bar */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-[#07090E]/80 border-b border-white/10 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0B0F19] rounded-[10px] flex items-center justify-center">
                <Zap className="w-6 h-6 text-indigo-400 group-hover:text-white transition-colors" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white font-mono">FALCON</span>
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent text-xl font-black font-mono">360</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Cloud
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">Enterprise & Retail OS</p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#erp" className="hover:text-white transition-colors">Cloud ERP</a>
            <a href="#pos" className="hover:text-white transition-colors">Smart POS</a>
            <a href="#custom-web" className="hover:text-white transition-colors">Custom Websites</a>
            <a href="#demos" className="hover:text-white transition-colors">Live Demos</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact & Quote</a>
          </div>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/store"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition-all flex items-center gap-1.5"
            >
              <Store className="w-3.5 h-3.5 text-indigo-400" />
              <span>Store Demo</span>
            </Link>

            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-1.5"
            >
              <span>ERP Portal Login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/10 bg-[#0B0F19] px-4 py-5 space-y-4 animate-in slide-in-from-top-2">
            <div className="flex flex-col gap-3 text-sm font-medium text-slate-200">
              <a onClick={() => setMobileMenuOpen(false)} href="#erp" className="py-1 hover:text-indigo-400">Cloud ERP</a>
              <a onClick={() => setMobileMenuOpen(false)} href="#pos" className="py-1 hover:text-indigo-400">Smart POS</a>
              <a onClick={() => setMobileMenuOpen(false)} href="#custom-web" className="py-1 hover:text-indigo-400">Custom Websites</a>
              <a onClick={() => setMobileMenuOpen(false)} href="#demos" className="py-1 hover:text-indigo-400">Live Demos</a>
              <a onClick={() => setMobileMenuOpen(false)} href="#contact" className="py-1 hover:text-indigo-400">Contact & Quote</a>
            </div>
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
              <Link
                href="/store"
                className="w-full py-2.5 text-center text-xs font-semibold rounded-lg bg-white/5 border border-white/10 text-white"
              >
                View Storefront Demo
              </Link>
              <Link
                href="/login"
                className="w-full py-2.5 text-center text-xs font-bold rounded-lg bg-indigo-600 text-white shadow-md"
              >
                ERP Portal Login
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-16 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-semibold tracking-wide backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
            <span>Complete 360° Technology Suite for Growing Businesses</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1]">
            Next-Gen <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">ERP & POS</span> With Bespoke Web Solutions.
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            Falcon 360 brings together powerful <strong>Cloud ERP</strong>, ultra-fast <strong>Retail POS Billing</strong>, and <strong>Custom Client Websites</strong>. We help retail stores, distributors, and brands manage everything from barcode scanning to online customer orders.
          </p>

          {/* CTA Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#contact"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            >
              <span>Get Custom Solution / Quote</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <a
              href="#demos"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/15 font-semibold text-sm backdrop-blur-md flex items-center justify-center gap-2 transition-all"
            >
              <Laptop className="w-4 h-4 text-indigo-400" />
              <span>Explore Live Interactive Demos</span>
            </a>
          </div>

          {/* Trust stats */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto border-t border-white/10 text-left">
            <div>
              <div className="text-2xl font-black text-white font-mono">0.2s</div>
              <div className="text-xs text-slate-400">Barcode Lookup Speed</div>
            </div>
            <div>
              <div className="text-2xl font-black text-indigo-400 font-mono">100%</div>
              <div className="text-xs text-slate-400">GST & Multi-Branch Ready</div>
            </div>
            <div>
              <div className="text-2xl font-black text-purple-400 font-mono">99.9%</div>
              <div className="text-xs text-slate-400">High Availability Cloud</div>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono">24/7</div>
              <div className="text-xs text-slate-400">Dedicated Support</div>
            </div>
          </div>
        </div>

        {/* Hero Interactive Preview Card Mockup */}
        <div className="mt-14 relative mx-auto max-w-5xl rounded-2xl border border-white/15 bg-gradient-to-b from-white/10 to-white/5 p-2 sm:p-4 backdrop-blur-xl shadow-2xl shadow-indigo-950/50">
          <div className="rounded-xl bg-[#0B0F19] border border-white/10 overflow-hidden shadow-inner">
            {/* Window bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#080B13] border-b border-white/10 text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 text-slate-500">falcon360.in/ecosystem</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-emerald-400 text-[11px] font-sans">Live System Connected</span>
              </div>
            </div>

            {/* Mockup Content */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Pillar 1 Preview */}
              <div className="rounded-xl p-5 bg-white/[0.03] border border-indigo-500/20 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">Falcon Cloud ERP</h3>
                <p className="text-xs text-slate-400">Real-time stock control, supplier Kharidi parchi, multi-branch, and profit/loss analytics.</p>
                <div className="pt-2">
                  <Link href="/login" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                    Open ERP Portal <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Pillar 2 Preview */}
              <div className="rounded-xl p-5 bg-white/[0.03] border border-purple-500/20 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">Smart POS Billing</h3>
                <p className="text-xs text-slate-400">Keyboard shortcuts, thermal printing, barcode scan, and split-second checkout for cashiers.</p>
                <div className="pt-2">
                  <Link href="/pos" className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1">
                    Launch POS Demo <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Pillar 3 Preview */}
              <div className="rounded-xl p-5 bg-white/[0.03] border border-pink-500/20 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">Custom Web Development</h3>
                <p className="text-xs text-slate-400">Tailor-made e-commerce storefronts and company websites with instant ERP inventory sync.</p>
                <div className="pt-2">
                  <Link href="/store" className="text-xs font-semibold text-pink-400 hover:text-pink-300 flex items-center gap-1">
                    View Storefront Demo <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE 3 CORE PILLARS DETAILED SHOWCASE */}
      <section id="erp" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">What We Build & Deliver</span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white">Three Pillars. One Powerhouse.</h2>
          <p className="text-sm text-slate-400">
            Whether you need a full enterprise software, a point-of-sale machine setup, or a bespoke website for your brand — we engineer everything end-to-end.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex justify-center mb-10">
          <div className="p-1.5 rounded-2xl bg-white/5 border border-white/10 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setActiveTab("erp")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "erp"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>1. Cloud ERP System</span>
            </button>

            <button
              onClick={() => setActiveTab("pos")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "pos"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>2. High-Speed POS</span>
            </button>

            <button
              onClick={() => setActiveTab("web")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "web"
                  ? "bg-pink-600 text-white shadow-lg shadow-pink-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>3. Custom Client Websites</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Cloud ERP */}
        {activeTab === "erp" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-gradient-to-br from-indigo-950/40 via-[#0B0F19] to-transparent p-6 sm:p-10 rounded-3xl border border-indigo-500/20 animate-in fade-in">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 text-xs font-bold">
                <Boxes className="w-4 h-4" /> Cloud ERP Operating System
              </div>
              <h3 className="text-2xl sm:text-4xl font-bold text-white">
                Total Control of Your Inventory, Branches & Cash Flow.
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Designed for retail chains, distributors, and modern shops. Track stock across multiple branches in real-time, generate GST invoices, manage supplier ledgers, and maintain customer demand pads with zero friction.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">Multi-Branch Realtime Stock Sync</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">Automated GST Invoicing & Tax Filing</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">Supplier Ledger & Purchase Tracking</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">Quick Kharidi Parchi (Shortage Pad)</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">Gross Margin & Net Profit Reports</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">Role-Based Access (Owner, Cashier, Manager)</span>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <Link
                  href="/login"
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  <span>Access ERP Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="rounded-2xl bg-[#07090E] border border-white/10 p-6 space-y-4 shadow-xl">
              <div className="text-xs font-mono text-slate-400 border-b border-white/10 pb-3 flex justify-between">
                <span>MODULE: ERP_CORE</span>
                <span className="text-emerald-400">ACTIVE: 100%</span>
              </div>
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                      ₹
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Today&apos;s Store Sales</div>
                      <div className="text-[10px] text-slate-400">Auto-synced across POS & Online</div>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-white font-mono">₹84,250.00</span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Estimated Net Profit Margin</div>
                      <div className="text-[10px] text-slate-400">COGS & Tax calculated live</div>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-emerald-400 font-mono">+28.4%</span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                      <Boxes className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Low Stock Warning System</div>
                      <div className="text-[10px] text-slate-400">12 items pending supplier reorder</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                    Reorder Alert
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: High-Speed POS */}
        {activeTab === "pos" && (
          <div id="pos" className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-gradient-to-br from-purple-950/40 via-[#0B0F19] to-transparent p-6 sm:p-10 rounded-3xl border border-purple-500/20 animate-in fade-in">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-purple-500/10 text-purple-300 text-xs font-bold">
                <Receipt className="w-4 h-4" /> Point of Sale (POS) Hardware & Software
              </div>
              <h3 className="text-2xl sm:text-4xl font-bold text-white">
                Ultra-Fast Billing Terminal. Built for Zero Cashier Queues.
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Whether you use desktop PC, barcode scanners, touch screen POS machines, or thermal receipt printers — Falcon POS guarantees sub-second checkout speeds so you never make a customer wait.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">Instant Barcode & QR Code Scanner</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">58mm & 80mm ESC/POS Thermal Printing</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">Keyboard-Only Fast Billing Shortcuts</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">Hold & Recall Multiple Carts</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">Split Tender (Cash, UPI, Card, Udhar)</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">Customer Loyalty Points & Credit Ledger</span>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <Link
                  href="/pos"
                  className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Launch Live POS Demo</span>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl bg-[#07090E] border border-white/10 p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-white/10 pb-3">
                <span>TERMINAL #01 (READY)</span>
                <span className="text-purple-400">SHORTCUT: [N] NEW BILL</span>
              </div>
              <div className="space-y-2 font-mono text-xs">
                <div className="p-3 rounded-lg bg-white/[0.03] flex justify-between items-center text-slate-300">
                  <span>ITEM 1: Lakme Matte Lipstick</span>
                  <span className="font-bold text-white">₹350.00</span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.03] flex justify-between items-center text-slate-300">
                  <span>ITEM 2: Nivea Soft Cream 200ml</span>
                  <span className="font-bold text-white">₹290.00</span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.03] flex justify-between items-center text-slate-300">
                  <span>ITEM 3: Maybelline FitMe Powder</span>
                  <span className="font-bold text-white">₹520.00</span>
                </div>
                <div className="pt-3 border-t border-white/10 flex justify-between items-center text-sm font-bold text-white">
                  <span>TOTAL BILL (INCL GST):</span>
                  <span className="text-purple-400 text-base">₹1,160.00</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Custom Web Development */}
        {activeTab === "web" && (
          <div id="custom-web" className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-gradient-to-br from-pink-950/40 via-[#0B0F19] to-transparent p-6 sm:p-10 rounded-3xl border border-pink-500/20 animate-in fade-in">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-pink-500/10 text-pink-300 text-xs font-bold">
                <Globe className="w-4 h-4" /> Bespoke Client Web Solutions
              </div>
              <h3 className="text-2xl sm:text-4xl font-bold text-white">
                Personalized Websites & Online Stores Crafted For Your Brand.
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                We design and engineer high-converting, tailored websites and e-commerce portals specifically for our clients. Every site connects directly with your Falcon ERP so inventory, orders, and customer data sync automatically.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">Custom E-Commerce Storefronts</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">100% Realtime Sync with Falcon ERP</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">Mobile-First, Ultra-Fast Loading (Next.js)</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">Direct WhatsApp Order & OTP Login</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">Custom Domain & SSL Setup Included</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">SEO & Google Search Optimized</span>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <Link
                  href="/store"
                  className="px-6 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-lg shadow-pink-600/30 flex items-center gap-2"
                >
                  <Store className="w-4 h-4" />
                  <span>View Live Client Store Demo</span>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl bg-[#07090E] border border-white/10 p-6 space-y-4 shadow-xl">
              <div className="text-xs font-mono text-slate-400 border-b border-white/10 pb-3 flex justify-between">
                <span>SHOWCASE: AGS STOREFRONT</span>
                <span className="text-pink-400">STATUS: LIVE PRODUCTION</span>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold">
                    AGS
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">AGS Cosmetics & Retail Store</h4>
                    <p className="text-xs text-slate-400">Custom E-Commerce Portal Powered by Falcon</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300">
                  Featuring instant product search, category browsing, wishlist, live customer cart, and direct WhatsApp order fulfillment.
                </p>
                <div className="pt-2">
                  <Link
                    href="/store"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-400 hover:underline"
                  >
                    <span>Browse AGS Storefront</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* LIVE INTERACTIVE ECOSYSTEM DEMOS */}
      <section id="demos" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Try Everything Live</span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white">Experience Falcon 360 Firsthand</h2>
          <p className="text-sm text-slate-400">
            Click on any live module below to interact with our real software and storefront environments right now.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Demo 1: Online Storefront */}
          <div className="group rounded-2xl bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 hover:border-pink-500/50 p-6 space-y-4 transition-all hover:scale-[1.02]">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-400 flex items-center justify-center group-hover:bg-pink-500 group-hover:text-white transition-all">
              <Store className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400">Customer Facing</span>
              <h3 className="text-xl font-bold text-white">Live Storefront Demo</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Explore how your customers browse products, view offers, manage carts, and place instant orders online.
            </p>
            <div className="pt-2">
              <Link
                href="/store"
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-pink-600 border border-white/10 hover:border-transparent text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <span>Launch Storefront</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Demo 2: Smart POS */}
          <div className="group rounded-2xl bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 hover:border-purple-500/50 p-6 space-y-4 transition-all hover:scale-[1.02]">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-all">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Cashier Terminal</span>
              <h3 className="text-xl font-bold text-white">High-Speed POS Billing</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Experience cashier checkout with barcode simulation, keyboard shortcuts, instant discounts, and thermal printing.
            </p>
            <div className="pt-2">
              <Link
                href="/pos"
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-purple-600 border border-white/10 hover:border-transparent text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <span>Launch POS Terminal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Demo 3: ERP Control Room */}
          <div className="group rounded-2xl bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 hover:border-indigo-500/50 p-6 space-y-4 transition-all hover:scale-[1.02]">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Admin Control</span>
              <h3 className="text-xl font-bold text-white">Falcon ERP Dashboard</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Login to access full store analytics, purchases, inventory status, customer demands, and supplier registers.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-indigo-600 border border-white/10 hover:border-transparent text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <span>Login to ERP Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE FALCON 360 */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Engineered for Indian Commerce</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Why Indian Retailers & Brands Choose Falcon 360
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Unlike generic international software, Falcon 360 is built ground-up for the daily realities of Indian retail: high-speed foot traffic, barcode printing, GST compliance, supplier credit, and instant customer WhatsApp communications.
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Sub-Second Performance</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Zero lag during peak festival rush hours. Your cashier never gets stuck.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Enterprise Cloud Security</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Automated backups, row-level data isolation, and encrypted cloud storage in Mumbai.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Custom Domain & Branding</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Your website runs on your own domain (e.g. yourstore.in) with your logo and colors.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Project Inquiry & Lead Capture Form */}
          <div id="contact" className="rounded-3xl bg-gradient-to-b from-[#0F1423] to-[#07090E] border border-white/15 p-6 sm:p-10 shadow-2xl space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Get in Touch</span>
              <h3 className="text-2xl font-bold text-white">Start Your Project With Us</h3>
              <p className="text-xs text-slate-400">
                Want a custom website, dedicated POS software, or a complete Cloud ERP for your business? Tell us what you need.
              </p>
            </div>

            {inquirySubmitted ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3 animate-in zoom-in">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-white">Thank You for Reaching Out!</h4>
                <p className="text-xs text-slate-300">
                  We received your inquiry. Our team will contact you on <strong>{formData.phone}</strong> shortly.
                </p>
                <div className="pt-2">
                  <a
                    href={generateWhatsAppUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Connect Immediately on WhatsApp</span>
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Business / Store Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Retail Store"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Mobile / WhatsApp No. *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Service You Are Interested In</label>
                  <select
                    value={formData.service}
                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0B0F19] border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="all">Complete Falcon 360 Ecosystem (ERP + POS + Website)</option>
                    <option value="erp">Cloud ERP System (Inventory, GST, Branches)</option>
                    <option value="pos">High-Speed POS Software & Hardware</option>
                    <option value="custom-web">Bespoke / Custom Client Website Development</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Project Requirements (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Tell us about your store type, number of branches, or custom website expectations..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Submit Inquiry</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <a
                    href={generateWhatsAppUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span>WhatsApp Direct</span>
                  </a>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/10 bg-[#05060A] py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white font-mono">FALCON</span>
              <span className="text-lg font-black text-indigo-400 font-mono">360</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Empowering Indian retail, wholesale, and enterprises with modern Cloud ERP, fast POS terminals, and custom digital web solutions.
            </p>
            <div className="text-[11px] text-slate-500 font-mono">
              Server: ap-south-1 (Mumbai) • SSL Secured
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Solutions</h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li><a href="#erp" className="hover:text-white transition-colors">Cloud ERP Platform</a></li>
              <li><a href="#pos" className="hover:text-white transition-colors">Smart POS Terminal</a></li>
              <li><a href="#custom-web" className="hover:text-white transition-colors">Custom Websites</a></li>
              <li><a href="#demos" className="hover:text-white transition-colors">Storefront Demo</a></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Live Access</h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li><Link href="/login" className="hover:text-white transition-colors">ERP Portal Login</Link></li>
              <li><Link href="/store" className="hover:text-white transition-colors">AGS Online Store</Link></li>
              <li><Link href="/pos" className="hover:text-white transition-colors">POS Terminal</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Admin Dashboard</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Contact & Support</h4>
            <div className="space-y-2 text-xs text-slate-400">
              <p className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span>falcon360.in</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>support@falcon360.in</span>
              </p>
              <p className="flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp Business Active</span>
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-10 mt-10 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 Falcon 360 Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Enterprise Grade</span>
            <span>•</span>
            <span>GST Ready</span>
            <span>•</span>
            <span>Multi-Branch Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
