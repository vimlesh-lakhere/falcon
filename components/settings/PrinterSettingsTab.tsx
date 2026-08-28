"use client";

import React, { useState, useEffect } from "react";
import {
  Printer,
  Bluetooth,
  Monitor,
  Check,
  Zap,
  RefreshCw,
  Sliders,
  Store,
  FileText,
  CheckCircle2,
  AlertCircle,
  QrCode as QrIcon,
  CreditCard,
  Type,
  Sparkles,
  Building2,
} from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  PrinterConfig,
  DEFAULT_PRINTER_CONFIG,
  getPrinterConfig,
  savePrinterConfig,
  pairBluetoothPrinter,
  sendBluetoothEscPos,
  buildRasterGraphicsReceipt,
  buildEscPosReceipt,
  buildTestPrintPayload,
  getBluetoothPrinterState,
  buildUpiPaymentUrl,
  PaperWidth,
  PrintEngine,
  FontSizePreference,
  ItemLayoutPreference,
} from "@/lib/thermal-printer";

interface PrinterSettingsTabProps {
  shopId: string;
}

export const PrinterSettingsTab: React.FC<PrinterSettingsTabProps> = ({ shopId }) => {
  const [config, setConfig] = useState<PrinterConfig>(DEFAULT_PRINTER_CONFIG);
  const [isSaved, setIsSaved] = useState(false);
  const [isPairing, setIsPairing] = useState(false);
  const [pairedDevice, setPairedDevice] = useState<string>("");
  const [btState, setBtState] = useState<"connected" | "paired" | "disconnected" | "unsupported">("disconnected");
  const [testPrintStatus, setTestPrintStatus] = useState<string>("");
  const [testPrintError, setTestPrintError] = useState<string>("");
  const [previewQrUrl, setPreviewQrUrl] = useState<string>("");

  useEffect(() => {
    const loaded = getPrinterConfig(shopId);
    setConfig(loaded);
    if (loaded.bluetoothDeviceName) {
      setPairedDevice(loaded.bluetoothDeviceName);
    }
    setBtState(getBluetoothPrinterState());
  }, [shopId]);

  // Generate real-time live preview QR for settings preview
  useEffect(() => {
    if (config.showQrCode && config.showDynamicUpiQr && config.upiId) {
      const sampleUpiUrl = buildUpiPaymentUrl(
        config.upiId,
        config.upiPayeeName || config.shopName,
        500,
        "TEST-001"
      );
      if (sampleUpiUrl) {
        QRCode.toDataURL(sampleUpiUrl, {
          width: 160,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#000000", light: "#ffffff" },
        })
          .then((url) => setPreviewQrUrl(url))
          .catch((err) => console.warn("Failed to generate preview QR", err));
      }
    } else {
      setPreviewQrUrl("");
    }
  }, [config.upiId, config.upiPayeeName, config.shopName, config.showQrCode, config.showDynamicUpiQr]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    savePrinterConfig(shopId, config);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handlePairBluetooth = async () => {
    setIsPairing(true);
    setTestPrintError("");
    setTestPrintStatus("Pairing Bluetooth Thermal Printer...");
    try {
      const devName = await pairBluetoothPrinter();
      setPairedDevice(devName);
      setBtState("connected");
      const updated: PrinterConfig = {
        ...config,
        connectionType: "bluetooth" as const,
        bluetoothDeviceName: devName,
      };
      setConfig(updated);
      savePrinterConfig(shopId, updated);
      setTestPrintStatus(`✓ Successfully paired and connected to "${devName}"`);
      setTimeout(() => setTestPrintStatus(""), 4000);
    } catch (err: any) {
      setTestPrintError(err.message || "Failed to pair Bluetooth printer. Ensure device is ON and in range.");
    } finally {
      setIsPairing(false);
    }
  };

  const handleTestPrint = async () => {
    setTestPrintStatus("");
    setTestPrintError("");

    if (config.connectionType === "bluetooth") {
      try {
        setTestPrintStatus("Generating high-definition test receipt with Hindi & Bank QR...");
        const bytes = await buildTestPrintPayload(config);
        await sendBluetoothEscPos(bytes);
        setBtState("connected");
        setTestPrintStatus("✓ Test receipt printed successfully on Bluetooth Printer!");
        setTimeout(() => setTestPrintStatus(""), 4000);
      } catch (err: any) {
        setTestPrintError(
          err.message || "Bluetooth print failed. Please ensure the printer is turned on and paired."
        );
      }
    } else {
      // System Browser Print Test
      const printWindow = window.open("", "_blank", "width=400,height=650");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <title>Falcon Thermal Test Receipt - ${config.paperWidth}</title>
              <style>
                @page { size: ${config.paperWidth === "80mm" ? "80mm auto" : "58mm auto"}; margin: 0; }
                body {
                  font-family: 'Noto Sans Devanagari', 'Mangal', 'Nirmala UI', system-ui, sans-serif;
                  font-size: ${config.fontSize === "compact" ? "10px" : config.fontSize === "large" ? "13px" : "11px"};
                  width: ${config.paperWidth === "80mm" ? "72mm" : "48mm"};
                  margin: 0 auto;
                  padding: 10px 4px;
                  text-align: center;
                  color: black;
                }
                .bold { font-weight: bold; }
                .title { font-size: 15px; font-weight: 900; margin-bottom: 2px; text-transform: uppercase; }
                .sep { border-top: 1px dashed #000; margin: 6px 0; }
                .row { display: flex; justify-content: space-between; margin: 3px 0; text-align: left; }
                .footer { font-size: 10px; margin-top: 8px; }
                .qr-container { margin: 8px 0; text-align: center; }
                .qr-img { width: 140px; height: 140px; margin: 0 auto; }
              </style>
            </head>
            <body>
              <div class="title">${config.shopName}</div>
              <div>${config.shopAddress}</div>
              <div>Tel: ${config.shopPhone}</div>
              ${config.showGstin && config.shopGst ? `<div>GSTIN: ${config.shopGst}</div>` : ""}
              <div class="sep"></div>
              <div class="row"><span>Invoice: #TEST-001</span><span>${new Date().toLocaleDateString()}</span></div>
              <div class="row"><span>Customer: रोहित शर्मा</span><span>+91 9876543210</span></div>
              <div class="sep"></div>
              <div class="row bold"><span>Item</span><span>Total</span></div>
              <div style="text-align: left;">
                <div class="bold">पतंजलि दंत कान्ति टूथपेस्ट 100g</div>
                <div class="row" style="color: #444; font-size: 10px;"><span>  2 Pc × ₹100.00</span><span class="bold">₹200.00</span></div>
              </div>
              <div style="text-align: left; margin-top: 4px;">
                <div class="bold">Maybelline Matte Lipstick Red</div>
                <div class="row" style="color: #444; font-size: 10px;"><span>  1 Pc × ₹300.00</span><span class="bold">₹300.00</span></div>
              </div>
              <div class="sep"></div>
              <div class="row"><span>Subtotal:</span><span>₹500.00</span></div>
              <div class="row bold" style="font-size: 13px; margin: 4px 0;"><span>NET TOTAL:</span><span>₹500.00</span></div>
              <div class="row"><span>Mode: CASH</span><span>Status: PAID</span></div>
              ${
                previewQrUrl
                  ? `
                <div class="sep"></div>
                <div class="bold">📱 SCAN & PAY WITH UPI</div>
                <div style="font-size: 10px;">Exact Amount: ₹500.00</div>
                <div class="qr-container"><img class="qr-img" src="${previewQrUrl}" alt="QR" /></div>
                <div style="font-size: 10px; font-family: monospace;">UPI ID: ${config.upiId}</div>
              `
                  : ""
              }
              <div class="sep"></div>
              <div class="footer">${config.customFooter}</div>
              <div style="margin-top: 10px; font-size: 9px; color: #555;">✓ Falcon Thermal Print Driver OK</div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 300);
      }
      setTestPrintStatus("✓ Browser test print dialog opened!");
      setTimeout(() => setTestPrintStatus(""), 3000);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="p-4 bg-gradient-to-r from-purple-700 via-indigo-800 to-slate-900 text-white rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
            <Printer className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h3 className="text-sm font-black flex items-center gap-2">
              <span>Thermal Receipt, Hindi Engine & Bank QR Setup</span>
              <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                Industrial Grade
              </span>
            </h3>
            <p className="text-xs text-purple-200">
              ATPOS 80mm/58mm, Bluetooth auto-reconnect, Hindi Unicode font rendering, and Dynamic UPI QR
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            onClick={handleTestPrint}
            className="flex-1 sm:flex-none bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs gap-1.5 shadow-md active:scale-95 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>🖨️ Send Test Print</span>
          </Button>
          <Button
            type="submit"
            className="flex-1 sm:flex-none bg-white hover:bg-gray-100 text-purple-900 font-black text-xs gap-1.5 shadow-md cursor-pointer"
          >
            {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>{isSaved ? "Saved!" : "Save Settings"}</span>
          </Button>
        </div>
      </div>

      {/* Test Print Feedback Alerts */}
      {testPrintStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{testPrintStatus}</span>
        </div>
      )}

      {testPrintError && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{testPrintError}</span>
        </div>
      )}

      {/* 1. Paper Width Selection (80mm vs 58mm) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-purple-600" />
            <span>1. Thermal Roll Paper Width</span>
          </h4>
          <span className="text-[11px] text-gray-500 font-bold">Selected: {config.paperWidth}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setConfig({ ...config, paperWidth: "80mm" })}
            className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
              config.paperWidth === "80mm"
                ? "border-purple-600 bg-purple-50/50 shadow-md ring-2 ring-purple-600/20"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-black text-gray-900">80mm (3-Inch Standard)</span>
              {config.paperWidth === "80mm" && (
                <span className="text-[10px] font-bold bg-purple-600 text-white px-2 py-0.5 rounded-full">
                  Recommended for ATPOS
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Standard supermarket counter size. Fits detailed item names, Hindi text, and full UPI QR code.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setConfig({ ...config, paperWidth: "58mm" })}
            className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
              config.paperWidth === "58mm"
                ? "border-purple-600 bg-purple-50/50 shadow-md ring-2 ring-purple-600/20"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-black text-gray-900">58mm (2-Inch Mini)</span>
              {config.paperWidth === "58mm" && (
                <span className="text-[10px] font-bold bg-purple-600 text-white px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Compact handheld Bluetooth printer rolls for portable billing.
            </p>
          </button>
        </div>
      </div>

      {/* 2. Connection Method & Auto-Reconnect */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-3 shadow-xs">
        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
          <Bluetooth className="w-4 h-4 text-indigo-600" />
          <span>2. Printer Connection & Bluetooth Auto-Reconnect</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Bluetooth ESC/POS */}
          <div
            className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
              config.connectionType === "bluetooth"
                ? "border-indigo-600 bg-indigo-50/40 shadow-sm"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Bluetooth className="w-4 h-4 text-indigo-600" /> Web Bluetooth (Direct Wireless)
                </span>
                <input
                  type="radio"
                  name="connType"
                  checked={config.connectionType === "bluetooth"}
                  onChange={() => setConfig({ ...config, connectionType: "bluetooth" })}
                  className="w-4 h-4 text-indigo-600 cursor-pointer"
                />
              </div>
              <p className="text-xs text-gray-500">
                Direct wireless printing to ATPOS / ESC-POS Bluetooth printers with auto-reconnection.
              </p>
            </div>

            <div className="pt-3 border-t border-gray-100 mt-3 flex items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold text-gray-800 block truncate">
                  {pairedDevice ? `Device: ${pairedDevice}` : "No device paired"}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">
                  ✓ Auto-reconnects on every bill print
                </span>
              </div>
              <button
                type="button"
                onClick={handlePairBluetooth}
                disabled={isPairing}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all shrink-0"
              >
                {isPairing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bluetooth className="w-3.5 h-3.5" />}
                <span>{pairedDevice ? "Re-Pair" : "Pair ATPOS"}</span>
              </button>
            </div>
          </div>

          {/* Browser System Print */}
          <div
            className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
              config.connectionType === "system"
                ? "border-purple-600 bg-purple-50/40 shadow-sm"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-purple-600" /> Browser Direct Print (USB / Wi-Fi / PDF)
                </span>
                <input
                  type="radio"
                  name="connType"
                  checked={config.connectionType === "system"}
                  onChange={() => setConfig({ ...config, connectionType: "system" })}
                  className="w-4 h-4 text-purple-600 cursor-pointer"
                />
              </div>
              <p className="text-xs text-gray-500">
                Uses standard system print driver for USB thermal printers, network printers, or PDF export.
              </p>
            </div>

            <div className="pt-3 border-t border-gray-100 mt-3 text-[11px] text-emerald-700 font-bold">
              ✓ Ready for instant high-speed print
            </div>
          </div>
        </div>
      </div>

      {/* 3. Hindi / Multilingual Print Engine */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-3 shadow-xs">
        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
          <Type className="w-4 h-4 text-amber-600" />
          <span>3. Language & Print Engine (Hindi / Unicode Support)</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setConfig({ ...config, printEngine: "graphics" })}
            className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
              config.printEngine === "graphics"
                ? "border-amber-500 bg-amber-50/50 shadow-sm ring-1 ring-amber-500/20"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" /> High-Definition Graphics (Hindi Ready)
              </span>
              <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                Recommended
              </span>
            </div>
            <p className="text-xs text-gray-600">
              Renders Hindi (Devanagari), regional languages, rupee symbols (₹), bold titles, and dynamic QR codes with 100% pixel-perfect clarity. No garbled text.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setConfig({ ...config, printEngine: "text" })}
            className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
              config.printEngine === "text"
                ? "border-gray-600 bg-gray-50 shadow-sm"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-bold text-gray-900">Standard ESC/POS ASCII Text</span>
            </div>
            <p className="text-xs text-gray-500">
              Raw ASCII text commands. Fast for English-only bills, but cannot print Hindi or complex Indic characters.
            </p>
          </button>
        </div>
      </div>

      {/* 4. Bank Account & Dynamic UPI Payment QR Code */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <QrIcon className="w-4 h-4 text-emerald-600" />
            <span>4. Bank Account & Dynamic UPI Payment QR Code</span>
          </h4>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Auto Amount Lock
          </span>
        </div>

        <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-start gap-3">
          <QrIcon className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 space-y-1">
            <p className="font-bold">
              Dynamic UPI QR code automatically sets the exact bill total on the customer's phone!
            </p>
            <p className="text-emerald-800 text-[11px]">
              When the customer scans the QR code using PhonePe, Google Pay, Paytm, or BHIM, the exact bill amount (e.g. ₹450) is locked in automatically so there are no typing errors.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Shop UPI ID (VPA) *
            </label>
            <Input
              type="text"
              value={config.upiId}
              onChange={(e) => setConfig({ ...config, upiId: e.target.value.trim() })}
              placeholder="e.g. 9340362381@ybl or shop@okhdfcbank"
              className="rounded-xl font-mono font-bold"
            />
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] text-gray-500 font-bold">Quick Handles:</span>
              {[
                { label: "PhonePe (@ybl)", handle: "@ybl" },
                { label: "PhonePe (@axl)", handle: "@axl" },
                { label: "PhonePe (@ibl)", handle: "@ibl" },
                { label: "Paytm (@paytm)", handle: "@paytm" },
                { label: "GPay (@okaxis)", handle: "@okaxis" },
                { label: "GPay (@okhdfcbank)", handle: "@okhdfcbank" },
                { label: "GPay (@oksbi)", handle: "@oksbi" },
                { label: "BHIM (@upi)", handle: "@upi" },
              ].map((h) => (
                <button
                  key={h.handle}
                  type="button"
                  onClick={() => {
                    const currentPrefix = config.upiId ? config.upiId.split("@")[0] : "9340362381";
                    setConfig({ ...config, upiId: `${currentPrefix}${h.handle}` });
                  }}
                  className="px-2 py-0.5 bg-gray-100 hover:bg-purple-100 hover:text-purple-900 border border-gray-200 hover:border-purple-300 rounded-md text-[10px] font-mono font-semibold transition-all cursor-pointer"
                >
                  {h.handle}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-gray-500 mt-1 block">
              Enter your active merchant or personal UPI ID (e.g. 9340362381@ybl)
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Payee / Account Name
            </label>
            <Input
              type="text"
              value={config.upiPayeeName}
              onChange={(e) => setConfig({ ...config, upiPayeeName: e.target.value })}
              placeholder="e.g. AGS Store"
              className="rounded-xl font-bold"
            />
            <span className="text-[10px] text-gray-500 mt-1 block">
              Business name registered on your UPI app (Special characters like &amp; are automatically sanitized)
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Bank Name (Optional)
            </label>
            <Input
              type="text"
              value={config.bankName}
              onChange={(e) => setConfig({ ...config, bankName: e.target.value })}
              placeholder="e.g. State Bank of India / HDFC Bank"
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Account Number & IFSC (Optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="text"
                value={config.bankAccountNumber}
                onChange={(e) => setConfig({ ...config, bankAccountNumber: e.target.value })}
                placeholder="A/c No."
                className="rounded-xl font-mono text-xs"
              />
              <Input
                type="text"
                value={config.bankIfsc}
                onChange={(e) => setConfig({ ...config, bankIfsc: e.target.value })}
                placeholder="IFSC Code"
                className="rounded-xl font-mono text-xs uppercase"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <label className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors border border-gray-200">
            <div>
              <span className="text-xs font-bold text-gray-900 block">
                📱 Print Dynamic UPI QR Code on Receipts
              </span>
              <span className="text-[11px] text-gray-500">
                Generates a scannable QR on each thermal bill with the customer&apos;s exact order amount
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.showDynamicUpiQr}
              onChange={(e) => setConfig({ ...config, showDynamicUpiQr: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* 5. Typography & Formatting (No Text Cutoff) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4 shadow-xs">
        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-purple-600" />
          <span>5. Typography, Font Size & Item Layout</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Font Size */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Receipt Font Size</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "compact", label: "Compact", desc: "Paper Saver" },
                  { id: "normal", label: "Normal", desc: "Standard" },
                  { id: "large", label: "Large", desc: "High Readability" },
                ] as const
              ).map((fs) => (
                <button
                  key={fs.id}
                  type="button"
                  onClick={() => setConfig({ ...config, fontSize: fs.id })}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    config.fontSize === fs.id
                      ? "border-purple-600 bg-purple-50 text-purple-900 font-black shadow-2xs"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  <span className="text-xs block">{fs.label}</span>
                  <span className="text-[9px] text-gray-500">{fs.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Item Layout (Wrapping vs Truncate) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Product Name Formatting</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfig({ ...config, itemLayout: "wrap-2line" })}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  config.itemLayout === "wrap-2line"
                    ? "border-purple-600 bg-purple-50 text-purple-900 font-bold shadow-2xs"
                    : "border-gray-200 hover:border-gray-300 text-gray-700"
                }`}
              >
                <span className="text-xs block font-bold">2-Line Full Name</span>
                <span className="text-[10px] text-gray-500">No &quot;...&quot; cutoff (Recommended)</span>
              </button>

              <button
                type="button"
                onClick={() => setConfig({ ...config, itemLayout: "single-line" })}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  config.itemLayout === "single-line"
                    ? "border-purple-600 bg-purple-50 text-purple-900 font-bold shadow-2xs"
                    : "border-gray-200 hover:border-gray-300 text-gray-700"
                }`}
              >
                <span className="text-xs block font-bold">Single-Line Table</span>
                <span className="text-[10px] text-gray-500">Compact width</span>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-gray-100">
          <label className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors border border-gray-200">
            <div>
              <span className="text-xs font-bold text-gray-900 block">
                ⚡ Auto-Print receipt immediately on checkout
              </span>
              <span className="text-[11px] text-gray-500">
                Prints automatically without needing an extra click
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.autoPrint}
              onChange={(e) => setConfig({ ...config, autoPrint: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors border border-gray-200">
            <div>
              <span className="text-xs font-bold text-gray-900 block">
                Show Customer Details on Bill Header
              </span>
              <span className="text-[11px] text-gray-500">
                Prints customer name and mobile number
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.showCustomerInfo}
              onChange={(e) => setConfig({ ...config, showCustomerInfo: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* 6. Receipt Header & Shop Branding */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4 shadow-xs">
        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
          <Store className="w-4 h-4 text-purple-600" />
          <span>6. Receipt Header & Shop Details</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Store / Business Name</label>
            <Input
              type="text"
              value={config.shopName}
              onChange={(e) => setConfig({ ...config, shopName: e.target.value })}
              placeholder="e.g. AGS STORE & COSMETICS"
              className="rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Contact Phone / Helpdesk</label>
            <Input
              type="text"
              value={config.shopPhone}
              onChange={(e) => setConfig({ ...config, shopPhone: e.target.value })}
              placeholder="e.g. +91 9340362381"
              className="rounded-xl"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-700 mb-1">Store Address</label>
            <Input
              type="text"
              value={config.shopAddress}
              onChange={(e) => setConfig({ ...config, shopAddress: e.target.value })}
              placeholder="e.g. Main Market Road, Near Post Office"
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">GSTIN (Optional)</label>
            <Input
              type="text"
              value={config.shopGst}
              onChange={(e) => setConfig({ ...config, shopGst: e.target.value })}
              placeholder="e.g. 23AAAAA0000A1Z5"
              className="rounded-xl font-mono uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Custom Return Policy / Footer</label>
            <Input
              type="text"
              value={config.customFooter}
              onChange={(e) => setConfig({ ...config, customFooter: e.target.value })}
              placeholder="e.g. Goods once sold can be exchanged within 7 days."
              className="rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="submit"
          className="bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white font-black text-sm px-6 py-2.5 rounded-xl shadow-md active:scale-95 transition-all cursor-pointer"
        >
          {isSaved ? "✓ All Settings Saved Permanently!" : "Save Printer Configuration"}
        </Button>
      </div>
    </form>
  );
};
