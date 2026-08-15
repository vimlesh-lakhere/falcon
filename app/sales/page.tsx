"use client";

import React, { useState, useEffect } from "react";
import { Receipt, Eye, Printer, Search, ArrowDownLeft, RotateCcw } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { posRepository } from "@/repositories/pos.repo";
import { Sale } from "@/types/database";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const SHOP_ID = process.env.DEFAULT_SHOP_ID || "a0000000-0000-0000-0000-000000000001";

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const loadSales = async () => {
    try {
      setLoading(true);
      const data = await posRepository.getRecentSales(SHOP_ID, 100);
      setSales(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const filteredSales = sales.filter((s) => {
    return (
      !search ||
      s.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      s.customer?.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <MainLayout
      title="Sales & Invoices Ledger"
      subtitle="Complete transaction audit trail, receipt lookup, and returns tracking"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-surface-border shadow-sm flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search invoice number or customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Invoices Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5">Invoice #</th>
                    <th className="px-6 py-3.5">Customer</th>
                    <th className="px-6 py-3.5">Date & Time</th>
                    <th className="px-6 py-3.5">Payment Method</th>
                    <th className="px-6 py-3.5 text-right">Subtotal</th>
                    <th className="px-6 py-3.5 text-right">Total Amount</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                        Loading sales records...
                      </td>
                    </tr>
                  ) : filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                        No invoices found.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs font-bold text-gray-900">
                          {sale.invoice_number}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-gray-800">
                          {sale.customer ? sale.customer.name : "Walk-in Customer"}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                          {formatDateTime(sale.created_at)}
                        </td>
                        <td className="px-6 py-4 text-xs capitalize text-gray-600">
                          {sale.payments?.[0]?.method || "cash"}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 text-right tabular-nums">
                          {formatCurrency(sale.subtotal)}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-brand-700 text-right tabular-nums">
                          {formatCurrency(sale.total_amount)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={sale.status === "completed" ? "success" : "warning"}>
                            {sale.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedSale(sale)}
                            className="text-xs font-medium gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Receipt
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Detail Modal */}
        <Modal
          isOpen={!!selectedSale}
          onClose={() => setSelectedSale(null)}
          title={`Invoice ${selectedSale?.invoice_number}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-4 border border-gray-200 rounded-xl bg-white space-y-3 font-mono text-xs text-gray-800">
              <div className="text-center pb-3 border-b border-dashed border-gray-300">
                <h2 className="font-bold text-sm text-gray-900">AGS STORE</h2>
                <p className="text-[11px] text-gray-500">Retail & Wholesale Cosmetics</p>
                <p className="text-[10px] text-gray-400">GST: 27AAAAA0000A1Z5</p>
              </div>

              <div className="flex justify-between text-[11px]">
                <span>Invoice: {selectedSale?.invoice_number}</span>
                <span>{selectedSale && formatDateTime(selectedSale.created_at)}</span>
              </div>

              {selectedSale?.customer && (
                <div className="text-[11px]">
                  Customer: <span className="font-bold">{selectedSale.customer.name}</span>
                </div>
              )}

              <div className="border-t border-b border-dashed border-gray-300 py-2 space-y-1">
                {selectedSale?.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="truncate max-w-[200px]">{it.product?.name || "Product"}</span>
                    <span className="tabular-nums">
                      {it.quantity} × {formatCurrency(it.unit_price)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-right font-bold text-xs pt-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{selectedSale && formatCurrency(selectedSale.subtotal)}</span>
                </div>
                {Number(selectedSale?.discount_amount) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span>- {selectedSale && formatCurrency(selectedSale.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-900 pt-1 border-t border-gray-200">
                  <span>Grand Total:</span>
                  <span className="text-brand-700">{selectedSale && formatCurrency(selectedSale.total_amount)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="flex-1 gap-1.5 text-xs font-semibold"
              >
                <Printer className="w-4 h-4" />
                Print Duplicate Receipt
              </Button>
              <Button
                variant="secondary"
                onClick={() => setSelectedSale(null)}
                className="text-xs font-semibold"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
}
