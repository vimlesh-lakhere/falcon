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
  QrCode as QrIcon,
  RefreshCw,
  Package,
} from "lucide-react";
import QRCode from "qrcode";
import { Sale, Customer } from "@/types/database";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { WhatsAppInvoiceModal } from "@/components/pos/WhatsAppInvoiceModal";
import { ShippingParcelLabelModal } from "@/components/pos/ShippingParcelLabelModal";
import {
  PrinterConfig,
  getPrinterConfig,
  savePrinterConfig,
  buildEscPosReceipt,
  buildRasterGraphicsReceipt,
  sendBluetoothEscPos,
  pairBluetoothPrinter,
  getBluetoothPrinterState,
  buildUpiPaymentUrl,
  parseFreightCharge,
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
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isParcelModalOpen, setIsParcelModalOpen] = useState(false);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(() => getPrinterConfig(shopId));
  const [isBluetoothPrinting, setIsBluetoothPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<string>("");
  const [printError, setPrintError] = useState<string>("");
  const [btState, setBtState] = useState<"connected" | "paired" | "disconnected" | "unsupported">("disconnected");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  useEffect(() => {
    const cfg = getPrinterConfig(shopId);
    setPrinterConfig(cfg);
    setBtState(getBluetoothPrinterState());

    // Generate Dynamic UPI QR Code for this invoice
    if (cfg.showQrCode && cfg.showDynamicUpiQr && cfg.upiId) {
      const upiUrl = buildUpiPaymentUrl(
        cfg.upiId,
        cfg.upiPayeeName || cfg.shopName,
        Number(sale.total_amount) || 0,
        sale.invoice_number
      );
      if (upiUrl) {
        QRCode.toDataURL(upiUrl, {
          width: cfg.paperWidth === "80mm" ? 280 : 220,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#000000", light: "#ffffff" },
        })
          .then((url) => setQrCodeDataUrl(url))
          .catch((err) => console.warn("Failed to generate QR Data URL", err));
      }
    }

    // If auto-print is enabled, print immediately on mount once
    if (cfg.autoPrint) {
      setTimeout(() => {
        handlePrint(cfg);
      }, 350);
    }
  }, [shopId, sale.total_amount, sale.invoice_number]);

  const activeShopName = shopName || printerConfig.shopName || "AGS STORE & COSMETICS";
  const activeShopPhone = shopPhone || printerConfig.shopPhone || "+91 9340362381";
  const activeShopAddress = shopAddress || printerConfig.shopAddress || "Main Market Road, Town Area";
  const rawGst = shopGst !== undefined ? shopGst : printerConfig.shopGst;
  const activeShopGst = rawGst && rawGst !== "23AAAAA0000A1Z5" ? rawGst.trim() : "";
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
      const lineTotal = (Number(it.unit_price) * it.quantity).toFixed(2);
      return `${idx + 1}. *${pName}*\n   ${it.quantity}${unitLabel} x ₹${it.unit_price} = *₹${lineTotal}*`;
    })
    .join("\n");

  const payMethod = payments.map((p) => p.method.toUpperCase()).join(", ") || "CASH";
  const upiPayLink =
    printerConfig.upiId && printerConfig.showDynamicUpiQr
      ? `\n📲 *Pay via UPI:* ${buildUpiPaymentUrl(
          printerConfig.upiId,
          printerConfig.upiPayeeName || activeShopName,
          Number(sale.total_amount) || 0,
          sale.invoice_number
        )}`
      : "";

  const freightAmount = parseFreightCharge(sale);

  const whatsappBillMessage = `🧾 *CASH BILL / INVOICE - ${activeShopName}*
━━━━━━━━━━━━━━━━━━━━
📍 *Address:* ${activeShopAddress}
📞 *Help/Contact:* ${activeShopPhone}
${printerConfig.showGstin && activeShopGst ? `🏛️ *GSTIN:* ${activeShopGst}\n` : ""}━━━━━━━━━━━━━━━━━━━━
📋 *Invoice:* #${sale.invoice_number}
📅 *Date:* ${formatDateTime(sale.created_at || new Date().toISOString())}
👤 *Customer:* ${custName}${custPhone ? ` (+91 ${custPhone})` : ""}
━━━━━━━━━━━━━━━━━━━━
🛒 *ITEMS PURCHASED:*
${itemsText}
━━━━━━━━━━━━━━━━━━━━
💵 *Subtotal:* ₹${Number(sale.subtotal).toFixed(2)}
${Number(sale.discount_amount) > 0 ? `🎁 *Discount:* -₹${Number(sale.discount_amount).toFixed(2)}\n` : ""}${Number(sale.tax_amount) > 0 ? `🏛️ *GST/Tax:* +₹${Number(sale.tax_amount).toFixed(2)}\n` : ""}${freightAmount > 0 ? `🚚 *भाड़ा / Freight:* +₹${freightAmount.toFixed(2)}\n` : ""}💰 *FINAL TOTAL:* *₹${Number(sale.total_amount).toFixed(2)}*
💳 *Payment Mode:* ${payMethod}${upiPayLink}
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
        setPrintStatus("Preparing high-definition thermal receipt...");
        // Use high-definition canvas raster graphics for 100% Hindi/Unicode & QR rendering
        let bytes: Uint8Array;
        if (cfg.printEngine === "graphics") {
          bytes = await buildRasterGraphicsReceipt(sale, customer, cfg);
        } else {
          bytes = buildEscPosReceipt(sale, customer, cfg);
        }

        setPrintStatus("Sending data to Bluetooth Thermal Printer...");
        await sendBluetoothEscPos(bytes);
        setBtState("connected");
        setPrintStatus("✓ Printed successfully on ATPOS Thermal Printer!");
        setTimeout(() => setPrintStatus(""), 4000);
      } catch (err: any) {
        console.error("Bluetooth print failed", err);
        setPrintError(err.message || "Bluetooth print failed. Falling back to browser print...");
        setTimeout(() => {
          window.print();
        }, 1200);
      } finally {
        setIsBluetoothPrinting(false);
      }
    } else {
      window.print();
    }
  };

  const handleQuickReconnect = async () => {
    setPrintError("");
    setPrintStatus("Connecting to Bluetooth Printer...");
    try {
      const devName = await pairBluetoothPrinter();
      setBtState("connected");
      setPrintStatus(`✓ Connected to ${devName}`);
      setTimeout(() => setPrintStatus(""), 3000);
    } catch (e: any) {
      setPrintError(e.message || "Could not connect to printer");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Action & Printer Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-200">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 shadow-2xs">
            <Printer className="w-3.5 h-3.5 text-purple-600" />
            <span>
              {paperWidth} • {printerConfig.connectionType === "bluetooth" ? "Bluetooth ESC/POS" : "System Driver"}
            </span>
          </div>

          {printerConfig.connectionType === "bluetooth" && (
            <button
              type="button"
              onClick={handleQuickReconnect}
              className={`px-2 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                btState === "connected"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
              }`}
              title="Click to re-connect or change printer"
            >
              <Bluetooth className="w-3 h-3" />
              <span>{btState === "connected" ? "BT Ready" : "Re-connect BT"}</span>
            </button>
          )}

          {onOpenPrinterSettings && (
            <button
              type="button"
              onClick={onOpenPrinterSettings}
              className="p-1.5 text-gray-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
              title="Configure Thermal Printer & Bank QR"
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
              <Bluetooth className={`w-3.5 h-3.5 ${isBluetoothPrinting ? "animate-pulse" : ""}`} />
            ) : (
              <Printer className="w-3.5 h-3.5" />
            )}
            <span>{isBluetoothPrinting ? "Printing..." : "🖨️ Print Thermal Bill"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsParcelModalOpen(true)}
            className="px-3 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            title="Print 80mm Parcel Shipping Sticker with Large Name & Phone"
          >
            <Package className="w-3.5 h-3.5" />
            <span>📦 Parcel Slip</span>
          </button>

          <button
            type="button"
            onClick={() => setIsWhatsAppModalOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            title="Send WhatsApp Invoice or Share with Mobile Apps"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>💬 WhatsApp Bill</span>
          </button>
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

      {/* Printable Thermal Receipt Canvas / Live Preview */}
      <div className="flex justify-center p-4 bg-gray-100 rounded-2xl overflow-x-auto">
        <div
          id="thermal-receipt-printable"
          style={{
            width: paperWidth === "58mm" ? "58mm" : "80mm",
            minWidth: paperWidth === "58mm" ? "58mm" : "80mm",
            fontFamily:
              "'Noto Sans Devanagari', 'Mangal', 'Nirmala UI', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
          className={`bg-white text-black p-3.5 leading-tight shadow-md border border-gray-200 printable-area ${
            printerConfig.fontSize === "compact"
              ? "text-[10px]"
              : printerConfig.fontSize === "large"
              ? "text-[12px]"
              : "text-[11px]"
          }`}
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
                <span className="truncate max-w-[140px]">{custName}</span>
              </div>
            )}
            {custPhone && (
              <div className="flex justify-between text-[9px] text-gray-700">
                <span>Phone:</span>
                <span>+91 {custPhone}</span>
              </div>
            )}
          </div>

          {/* Items Table Header */}
          <div className="py-2 border-b border-dashed border-black space-y-2">
            <div className="flex justify-between font-black text-[10px] uppercase">
              <span>Item & Qty</span>
              <span>Amt (₹)</span>
            </div>

            {/* Items List with Hindi support & no text cutoff */}
            {items.map((it: any, idx: number) => {
              const pName = it.product?.name || it.product_name || it.name || it.title || "Product";
              const unitLabel = it.unit_name ? ` ${it.unit_name}` : "";
              const total = (Number(it.unit_price) * it.quantity).toFixed(2);

              if (printerConfig.itemLayout === "wrap-2line") {
                return (
                  <div key={idx} className="space-y-0.5 pt-0.5">
                    <div className="font-bold break-words leading-tight">{pName}</div>
                    <div className="flex justify-between text-[10px] text-gray-700">
                      <span>
                        {it.quantity}
                        {unitLabel} × ₹{Number(it.unit_price).toFixed(2)}
                      </span>
                      <span className="font-bold text-black">₹{total}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={idx} className="flex justify-between items-start gap-1">
                  <span className="font-bold truncate max-w-[65%]">
                    {pName} ({it.quantity})
                  </span>
                  <span className="font-bold">₹{total}</span>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="py-2 border-b border-dashed border-black space-y-1">
            <div className="flex justify-between text-[10px]">
              <span>Subtotal:</span>
              <span>₹{Number(sale.subtotal).toFixed(2)}</span>
            </div>

            {Number(sale.discount_amount) > 0 && (
              <div className="flex justify-between text-[10px]">
                <span>Discount:</span>
                <span>-₹{Number(sale.discount_amount).toFixed(2)}</span>
              </div>
            )}

            {Number(sale.tax_amount) > 0 && (
              <div className="flex justify-between text-[10px]">
                <span>Tax / GST:</span>
                <span>+₹{Number(sale.tax_amount).toFixed(2)}</span>
              </div>
            )}

            {freightAmount > 0 && (
              <div className="flex justify-between text-[10px] font-bold text-gray-900">
                <span>🚚 भाड़ा / Freight:</span>
                <span>+₹{freightAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between font-black text-xs pt-1 border-t border-black">
              <span>NET TOTAL:</span>
              <span>₹{Number(sale.total_amount).toFixed(2)}</span>
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
                <span>₹{Number(p.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Dynamic Bank UPI QR Code Section */}
          {printerConfig.showQrCode && printerConfig.showDynamicUpiQr && printerConfig.upiId && (
            <div className="py-2.5 border-b border-dashed border-black text-center space-y-1">
              <p className="font-black text-[10px] uppercase">📱 Scan & Pay with any UPI App</p>
              <p className="font-bold text-[11px]">Exact Amount: ₹{Number(sale.total_amount).toFixed(2)}</p>

              {qrCodeDataUrl ? (
                <div className="flex justify-center py-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeDataUrl}
                    alt="UPI Dynamic Payment QR"
                    className="w-44 h-44 border-2 border-black rounded-lg p-1 bg-white object-contain"
                  />
                </div>
              ) : (
                <div className="p-3 bg-gray-100 rounded text-[9px] text-gray-500 font-mono">
                  UPI ID: {printerConfig.upiId}
                </div>
              )}

              <p className="text-[9px] font-mono font-bold text-gray-800">{printerConfig.upiId}</p>
              {printerConfig.bankAccountNumber && (
                <p className="text-[8px] text-gray-600">
                  A/c: {printerConfig.bankAccountNumber} • IFSC: {printerConfig.bankIfsc || "N/A"}
                </p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-2 space-y-0.5 text-[9px]">
            <p className="font-bold">*** THANK YOU FOR SHOPPING! ***</p>
            <p>{printerConfig.customFooter || "Goods once sold can be exchanged within 7 days."}</p>
            <p className="pt-1 text-[8px] text-gray-500">Powered by Falcon POS</p>
          </div>
        </div>
      </div>

      {/* WhatsApp Invoice Modal */}
      <WhatsAppInvoiceModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        sale={sale}
        customer={customer}
        shopId={shopId || "a0000000-0000-0000-0000-000000000001"}
      />

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

      {/* 📦 80mm Shipping / Parcel Label Modal */}
      <ShippingParcelLabelModal
        isOpen={isParcelModalOpen}
        onClose={() => setIsParcelModalOpen(false)}
        shopId={shopId}
        initialCustomerName={custName !== "Walk-in Customer" ? custName : ""}
        initialCustomerPhone={custPhone}
        initialDestination={customer?.address || ""}
        initialInvoiceNo={sale.invoice_number}
        initialOrderValue={Number(sale.total_amount) || 0}
      />

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
