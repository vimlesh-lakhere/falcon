"use client";

import React from "react";

/**
 * Online store price, linked to the shop (POS) selling price by default.
 *
 * `value` is the SEPARATE online price as a string; "" means linked — the box then shows the shop
 * price and the product is saved with online_price = NULL, so any later POS price change also moves
 * the online price. Typing a different number (or +5% / +10%) makes it a separate online rate.
 */
export function OnlinePriceField({
  sellingPrice,
  value,
  onChange,
}: {
  sellingPrice: number;
  value: string;
  onChange: (v: string) => void;
}) {
  const shop = Number(sellingPrice) || 0;
  const linked = value === "" || Math.abs(Number(value) - shop) < 0.001;

  const setFromInput = (raw: string) => {
    const n = Number(raw);
    onChange(raw === "" || (n > 0 && Math.abs(n - shop) < 0.001) ? "" : raw);
  };

  const applyPercent = (pct: number) => {
    if (pct === 0 || !(shop > 0)) return onChange("");
    const raw = shop * (1 + pct / 100);
    // Clean customer-facing prices: whole rupees from ₹20 up, else the nearest 50 paise.
    const rounded = raw >= 20 ? Math.round(raw) : Math.round(raw * 2) / 2;
    onChange(Math.abs(rounded - shop) < 0.001 ? "" : String(rounded));
  };

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <span className="absolute left-3 top-2 text-xs font-bold text-emerald-700">₹</span>
        <input
          type="number"
          step="0.01"
          value={linked ? (shop > 0 ? String(shop) : "") : value}
          onChange={(e) => setFromInput(e.target.value)}
          placeholder="Online price"
          className="w-full pl-7 pr-3 py-1.5 text-xs font-bold bg-white border border-emerald-400 rounded-xl text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {[
          ["Same as POS", 0],
          ["+5%", 5],
          ["+10%", 10],
        ].map(([label, pct]) => (
          <button
            key={label as string}
            type="button"
            onClick={() => applyPercent(pct as number)}
            className="px-2 py-0.5 rounded-lg border border-emerald-300 bg-white text-[10px] font-bold text-emerald-800 hover:bg-emerald-50"
          >
            {label}
          </button>
        ))}
      </div>
      <p className={`text-[10px] font-semibold ${linked ? "text-gray-500" : "text-emerald-800"}`}>
        {linked
          ? "🔗 POS price ke saath linked — POS badlega to online bhi badlega"
          : "✏️ Online ka alag rate — POS badalne par ye nahi badlega"}
      </p>
    </div>
  );
}
