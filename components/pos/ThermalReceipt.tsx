"use client";

import React, { useState, useEffect } from "react";
import {
  Printer,
  MessageSquare,
  Check,
  Copy,
  Share2,
  ArrowRight,
  Bluetooth,
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Sale, Customer } from "@/types/database";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  PrinterConfig,
  getPrinterConfig,
  buildEscPosReceipt,
  sendBluetoothEscPos,
  PaperWidth,
} from "@/lib/thermal-printer";

interface ThermalReceiptProps {
  sale: Sale;
  customer?: Customer | null;
  shopId?: string;
  shopName?: string;
  shopPhone?: string;
  shopAddress?: string;
  shopGst?: string;
  onDone?: () => void;
  onOpenPrinterSettings?: () => void;
}

export function ThermalReceipt({
  sale,
  customer,
  shopId = "a0000000-0000-0000-0000-000000000001",
  shopName,
  shopPhone,
  shopAddress,
  shopGst,
  onDone,
  onOpenPrinterSettings,
}: ThermalReceiptProps) {
  const [copiedText, setCopiedText] = useState(false);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(() => getPrinterConfig(shopId));
  const [isBluetoothPrinting, setIsBluetoothPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<string>("");
  const [printError, setPrintError] = useState<string>("");

  useEffect(() => {
    const cfg = getPrinterConfig(shopId);
    setPrinterConfig(cfg);

    // If auto-print is enabled, print immediately on mount once
    if (cfg.autoPrint) {
      setTimeout(() => {
        handlePrint(cfg);
      }, 300);
    }
  }, [shopId]);

  const activeShopName = shopName || printerConfig.shopName || "AGS STORE & COSMETICS";
  const activeShopPhone = shopPhone || printerConfig.shopPhone || "+91 9340362381";
  const activeShopAddress = shopAddress || printerConfig.shopAddress || "Main Market Road, Town Area";
  const activeShopGst = shopGst || printerConfig.shopGst || "23AAAAA0000A1Z5";
  const paperWidth: PaperWidth = printerConfig.paperWidth || "80mm";

  const items = sale.items || [];
  const payments = sale.payments || [];
  const custName = customer?.name || (sale as any).customer?.name || "Walk-in Customer";
  const custPhone = customer?.phone || (sale as any).customer?.phone || "";

  // 1. Generate formatted WhatsApp Billing Receipt text
  const itemsText = items
    .map((it: any, idx: number) => {
      const pName = it.product?.name || it.product_name || it.name || it.title || "Product";
      const unitLabel = it.unit_name ? ` (${it.unit_name})` : "";
      const lineTotal = Number(it.unit_price) * it.quantity;
      return `${idx + 1}. *${pName}*\n   ${it.quantity}${unitLabel} x ₹${it.unit_price} = *₹${lineTotal}*`;
    })
    .join("\n");

  const payMethod = payments.map((p) => p.method.toUpperCase()).join(", ") || "CASH";

  const whatsappBillMessage = `🧾 *CASH BILL / INVOICE - ${activeShopName}*
━━━━━━━━━━━━━━━━━━━━
📍 *Address:* ${activeShopAddress}
📞 *Help/Contact:* ${activeShopPhone}
${activeShopGst ? `🏛️ *GSTIN:* ${activeShopGst}\n` : ""}━━━━━━━━━━━━━━━━━━━━
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
🙏 *${printerConfig.customFooter || "Thank you for shopping with us!"}*
⚡ *Visit again soon.*`;

  const whatsappUrl = custPhone
    ? `https://wa.me/91${custPhone.replace(/[^0-9]/g, "").slice(-10)}?text=${encodeURIComponent(whatsappBillMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(whatsappBillMessage)}`;

  const handlePrint = async (cfg: PrinterConfig = printerConfig) => {
    setPrintStatus("");
    setPrintError("");

    if (cfg.connectionType === "bluetooth") {
      setIsBluetoothPrinting(true);
      try {
        setPrintStatus("Printing to Bluetooth printer...");
        const bytes = buildEscPosReceipt(sale, customer, cfg);
        await sendBluetoothEscPos(bytes);
        setPrintStatus("✓ Printed on ATPOS Bluetooth Printer!");
        setTimeout(() => setPrintStatus(""), 3000);
      } catch (err: any) {
        setPrintError(err.message || "Bluetooth print failed. Falling back to browser print...");
        setTimeout(() => {
          window.print();
        }, 1000);
      } finally {
        setIsBluetoothPrinting(false);
      }
    } else {
      window.print();
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(whatsappBillMessage);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Top Action & Printer Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-200">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700">
            <Printer className="w-3.5 h-3.5 text-purple-600" />
            <span>
              {paperWidth} • {printerConfig.connectionType === "bluetooth" ? "Bluetooth ESC/POS" : "System Driver"}
            </span>
          </div>

          {onOpenPrinterSettings && (
            <button
              type="button"
              onClick={onOpenPrinterSettings}
              className="p-1.5 text-gray-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
              title="Configure Thermal Printer"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePrint()}
            disabled={isBluetoothPrinting}
            className="px-4 py-2 bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            {printerConfig.connectionType === "bluetooth" ? (
              <Bluetooth className="w-3.5 h-3.5" />
            ) : (
              <Printer className="w-3.5 h-3.5" />
            )}
            <span>{isBluetoothPrinting ? "Printing..." : "🖨️ Print Thermal Bill"}</span>
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp Bill</span>
          </a>
        </div>
      </div>

      {/* Live Print Feedback */}
      {printStatus && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{printStatus}</span>
        </div>
      )}

      {printError && (
        <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{printError}</span>
        </div>
      )}

      {/* Printable Thermal Receipt Canvas */}
      <div className="flex justify-center p-4 bg-gray-100 rounded-2xl overflow-x-auto">
        <div
          id="thermal-receipt-printable"
          style={{
            width: paperWidth === "58mm" ? "58mm" : "80mm",
            minWidth: paperWidth === "58mm" ? "58mm" : "80mm",
          }}
          className="bg-white text-black p-3 font-mono text-[11px] leading-tight shadow-md border border-gray-200 printable-area"
        >
          {/* Header */}
          <div className="text-center pb-2 border-b border-dashed border-black space-y-0.5">
            <h2 className="font-black text-sm uppercase tracking-tight">{activeShopName}</h2>
            <p className="text-[10px]">{activeShopAddress}</p>
            <p className="text-[10px]">Ph: {activeShopPhone}</p>
            {printerConfig.showGstin && activeShopGst && (
              <p className="text-[9px] font-bold">GSTIN: {activeShopGst}</p>
            )}
          </div>

          {/* Meta */}
          <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span>Inv: #{sale.invoice_number}</span>
              <span>{formatDateTime(sale.created_at || new Date().toISOString())}</span>
            </div>
            {printerConfig.showCustomerInfo && (
              <div className="flex justify-between font-bold">
                <span>Customer:</span>
                <span className="truncate max-w-[120px]">{custName}</span>
              </div>
            )}
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
                      {it.quantity}
                      {unitLabel} x ₹{it.unit_price}
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
            <p>{printerConfig.customFooter || "Goods once sold can be exchanged within 7 days."}</p>
            <p className="pt-1 text-[8px] text-gray-500">Powered by Falcon POS</p>
          </div>
        </div>
      </div>

      {/* Done Button */}
      {onDone && (
        <button
          type="button"
          onClick={onDone}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Start New Bill</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}

      {/* Global Thermal Printing Style */}
      <style jsx global>{`
        @media print {
          @page {
            size: ${paperWidth === "80mm" ? "80mm auto" : "58mm auto"};
            margin: 0;
          }
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
