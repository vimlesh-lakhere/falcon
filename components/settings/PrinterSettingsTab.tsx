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
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  PrinterConfig,
  DEFAULT_PRINTER_CONFIG,
  getPrinterConfig,
  savePrinterConfig,
  pairBluetoothPrinter,
  sendBluetoothEscPos,
  buildTestPrintEscPos,
} from "@/lib/thermal-printer";

interface PrinterSettingsTabProps {
  shopId: string;
}

export const PrinterSettingsTab: React.FC<PrinterSettingsTabProps> = ({ shopId }) => {
  const [config, setConfig] = useState<PrinterConfig>(DEFAULT_PRINTER_CONFIG);
  const [isSaved, setIsSaved] = useState(false);
  const [isPairing, setIsPairing] = useState(false);
  const [pairedDevice, setPairedDevice] = useState<string>("");
  const [testPrintStatus, setTestPrintStatus] = useState<string>("");
  const [testPrintError, setTestPrintError] = useState<string>("");

  useEffect(() => {
    const loaded = getPrinterConfig(shopId);
    setConfig(loaded);
    if (loaded.bluetoothDeviceName) {
      setPairedDevice(loaded.bluetoothDeviceName);
    }
  }, [shopId]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    savePrinterConfig(shopId, config);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handlePairBluetooth = async () => {
    setIsPairing(true);
    setTestPrintError("");
    try {
      const devName = await pairBluetoothPrinter();
      setPairedDevice(devName);
      const updated = {
        ...config,
        connectionType: "bluetooth" as const,
        bluetoothDeviceName: devName,
      };
      setConfig(updated);
      savePrinterConfig(shopId, updated);
      setTestPrintStatus(`✓ Paired with "${devName}"`);
      setTimeout(() => setTestPrintStatus(""), 3000);
    } catch (err: any) {
      setTestPrintError(err.message || "Failed to pair Bluetooth printer");
    } finally {
      setIsPairing(false);
    }
  };

  const handleTestPrint = async () => {
    setTestPrintStatus("");
    setTestPrintError("");

    if (config.connectionType === "bluetooth") {
      try {
        setTestPrintStatus("Sending test receipt to Bluetooth printer...");
        const bytes = buildTestPrintEscPos(config);
        await sendBluetoothEscPos(bytes);
        setTestPrintStatus("✓ Test receipt printed successfully on ATPOS Bluetooth Printer!");
        setTimeout(() => setTestPrintStatus(""), 4000);
      } catch (err: any) {
        setTestPrintError(
          err.message || "Bluetooth print failed. Please make sure printer is ON and paired."
        );
      }
    } else {
      // System Browser Print Test
      const printWindow = window.open("", "_blank", "width=380,height=600");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>ATPOS Test Receipt - 80mm</title>
              <style>
                @page { size: ${config.paperWidth === "80mm" ? "80mm auto" : "58mm auto"}; margin: 0; }
                body { font-family: 'Courier New', monospace; font-size: 12px; width: ${
                  config.paperWidth === "80mm" ? "72mm" : "48mm"
                }; margin: 0 auto; padding: 10px 4px; text-align: center; color: black; }
                .bold { font-weight: bold; }
                .title { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
                .sep { border-top: 1px dashed #000; margin: 6px 0; }
                .row { display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0; }
                .footer { font-size: 10px; margin-top: 8px; }
              </style>
            </head>
            <body>
              <div class="title">${config.shopName}</div>
              <div>${config.shopAddress}</div>
              <div>Tel: ${config.shopPhone}</div>
              ${config.showGstin && config.shopGst ? `<div>GSTIN: ${config.shopGst}</div>` : ""}
              <div class="sep"></div>
              <div class="row"><span>Invoice: #TEST-001</span><span>${new Date().toLocaleDateString()}</span></div>
              <div class="sep"></div>
              <div class="row bold"><span>Item</span><span>Qty</span><span>Total</span></div>
              <div class="row"><span>Dabur Badam Tail</span><span>2</span><span>₹150</span></div>
              <div class="row"><span>Maybelline Lipstick</span><span>1</span><span>₹300</span></div>
              <div class="sep"></div>
              <div class="row bold" style="font-size: 14px;"><span>FINAL TOTAL</span><span>₹450</span></div>
              <div class="row"><span>Mode: CASH</span><span>Status: PAID</span></div>
              <div class="sep"></div>
              <div class="footer">${config.customFooter}</div>
              <div style="margin-top: 10px; font-size: 9px;">✓ ATPOS 80mm / 58mm Thermal Print OK</div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
      setTestPrintStatus("✓ Browser test print dialog opened!");
      setTimeout(() => setTestPrintStatus(""), 3000);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Banner & Quick Test Action */}
      <div className="p-4 bg-gradient-to-r from-purple-700 via-indigo-800 to-slate-900 text-white rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
            <Printer className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h3 className="text-sm font-black flex items-center gap-2">
              <span>Thermal Receipt & ATPOS Printer Setup</span>
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                Saved Permanently
              </span>
            </h3>
            <p className="text-xs text-purple-200">
              Configure 80mm / 58mm roll width, Bluetooth ESC/POS connection, and auto-print
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            onClick={handleTestPrint}
            className="flex-1 sm:flex-none bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs gap-1.5 shadow-md active:scale-95"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>🖨️ Send Test Print</span>
          </Button>
          <Button
            type="submit"
            className="flex-1 sm:flex-none bg-white hover:bg-gray-100 text-purple-900 font-black text-xs gap-1.5 shadow-md"
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
          <span className="text-[11px] text-gray-500">Selected: {config.paperWidth}</span>
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
              Standard supermarket counter size. Fits detailed item names, quantities, and GST columns.
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
              Compact handheld Bluetooth printer rolls for small bills.
            </p>
          </button>
        </div>
      </div>

      {/* 2. Connection Method (Bluetooth vs Browser Print) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-3 shadow-xs">
        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
          <Bluetooth className="w-4 h-4 text-indigo-600" />
          <span>2. Printer Connection Method</span>
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
                  <Bluetooth className="w-4 h-4 text-indigo-600" /> Web Bluetooth (Direct ESC/POS)
                </span>
                <input
                  type="radio"
                  name="connType"
                  checked={config.connectionType === "bluetooth"}
                  onChange={() => setConfig({ ...config, connectionType: "bluetooth" })}
                  className="w-4 h-4 text-indigo-600"
                />
              </div>
              <p className="text-xs text-gray-500">
                Direct wireless printing to ATPOS Bluetooth printers without opening the browser print popup.
              </p>
            </div>

            <div className="pt-3 border-t border-gray-100 mt-3 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-gray-700 truncate">
                {pairedDevice ? `Device: ${pairedDevice}` : "No device paired"}
              </span>
              <button
                type="button"
                onClick={handlePairBluetooth}
                disabled={isPairing}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
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
                  <Monitor className="w-4 h-4 text-purple-600" /> Browser Direct Print (USB / Network / PDF)
                </span>
                <input
                  type="radio"
                  name="connType"
                  checked={config.connectionType === "system"}
                  onChange={() => setConfig({ ...config, connectionType: "system" })}
                  className="w-4 h-4 text-purple-600"
                />
              </div>
              <p className="text-xs text-gray-500">
                Works with all thermal printers connected via USB, Wi-Fi, Ethernet, or Windows/Android drivers.
              </p>
            </div>

            <div className="pt-3 border-t border-gray-100 mt-3 text-[11px] text-emerald-700 font-bold">
              ✓ Ready for instant high-speed print
            </div>
          </div>
        </div>
      </div>

      {/* 3. Automation & Checkout Behavior */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-3 shadow-xs">
        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>3. Automation Preferences</span>
        </h4>

        <div className="space-y-2.5">
          <label className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors border border-gray-200">
            <div>
              <span className="text-xs font-bold text-gray-900 block">
                ⚡ Auto-Print receipt on payment completion
              </span>
              <span className="text-[11px] text-gray-500">
                Automatically triggers printing right when you click Pay in POS without asking
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.autoPrint}
              onChange={(e) => setConfig({ ...config, autoPrint: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors border border-gray-200">
            <div>
              <span className="text-xs font-bold text-gray-900 block">
                Show Customer Details on Receipt
              </span>
              <span className="text-[11px] text-gray-500">
                Prints customer name and mobile number on bill header
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.showCustomerInfo}
              onChange={(e) => setConfig({ ...config, showCustomerInfo: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded"
            />
          </label>
        </div>
      </div>

      {/* 4. Receipt Header & Shop Branding */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4 shadow-xs">
        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
          <Store className="w-4 h-4 text-purple-600" />
          <span>4. Receipt Header & Shop Details</span>
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
              className="rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Footer Message</label>
            <Input
              type="text"
              value={config.customFooter}
              onChange={(e) => setConfig({ ...config, customFooter: e.target.value })}
              placeholder="e.g. Goods once sold will not be returned. Thank you!"
              className="rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="submit"
          className="bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white font-black text-sm px-6 py-2.5 rounded-xl shadow-md active:scale-95 transition-all"
        >
          {isSaved ? "✓ All Settings Saved!" : "Save Printer Configuration"}
        </Button>
      </div>
    </form>
  );
};
