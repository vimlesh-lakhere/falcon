"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Calculator,
  Plus,
  Minus,
  X,
  Sparkles,
  Zap,
  Trash2,
  CornerDownLeft,
  Banknote,
  QrCode,
  ShoppingCart,
  Receipt,
  Check,
  RotateCcw,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ParsedCalcItem {
  id: string;
  qty: number;
  price: number;
  total: number;
  label: string;
}

interface PosFastCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItemsToCart: (items: { name: string; quantity: number; unitPrice: number }[]) => void;
  onDirectQuickCheckout?: (total: number, items: { name: string; quantity: number; unitPrice: number }[]) => void;
}

export const PosFastCalculatorModal: React.FC<PosFastCalculatorModalProps> = ({
  isOpen,
  onClose,
  onAddItemsToCart,
  onDirectQuickCheckout,
}) => {
  const [expression, setExpression] = useState<string>("");
  const [itemNote, setItemNote] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setExpression("");
      setItemNote("");
    }
  }, [isOpen]);

  // Parse expression into structured calculation items (supports "1*30 + 2*20 + 50", "3x45", "10+20+30")
  const parsedResult = useMemo(() => {
    const raw = expression.trim();
    if (!raw) return { items: [], grandTotal: 0, isValid: true };

    try {
      // Normalize 'x', 'X', '×', '*' and split by '+' or newlines
      const normalized = raw
        .replace(/×/g, "*")
        .replace(/[xX]/g, "*")
        .replace(/₹/g, "");

      const chunks = normalized.split(/\+/);
      const items: ParsedCalcItem[] = [];
      let grandTotal = 0;

      chunks.forEach((chunk, index) => {
        const trimmed = chunk.trim();
        if (!trimmed) return;

        if (trimmed.includes("*")) {
          const parts = trimmed.split("*").map((p) => p.trim());
          if (parts.length >= 2) {
            const first = parseFloat(parts[0]);
            const second = parseFloat(parts[1]);

            if (!isNaN(first) && !isNaN(second) && first > 0 && second > 0) {
              const qty = Math.min(first, 9999);
              const price = second;
              const total = qty * price;
              grandTotal += total;
              items.push({
                id: `calc-item-${index}`,
                qty,
                price,
                total,
                label: `${qty} × ₹${price}`,
              });
              return;
            }
          }
        }

        // Single price number
        const singleVal = parseFloat(trimmed);
        if (!isNaN(singleVal) && singleVal > 0) {
          grandTotal += singleVal;
          items.push({
            id: `calc-item-${index}`,
            qty: 1,
            price: singleVal,
            total: singleVal,
            label: `1 × ₹${singleVal}`,
          });
        }
      });

      return { items, grandTotal, isValid: items.length > 0 };
    } catch {
      return { items: [], grandTotal: 0, isValid: false };
    }
  }, [expression]);

  const handleAppend = (val: string) => {
    setExpression((prev) => {
      // Avoid double operators
      if (["+", "*"].includes(val) && (prev.endsWith("+") || prev.endsWith("*"))) {
        return prev.slice(0, -1) + val;
      }
      return prev + val;
    });
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setExpression("");
    inputRef.current?.focus();
  };

  const handleBackspace = () => {
    setExpression((prev) => prev.slice(0, -1));
    inputRef.current?.focus();
  };

  const handleAddQuickAmount = (amount: number) => {
    setExpression((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return `${amount}`;
      if (trimmed.endsWith("+") || trimmed.endsWith("*")) return `${trimmed} ${amount}`;
      return `${trimmed} + ${amount}`;
    });
    inputRef.current?.focus();
  };

  const handleAddQuickMultiplier = (multiplier: number) => {
    setExpression((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return `${multiplier} * `;
      if (trimmed.endsWith("+")) return `${trimmed} ${multiplier} * `;
      return `${trimmed} + ${multiplier} * `;
    });
    inputRef.current?.focus();
  };

  const handleApplyToCart = () => {
    if (parsedResult.items.length === 0) return;

    const formattedPayload = parsedResult.items.map((it) => ({
      name: itemNote.trim()
        ? `${itemNote.trim()} (${it.qty > 1 ? `${it.qty} × ₹${it.price}` : `₹${it.price}`})`
        : `Quick Item (₹${it.price})`,
      quantity: it.qty,
      unitPrice: it.price,
    }));

    onAddItemsToCart(formattedPayload);
    onClose();
  };

  const handleDirectCheckout = () => {
    if (parsedResult.items.length === 0) return;

    const formattedPayload = parsedResult.items.map((it) => ({
      name: itemNote.trim()
        ? `${itemNote.trim()} (${it.qty > 1 ? `${it.qty} × ₹${it.price}` : `₹${it.price}`})`
        : `Quick Item (₹${it.price})`,
      quantity: it.qty,
      unitPrice: it.price,
    }));

    if (onDirectQuickCheckout) {
      onDirectQuickCheckout(parsedResult.grandTotal, formattedPayload);
      onClose();
    } else {
      onAddItemsToCart(formattedPayload);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
        {/* ========================================================================= */}
        {/* MODAL HEADER                                                              */}
        {/* ========================================================================= */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-indigo-500 flex items-center justify-center shadow-md">
              <Calculator className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                ⚡ Fast Calculator Billing
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Express
                </span>
              </h3>
              <p className="text-[10px] text-purple-200/80">
                Count items directly without searching product names (e.g. 1*30 + 2*20)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* SCREEN / DISPLAY AREA                                                     */}
        {/* ========================================================================= */}
        <div className="p-4 bg-slate-900 text-white space-y-2 shrink-0 border-b border-slate-800">
          {/* Optional Item Label (e.g. "Vegetables", "Sweets", "Misc") */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Item note / category (optional, e.g. Loose Items, Veg)..."
              value={itemNote}
              onChange={(e) => setItemNote(e.target.value)}
              className="w-full text-xs bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-1.5 text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Main Calculation Math Input */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="e.g. 1*30 + 2*20 + 50"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApplyToCart();
                }
              }}
              className="w-full text-xl sm:text-2xl font-mono font-black bg-slate-950 border border-purple-500/40 rounded-2xl px-4 py-2.5 text-amber-300 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {expression && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-3 text-gray-400 hover:text-white text-xs font-bold bg-slate-800 px-2 py-0.5 rounded-lg"
              >
                CLEAR
              </button>
            )}
          </div>

          {/* Real-time Subtotal & Breakdown */}
          <div className="flex items-center justify-between pt-1">
            <div className="text-[11px] text-gray-400 flex items-center gap-1.5 overflow-x-auto max-w-[200px] sm:max-w-xs no-scrollbar">
              {parsedResult.items.length > 0 ? (
                parsedResult.items.map((it, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[10px] shrink-0"
                  >
                    {it.label}
                  </span>
                ))
              ) : (
                <span>Type numbers or use keypad below</span>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] text-gray-400 block font-bold uppercase">Total Amount</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400">
                {formatCurrency(parsedResult.grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FAST PRESETS & KEYPAD AREA                                                */}
        {/* ========================================================================= */}
        <div className="p-3.5 space-y-3 bg-gray-50 flex-1 overflow-y-auto">
          {/* Quick Multipliers (1x, 2x, 3x, 5x, 10x) */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              ⚡ Quick Multipliers (Qty × Price)
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 5, 10].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => handleAddQuickMultiplier(qty)}
                  className="py-2 px-1 rounded-xl bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-900 font-black text-xs transition-all cursor-pointer shadow-2xs text-center"
                >
                  {qty} ×
                </button>
              ))}
            </div>
          </div>

          {/* Quick Amount Rupees Chips (+10, +20, +50, +100, +200, +500) */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              💵 Quick Cash Presets
            </span>
            <div className="grid grid-cols-6 gap-1.5">
              {[10, 20, 50, 100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleAddQuickAmount(amt)}
                  className="py-1.5 px-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200 text-emerald-800 font-black text-[11px] transition-all cursor-pointer text-center"
                >
                  +₹{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Full High-Speed Number Pad */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {/* Row 1 */}
            <button
              type="button"
              onClick={() => handleAppend("7")}
              className="py-3.5 rounded-2xl bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-black text-base shadow-2xs border border-gray-200 cursor-pointer"
            >
              7
            </button>
            <button
              type="button"
              onClick={() => handleAppend("8")}
              className="py-3.5 rounded-2xl bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-black text-base shadow-2xs border border-gray-200 cursor-pointer"
            >
              8
            </button>
            <button
              type="button"
              onClick={() => handleAppend("9")}
              className="py-3.5 rounded-2xl bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-black text-base shadow-2xs border border-gray-200 cursor-pointer"
            >
              9
            </button>
            <button
              type="button"
              onClick={() => handleAppend(" * ")}
              className="py-3.5 rounded-2xl bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-900 font-black text-lg shadow-2xs border border-amber-200 cursor-pointer"
              title="Multiply (×)"
            >
              ×
            </button>

            {/* Row 2 */}
            <button
              type="button"
              onClick={() => handleAppend("4")}
              className="py-3.5 rounded-2xl bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-black text-base shadow-2xs border border-gray-200 cursor-pointer"
            >
              4
            </button>
            <button
              type="button"
              onClick={() => handleAppend("5")}
              className="py-3.5 rounded-2xl bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-black text-base shadow-2xs border border-gray-200 cursor-pointer"
            >
              5
            </button>
            <button
              type="button"
              onClick={() => handleAppend("6")}
              className="py-3.5 rounded-2xl bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-black text-base shadow-2xs border border-gray-200 cursor-pointer"
            >
              6
            </button>
            <button
              type="button"
              onClick={() => handleAppend(" + ")}
              className="py-3.5 rounded-2xl bg-indigo-100 hover:bg-indigo-200 active:bg-indigo-300 text-indigo-900 font-black text-lg shadow-2xs border border-indigo-200 cursor-pointer"
              title="Add (+)"
            >
              +
            </button>

            {/* Row 3 */}
            <button
              type="button"
              onClick={() => handleAppend("1")}
              className="py-3.5 rounded-2xl bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-black text-base shadow-2xs border border-gray-200 cursor-pointer"
            >
              1
            </button>
            <button
              type="button"
              onClick={() => handleAppend("2")}
              className="py-3.5 rounded-2xl bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-black text-base shadow-2xs border border-gray-200 cursor-pointer"
            >
              2
            </button>
            <button
              type="button"
              onClick={() => handleAppend("3")}
              className="py-3.5 rounded-2xl bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-black text-base shadow-2xs border border-gray-200 cursor-pointer"
            >
              3
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="py-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 font-bold text-sm shadow-2xs border border-rose-200 cursor-pointer flex items-center justify-center"
              title="Backspace"
            >
              ⌫
            </button>

            {/* Row 4 */}
            <button
              type="button"
              onClick={() => handleAppend("0")}
              className="py-3.5 rounded-2xl bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-black text-base shadow-2xs border border-gray-200 cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleAppend("00")}
              className="py-3.5 rounded-2xl bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-black text-sm shadow-2xs border border-gray-200 cursor-pointer"
            >
              00
            </button>
            <button
              type="button"
              onClick={() => handleAppend(".")}
              className="py-3.5 rounded-2xl bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-black text-base shadow-2xs border border-gray-200 cursor-pointer"
            >
              .
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="py-3.5 rounded-2xl bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 font-bold text-xs shadow-2xs cursor-pointer flex items-center justify-center"
            >
              AC
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ACTION BUTTONS (ADD TO BILL / DIRECT CHECKOUT)                            */}
        {/* ========================================================================= */}
        <div className="p-4 bg-white border-t border-gray-200 space-y-2 shrink-0">
          <div className="flex items-center gap-2">
            {/* Add to Bill */}
            <button
              type="button"
              disabled={parsedResult.grandTotal <= 0}
              onClick={handleApplyToCart}
              className="flex-1 py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-40 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 active:scale-98 transition-all cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Add {formatCurrency(parsedResult.grandTotal)} to Bill</span>
            </button>

            {/* Quick Charge / Direct Checkout */}
            {onDirectQuickCheckout && (
              <button
                type="button"
                disabled={parsedResult.grandTotal <= 0}
                onClick={handleDirectCheckout}
                className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
                title="Direct Checkout / Cash Out"
              >
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>Pay Now</span>
              </button>
            )}
          </div>

          <div className="text-center">
            <span className="text-[10px] text-gray-400 font-medium">
              💡 Tip: Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-700 font-mono text-[9px]">Enter</kbd> to add instantly
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
