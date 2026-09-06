"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Package,
  Printer,
  X,
  Check,
  Plus,
  Minus,
  MapPin,
  Phone,
  User,
  Truck,
  FileText,
  Sparkles,
  Bluetooth,
  Copy,
  Share2,
} from "lucide-react";
import {
  PrinterConfig,
  getPrinterConfig,
  ParcelLabelData,
  buildShippingParcelLabelGraphics,
  buildShippingParcelLabelEscPos,
  sendBluetoothEscPos,
  getBluetoothPrinterState,
} from "@/lib/thermal-printer";
import { Button } from "@/components/ui/Button";

interface ShippingParcelLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId?: string;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  initialDestination?: string;
  initialAddress?: string;
  initialInvoiceNo?: string;
  initialOrderValue?: number;
}

export const ShippingParcelLabelModal: React.FC<ShippingParcelLabelModalProps> = ({
  isOpen,
  onClose,
  shopId = "",
  initialCustomerName = "",
  initialCustomerPhone = "",
  initialDestination = "",
  initialAddress = "",
  initialInvoiceNo = "",
  initialOrderValue = 0,
}) => {
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone);
  const [destination, setDestination] = useState(initialDestination);
  const [address, setAddress] = useState(initialAddress);
  const [totalBoxes, setTotalBoxes] = useState<number>(1);
  const [currentBoxIndex, setCurrentBoxIndex] = useState<number>(1);
  const [transportNotes, setTransportNotes] = useState("");
  const [invoiceNo, setInvoiceNo] = useState(initialInvoiceNo);
  const [orderValue, setOrderValue] = useState<number>(initialOrderValue);
  const [orientation, setOrientation] = useState<"rotated-90" | "standard">("rotated-90");

  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(() => getPrinterConfig(shopId));
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState("");
  const [printError, setPrintError] = useState("");

  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPrinterConfig(getPrinterConfig(shopId));
      setCustomerName(initialCustomerName);
      setCustomerPhone(initialCustomerPhone);
      setDestination(initialDestination);
      setAddress(initialAddress);
      setInvoiceNo(initialInvoiceNo);
      setOrderValue(initialOrderValue);
      setOrientation("rotated-90");
      setTotalBoxes(1);
      setCurrentBoxIndex(1);
      setPrintStatus("");
      setPrintError("");
    }
  }, [
    isOpen,
    initialCustomerName,
    initialCustomerPhone,
    initialDestination,
    initialAddress,
    initialInvoiceNo,
    initialOrderValue,
    shopId,
  ]);

  if (!isOpen) return null;

  const currentLabelData: ParcelLabelData = {
    customerName: customerName.trim() || "Customer Name",
    customerPhone: customerPhone.trim(),
    destination: destination.trim(),
    address: address.trim(),
    boxIndex: currentBoxIndex,
    totalBoxes: Math.max(1, totalBoxes),
    invoiceNo: invoiceNo.trim(),
    orderValue: orderValue > 0 ? orderValue : undefined,
    notes: transportNotes.trim(),
    senderName: printerConfig.shopName || "AGS STORE & COSMETICS",
    senderPhone: printerConfig.shopPhone || "+91 9340362381",
    senderAddress: printerConfig.shopAddress || "Main Market Road",
    orientation: orientation,
  };

  const rawPhone = customerPhone.replace(/[^0-9]/g, "").slice(-10);
  const displayFormattedPhone = rawPhone.length === 10
    ? `${rawPhone.slice(0, 5)} ${rawPhone.slice(5)}`
    : customerPhone || "98765 00000";

  // Print Single Label via Bluetooth ESC/POS or Browser Print
  const handlePrintSingleLabel = async (boxIdx: number) => {
    setIsPrinting(true);
    setPrintStatus("");
    setPrintError("");

    const dataToPrint: ParcelLabelData = {
      ...currentLabelData,
      boxIndex: boxIdx,
    };

    try {
      if (printerConfig.connectionType === "bluetooth") {
        setPrintStatus(`Sending Box ${boxIdx} of ${totalBoxes} to 80mm Thermal Printer...`);
        let bytes: Uint8Array;
        if (printerConfig.printEngine === "graphics") {
          bytes = await buildShippingParcelLabelGraphics(dataToPrint, printerConfig);
        } else {
          bytes = buildShippingParcelLabelEscPos(dataToPrint, printerConfig);
        }

        await sendBluetoothEscPos(bytes);
        setPrintStatus(`✓ Box ${boxIdx} of ${totalBoxes} printed successfully!`);
        setTimeout(() => setPrintStatus(""), 3500);
      } else {
        // System Browser Print Dialog
        window.print();
      }
    } catch (err: any) {
      console.warn("Direct thermal print error:", err);
      setPrintError(err.message || "Bluetooth print failed. Using browser print dialog...");
      setTimeout(() => {
        window.print();
      }, 300);
    } finally {
      setIsPrinting(false);
    }
  };

  // Print All Labels for all boxes sequentially (e.g. Box 1 of 3, Box 2 of 3, Box 3 of 3)
  const handlePrintAllBoxes = async () => {
    setIsPrinting(true);
    setPrintStatus("");
    setPrintError("");

    try {
      for (let i = 1; i <= totalBoxes; i++) {
        setPrintStatus(`Printing Box ${i} of ${totalBoxes}...`);
        const dataToPrint: ParcelLabelData = {
          ...currentLabelData,
          boxIndex: i,
        };

        if (printerConfig.connectionType === "bluetooth") {
          let bytes: Uint8Array;
          if (printerConfig.printEngine === "graphics") {
            bytes = await buildShippingParcelLabelGraphics(dataToPrint, printerConfig);
          } else {
            bytes = buildShippingParcelLabelEscPos(dataToPrint, printerConfig);
          }
          await sendBluetoothEscPos(bytes);
          // Small pause between multiple box labels
          if (i < totalBoxes) {
            await new Promise((r) => setTimeout(r, 600));
          }
        }
      }
      setPrintStatus(`✓ All ${totalBoxes} parcel stickers printed successfully!`);
      setTimeout(() => setPrintStatus(""), 4000);
    } catch (err: any) {
      console.warn("Print all error:", err);
      setPrintError(err.message || "Print failed. Falling back to browser print...");
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
        {/* ========================================================================= */}
        {/* MODAL HEADER                                                              */}
        {/* ========================================================================= */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-indigo-500 flex items-center justify-center shadow-md">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                📦 80mm Parcel & Shipping Label
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  Thermal Sticker
                </span>
              </h3>
              <p className="text-[10px] text-purple-200/80">
                Giant bold name, mobile & bus stand label for bus conductors & courier parcels
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* SPLIT CONTENT: EDIT DETAILS ON LEFT + LIVE 80MM PREVIEW ON RIGHT          */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-gray-200">
          {/* Left: Input Form Controls (6 cols) */}
          <div className="md:col-span-6 p-4 space-y-3.5 bg-gray-50">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                👤 Customer / Recipient Details
              </span>

              {/* Customer Name */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">
                  Customer Name (बड़ा नाम) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar Sharma"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-xs bg-white border border-gray-300 rounded-xl px-3 py-2 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-600 shadow-xs"
                />
              </div>

              {/* Customer Phone Number */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">
                  Mobile Number (बड़ा मोबाइल नंबर) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">📱</span>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-xl font-mono font-black text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-600 shadow-xs"
                  />
                </div>
              </div>

              {/* Destination / Bus Stand */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">
                  Destination / Bus Stand (गंतव्य / बस स्टैंड) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">📍</span>
                  <input
                    type="text"
                    placeholder="e.g. BANDA BUS STAND / REWA / BUS NO 4"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-600 shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* Parcel Box Counter */}
            <div className="space-y-1 pt-1 border-t border-gray-200">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                📦 Parcel & Box Count
              </span>

              <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-gray-200">
                <div>
                  <div className="text-xs font-black text-gray-900">Total Boxes / Cartons</div>
                  <div className="text-[10px] text-gray-500">How many boxes in this parcel?</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTotalBoxes((b) => Math.max(1, b - 1))}
                    className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 font-black text-sm flex items-center justify-center cursor-pointer active:scale-95"
                  >
                    -
                  </button>
                  <span className="font-mono font-black text-sm text-purple-950 w-6 text-center">
                    {totalBoxes}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTotalBoxes((b) => Math.min(20, b + 1))}
                    className="w-7 h-7 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 font-black text-sm flex items-center justify-center cursor-pointer active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Print Orientation Selector */}
            <div className="space-y-1 pt-1 border-t border-gray-200">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                📐 Print Style / ओरिएंटेशन (अक्षर का आकार)
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrientation("rotated-90")}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    orientation === "rotated-90"
                      ? "bg-purple-50 border-purple-600 text-purple-950 ring-2 ring-purple-600 shadow-xs"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-black text-xs">
                    <span>🔄 लंबा बड़ा स्टिकर</span>
                    <span className="text-[9px] bg-purple-600 text-white px-1.5 py-0.2 rounded-full font-black">
                      Recommended
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                    90° घूमकर लंबा प्रिंट होगा (सबसे बड़ा नाम व मोबाइल नंबर)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setOrientation("standard")}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    orientation === "standard"
                      ? "bg-purple-50 border-purple-600 text-purple-950 ring-2 ring-purple-600 shadow-xs"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <div className="font-black text-xs text-gray-900">
                    📄 सीधा स्टिकर
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                    स्टैंडर्ड 80mm चौड़ाई में सामान्य साइज
                  </div>
                </button>
              </div>
            </div>

            {/* Optional Additional Details */}
            <div className="space-y-2 pt-1 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-0.5">
                    Bill / Inv No. (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-1049"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full text-xs bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-0.5">
                    Order Value (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={orderValue || ""}
                    onChange={(e) => setOrderValue(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-0.5">
                  Transport / Driver Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bus driver Chhotelal, Phone 9425xxxx"
                  value={transportNotes}
                  onChange={(e) => setTransportNotes(e.target.value)}
                  className="w-full text-xs bg-white border border-gray-300 rounded-lg px-2.5 py-1.5"
                />
              </div>
            </div>
          </div>

          {/* Right: Live 80mm Thermal Label Preview (6 cols) */}
          <div className="md:col-span-6 p-4 bg-slate-100 flex flex-col items-center justify-start overflow-y-auto max-h-[500px]">
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                🖨️ Live 80mm Preview
              </span>
              <span className="text-[10px] font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                {orientation === "rotated-90" ? "🔄 90° Rotated (Mega Text)" : "📄 Standard 80mm"}
              </span>
            </div>

            {orientation === "rotated-90" ? (
              /* Real 90° Rotated Landscape-on-Roll Preview */
              <div
                ref={printAreaRef}
                className="w-full bg-white border-2 border-dashed border-gray-400 p-3.5 rounded-xl shadow-lg font-sans text-black space-y-2.5"
              >
                {/* Header Banner */}
                <div className="bg-black text-white text-center py-1 px-2 rounded-sm font-black text-xs uppercase tracking-wider">
                  ★ PARCEL / DISPATCH SLIP (पार्सल पर्ची) ★
                </div>

                <div className="grid grid-cols-12 gap-2">
                  {/* Left Column: Mega Customer Info */}
                  <div className="col-span-8 space-y-1.5 pr-2 border-r border-dashed border-gray-300">
                    <div className="text-[9px] font-bold uppercase text-gray-500">
                      SHIP TO / पाने वाले ग्राहक का विवरण:
                    </div>

                    {/* Mega Customer Name */}
                    <div className="text-xl font-black leading-tight text-gray-950 uppercase break-words">
                      {customerName.trim() || "RAMESH KUMAR SHARMA"}
                    </div>

                    {/* Mega Highlighted Phone Bar */}
                    <div className="bg-black text-white text-center py-2 px-1 rounded-md font-mono font-black text-xl tracking-wider shadow-xs">
                      📱 {displayFormattedPhone}
                    </div>

                    {/* Mega Destination */}
                    {destination.trim() && (
                      <div className="pt-1">
                        <div className="text-[9px] font-bold text-gray-600">
                          📍 DESTINATION / बस स्टैंड / शहर:
                        </div>
                        <div className="text-sm font-black text-gray-900 uppercase">
                          {destination.trim()}
                        </div>
                      </div>
                    )}

                    {(address.trim() || transportNotes.trim()) && (
                      <div className="text-[10px] text-gray-700 font-bold line-clamp-2">
                        {[address.trim(), transportNotes.trim()].filter(Boolean).join(" • ")}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Box, Sender & Info */}
                  <div className="col-span-4 space-y-1.5 text-left flex flex-col justify-between">
                    {/* Box Counter Badge */}
                    <div className="border-2 border-black text-center py-1 font-black text-xs tracking-wide bg-gray-50">
                      📦 BOX {currentBoxIndex} OF {totalBoxes}
                    </div>

                    {/* Sender Info */}
                    <div className="space-y-0.5 text-[9px]">
                      <div className="font-bold text-gray-500 uppercase">FROM / प्रेषक:</div>
                      <div className="font-black text-[10px] text-gray-900 leading-tight">
                        {printerConfig.shopName || "AGS STORE & COSMETICS"}
                      </div>
                      <div className="font-mono font-bold text-[10px]">
                        📞 {printerConfig.shopPhone || "+91 9340362381"}
                      </div>
                    </div>

                    <div className="bg-gray-100 p-1 text-[9px] font-mono font-bold rounded-sm">
                      {invoiceNo ? `#${invoiceNo} • ` : ""}
                      {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      {orderValue > 0 && ` • ₹${orderValue}`}
                    </div>

                    <div className="text-[8px] font-black text-center text-gray-700 border-t border-gray-200 pt-1">
                      ⚠️ HANDLE WITH CARE
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Standard Vertical 80mm Preview */
              <div
                ref={printAreaRef}
                className="w-full max-w-[280px] bg-white border-2 border-dashed border-gray-400 p-3 rounded-xl shadow-lg font-sans text-black space-y-2.5"
              >
                {/* Header Banner */}
                <div className="bg-black text-white text-center py-1.5 px-2 rounded-sm font-black text-xs uppercase tracking-wider">
                  ★ PARCEL / DISPATCH SLIP ★
                </div>

                {/* Box Counter Badge */}
                <div className="border-2 border-black text-center py-1 font-black text-xs tracking-wide">
                  📦 PARCEL: BOX {currentBoxIndex} OF {totalBoxes}
                </div>

                {/* TO: Section */}
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] font-bold uppercase text-gray-600">
                    SHIP TO / पाने वाले का विवरण:
                  </div>

                  <div className="text-lg font-black leading-tight break-words">
                    {customerName.trim() || "RAMESH KUMAR"}
                  </div>

                  <div className="bg-black text-white text-center py-1.5 px-1 rounded-sm font-mono font-black text-base tracking-wider">
                    📱 {displayFormattedPhone}
                  </div>
                </div>

                {destination.trim() && (
                  <div className="space-y-0.5 border-t border-gray-300 pt-1">
                    <div className="text-[10px] font-bold text-gray-600">
                      📍 DESTINATION:
                    </div>
                    <div className="text-xs font-black text-gray-900 leading-snug uppercase">
                      {destination.trim()}
                    </div>
                  </div>
                )}

                {(address.trim() || transportNotes.trim()) && (
                  <div className="text-[10px] text-gray-800 space-y-0.5">
                    {address.trim() && <div>Addr: {address.trim()}</div>}
                    {transportNotes.trim() && <div>Transport: {transportNotes.trim()}</div>}
                  </div>
                )}

                <div className="border-t-2 border-black pt-1 space-y-0.5 text-left text-[10px]">
                  <div className="text-[9px] font-bold uppercase text-gray-500">
                    FROM:
                  </div>
                  <div className="font-black text-xs">
                    {printerConfig.shopName || "AGS STORE & COSMETICS"}
                  </div>
                  <div className="font-mono font-bold text-[11px]">
                    📞 {printerConfig.shopPhone || "+91 9340362381"}
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-400 pt-1 text-center text-[9px] font-bold text-gray-800">
                  ⚠️ HANDLE WITH CARE (कांच/सामान सम्भाल कर रखें)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STATUS / ERROR TOAST                                                      */}
        {/* ========================================================================= */}
        {(printStatus || printError) && (
          <div
            className={`px-4 py-2 text-xs font-bold shrink-0 flex items-center justify-between ${
              printError ? "bg-rose-50 text-rose-800 border-t border-rose-200" : "bg-emerald-50 text-emerald-800 border-t border-emerald-200"
            }`}
          >
            <span>{printError || printStatus}</span>
            {printError && (
              <button
                type="button"
                onClick={() => setPrintError("")}
                className="text-rose-600 font-bold ml-2"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL ACTION BUTTONS                                                      */}
        {/* ========================================================================= */}
        <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-bold">80mm ATPOS Thermal</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Close
            </Button>

            {/* Print Single Label */}
            <Button
              type="button"
              size="sm"
              onClick={() => handlePrintSingleLabel(currentBoxIndex)}
              disabled={isPrinting || !customerName.trim()}
              isLoading={isPrinting}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              <span>Print Box {currentBoxIndex}</span>
            </Button>

            {/* Print All Labels (if multiple boxes) */}
            {totalBoxes > 1 && (
              <Button
                type="button"
                size="sm"
                onClick={handlePrintAllBoxes}
                disabled={isPrinting || !customerName.trim()}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                <Package className="w-3.5 h-3.5 mr-1" />
                <span>Print All {totalBoxes} Stickers</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
