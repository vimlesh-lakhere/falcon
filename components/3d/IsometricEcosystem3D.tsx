"use client";

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Boxes,
  ShoppingCart,
  Globe,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Zap,
  Layers,
  ArrowRight,
  Barcode,
  Receipt,
  RotateCw,
} from "lucide-react";

export function IsometricEcosystem3D() {
  const [activeTab, setActiveTab] = useState<"erp" | "pos" | "web">("erp");
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [rotation, setRotation] = useState({ x: 10, y: -6 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Responsive 3D parallax sway
    const targetX = 14 - y * 12; // rotateX between 2deg and 14deg
    const targetY = -12 + x * 14; // rotateY between -12deg and 2deg
    setRotation({ x: targetX, y: targetY });
  }, []);

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 10, y: -6 });
  };

  return (
    <div
      className="relative w-full max-w-5xl mx-auto py-10 perspective-1500"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Main 3D Tilted Stage Container */}
      <div
        ref={stageRef}
        className="relative transition-transform duration-300 ease-out preserve-3d"
        style={{
          transform: `perspective(1200px) rotateX(${rotation.x.toFixed(
            1
          )}deg) rotateY(${rotation.y.toFixed(1)}deg) rotateZ(0.5deg)`,
        }}
      >
        {/* Under-deck 3D Shadow Plate */}
        <div
          className="absolute inset-x-8 -bottom-8 h-20 bg-indigo-950/60 rounded-3xl blur-2xl -z-10 pointer-events-none"
          style={{ transform: "translateZ(-40px)" }}
        />

        {/* Floating Holographic Badge 1: Top-Left GST Pill */}
        <div
          className="absolute -top-5 -left-3 sm:-left-6 z-40 px-3.5 py-1.5 rounded-xl bg-[#0F172A]/90 backdrop-blur-xl border border-teal-500/40 text-teal-300 text-xs font-semibold shadow-xl shadow-teal-950/50 flex items-center gap-2 pointer-events-none animate-float-3d"
          style={{ transform: "translateZ(55px)" }}
        >
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span className="font-mono">GST & E-Way Ready</span>
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
        </div>

        {/* Floating Holographic Badge 2: Top-Right Revenue Metric */}
        <div
          className="absolute -top-6 -right-2 sm:-right-6 z-40 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-950/90 to-slate-900/90 backdrop-blur-xl border border-emerald-500/40 text-white text-xs font-bold shadow-2xl shadow-emerald-950/50 flex items-center gap-2.5 pointer-events-none animate-float-3d-reverse"
          style={{ transform: "translateZ(65px)" }}
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">Retail Margin</div>
            <div className="text-sm font-black text-emerald-300 font-mono">+38.4% Net</div>
          </div>
        </div>

        {/* Floating Holographic Badge 3: Bottom-Left Barcode Speed */}
        <div
          className="absolute -bottom-6 -left-2 sm:-left-4 z-40 px-3.5 py-2 rounded-xl bg-[#0D1220]/95 backdrop-blur-xl border border-indigo-500/40 text-slate-200 text-xs shadow-xl shadow-indigo-950/50 flex items-center gap-2.5 pointer-events-none animate-float-3d"
          style={{ transform: "translateZ(50px)" }}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <div>
            <span className="font-mono text-xs font-bold text-white">0.2s</span>
            <span className="text-[10px] text-slate-400 ml-1.5">Offline Barcode Sync</span>
          </div>
        </div>

        {/* Main 3D Display Deck */}
        <div
          className="rounded-3xl border border-white/20 bg-gradient-to-b from-[#0F1527]/95 via-[#0B0F1E]/95 to-[#060810]/95 p-3 sm:p-5 backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(15,23,42,0.9)] overflow-hidden"
          style={{ transform: "translateZ(10px)" }}
        >
          {/* Deck Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white/[0.03] border-b border-white/10 rounded-2xl font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/90 inline-block shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-amber-500/90 inline-block shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/90 inline-block shadow-sm" />
              <span className="ml-2 text-slate-400 font-bold hidden sm:inline">
                falcon360.in/3d-control-center
              </span>
            </div>

            {/* Interactive Tab Switcher in 3D */}
            <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("erp")}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "erp"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Cloud ERP</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("pos")}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "pos"
                    ? "bg-teal-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Smart POS</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("web")}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "web"
                    ? "bg-purple-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Web Store</span>
              </button>
            </div>
          </div>

          {/* Dynamic Tab Body */}
          <div className="p-4 sm:p-6 min-h-[360px]">
            {activeTab === "erp" && (
              <div className="space-y-5 animate-in fade-in-50 duration-300">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-[10px] uppercase font-mono text-slate-400">Total Active SKUs</div>
                    <div className="text-xl font-black text-white font-mono mt-1">12,480</div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">● Real-time Sync</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-[10px] uppercase font-mono text-slate-400">Today&apos;s Invoices</div>
                    <div className="text-xl font-black text-teal-400 font-mono mt-1">₹1,84,320</div>
                    <div className="text-[10px] text-teal-300 mt-0.5">34 orders settled</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-[10px] uppercase font-mono text-slate-400">Stock Alerts</div>
                    <div className="text-xl font-black text-amber-400 font-mono mt-1">4 Low Stock</div>
                    <div className="text-[10px] text-amber-300 mt-0.5">Auto-reorder ready</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-[10px] uppercase font-mono text-slate-400">Connected Branches</div>
                    <div className="text-xl font-black text-indigo-400 font-mono mt-1">3 Locations</div>
                    <div className="text-[10px] text-indigo-300 mt-0.5">Delhi, Jaipur, Mumbai</div>
                  </div>
                </div>

                {/* Real-time Sales Velocity Sparkline Graph */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-950/20 via-black/40 to-indigo-950/20 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                      <span className="font-bold text-white">Live Store Sales Velocity</span>
                    </div>
                    <span className="font-mono text-teal-400 text-xs font-bold">+18.2% vs Yesterday</span>
                  </div>

                  {/* SVG Chart */}
                  <div className="h-16 w-full">
                    <svg viewBox="0 0 500 70" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,55 Q60,40 120,48 T240,25 T360,35 T480,12 L500,8 L500,70 L0,70 Z"
                        fill="url(#chartGlow)"
                      />
                      <path
                        d="M0,55 Q60,40 120,48 T240,25 T360,35 T480,12 L500,8"
                        fill="none"
                        stroke="#2dd4bf"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <circle cx="500" cy="8" r="4" fill="#2dd4bf" className="animate-ping" />
                      <circle cx="500" cy="8" r="3" fill="#ffffff" />
                    </svg>
                  </div>
                </div>

                {/* Simulated Data Table */}
                <div className="rounded-xl border border-white/10 bg-black/30 overflow-hidden font-mono text-xs">
                  <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/10 text-slate-400 text-[11px] grid grid-cols-5 font-semibold">
                    <span className="col-span-2">PRODUCT LINE</span>
                    <span>STOCK</span>
                    <span>CARTON / UNIT</span>
                    <span className="text-right">GST STATUS</span>
                  </div>
                  <div className="divide-y divide-white/5 text-slate-300">
                    <div className="px-4 py-2.5 grid grid-cols-5 items-center hover:bg-white/[0.03]">
                      <span className="col-span-2 font-sans font-medium text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal-400" />
                        Premium Hair Bands Box (Carton of 48)
                      </span>
                      <span className="text-emerald-400">85 Cartons</span>
                      <span>₹4,200 / ctn</span>
                      <span className="text-right text-emerald-400">E-Way Generated</span>
                    </div>
                    <div className="px-4 py-2.5 grid grid-cols-5 items-center hover:bg-white/[0.03]">
                      <span className="col-span-2 font-sans font-medium text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                        Korean Matte Hair Claws (12 Pcs Pack)
                      </span>
                      <span className="text-slate-300">320 Units</span>
                      <span>₹360 / pack</span>
                      <span className="text-right text-teal-400">Tax Invoice 18%</span>
                    </div>
                    <div className="px-4 py-2.5 grid grid-cols-5 items-center hover:bg-white/[0.03]">
                      <span className="col-span-2 font-sans font-medium text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                        Super Grip Rubber Bands (1kg Bag)
                      </span>
                      <span className="text-amber-400">12 Bags</span>
                      <span>₹280 / kg</span>
                      <span className="text-right text-slate-400">Auto-Billed</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "pos" && (
              <div className="space-y-4 animate-in fade-in-50 duration-300">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-950/40 via-indigo-950/20 to-transparent border border-teal-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center">
                      <Barcode className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Ultra-Fast Barcode Scanner Ready</h4>
                      <p className="text-xs text-slate-400">
                        Plug-and-play USB/Bluetooth scanner with instant local cache lookup
                      </p>
                    </div>
                  </div>
                  <div className="px-4 py-1.5 rounded-xl bg-teal-500/20 text-teal-300 font-mono text-xs font-bold border border-teal-500/30">
                    SCANNER READY: 0.2s
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                    <div className="flex justify-between text-slate-400 pb-2 border-b border-white/10">
                      <span>SCAN QUEUE (TABLET / DESKTOP)</span>
                      <span className="text-emerald-400">ONLINE</span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span>1x Velvet Scrunchie Combo</span>
                      <span>₹180</span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span>3x Metal Pearl Hair Pins</span>
                      <span>₹270</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-bold pt-2 border-t border-white/10 text-sm">
                      <span>TOTAL PAYABLE</span>
                      <span>₹450</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                    <div className="text-slate-400 pb-2 border-b border-white/10 flex justify-between">
                      <span>QUICK SETTLEMENT CHANNELS</span>
                      <span className="text-indigo-400">MULTI-PAY</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-sans font-semibold">
                      <div className="p-2 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300">
                        UPI QR Pay
                      </div>
                      <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
                        Cash Bill
                      </div>
                      <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300">
                        Split Card
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans text-center">
                      Auto-triggers 2-inch & 3-inch ESC/POS thermal printer receipt instantly.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "web" && (
              <div className="space-y-4 animate-in fade-in-50 duration-300">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 to-indigo-950/30 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-white">Custom Web App & B2B Wholesale Portal</h4>
                    <p className="text-xs text-slate-300">
                      Live example: The House of HRB wholesale catalog with carton calculation & direct WhatsApp orders
                    </p>
                  </div>
                  <Link
                    href="/store"
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>View Store Demo</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Direct WhatsApp RFQ</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Customers send structured quotation cart straight to owner WhatsApp with 1 tap.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-teal-400" />
                      <span>B2B Master Carton Logic</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Dual pricing for wholesale cartons & retail units with packing & transport freight calculator.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                      <span>Zero Marketplace Cut</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      100% direct client ownership on your custom domain with fast Cloudflare edge CDN.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
