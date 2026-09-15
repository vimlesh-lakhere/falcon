"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  DollarSign,
  Printer,
  MessageCircle,
  Phone,
  MapPin,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Receipt,
  Plus,
  Clock,
  User,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Customer, CustomerLedgerEntry } from "@/types/database";
import { khataRepository, CustomerKhataSummary } from "@/repositories/khata.repo";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { getPrinterConfig } from "@/lib/thermal-printer";

interface CustomerLedgerStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string | null;
  shopId: string;
  onCollectPayment?: (customer: Customer) => void;
}

export const CustomerLedgerStatementModal: React.FC<CustomerLedgerStatementModalProps> = ({
  isOpen,
  onClose,
  customerId,
  shopId,
  onCollectPayment,
}) => {
  const [loading, setLoading] = useState(true);
  const [ledgerData, setLedgerData] = useState<CustomerKhataSummary | null>(null);

  const loadData = async () => {
    if (!customerId) return;
    try {
      setLoading(true);
      const data = await khataRepository.getCustomerLedger(customerId);
      setLedgerData(data);
    } catch (err) {
      console.error("Failed to load customer ledger", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerId) {
      loadData();
    }
  }, [isOpen, customerId]);

  if (!customerId) return null;

  const customer = ledgerData?.customer;
  const entries = ledgerData?.entries || [];

  const shopConfig = getPrinterConfig(shopId);
  const shopName = shopConfig.shopName || "AGS Store & Cosmetics";
  const shopPhone = shopConfig.shopPhone || "+91 9340362381";

  // Build WhatsApp Reminder & Statement summary text
  const cleanPhone = customer?.phone?.replace(/[^0-9]/g, "").slice(-10) || "";
  const currentDue = ledgerData?.currentDue || 0;

  const whatsappStatementText = `📕 *खाता विवरण / KHATA STATEMENT*
🏬 *${shopName}*
📞 *Helpline:* ${shopPhone}
━━━━━━━━━━━━━━━━━━━━
👤 *ग्राहक:* ${customer?.name || "Customer"}${customer?.phone ? ` (+91 ${customer.phone})` : ""}
📅 *Statement Date:* ${formatDateTime(new Date().toISOString())}
━━━━━━━━━━━━━━━━━━━━
🛒 *कुल खरीद (Total Bills):* ₹${(ledgerData?.totalPurchases || 0).toFixed(2)}
💵 *कुल जमा (Total Paid):* ₹${(ledgerData?.totalPaid || 0).toFixed(2)}
⚠️ *कुल बकाया (Balance Due):* *₹${currentDue.toFixed(2)}*
━━━━━━━━━━━━━━━━━━━━
*हाल के लेन-देन (Recent Entries):*
${entries
  .slice(-5)
  .map(
    (e) =>
      `• ${new Date(e.date).toLocaleDateString("en-IN")}: ${e.debit > 0 ? `+₹${e.debit.toFixed(0)} (उधार)` : `-₹${e.credit.toFixed(0)} (जमा)`}`
  )
  .join("\n")}
━━━━━━━━━━━━━━━━━━━━
🙏 *कृपया अपना शेष बकाया ₹${currentDue.toFixed(2)} का भुगतान जल्द करें। धन्यवाद!*`;

  const whatsappUrl = cleanPhone
    ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(whatsappStatementText)}`
    : `https://wa.me/?text=${encodeURIComponent(whatsappStatementText)}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? `📕 ${customer.name} — खाता बही (Ledger Statement)` : "Customer Ledger"}
      description="तारीखवार खरीद, जमा और शेष बकाया का पूरा विवरण"
      maxWidth="4xl"
    >
      {loading || !ledgerData ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-2">
          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500 font-medium">खाता बही लोड हो रही है...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header Bar */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-gray-900">{customer?.name}</h3>
                {currentDue > 0 ? (
                  <span className="text-[10px] font-extrabold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                    बकायादार (Pending Due)
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    खाता बेबाक (Cleared)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                {customer?.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    +91 {customer.phone}
                  </span>
                )}
                {customer?.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {customer.address}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {currentDue > 0 && onCollectPayment && customer && (
                <Button
                  size="sm"
                  onClick={() => onCollectPayment(customer)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>जमा करें</span>
                </Button>
              )}

              {cleanPhone && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>तगादा भेजें</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>प्रिंट</span>
              </button>
            </div>
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                कुल खरीद (Bills)
              </span>
              <div className="text-base sm:text-lg font-black text-purple-950 tabular-nums">
                ₹{ledgerData.totalPurchases.toFixed(2)}
              </div>
              <span className="text-[10px] text-purple-600">{ledgerData.totalBillsCount} Invoices</span>
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                कुल जमा (Paid)
              </span>
              <div className="text-base sm:text-lg font-black text-emerald-950 tabular-nums">
                ₹{ledgerData.totalPaid.toFixed(2)}
              </div>
              <span className="text-[10px] text-emerald-600">Counter + Khata Settle</span>
            </div>

            <div className={`p-3 rounded-2xl border ${currentDue > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${currentDue > 0 ? "text-red-700" : "text-gray-500"}`}>
                कुल बाकी (Balance Due)
              </span>
              <div className={`text-base sm:text-lg font-black tabular-nums ${currentDue > 0 ? "text-red-700" : "text-gray-800"}`}>
                ₹{currentDue.toFixed(2)}
              </div>
              <span className="text-[10px] text-gray-500">
                {currentDue > 0 ? "उधार बाकी है" : "कोई बकाया नहीं"}
              </span>
            </div>
          </div>

          {/* Ledger Statement Table */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            <div className="max-h-[380px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100/80 sticky top-0 z-10 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">तारीख (Date)</th>
                    <th className="py-2.5 px-3">विवरण / Invoice</th>
                    <th className="py-2.5 px-3 text-right text-red-700">उधार (+Debit)</th>
                    <th className="py-2.5 px-3 text-right text-emerald-700">जमा (-Credit)</th>
                    <th className="py-2.5 px-3 text-right font-black">बकाया (Balance)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                        इस ग्राहक का कोई लेन-देन इतिहास नहीं मिला।
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-gray-500 font-mono text-[11px] whitespace-nowrap">
                          {new Date(entry.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-gray-900">{entry.description}</div>
                          {entry.notes && (
                            <div className="text-[10px] text-gray-500 italic">{entry.notes}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-red-700 tabular-nums">
                          {entry.debit > 0 ? `₹${entry.debit.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700 tabular-nums">
                          {entry.credit > 0 ? `₹${entry.credit.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-gray-900 tabular-nums bg-gray-50/50">
                          ₹{entry.running_balance.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
