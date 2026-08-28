"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  DollarSign,
  TrendingUp,
  Receipt,
  Clock,
  Phone,
  MapPin,
  MessageCircle,
  Eye,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Customer, Sale } from "@/types/database";
import { customersRepository } from "@/repositories/customers.repo";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { WhatsAppInvoiceModal } from "@/components/pos/WhatsAppInvoiceModal";

interface CustomerLedgerModalProps {
  customerId: string | null;
  onClose: () => void;
  shopId: string;
}

export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  customerId,
  onClose,
  shopId,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [whatsAppSale, setWhatsAppSale] = useState<Sale | null>(null);

  useEffect(() => {
    if (!customerId) return;
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const result = await customersRepository.getCustomerProfitAnalytics(customerId);
        setData(result);
      } catch (err) {
        console.error("Failed to load customer analytics", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [customerId]);

  if (!customerId) return null;

  const customer: Customer = data?.customer;

  return (
    <>
      <Modal
        isOpen={!!customerId}
        onClose={onClose}
        title={customer ? `👤 ${customer.name} — Customer Profit & Purchase Ledger` : "Customer Ledger"}
        description="Lifetime purchase history, total revenue, and exact gross profit earned"
        maxWidth="2xl"
      >
        {loading || !data ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-2">
            <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-500 font-medium">Calculating customer profit history...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Customer Header Info */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <h3 className="text-base font-black text-gray-900">{customer.name}</h3>
                <div className="flex items-center gap-3 text-gray-600">
                  {customer.phone && (
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      +91 {customer.phone}
                    </span>
                  )}
                  {customer.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {customer.address}
                    </span>
                  )}
                </div>
              </div>

              {customer.phone && (
                <a
                  href={`https://wa.me/91${customer.phone.replace(/[^0-9]/g, "").slice(-10)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs self-start sm:self-auto cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Chat</span>
                </a>
              )}
            </div>

            {/* Lifetime KPI Analytics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Lifetime Spend
                </span>
                <div className="text-lg font-black text-gray-900 tabular-nums">
                  {formatCurrency(data.lifetimeSpend)}
                </div>
                <div className="text-[10px] text-gray-500">
                  {data.totalBills} Bills Billed
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-3.5 rounded-xl border border-emerald-200 shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Gross Profit (कमाई)
                </span>
                <div className="text-lg font-black text-emerald-700 tabular-nums">
                  +{formatCurrency(data.lifetimeProfit)}
                </div>
                <div className="text-[10px] font-bold text-emerald-800">
                  {data.profitMarginPercent.toFixed(1)}% Avg. Margin
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Total Cost (COGS)
                </span>
                <div className="text-lg font-black text-gray-700 tabular-nums">
                  {formatCurrency(data.lifetimeCost)}
                </div>
                <div className="text-[10px] text-gray-500">
                  Wholesale product cost
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Avg. Order Value
                </span>
                <div className="text-lg font-black text-purple-700 tabular-nums">
                  {formatCurrency(data.averageOrderValue)}
                </div>
                <div className="text-[10px] text-gray-500">
                  Per bill average
                </div>
              </div>
            </div>

            {/* Past Invoices & Per-Bill Profit Breakdown Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center justify-between">
                <span>Invoices & Per-Bill Profit History</span>
                <span className="text-gray-500 font-normal">
                  {data.sales.length} transactions recorded
                </span>
              </h4>

              {data.sales.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400 text-xs">
                  No purchases recorded for this customer yet.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-2xl overflow-hidden overflow-x-auto shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-[11px] font-bold text-gray-600 uppercase border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-right">Billed Amount</th>
                        <th className="py-2.5 px-3 text-right">Cost Price</th>
                        <th className="py-2.5 px-3 text-right">Profit (कमाई)</th>
                        <th className="py-2.5 px-3 text-center">Margin</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {data.sales.map((sale: any) => (
                        <tr key={sale.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-gray-900">
                            {sale.invoice_number}
                          </td>
                          <td className="py-2.5 px-3 text-gray-500 font-mono text-[11px]">
                            {formatDateTime(sale.created_at)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-gray-900 tabular-nums">
                            {formatCurrency(sale.total_amount)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-500 tabular-nums">
                            {formatCurrency(sale.cost_amount)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-700 tabular-nums">
                            +{formatCurrency(sale.profit_amount)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                              {sale.profit_margin.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setWhatsAppSale({
                                  ...sale,
                                  customer,
                                } as any);
                              }}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ml-auto cursor-pointer border border-emerald-200"
                              title="Resend WhatsApp Bill"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                              <span>Bill</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <Button variant="secondary" onClick={onClose} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* WhatsApp Resend Modal */}
      {whatsAppSale && (
        <WhatsAppInvoiceModal
          isOpen={!!whatsAppSale}
          onClose={() => setWhatsAppSale(null)}
          sale={whatsAppSale}
          customer={customer}
          shopId={shopId}
        />
      )}
    </>
  );
};
