"use client";

import React, { useState } from "react";
import { Printer, MessageSquare, Check, Copy, Share2, ArrowRight } from "lucide-react";
import { Sale, Customer } from "@/types/database";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface ThermalReceiptProps {
  sale: Sale;
  customer?: Customer | null;
  shopName?: string;
  shopPhone?: string;
  shopAddress?: string;
  shopGst?: string;
  onDone?: () => void;
}

export function ThermalReceipt({
  sale,
  customer,
  shopName = "AGS STORE & COSMETICS",
  shopPhone = "+91 9340362381",
  shopAddress = "Main Market Road, Town Area",
  shopGst = "23AAAAA0000A1Z5",
  onDone,
}: ThermalReceiptProps) {
  const [copiedText, setCopiedText] = useState(false);
  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm">("58mm");

  const items = sale.items || [];
  const payments = sale.payments || [];
  const custName = customer?.name || (sale as any).customer?.name || "Walk-in Customer";
  const custPhone = customer?.phone || (sale as any).customer?.phone || "";

  // 1. Generate formatted WhatsApp Billing Receipt text
  const itemsText = items
    .map(
      (it: any, idx: number) => {
        const pName = it.product?.name || it.product_name || it.name || it.title || "Product";
        const unitLabel = it.unit_name ? ` (${it.unit_name})` : "";
        const lineTotal = Number(it.unit_price) * it.quantity;
        return `${idx + 1}. *${pName}*\n   ${it.quantity}${unitLabel} x ₹${it.unit_price} = *₹${lineTotal}*`;
      }
    )
    .join("\n");

  const payMethod = payments.map((p) => p.method.toUpperCase()).join(", ") || "CASH";

  const whatsappBillMessage = `🧾 *CASH BILL / INVOICE - ${shopName}*
━━━━━━━━━━━━━━━━━━━━
📍 *Address:* ${shopAddress}
📞 *Help/Contact:* ${shopPhone}
${shopGst ? `🏛️ *GSTIN:* ${shopGst}\n` : ""}━━━━━━━━━━━━━━━━━━━━
📋 *Invoice:* #${sale.invoice_number}
📅 *Date:* ${formatDateTime(sale.created_at || new Date().toISOString())}
👤 *Customer:* ${custName}${custPhone ? ` (+91 ${custPhone})` : ""}
━━━━━━━━━━━━━━━━━━━━
🛒 *ITEMS PURCHASED:*
${itemsText}
━━━━━━━━━━━━━━━━━━━━
💵 *Subtotal:* ₹${sale.subtotal}
${Number(sale.discount_amount) > 0 ? `🎁 *Discount:* -₹${sale.discount_amount}\n` : ""}${Number(sale.tax_amount) > 0 ? `🏛️ *GST/Tax:* +₹${sale.tax_amount}\n` : ""}💰 *FINAL TOTAL:* *₹${sale.total_amount}*
💳 *Payment Mode:* ${payMethod}
━━━━━━━━━━━━━━━━━━━━
🙏 *Thank you for shopping with us!*
⚡ *Visit again soon.*`;

  const whatsappUrl = custPhone
    ? `https://wa.me/91${custPhone.replace(/[^0-9]/g, "").slice(-10)}?text=${encodeURIComponent(whatsappBillMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(whatsappBillMessage)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(whatsappBillMessage);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-600">Paper Width:</span>
          <button
            type="button"
            onClick={() => setPaperWidth("58mm")}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              paperWidth === "58mm" ? "bg-purple-600 text-white shadow-xs" : "bg-white text-gray-700 border border-gray-200"
            }`}
          >
            58mm (2-inch)
          </button>
          <button
            type="button"
            onClick={() => setPaperWidth("80mm")}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              paperWidth === "80mm" ? "bg-purple-600 text-white shadow-xs" : "bg-white text-gray-700 border border-gray-200"
            }`}
          >
            80mm (3-inch)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Thermal Bill</span>
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Send on WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Printable Thermal Receipt Canvas */}
      <div className="flex justify-center p-4 bg-gray-100 rounded-2xl overflow-x-auto">
        <div
          id="thermal-receipt-printable"
          style={{ width: paperWidth === "58mm" ? "58mm" : "80mm", minWidth: paperWidth === "58mm" ? "58mm" : "80mm" }}
          className="bg-white text-black p-3 font-mono text-[11px] leading-tight shadow-md border border-gray-200 printable-area"
        >
          {/* Header */}
          <div className="text-center pb-2 border-b border-dashed border-black space-y-0.5">
            <h2 className="font-black text-sm uppercase tracking-tight">{shopName}</h2>
            <p className="text-[10px]">{shopAddress}</p>
            <p className="text-[10px]">Ph: {shopPhone}</p>
            {shopGst && <p className="text-[9px]">GSTIN: {shopGst}</p>}
          </div>

          {/* Meta */}
          <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span>Inv: #{sale.invoice_number}</span>
              <span>{formatDateTime(sale.created_at || new Date().toISOString())}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Customer:</span>
              <span className="truncate max-w-[120px]">{custName}</span>
            </div>
            {custPhone && (
              <div className="flex justify-between text-[9px] text-gray-700">
                <span>Phone:</span>
                <span>+91 {custPhone}</span>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="py-2 border-b border-dashed border-black space-y-1.5">
            <div className="flex justify-between font-black text-[10px] uppercase">
              <span>Item & Qty</span>
              <span>Amt (₹)</span>
            </div>

            {items.map((it: any, idx: number) => {
              const pName = it.product?.name || it.product_name || it.name || it.title || "Product";
              const unitLabel = it.unit_name ? ` ${it.unit_name}` : "";
              const total = Number(it.unit_price) * it.quantity;
              return (
                <div key={idx} className="space-y-0.5">
                  <div className="font-bold line-clamp-1">{pName}</div>
                  <div className="flex justify-between text-[10px] text-gray-700">
                    <span>
                      {it.quantity}{unitLabel} x ₹{it.unit_price}
                    </span>
                    <span className="font-bold text-black">₹{total}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{sale.subtotal}</span>
            </div>

            {Number(sale.discount_amount) > 0 && (
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-₹{sale.discount_amount}</span>
              </div>
            )}

            {Number(sale.tax_amount) > 0 && (
              <div className="flex justify-between">
                <span>Tax/GST:</span>
                <span>+₹{sale.tax_amount}</span>
              </div>
            )}

            <div className="flex justify-between font-black text-sm pt-1 border-t border-black">
              <span>NET TOTAL:</span>
              <span>₹{sale.total_amount}</span>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="py-2 border-b border-dashed border-black text-[10px] space-y-0.5">
            <div className="flex justify-between font-bold">
              <span>Payment Mode:</span>
              <span>{payMethod}</span>
            </div>
            {payments.map((p, i) => (
              <div key={i} className="flex justify-between text-[9px] text-gray-600">
                <span>• {p.method.toUpperCase()}</span>
                <span>₹{p.amount}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center pt-2 space-y-0.5 text-[9px]">
            <p className="font-bold">*** THANK YOU FOR SHOPPING! ***</p>
            <p>Goods once sold can be exchanged within 7 days.</p>
            <p className="pt-1 text-[8px] text-gray-500">Powered by Falcon POS</p>
          </div>
        </div>
      </div>

      {/* Done Button */}
      {onDone && (
        <button
          type="button"
          onClick={onDone}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
        >
          <span>Start New Bill</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}

      {/* Global Thermal Printing Style */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-receipt-printable,
          #thermal-receipt-printable * {
            visibility: visible !important;
          }
          #thermal-receipt-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 2mm !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}
