"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Search } from "lucide-react";
import { Sale } from "@/types/database";
import { posRepository } from "@/repositories/pos.repo";
import { ReturnModal } from "@/components/sales/ReturnModal";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface PosReturnFlowProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  /** Called after a return succeeds — the POS uses it to refresh product stock. */
  onDone?: () => void;
}

/**
 * POS-side return: pick a recent bill (search by invoice / customer / mobile), then reuse the
 * shared ReturnModal to return items, restore stock and refund.
 */
export function PosReturnFlow({ isOpen, onClose, shopId, onDone }: PosReturnFlowProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [returnSale, setReturnSale] = useState<Sale | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQ("");
      setLoading(true);
      posRepository
        .getRecentSales(shopId, 50)
        .then((d) => setSales(d || []))
        .catch(() => setSales([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, shopId]);

  const filtered = q.trim()
    ? sales.filter((s) => {
        const t = q.toLowerCase();
        return (
          (s.invoice_number || "").toLowerCase().includes(t) ||
          (s.customer?.name || "").toLowerCase().includes(t) ||
          (s.customer?.phone || "").includes(q.trim())
        );
      })
    : sales;

  return (
    <>
      <Modal
        isOpen={isOpen && !returnSale}
        onClose={onClose}
        title="↩️ Return — bill dhoondo"
        description="Jis bill ka item wapas aaya usko chuno (invoice number / customer / mobile se search)"
        maxWidth="md"
      >
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Invoice number, customer ya mobile..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="max-h-[55vh] overflow-y-auto space-y-1">
            {loading ? (
              <div className="text-center py-6 text-xs text-gray-400">Bills load ho rahe…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400">Koi bill nahi mila</div>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setReturnSale(s)}
                  className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-left cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-black text-gray-900 truncate">#{s.invoice_number}</div>
                    <div className="text-[10px] text-gray-500 truncate">
                      {s.customer?.name || "Walk-in"} · {formatDateTime(s.created_at)}
                    </div>
                  </div>
                  <div className="text-sm font-black text-gray-800 shrink-0">{formatCurrency(Number(s.total_amount))}</div>
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>

      {returnSale && (
        <ReturnModal
          isOpen={!!returnSale}
          onClose={() => setReturnSale(null)}
          sale={returnSale}
          shopId={shopId}
          processedBy={null}
          onSuccess={() => onDone?.()}
        />
      )}
    </>
  );
}
