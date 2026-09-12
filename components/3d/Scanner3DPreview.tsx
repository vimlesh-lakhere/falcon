"use client";

import React, { useState, useEffect } from "react";
import { Barcode, CheckCircle2, Zap, Printer, Sparkles, ShoppingBag } from "lucide-react";

export function Scanner3DPreview() {
  const [scannedItemsCount, setScannedItemsCount] = useState(3);
  const [recentScanned, setRecentScanned] = useState({
    name: "Korean Velvet Hair Bow Clips",
    sku: "HRB-ACC-882",
    price: 340,
    time: "Just now",
  });
  const [isScanning, setIsScanning] = useState(true);

  // Simulated live periodic scan effect
  useEffect(() => {
    const products = [
      { name: "Korean Velvet Hair Bow Clips", sku: "HRB-ACC-882", price: 340 },
      { name: "Sadar Bazar Rubber Bands (1kg)", sku: "HRB-RB-019", price: 280 },
      { name: "Matte Pastel Hair Claws (Pack of 6)", sku: "HRB-CLAW-102", price: 210 },
      { name: "Satin Pearl Scrunchie Set", sku: "HRB-SCR-404", price: 160 },
    ];

    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % products.length;
      setRecentScanned({
        ...products[idx],
        time: "Just now",
      });
      setScannedItemsCount((prev) => prev + 1);
    }, 3800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative rounded-3xl bg-gradient-to-br from-[#0F1424] via-[#090C15] to-[#04060A] border border-teal-500/30 p-6 sm:p-8 overflow-hidden shadow-2xl shadow-teal-950/40 preserve-3d">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[90px] pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left column: 3D Product Box & Laser Scanner Visual */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center p-4">
          <div className="relative w-64 sm:w-72 h-72 preserve-3d flex items-center justify-center">
            {/* 3D Tilted Product Box Mockup */}
            <div
              className="relative w-52 h-56 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-teal-400/40 shadow-[0_20px_50px_rgba(20,184,166,0.3)] p-4 flex flex-col justify-between preserve-3d animate-float-3d"
              style={{
                transform: "perspective(800px) rotateX(15deg) rotateY(-18deg) rotateZ(3deg)",
              }}
            >
              {/* Product Label */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>HRB WHOLESALE</span>
                </div>
                <span className="text-[10px] font-mono uppercase bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded">
                  ORIGINAL
                </span>
              </div>

              {/* Central Box Logo */}
              <div className="my-auto text-center space-y-1">
                <div className="w-10 h-10 mx-auto rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 font-bold font-mono">
                  HRB
                </div>
                <div className="text-xs font-bold text-white tracking-wide">
                  {recentScanned.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  SKU: {recentScanned.sku}
                </div>
              </div>

              {/* Barcode Strip with 3D Laser Beam */}
              <div className="relative pt-2 border-t border-white/10">
                <div className="bg-white p-2 rounded-lg text-black text-center relative overflow-hidden">
                  <div className="h-10 flex items-center justify-center font-mono font-bold tracking-widest text-xs">
                    ||| | |||| | ||| |||| |
                  </div>
                  <div className="text-[9px] font-mono tracking-wider font-bold">
                    890432109876
                  </div>

                  {/* 3D Laser Scanning Beam */}
                  <div className="absolute inset-x-0 h-1 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-laser-sweep z-20 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Simulated 3D Counter Floor Grid */}
            <div
              className="absolute -bottom-2 w-64 h-24 bg-gradient-to-t from-teal-500/10 to-transparent rounded-full blur-xl -z-10"
              style={{ transform: "rotateX(75deg)" }}
            />
          </div>
        </div>

        {/* Right column: Interactive Terminal & Digital Receipt */}
        <div className="lg:col-span-6 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-teal-400" />
            <span>Interactive 3D Countertop Billing Demo</span>
          </div>

          <h3 className="text-2xl font-black text-white tracking-tight">
            Laser Fast 0.2s Checkout With Auto-Receipt
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Falcon POS integrates hardware-accelerated barcode decoding, local offline caching, and instant thermal receipt printing for rush hour queues.
          </p>

          {/* Terminal Screen Card */}
          <div className="rounded-2xl bg-black/50 border border-white/10 p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 text-slate-400 text-[11px]">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                HARDWARE SCANNER LINKED
              </span>
              <span>ITEMS SCANNED: {scannedItemsCount}</span>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-teal-400 uppercase font-bold block">
                  Last Scanned Item:
                </span>
                <span className="text-white font-sans font-bold text-sm">
                  {recentScanned.name}
                </span>
                <span className="text-[11px] text-slate-400 block font-mono">
                  {recentScanned.sku}
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-teal-300 font-mono">
                  ₹{recentScanned.price}
                </span>
                <span className="text-[10px] text-slate-400 block">GST 18% Incl.</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-slate-300 flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-[11px] font-sans">Auto ESC/POS Print Ready</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-slate-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-[11px] font-sans">Dual Screen Customer Display</span>
              </div>
            </div>

            {/* Interactive Manual Test Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  const products = [
                    { name: "Korean Velvet Hair Bow Clips", sku: "HRB-ACC-882", price: 340 },
                    { name: "Sadar Bazar Rubber Bands (1kg)", sku: "HRB-RB-019", price: 280 },
                    { name: "Matte Pastel Hair Claws (Pack of 6)", sku: "HRB-CLAW-102", price: 210 },
                    { name: "Satin Pearl Scrunchie Set", sku: "HRB-SCR-404", price: 160 },
                  ];
                  const randomProd = products[Math.floor(Math.random() * products.length)];
                  setRecentScanned({ ...randomProd, time: "Just now" });
                  setScannedItemsCount((prev) => prev + 1);
                }}
                className="w-full py-2.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/40 hover:border-teal-400 text-teal-300 text-xs font-bold font-sans flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-950/40 active:scale-[0.98]"
              >
                <Barcode className="w-4 h-4" />
                <span>Simulate Barcode Scan (Click to Test)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
