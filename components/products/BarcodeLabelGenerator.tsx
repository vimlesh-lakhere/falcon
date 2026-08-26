"use client";

import React, { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Product } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { Printer, Download, Sparkles, RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface BarcodeLabelGeneratorProps {
  product: Product;
  shopName?: string;
  onClose: () => void;
  onUpdateBarcode?: (newBarcode: string) => Promise<void>;
}

export function BarcodeLabelGenerator({
  product,
  shopName = "AGS STORE",
  onClose,
  onUpdateBarcode,
}: BarcodeLabelGeneratorProps) {
  const [barcodeValue, setBarcodeValue] = useState<string>(
    product.barcode || product.sku || `890${Math.floor(1000000000 + Math.random() * 9000000000)}`
  );
  const [labelSize, setLabelSize] = useState<"50x25" | "38x25" | "a4_24">("50x25");
  const [printCount, setPrintCount] = useState<number>(1);
  const [includeMrp, setIncludeMrp] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);
  const [isSavingBarcode, setIsSavingBarcode] = useState(false);

  const previewSvgRef = useRef<SVGSVGElement>(null);

  // Render SVG barcode using JsBarcode
  useEffect(() => {
    if (!previewSvgRef.current || !barcodeValue.trim()) return;

    try {
      // Determine barcode format: if 13 digits, use EAN13 or CODE128
      const isDigitsOnly = /^\d+$/.test(barcodeValue.trim());
      const format = isDigitsOnly && barcodeValue.trim().length === 13 ? "EAN13" : "CODE128";

      JsBarcode(previewSvgRef.current, barcodeValue.trim(), {
        format: format,
        width: 1.6,
        height: 40,
        displayValue: true,
        font: "monospace",
        fontSize: 11,
        textMargin: 2,
        margin: 4,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch {
      // If EAN13 checksum fails, fallback to CODE128
      try {
        if (previewSvgRef.current) {
          JsBarcode(previewSvgRef.current, barcodeValue.trim(), {
            format: "CODE128",
            width: 1.5,
            height: 40,
            displayValue: true,
            fontSize: 11,
            margin: 4,
          });
        }
      } catch (err) {
        console.warn("Barcode rendering error:", err);
      }
    }
  }, [barcodeValue]);

  // Generate new EAN-13 random barcode
  const handleGenerateNewBarcode = () => {
    const randomEan = `890${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    setBarcodeValue(randomEan);
  };

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(barcodeValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToProduct = async () => {
    if (!onUpdateBarcode) return;
    try {
      setIsSavingBarcode(true);
      await onUpdateBarcode(barcodeValue);
      alert("Barcode saved to product successfully!");
    } catch (err: any) {
      alert("Failed to save barcode: " + (err.message || "Error"));
    } finally {
      setIsSavingBarcode(false);
    }
  };

  const handleDownloadSvg = () => {
    if (!previewSvgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(previewSvgRef.current);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `${product.name.slice(0, 20)}_Barcode_${barcodeValue}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handlePrint = () => {
    window.print();
  };

  const mrpPrice = Math.round(Number(product.selling_price) * 1.2);
  const sellingPrice = Number(product.selling_price);

  return (
    <div className="space-y-6">
      {/* Configuration Controls (Hidden in Print) */}
      <div className="space-y-4 print:hidden">
        {/* Barcode Number & Generate / Save Bar */}
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700">Barcode / SKU Value:</label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleGenerateNewBarcode}
                className="text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 bg-brand-50 px-2 py-0.5 rounded cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> Auto-Generate EAN-13
              </button>
              <button
                type="button"
                onClick={handleCopyBarcode}
                className="text-[11px] text-gray-600 hover:text-gray-900 flex items-center gap-1 px-2 py-0.5 rounded border border-gray-200 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={barcodeValue}
              onChange={(e) => setBarcodeValue(e.target.value)}
              placeholder="Enter barcode or SKU"
              className="flex-1 text-xs font-mono bg-white border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
            {onUpdateBarcode && barcodeValue !== product.barcode && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveToProduct}
                isLoading={isSavingBarcode}
                className="text-xs"
              >
                Save to Product
              </Button>
            )}
          </div>
        </div>

        {/* Label Size & Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">Label Paper Size:</label>
            <select
              value={labelSize}
              onChange={(e) => setLabelSize(e.target.value as any)}
              className="w-full text-xs bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
              <option value="50x25">Thermal Sticker (50mm × 25mm / 2&quot; × 1&quot;)</option>
              <option value="38x25">Compact Sticker (38mm × 25mm)</option>
              <option value="a4_24">A4 Sheet (24 Stickers / 3×8 Grid)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">Print Quantity:</label>
            <input
              type="number"
              min={1}
              max={200}
              value={printCount}
              onChange={(e) => setPrintCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full text-xs bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-brand-600 text-center"
            />
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={includeMrp}
                onChange={(e) => setIncludeMrp(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <span>Show MRP Strike-off</span>
            </label>
          </div>
        </div>
      </div>

      {/* Live Label Preview (Screen View) */}
      <div className="p-4 bg-gray-100 rounded-2xl border border-gray-200 flex flex-col items-center justify-center space-y-2 print:hidden">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
          Live Sticker Label Preview
        </span>

        <div className="w-[240px] bg-white border-2 border-dashed border-gray-300 rounded-xl p-3 shadow-md flex flex-col items-center text-center space-y-1">
          <div className="text-[10px] font-extrabold text-gray-800 tracking-wider uppercase truncate max-w-full">
            {shopName}
          </div>
          <div className="text-xs font-bold text-gray-900 leading-tight line-clamp-2 max-w-full">
            {product.name}
          </div>

          {/* Barcode SVG element */}
          <div className="w-full flex justify-center py-1">
            <svg ref={previewSvgRef} className="max-w-full h-auto" />
          </div>

          {/* Pricing Details */}
          <div className="w-full flex items-center justify-between pt-1 border-t border-gray-200 text-xs">
            {includeMrp && (
              <span className="text-[10px] text-gray-400 line-through">
                MRP: {formatCurrency(mrpPrice)}
              </span>
            )}
            <span className="font-extrabold text-brand-700 ml-auto">
              Our Price: {formatCurrency(sellingPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons (Hidden in Print) */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100 print:hidden">
        <Button variant="ghost" onClick={handleDownloadSvg} className="text-xs gap-1.5">
          <Download className="w-3.5 h-3.5" /> Download SVG
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="text-xs">
            Close
          </Button>
          <Button onClick={handlePrint} className="gap-2 text-xs font-bold shadow-md">
            <Printer className="w-4 h-4" /> Print {printCount} Label(s)
          </Button>
        </div>
      </div>

      {/* PRINT MEDIA STYLESHEET & REPEATING LABELS FOR ACTUAL THERMAL / SHEET PRINTING */}
      <div className="hidden print:block print:w-full">
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * {
                visibility: hidden;
              }
              #barcode-print-container, #barcode-print-container * {
                visibility: visible;
              }
              #barcode-print-container {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 0;
                background: white;
              }
              .barcode-sticker {
                page-break-inside: avoid;
                break-inside: avoid;
                margin-bottom: 2mm;
                border: 1px solid #ccc;
                box-sizing: border-box;
                padding: 2mm;
                text-align: center;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
              }
              .sticker-50x25 {
                width: 50mm;
                height: 25mm;
              }
              .sticker-38x25 {
                width: 38mm;
                height: 25mm;
              }
              .sticker-a4_24 {
                width: 63.5mm;
                height: 38.1mm;
                margin: 1.5mm;
                display: inline-flex;
              }
            }
          `,
        }} />

        <div
          id="barcode-print-container"
          className={labelSize === "a4_24" ? "flex flex-wrap" : "flex flex-col items-center"}
        >
          {Array.from({ length: printCount }).map((_, index) => (
            <div
              key={index}
              className={`barcode-sticker ${
                labelSize === "50x25"
                  ? "sticker-50x25"
                  : labelSize === "38x25"
                  ? "sticker-38x25"
                  : "sticker-a4_24"
              }`}
            >
              <div style={{ fontSize: "8px", fontWeight: "800", textTransform: "uppercase" }}>
                {shopName}
              </div>
              <div style={{ fontSize: "9px", fontWeight: "700", lineHeight: "1.1", maxHeight: "18px", overflow: "hidden" }}>
                {product.name}
              </div>

              <BarcodeImageItem barcode={barcodeValue} />

              <div style={{ width: "100%", display: "flex", justifyContent: "space-between", fontSize: "9px", fontWeight: "bold" }}>
                {includeMrp && (
                  <span style={{ textDecoration: "line-through", color: "#666", fontSize: "8px" }}>
                    MRP: ₹{mrpPrice}
                  </span>
                )}
                <span style={{ marginLeft: "auto" }}>
                  Price: ₹{sellingPrice}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Subcomponent to render SVG for individual print items
function BarcodeImageItem({ barcode }: { barcode: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !barcode) return;
    try {
      const isDigitsOnly = /^\d+$/.test(barcode.trim());
      const format = isDigitsOnly && barcode.trim().length === 13 ? "EAN13" : "CODE128";

      JsBarcode(svgRef.current, barcode.trim(), {
        format: format,
        width: 1.2,
        height: 25,
        displayValue: true,
        fontSize: 9,
        textMargin: 1,
        margin: 2,
      });
    } catch {
      try {
        if (svgRef.current) {
          JsBarcode(svgRef.current, barcode.trim(), {
            format: "CODE128",
            width: 1.1,
            height: 25,
            displayValue: true,
            fontSize: 9,
            margin: 2,
          });
        }
      } catch {}
    }
  }, [barcode]);

  return <svg ref={svgRef} style={{ maxHeight: "30px", width: "auto" }} />;
}
