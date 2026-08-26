"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  ArrowRight,
  RefreshCw,
  X,
  Database,
  Tag,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase/client";
import { Category, Product } from "@/types/database";

interface ExcelBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  existingCategories: Category[];
  onImportComplete: () => void;
}

interface ParsedRow {
  raw: Record<string, any>;
  name: string;
  categoryName: string;
  itemCode: string;
  salesPrice: number;
  costPrice: number;
  mrp: number;
  stock: number;
  minStock: number;
  description: string;
  isValid: boolean;
  errors: string[];
}

export const ExcelBulkImportModal: React.FC<ExcelBulkImportModalProps> = ({
  isOpen,
  onClose,
  shopId,
  existingCategories,
  onImportComplete,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [newCategoriesToCreate, setNewCategoriesToCreate] = useState<string[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({
    name: "",
    category: "",
    itemCode: "",
    salesPrice: "",
    costPrice: "",
    mrp: "",
    stock: "",
    minStock: "",
    description: "",
  });

  const [step, setStep] = useState<"upload" | "preview" | "importing" | "success">("upload");
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState({
    productsCreated: 0,
    categoriesCreated: 0,
    errors: [] as string[],
  });

  if (!isOpen) return null;

  // Helper to extract clean numeric value from strings like "35 Exclusive", "₹ 420.00", "-8"
  const parseCleanNumber = (val: any, fallback: number = 0): number => {
    if (typeof val === "number") return isNaN(val) ? fallback : val;
    if (!val) return fallback;
    const str = String(val).replace(/[^\d.-]/g, "").trim();
    const num = parseFloat(str);
    return isNaN(num) ? fallback : num;
  };

  // Find header row and parse rows
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    try {
      const buffer = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Convert sheet to 2D array to locate the true header row
      const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
      if (!rawData || rawData.length === 0) {
        alert("The Excel file is empty.");
        return;
      }

      // Find row with header keywords (e.g. "(mandatory field)", "Item Name", "Sales Price", "Price", "Category")
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(rawData.length, 10); i++) {
        const row = (rawData[i] || []).map((c: any) => String(c || "").toLowerCase().trim());
        const matches = row.filter((cell: string) =>
          cell.includes("mandatory") ||
          cell.includes("name") ||
          cell.includes("category") ||
          cell.includes("price") ||
          cell.includes("sales") ||
          cell.includes("item code") ||
          cell.includes("mrp") ||
          cell.includes("stock")
        );
        if (matches.length >= 2) {
          headerRowIndex = i;
          break;
        }
      }

      // Extract raw header columns
      const rawHeaderRow = (rawData[headerRowIndex] || []).map((c: any) => String(c || "").trim());
      setHeaders(rawHeaderRow.filter(Boolean));

      // Auto-detect best column matches
      const initialMap: Record<string, string> = {
        name: "",
        category: "",
        itemCode: "",
        salesPrice: "",
        costPrice: "",
        mrp: "",
        stock: "",
        minStock: "",
        description: "",
      };

      rawHeaderRow.forEach((h: string) => {
        const lower = h.toLowerCase();
        if ((lower.includes("mandatory") || lower.includes("item name") || lower.includes("product name") || lower === "name" || lower === "item") && !initialMap.name) {
          initialMap.name = h;
        } else if (lower.includes("category") && !initialMap.category) {
          initialMap.category = h;
        } else if ((lower.includes("item code") || lower.includes("barcode") || lower.includes("sku") || lower === "code") && !initialMap.itemCode) {
          initialMap.itemCode = h;
        } else if ((lower.includes("sales price") || lower.includes("selling price") || lower.includes("sale price")) && !initialMap.salesPrice) {
          initialMap.salesPrice = h;
        } else if ((lower === "price" || lower.includes("purchase price") || lower.includes("cost price") || lower.includes("buy price") || lower.includes("purchase")) && !initialMap.costPrice) {
          initialMap.costPrice = h;
        } else if (lower.includes("mrp") && !initialMap.mrp) {
          initialMap.mrp = h;
        } else if ((lower.includes("current stock") || lower.includes("opening stock") || lower === "stock" || lower.includes("qty") || lower.includes("quantity")) && !initialMap.stock) {
          initialMap.stock = h;
        } else if ((lower.includes("alert") || lower.includes("min stock") || lower.includes("minimum")) && !initialMap.minStock) {
          initialMap.minStock = h;
        } else if (lower.includes("description") && !initialMap.description) {
          initialMap.description = h;
        }
      });

      // Fallback for name if not matched
      if (!initialMap.name && rawHeaderRow.length > 0) {
        initialMap.name = rawHeaderRow[0];
      }

      setColumnMap(initialMap);

      // Parse JSON objects from sheet using header row
      const jsonRows: any[] = XLSX.utils.sheet_to_json(sheet, {
        range: headerRowIndex,
        defval: "",
      });

      processParsedRows(jsonRows, initialMap);
      setStep("preview");
    } catch (err: any) {
      console.error("Excel parse error:", err);
      alert("Failed to parse Excel file: " + err.message);
    }
  };

  const processParsedRows = (rows: any[], mapping: Record<string, string>) => {
    const existingCatNames = new Set(existingCategories.map((c) => c.name.toLowerCase().trim()));
    const newCats = new Set<string>();

    const processed: ParsedRow[] = rows
      .map((row) => {
        const rawName = String(row[mapping.name] || "").trim();
        const rawCategory = String(row[mapping.category] || "").trim();
        const rawItemCode = String(row[mapping.itemCode] || "").trim();
        const rawSalesPrice = parseCleanNumber(row[mapping.salesPrice], 0);
        const rawCostPrice = parseCleanNumber(row[mapping.costPrice], 0);
        let rawMrp = parseCleanNumber(row[mapping.mrp], 0);
        if (rawMrp <= 0 && rawSalesPrice > 0) {
          rawMrp = rawSalesPrice; // Default MRP to sales price if 0
        }
        const rawStock = Math.max(0, parseCleanNumber(row[mapping.stock], 0));
        const rawMinStock = Math.max(0, parseCleanNumber(row[mapping.minStock], 5));
        const rawDesc = String(row[mapping.description] || "").trim();

        const errors: string[] = [];
        if (!rawName) errors.push("Product name is required");

        if (rawCategory && !existingCatNames.has(rawCategory.toLowerCase().trim())) {
          newCats.add(rawCategory.trim());
        }

        return {
          raw: row,
          name: rawName,
          categoryName: rawCategory || "General",
          itemCode: rawItemCode,
          salesPrice: rawSalesPrice,
          costPrice: rawCostPrice,
          mrp: rawMrp,
          stock: rawStock,
          minStock: rawMinStock,
          description: rawDesc,
          isValid: errors.length === 0,
          errors,
        };
      })
      .filter((r) => r.name.length > 0); // Ignore completely blank rows

    setParsedRows(processed);
    setNewCategoriesToCreate(Array.from(newCats));
  };

  const handleRemap = (field: string, newHeader: string) => {
    const updatedMap = { ...columnMap, [field]: newHeader };
    setColumnMap(updatedMap);
    if (parsedRows.length > 0) {
      const rawData = parsedRows.map((r) => r.raw);
      processParsedRows(rawData, updatedMap);
    }
  };

  // Execute Bulk Import
  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;

    setStep("importing");
    setImportProgress(15);

    try {
      const validRows = parsedRows.filter((r) => r.isValid);
      
      const payload = {
        shopId,
        items: validRows.map((r) => ({
          name: r.name,
          categoryName: r.categoryName,
          itemCode: r.itemCode,
          salesPrice: r.salesPrice,
          costPrice: r.costPrice,
          mrp: r.mrp,
          stock: r.stock,
          minStock: r.minStock,
          description: r.description,
        })),
      };

      setImportProgress(40);

      const res = await fetch("/api/products/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setImportProgress(85);

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Server returned an error during bulk import.");
      }

      setImportProgress(100);
      setImportStats({
        productsCreated: json.insertedCount || 0,
        categoriesCreated: json.categoriesCreated || 0,
        errors: json.errors || [],
      });

      setStep("success");
      onImportComplete();
    } catch (err: any) {
      console.error("Import error:", err);
      alert("Failed during bulk import: " + err.message);
      setStep("preview");
    }
  };

  const extractBrandFromName = (name: string): string => {
    const brands = [
      "Parachute", "Vicco", "Dettol", "Patanjali", "Dabur", "Himalaya", "Colgate",
      "Maggi", "Dove", "Nivea", "Lifebuoy", "Lux", "Clinic Plus", "Godrej", "Vivel",
      "Pond's", "Fair & Lovely", "Glow & Lovely", "Sunsilk", "Head & Shoulders",
      "Garnier", "L'Oreal", "Amul", "Britannia", "Tata", "Fortune", "Aashirvaad",
      "Boro Plus", "Clean & Clear", "AD Meena", "Baal Choti", "Baba", "Bitnovate"
    ];
    for (const b of brands) {
      if (name.toLowerCase().includes(b.toLowerCase())) return b;
    }
    return "Authentic Brand";
  };

  const totalInventoryValue = parsedRows.reduce(
    (sum, r) => sum + r.salesPrice * (r.stock || 1),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                Bulk Excel / CSV Product & Category Importer
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  .XLSX • .XLS • .CSV
                </span>
              </h2>
              <p className="text-xs text-purple-200/80">
                Upload your supplier or inventory spreadsheet. Products & missing categories will be created automatically.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-gray-50/50">
          {/* STEP 1: UPLOAD FILE */}
          {step === "upload" && (
            <div className="space-y-6 max-w-2xl mx-auto py-8">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-3 border-dashed border-indigo-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/30 rounded-3xl p-10 text-center transition-all group space-y-4 shadow-sm"
              >
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-xs">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    Click to select or drop your Excel Spreadsheet (.xlsx, .xls, .csv)
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Supports Vyapar, myBillBook, Tally, Marg ERP, and custom Excel inventory formats
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black shadow-md shadow-indigo-500/20">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Choose Excel File</span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Supported Columns Guide */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Auto-Detected Excel Columns
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600">
                  <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <strong className="text-gray-900 block">Product Name</strong>
                    <span className="text-[10px] text-gray-500">(mandatory field)</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <strong className="text-gray-900 block">Category</strong>
                    <span className="text-[10px] text-emerald-600 font-bold">Auto-Created if missing</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <strong className="text-gray-900 block">Sales / Cost Price</strong>
                    <span className="text-[10px] text-gray-500">Auto cleans &quot;Exclusive&quot;</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <strong className="text-gray-900 block">Barcode / Stock</strong>
                    <span className="text-[10px] text-gray-500">Item code & quantities</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & COLUMN MAPPING */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-gray-500">Products to Import</span>
                  <div className="text-xl font-black text-gray-900">{parsedRows.length} items</div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-purple-200 bg-purple-50/40 shadow-2xs">
                  <span className="text-[11px] font-bold text-purple-700">New Categories to Create</span>
                  <div className="text-xl font-black text-purple-950 flex items-center gap-1.5">
                    {newCategoriesToCreate.length}
                    <span className="text-[10px] font-bold bg-purple-200 text-purple-900 px-1.5 py-0.2 rounded-md">
                      Auto
                    </span>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-2xs">
                  <span className="text-[11px] font-bold text-emerald-700">Valid Rows</span>
                  <div className="text-xl font-black text-emerald-950">
                    {parsedRows.filter((r) => r.isValid).length} / {parsedRows.length}
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/40 shadow-2xs">
                  <span className="text-[11px] font-bold text-indigo-700">Total Stock Value</span>
                  <div className="text-xl font-black text-indigo-950">
                    ₹{totalInventoryValue.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* New Categories Badge List */}
              {newCategoriesToCreate.length > 0 && (
                <div className="bg-white p-3 rounded-xl border border-purple-200 flex items-center gap-2 flex-wrap text-xs">
                  <span className="font-bold text-purple-900 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    Categories will be created automatically:
                  </span>
                  {newCategoriesToCreate.map((cat, i) => (
                    <span
                      key={i}
                      className="bg-purple-100 text-purple-900 font-bold px-2 py-0.5 rounded-md text-[11px] border border-purple-300"
                    >
                      + {cat}
                    </span>
                  ))}
                </div>
              )}

              {/* Column Mapping Selectors */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-800">
                    Column Mapping Verification
                  </h4>
                  <span className="text-[10px] font-bold text-gray-500">
                    Review or adjust column assignments
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Product Name *
                    </label>
                    <select
                      value={columnMap.name}
                      onChange={(e) => handleRemap("name", e.target.value)}
                      className="w-full h-8 text-xs bg-gray-50 border border-gray-300 rounded-lg px-2 font-medium"
                    >
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={columnMap.category}
                      onChange={(e) => handleRemap("category", e.target.value)}
                      className="w-full h-8 text-xs bg-gray-50 border border-gray-300 rounded-lg px-2 font-medium"
                    >
                      <option value="">-- None --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Sales Price (₹)
                    </label>
                    <select
                      value={columnMap.salesPrice}
                      onChange={(e) => handleRemap("salesPrice", e.target.value)}
                      className="w-full h-8 text-xs bg-gray-50 border border-gray-300 rounded-lg px-2 font-medium"
                    >
                      <option value="">-- None --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Cost / Purchase Price (₹)
                    </label>
                    <select
                      value={columnMap.costPrice}
                      onChange={(e) => handleRemap("costPrice", e.target.value)}
                      className="w-full h-8 text-xs bg-gray-50 border border-gray-300 rounded-lg px-2 font-medium"
                    >
                      <option value="">-- None --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Data Table Preview (First 15 rows) */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
                <div className="bg-gray-100/80 px-4 py-2.5 flex items-center justify-between text-xs border-b border-gray-200">
                  <span className="font-black text-gray-800">
                    Preview Data (Showing first {Math.min(parsedRows.length, 15)} of {parsedRows.length} rows)
                  </span>
                  <span className="text-[10px] text-gray-500">Verified & Cleaned</span>
                </div>

                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold sticky top-0">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Product Name</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Item Code / Barcode</th>
                        <th className="py-2 px-3">Sales Price</th>
                        <th className="py-2 px-3">Cost Price</th>
                        <th className="py-2 px-3">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedRows.slice(0, 15).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-2 px-3 text-gray-400 text-[10px]">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-gray-900">{row.name}</td>
                          <td className="py-2 px-3">
                            <span className="bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              {row.categoryName}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-gray-600">
                            {row.itemCode || "—"}
                          </td>
                          <td className="py-2 px-3 font-black text-purple-900">₹{row.salesPrice}</td>
                          <td className="py-2 px-3 text-gray-600 font-semibold">₹{row.costPrice}</td>
                          <td className="py-2 px-3 font-bold text-emerald-700">{row.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: IMPORTING ANIMATION & PROGRESS */}
          {step === "importing" && (
            <div className="py-16 text-center space-y-6 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto animate-bounce shadow-md">
                <Database className="w-8 h-8 animate-spin" />
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-black text-gray-900">
                  Importing Products & Creating Categories...
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Inserting {parsedRows.length} products and ensuring all categories exist in database.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                  <div
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-bold text-gray-500">
                  <span>Progress</span>
                  <span>{importProgress}%</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS SUMMARY */}
          {step === "success" && (
            <div className="py-10 text-center space-y-6 max-w-lg mx-auto">
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md animate-in zoom-in-50 duration-300">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-gray-900">
                  Excel Import Successfully Completed!
                </h3>
                <p className="text-xs text-gray-600">
                  All products and categories from your spreadsheet have been securely added to your store.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                <div className="text-center p-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Products Created</span>
                  <div className="text-2xl font-black text-indigo-950 mt-0.5">
                    {importStats.productsCreated}
                  </div>
                </div>
                <div className="text-center p-2 border-l border-gray-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Categories Created</span>
                  <div className="text-2xl font-black text-purple-950 mt-0.5">
                    {importStats.categoriesCreated}
                  </div>
                </div>
              </div>

              <Button
                onClick={() => {
                  onImportComplete();
                  onClose();
                }}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-600/30"
              >
                View Products in Catalog
              </Button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (step === "success") onImportComplete();
              onClose();
            }}
            className="text-xs font-bold"
          >
            {step === "success" ? "Done" : "Cancel"}
          </Button>

          {step === "preview" && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep("upload")}
                className="text-xs font-bold"
              >
                Change File
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleExecuteImport}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 flex items-center gap-1.5 px-4"
              >
                <span>Import {parsedRows.filter((r) => r.isValid).length} Products Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
