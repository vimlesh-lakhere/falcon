"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { RotateCcw, CheckCircle2, Minus, Plus, Banknote, BookOpen, QrCode } from "lucide-react";
import { Sale } from "@/types/database";
import { returnsRepository } from "@/repositories/returns.repo";
import { formatCurrency } from "@/lib/utils";

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  shopId: string;
  processedBy?: string | null;
  onSuccess?: () => void;
}

export function ReturnModal({ isOpen, onClose, sale, shopId, processedBy, onSuccess }: ReturnModalProps) {
  const [qty, setQty] = useState<Record<string, number>>({}); // sale_item_id -> return qty
  const [alreadyReturned, setAlreadyReturned] = useState<Record<string, number>>({});
  const [refundMethod, setRefundMethod] = useState<"cash" | "khata" | "upi">("cash");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [done, setDone] = useState<{ totalRefund: number; newBalance: number | null } | null>(null);

  const hasCustomer = !!(sale?.customer_id || (sale as any)?.customer?.id);
  const items = (sale?.items || []) as any[];

  useEffect(() => {
    if (isOpen && sale) {
      setQty({});
      setReason("");
      setRefundMethod(hasCustomer ? "khata" : "cash");
      setDone(null);
      returnsRepository
        .getAlreadyReturned(sale.id)
        .then(setAlreadyReturned)
        .catch(() => setAlreadyReturned({}));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sale?.id]);

  const maxFor = (it: any) => Math.max(0, Number(it.quantity || 0) - (alreadyReturned[it.id] || 0));

  const totalRefund = useMemo(
    () => items.reduce((s, it: any) => s + (qty[it.id] || 0) * (Number(it.unit_price) || 0), 0),
    [qty, items]
  );

  const setItemQty = (it: any, val: number) => {
    const max = maxFor(it);
    setQty((p) => ({ ...p, [it.id]: Math.max(0, Math.min(val, max)) }));
  };

  const handleSubmit = async () => {
    if (!sale || totalRefund <= 0) return;
    const lines = items
      .filter((it: any) => (qty[it.id] || 0) > 0)
      .map((it: any) => ({
        sale_item_id: it.id,
        product_id: it.product_id,
        variant_id: it.variant_id || null,
        quantity: qty[it.id],
        unit_price: Number(it.unit_price) || 0,
      }));
    try {
      setIsSaving(true);
      const res = await returnsRepository.processReturn({
        shop_id: shopId,
        sale_id: sale.id,
        customer_id: sale.customer_id || (sale as any)?.customer?.id || null,
        processed_by: processedBy || null,
        reason: reason.trim() || undefined,
        refund_method: refundMethod,
        lines,
      });
      setDone({ totalRefund: res.totalRefund, newBalance: res.newCustomerBalance });
      onSuccess?.();
    } catch (e: any) {
      alert("Return process karne me dikkat: " + (e.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  if (!sale) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={done ? "✅ Return Ho Gaya" : `↩️ Return / वापसी — #${sale.invoice_number}`}
      description={
        done
          ? "Item wapas stock me add ho gaya aur refund record ho gaya."
          : "Jo item wapas aaye unki quantity chuno — stock apne aap wapas add ho jayega."
      }
      maxWidth="md"
    >
      {done ? (
        <div className="space-y-4">
          <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <div className="text-base font-black text-emerald-950">Refund: {formatCurrency(done.totalRefund)}</div>
            <p className="text-xs text-emerald-800">Return ho gaya · returned items ka stock wapas add ho gaya.</p>
            {done.newBalance !== null && (
              <div className="text-xs font-bold text-purple-900">Customer ka naya bakaya: {formatCurrency(done.newBalance)}</div>
            )}
          </div>
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
            {items.length === 0 ? (
              <div className="text-center text-xs text-gray-400 py-6">Is bill me koi item nahi mila.</div>
            ) : (
              items.map((it: any) => {
                const max = maxFor(it);
                const r = qty[it.id] || 0;
                return (
                  <div
                    key={it.id}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                      r > 0 ? "border-purple-300 bg-purple-50/60" : "border-gray-200"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-gray-900 truncate">{it.product?.name || "Item"}</div>
                      <div className="text-[10px] text-gray-500">
                        Becha: {it.quantity} · {formatCurrency(Number(it.unit_price))} each
                        {max < Number(it.quantity) ? ` · pehle wapas: ${Number(it.quantity) - max}` : ""}
                      </div>
                    </div>
                    {max <= 0 ? (
                      <span className="text-[10px] font-bold text-gray-400 shrink-0">Pura return ho chuka</span>
                    ) : (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setItemQty(it, r - 1)}
                          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          value={r === 0 ? "" : r}
                          onChange={(e) => setItemQty(it, parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-12 text-center text-sm font-black border border-gray-300 rounded-lg py-1"
                        />
                        <button
                          type="button"
                          onClick={() => setItemQty(it, r + 1)}
                          className="w-7 h-7 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center justify-center"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemQty(it, max)}
                          className="text-[9px] font-bold text-purple-600 px-1"
                          title="Poora return"
                        >
                          All
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Refund method */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">Refund kaise dena hai?</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "cash", label: "नकद वापस", icon: Banknote, disabled: false },
                  { id: "khata", label: "खाते में घटाएं", icon: BookOpen, disabled: !hasCustomer },
                  { id: "upi", label: "UPI वापस", icon: QrCode, disabled: false },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={m.disabled}
                  onClick={() => setRefundMethod(m.id)}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-[11px] font-bold transition-all ${
                    refundMethod === m.id
                      ? "border-purple-600 bg-purple-50 text-purple-800"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  } ${m.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <m.icon className="w-4 h-4" />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
            {refundMethod === "khata" && hasCustomer && (
              <p className="text-[10px] text-amber-700 mt-1">Refund customer ke purane bakaya me se ghata diya jayega.</p>
            )}
          </div>

          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional) — e.g. damaged / wrong item / size"
            className="w-full text-xs p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />

          <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl text-white">
            <span className="text-xs text-gray-300">Total Refund</span>
            <span className="text-lg font-black tabular-nums">{formatCurrency(totalRefund)}</span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              isLoading={isSaving}
              disabled={totalRefund <= 0}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <RotateCcw className="w-4 h-4 mr-1" /> Return karo
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
