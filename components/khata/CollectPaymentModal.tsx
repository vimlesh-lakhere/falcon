"use client";

import React, { useState, useEffect } from "react";
import {
  DollarSign,
  Receipt,
  CheckCircle2,
  Printer,
  MessageCircle,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Building,
  User,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Customer, CustomerPayment } from "@/types/database";
import { khataRepository } from "@/repositories/khata.repo";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { getPrinterConfig } from "@/lib/thermal-printer";

interface CollectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  shopId: string;
  onPaymentSuccess?: (payment: CustomerPayment, newBalance: number) => void;
}

export const CollectPaymentModal: React.FC<CollectPaymentModalProps> = ({
  isOpen,
  onClose,
  customer,
  shopId,
  onPaymentSuccess,
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<string>("cash");
  const [refNo, setRefNo] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [successData, setSuccessData] = useState<{
    payment: CustomerPayment;
    newBalance: number;
    prevBalance: number;
  } | null>(null);

  const currentDue = Number(customer?.outstanding_balance) || 0;

  useEffect(() => {
    if (isOpen) {
      setAmount(currentDue > 0 ? currentDue : 0);
      setMethod("cash");
      setRefNo("");
      setNotes("");
      setSuccessData(null);
    }
  }, [isOpen, currentDue]);

  if (!customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || amount <= 0) return;

    try {
      setIsSaving(true);
      const res = await khataRepository.recordCustomerPayment({
        shop_id: shopId,
        customer_id: customer.id,
        amount,
        payment_method: method,
        reference_no: refNo || undefined,
        notes: notes || undefined,
      });

      const prevBal = currentDue;
      setSuccessData({
        payment: res.payment,
        newBalance: res.newBalance,
        prevBalance: prevBal,
      });

      if (onPaymentSuccess) {
        onPaymentSuccess(res.payment, res.newBalance);
      }
    } catch (err: any) {
      alert("भुगतान दर्ज करने में त्रुटि: " + (err.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  // WhatsApp confirmation text
  const shopConfig = getPrinterConfig(shopId);
  const shopName = shopConfig.shopName || "AGS Store & Cosmetics";
  const shopPhone = shopConfig.shopPhone || "+91 9340362381";

  const prevBal = successData?.prevBalance || currentDue;
  // May be negative = customer advance / credit (they paid more than the due).
  const newBal = successData?.newBalance ?? Math.round((currentDue - amount) * 100) / 100;
  const paidAmt = successData?.payment?.amount || amount;

  const whatsappReceiptMessage = `🧾 *रसीद: खाता जमा / PAYMENT RECEIPT*
━━━━━━━━━━━━━━━━━━━━
🏬 *${shopName}*
📞 *संपर्क:* ${shopPhone}
━━━━━━━━━━━━━━━━━━━━
👤 *ग्राहक:* ${customer.name}${customer.phone ? ` (+91 ${customer.phone})` : ""}
📅 *दिनांक:* ${formatDateTime(new Date().toISOString())}
💳 *माध्यम:* ${(method || "CASH").toUpperCase()}${refNo ? ` [Ref: ${refNo}]` : ""}
━━━━━━━━━━━━━━━━━━━━
💵 *प्राप्त राशि (Paid):* *₹${paidAmt.toFixed(2)}*
📋 *पिछला बकाया (Previous Due):* ₹${prevBal.toFixed(2)}
${newBal < 0 ? `💰 *Advance जमा (Credit):* *₹${Math.abs(newBal).toFixed(2)}*` : `✅ *शेष बकाया (Remaining Balance):* *₹${newBal.toFixed(2)}*`}
━━━━━━━━━━━━━━━━━━━━
🙏 *आपका भुगतान सफलतापूर्वक प्राप्त हुआ। धन्यवाद!*`;

  const cleanPhone = customer.phone?.replace(/[^0-9]/g, "").slice(-10) || "";
  const whatsappUrl = cleanPhone
    ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(whatsappReceiptMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(whatsappReceiptMessage)}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={successData ? "✅ भुगतान रसीद / Payment Confirmed" : `💰 ग्राहक खाता जमा करें (Collect Udhaar)`}
      description={
        successData
          ? "भुगतान सफलतापूर्वक दर्ज हो गया और खाता अपडेट हो गया है।"
          : `${customer.name} के खाते में राशि जमा करें`
      }
      maxWidth="md"
    >
      {successData ? (
        <div className="space-y-4 pt-1">
          <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-emerald-950">
              ₹{successData.payment.amount.toFixed(2)} सफलतापूर्वक जमा हुए!
            </h3>
            <p className="text-xs text-emerald-800">
              {customer.name} का खाता अपडेट कर दिया गया है।
            </p>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-200 text-xs">
              <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-gray-500 font-bold block">पिछला बकाया</span>
                <span className="font-bold text-gray-800">₹{successData.prevBalance.toFixed(2)}</span>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-gray-500 font-bold block">जमा राशि</span>
                <span className="font-black text-emerald-700">₹{successData.payment.amount.toFixed(2)}</span>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-gray-500 font-bold block">
                  {successData.newBalance < 0 ? "Advance जमा" : "शेष बकाया"}
                </span>
                <span className={`font-black ${successData.newBalance < 0 ? "text-blue-700" : "text-purple-900"}`}>
                  ₹{Math.abs(successData.newBalance).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            {cleanPhone ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp रसीद भेजें</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => alert("ग्राहक का मोबाइल नंबर दर्ज नहीं है।")}
                className="py-2.5 px-3 bg-gray-100 text-gray-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed"
              >
                <MessageCircle className="w-4 h-4" />
                <span>No Mobile Number</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="py-2.5 px-3 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>रसीद प्रिंट करें (Print)</span>
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full text-xs font-bold mt-2"
          >
            बंद करें (Done)
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Customer & Current Balance Card */}
          <div className="p-3.5 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                कस्टमर (Customer)
              </span>
              <div className="text-sm font-black text-purple-950 flex items-center gap-1.5">
                <User className="w-4 h-4 text-purple-600" />
                <span>{customer.name}</span>
              </div>
              {customer.phone && (
                <span className="text-xs text-purple-700 font-mono">+91 {customer.phone}</span>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">
                कुल बकाया (Total Due)
              </span>
              <div className="text-lg font-black text-red-700 tabular-nums">
                ₹{currentDue.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Amount Input & Quick Chips */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-800">
              जमा राशि (Received Amount) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-base text-gray-500">
                ₹
              </span>
              <input
                type="number"
                step="any"
                required
                min="0.01"
                value={amount === 0 ? "" : amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-2.5 text-lg font-black text-gray-900 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:border-purple-600 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
              />
            </div>

            {/* Quick Amount Suggestion Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {currentDue > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(currentDue)}
                  className="px-2.5 py-1 text-[11px] font-bold bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg transition-all"
                >
                  पूरा बकाया (₹{currentDue.toFixed(0)})
                </button>
              )}
              {[100, 200, 500, 1000, 2000]
                .filter((v) => v < currentDue)
                .map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className="px-2.5 py-1 text-[11px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all"
                  >
                    ₹{val}
                  </button>
                ))}
            </div>
          </div>

          {/* Remaining Balance Preview */}
          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-600">
              {newBal < 0 ? "जमा (Advance) बचेगा:" : "जमा के बाद शेष बकाया:"}
            </span>
            <span
              className={`font-black tabular-nums ${
                newBal < 0 ? "text-blue-700" : newBal === 0 ? "text-emerald-700" : "text-amber-800"
              }`}
            >
              ₹{Math.abs(newBal).toFixed(2)}{" "}
              {newBal < 0 ? "(Advance जमा)" : newBal === 0 ? "(खाता क्लियर ✓)" : ""}
            </span>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-800">
              भुगतान का माध्यम (Payment Method) *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "cash", label: "नकद (Cash)", icon: Banknote },
                { id: "upi", label: "UPI / QR", icon: QrCode },
                { id: "card", label: "कार्ड (Card)", icon: CreditCard },
                { id: "bank_transfer", label: "बैंक ट्रांसफर", icon: Building },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMethod(item.id)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-[11px] font-bold transition-all ${
                    method === item.id
                      ? "border-purple-600 bg-purple-50 text-purple-800 shadow-xs"
                      : "border-gray-200 hover:bg-gray-50 text-gray-600"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reference No & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                रिफरेंस / UTR नंबर (Optional)
              </label>
              <input
                type="text"
                placeholder="UPI ref / Slip no."
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                className="w-full text-xs p-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                टिप्पणी / विवरण (Optional Note)
              </label>
              <input
                type="text"
                placeholder="e.g. दुकान पर नकद दिया"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs p-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs font-bold"
            >
              रद्द करें (Cancel)
            </Button>
            <Button
              type="submit"
              isLoading={isSaving}
              disabled={amount <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>₹{amount.toFixed(2)} जमा करें (Save Payment)</span>
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
