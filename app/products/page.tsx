"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Barcode,
  Layers,
  Sparkles,
  Printer,
  Download,
  Upload,
  FileSpreadsheet,
  Percent,
  TrendingUp,
  DollarSign,
  PlusCircle,
  Tag,
  Check,
  AlertTriangle,
  Boxes,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  SlidersHorizontal,
  Flame,
  Minus,
  Camera,
  Image as ImageIcon,
  Globe,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { productsRepository } from "@/repositories/products.repo";
import { suppliersRepository } from "@/repositories/suppliers.repo";
import { inventoryRepository } from "@/repositories/inventory.repo";
import { Product, Category, Supplier, Unit } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { AddProductSplitButton } from "@/components/products/AddProductSplitButton";
import { UnifiedAddProductModal } from "@/components/products/UnifiedAddProductModal";
import { FalconAiProductModal } from "@/components/products/FalconAiProductModal";
import { ExcelBulkImportModal } from "@/components/products/ExcelBulkImportModal";
import { ManageCategoriesModal } from "@/components/products/ManageCategoriesModal";
import { UnitManagementModal } from "@/components/products/UnitManagementModal";
import { BarcodeLabelGenerator } from "@/components/products/BarcodeLabelGenerator";
import { resolveCategoryVisual } from "@/lib/category-icons";
import { isProductOnline, getProductOnlineConfig } from "@/lib/product-online";

export default function ProductsPage() {
  const { currentStore, profile, fetchSession } = useAuthStore();
  const activeShopId = currentStore?.id || profile?.store_id || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [stockStatusFilter, setStockStatusFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");
  const [onlineStatusFilter, setOnlineStatusFilter] = useState<"all" | "online" | "store_only">("all");

  // Unified Add / Edit Product Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFalconAiModalOpen, setIsFalconAiModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Stock Adjustment Modal state
  const [stockAdjustProduct, setStockAdjustProduct] = useState<Product | null>(null);
  const [adjustMode, setAdjustMode] = useState<"add" | "deduct" | "set">("add");
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);

  // Excel Bulk Import Modal state
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);

  // Category Management Modal state
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  // Packaging Units Management Modal state
  const [isUnitsModalOpen, setIsUnitsModalOpen] = useState(false);

  // Barcode Label Print Modal state
  const [printProduct, setPrintProduct] = useState<Product | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prods, cats, supps, unts] = await Promise.all([
        productsRepository.getAll(activeShopId, { isActive: true }),
        productsRepository.getCategories(activeShopId),
        suppliersRepository.getAll(activeShopId),
        productsRepository.getUnits(activeShopId),
      ]);
      setProducts(prods);
      setCategories(cats);
      setSuppliers(supps);
      setUnits(unts);
    } catch (err) {
      console.error("Failed to load products data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (activeShopId) {
      loadData();
    }
  }, [activeShopId]);

  // Handle URL query actions (e.g. from Quick Demand Pad or Dashboard Out-of-Stock card)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("action") === "add") {
        const prefillName = params.get("name");
        const prefillSuppId = params.get("supplierId");
        if (prefillName) {
          setEditingProduct({
            id: "",
            shop_id: activeShopId,
            name: prefillName,
            supplier_id: prefillSuppId || null,
            purchase_price: 0,
            selling_price: 0,
            current_stock: 10,
            minimum_stock: 5,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as unknown as Product);
        }
        setIsModalOpen(true);
      } else if (params.get("stock") === "out_of_stock") {
        setStockStatusFilter("out_of_stock");
      }
    }
  }, [activeShopId]);

  // Inventory KPI calculations
  const totalItemsCount = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + (Number(p.current_stock) || 0), 0);
  const totalCostValuation = products.reduce(
    (acc, p) => acc + (Number(p.purchase_price) || 0) * (Number(p.current_stock) || 0),
    0
  );
  const totalRetailValuation = products.reduce(
    (acc, p) => acc + (Number(p.selling_price) || 0) * (Number(p.current_stock) || 0),
    0
  );
  const lowStockCount = products.filter(
    (p) => Number(p.current_stock) > 0 && Number(p.current_stock) <= Number(p.minimum_stock)
  ).length;
  const outOfStockCount = products.filter((p) => Number(p.current_stock) <= 0).length;
  const liveOnlineCount = products.filter((p) => isProductOnline(p)).length;
  const storeOnlyCount = products.length - liveOnlineCount;

  const handleToggleOnline = async (product: Product) => {
    const currentCfg = getProductOnlineConfig(product);
    const nextStatus = !currentCfg.isOnline;

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((item) =>
        item.id === product.id ? { ...item, is_online: nextStatus } : item
      )
    );

    try {
      await productsRepository.toggleOnlineVisibility(product.id, nextStatus, product);
    } catch (err: any) {
      console.error("Failed to toggle online status:", err);
      // Rollback on error
      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id ? { ...item, is_online: currentCfg.isOnline } : item
        )
      );
      alert("Failed to update online visibility: " + (err.message || "Unknown error"));
    }
  };

  const handleExportCsv = () => {
    if (products.length === 0) return alert("No products to export!");
    const headers = [
      "ID",
      "Product Name",
      "Brand",
      "SKU",
      "Barcode",
      "Category",
      "Purchase Price",
      "Selling Price",
      "Wholesale Price",
      "Current Stock",
      "Min Stock",
    ];
    const rows = products.map((p) => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.brand || "").replace(/"/g, '""')}"`,
      p.sku || "",
      p.barcode || "",
      `"${(p.category?.name || "").replace(/"/g, '""')}"`,
      p.purchase_price,
      p.selling_price,
      p.wholesale_price || "",
      p.current_stock,
      p.minimum_stock,
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Falcon_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setIsModalOpen(true);
  };

  const openQuickStockAdjust = (p: Product) => {
    setStockAdjustProduct(p);
    setAdjustMode("add");
    setAdjustQty(10);
    setAdjustReason("");
  };

  const handleApplyStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockAdjustProduct) return;

    try {
      setIsAdjustingStock(true);
      const cur = Number(stockAdjustProduct.current_stock) || 0;
      let finalStock = cur;

      if (adjustMode === "add") {
        finalStock = cur + Math.max(0, adjustQty);
      } else if (adjustMode === "deduct") {
        finalStock = Math.max(0, cur - Math.max(0, adjustQty));
      } else {
        finalStock = Math.max(0, adjustQty);
      }

      const noteText =
        adjustReason.trim() ||
        (adjustMode === "add"
          ? `Added +${adjustQty} units`
          : adjustMode === "deduct"
          ? `Deducted -${adjustQty} units`
          : `Stock count set to ${finalStock}`);

      const updated = await productsRepository.updateStock(
        stockAdjustProduct.id,
        finalStock,
        noteText,
        activeShopId
      );

      // Instant state update for 0ms UI lag
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, current_stock: updated.current_stock } : p))
      );

      setStockAdjustProduct(null);
    } catch (err: any) {
      console.error(err);
      alert("Failed to adjust stock: " + err.message);
    } finally {
      setIsAdjustingStock(false);
    }
  };

  // 1-Tap Rapid Stock Stepper (+1 / -1 with optimistic instant response)
  const handleQuickStepStock = async (p: Product, delta: number) => {
    const cur = Number(p.current_stock) || 0;
    const next = Math.max(0, cur + delta);
    if (next === cur) return;

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((item) => (item.id === p.id ? { ...item, current_stock: next } : item))
    );

    try {
      await productsRepository.updateStock(
        p.id,
        next,
        delta > 0 ? `Quick +${delta} stock` : `Quick ${delta} stock`,
        activeShopId
      );
    } catch (err: any) {
      // Revert on error
      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, current_stock: cur } : item))
      );
      alert("Failed to update stock: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this product?")) return;
    try {
      await productsRepository.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert("Failed to delete product: " + err.message);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCat === "all" || p.category_id === selectedCat;
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.name_hindi && p.name_hindi.toLowerCase().includes(search.toLowerCase())) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(search.toLowerCase());

    const stock = Number(p.current_stock) || 0;
    const min = Number(p.minimum_stock) || 0;

    let matchesStock = true;
    if (stockStatusFilter === "in_stock") matchesStock = stock > 0;
    else if (stockStatusFilter === "low_stock") matchesStock = stock > 0 && stock <= min;
    else if (stockStatusFilter === "out_of_stock") matchesStock = stock <= 0;

    const isOnline = isProductOnline(p);
    let matchesOnline = true;
    if (onlineStatusFilter === "online") matchesOnline = isOnline;
    else if (onlineStatusFilter === "store_only") matchesOnline = !isOnline;

    return matchesCat && matchesSearch && matchesStock && matchesOnline;
  });

  return (
    <MainLayout
      title="Product Catalog & Inventory Management"
      subtitle="Track live stock, multi-pack pricing, barcode stickers, and inventory valuation"
    >
      <div className="space-y-5 max-w-7xl mx-auto">
        {/* ========================================================================= */}
        {/* 📊 INVENTORY KPI DASHBOARD BAR                                            */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Total Products */}
          <div
            onClick={() => {
              setStockStatusFilter("all");
              setSelectedCat("all");
            }}
            className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs hover:border-purple-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Items</span>
              <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg group-hover:scale-110 transition-transform">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-1 text-xl font-black text-gray-900">{totalItemsCount}</div>
            <span className="text-[10px] text-gray-400 font-medium">All active catalog products</span>
          </div>

          {/* 2. Total Stock Units */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Stock Units</span>
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-1 text-xl font-black text-indigo-900">{totalStockUnits.toLocaleString("en-IN")}</div>
            <span className="text-[10px] text-gray-400 font-medium">Physical pieces in shop</span>
          </div>

          {/* 3. Cost Value */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Cost Value</span>
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-1 text-xl font-black text-emerald-700">{formatCurrency(totalCostValuation)}</div>
            <span className="text-[10px] text-gray-400 font-medium">Purchase cost investment</span>
          </div>

          {/* 4. Retail Value */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Retail Value</span>
              <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-1 text-xl font-black text-purple-900">{formatCurrency(totalRetailValuation)}</div>
            <span className="text-[10px] text-emerald-600 font-bold">
              +{formatCurrency(totalRetailValuation - totalCostValuation)} potential profit
            </span>
          </div>

          {/* 5. Low / Out of Stock Alert */}
          <div
            onClick={() => setStockStatusFilter(stockStatusFilter === "low_stock" ? "all" : "low_stock")}
            className={`p-3.5 rounded-2xl border shadow-2xs cursor-pointer transition-all ${
              lowStockCount > 0 || outOfStockCount > 0
                ? "bg-amber-50/60 border-amber-300 hover:bg-amber-100/50"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Stock Alerts</span>
              <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-1 text-xl font-black text-amber-900">
              {lowStockCount + outOfStockCount}{" "}
              <span className="text-xs font-normal text-amber-700">
                ({outOfStockCount} out, {lowStockCount} low)
              </span>
            </div>
            <span className="text-[10px] text-amber-800 font-bold underline">Click to filter alerts</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 🛠️ ACTION BAR & CONTROLS                                                  */}
        {/* ========================================================================= */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          {/* Left: Search + Category Selector */}
          <div className="flex items-center gap-2.5 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search products by name, brand, SKU or barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
              />
            </div>

            {/* Stock Status Filter Pills */}
            <div className="hidden sm:flex items-center gap-1 bg-gray-100 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setStockStatusFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  stockStatusFilter === "all" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-600"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStockStatusFilter("low_stock")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  stockStatusFilter === "low_stock"
                    ? "bg-amber-500 text-white shadow-2xs"
                    : "text-amber-800 hover:bg-amber-100/50"
                }`}
              >
                <span>⚠️ Low Stock</span>
                {lowStockCount > 0 && <span className="text-[10px] font-mono font-bold">({lowStockCount})</span>}
              </button>
              <button
                type="button"
                onClick={() => setStockStatusFilter("out_of_stock")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  stockStatusFilter === "out_of_stock"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "text-rose-700 hover:bg-rose-100/50"
                }`}
              >
                <span>🔴 Out ({outOfStockCount})</span>
              </button>
            </div>

            {/* Online Storefront Visibility Filter Pills */}
            <div className="hidden md:flex items-center gap-1 bg-purple-50/80 border border-purple-100 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setOnlineStatusFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  onlineStatusFilter === "all" ? "bg-white text-purple-950 shadow-2xs" : "text-purple-700 hover:text-purple-950"
                }`}
              >
                🌐 All
              </button>
              <button
                type="button"
                onClick={() => setOnlineStatusFilter("online")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  onlineStatusFilter === "online" ? "bg-emerald-600 text-white shadow-2xs" : "text-emerald-800 hover:bg-emerald-100/50"
                }`}
                title="Only products published on public website (/store)"
              >
                <span>🟢 Online</span>
                {liveOnlineCount > 0 && <span className="text-[10px] font-mono font-bold">({liveOnlineCount})</span>}
              </button>
              <button
                type="button"
                onClick={() => setOnlineStatusFilter("store_only")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  onlineStatusFilter === "store_only" ? "bg-gray-700 text-white shadow-2xs" : "text-gray-600 hover:bg-gray-200/50"
                }`}
                title="Products sold exclusively in physical shop (POS only)"
              >
                <span>🔒 Store Only</span>
                {storeOnlyCount > 0 && <span className="text-[10px] font-mono font-bold">({storeOnlyCount})</span>}
              </button>
            </div>
          </div>

          {/* Right: Quick Modals Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCategoriesModalOpen(true)}
              className="gap-1.5 text-xs text-purple-700 bg-purple-50/50 hover:bg-purple-100/70 border-purple-200 font-bold rounded-xl"
              title="Manage & Reorder Categories"
            >
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>Categories ({categories.length})</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUnitsModalOpen(true)}
              className="gap-1.5 text-xs text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100/70 border-indigo-200 font-bold rounded-xl"
              title="Manage Packaging Units (10, 12, 16, 24 pcs, or custom packs)"
            >
              <Package className="w-3.5 h-3.5 text-indigo-600" />
              <span>Units ({units.length})</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExcelImportOpen(true)}
              className="gap-1.5 text-xs text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100/70 border-indigo-200 font-bold rounded-xl"
              title="Bulk Import Products from Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
              <span>Excel Import</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="gap-1.5 text-xs text-gray-700 hover:bg-gray-50 border-gray-200 rounded-xl"
              title="Export Inventory to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </Button>

            {/* Primary Add Product Action: Direct, Fast, Streamlined */}
            <Button
              size="sm"
              onClick={openAddModal}
              className="gap-1.5 font-bold text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-600/20 rounded-xl"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </Button>

            {/* Optional Falcon AI Studio */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsFalconAiModalOpen(true)}
              className="gap-1.5 font-bold text-xs border-purple-200 text-purple-700 bg-purple-50/60 hover:bg-purple-100 rounded-xl"
              title="Launch Falcon AI Studio"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>AI Studio</span>
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 🏷️ CATEGORY FILTER STRIP                                                  */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedCat("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              selectedCat === "all"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            All Products ({products.length})
          </button>
          {categories.map((c) => {
            const count = products.filter((p) => p.category_id === c.id).length;
            const isSelected = selectedCat === c.id;
            const visual = resolveCategoryVisual(c.id, c.name);

            return (
              <button
                key={c.id}
                onClick={() => setSelectedCat(c.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {visual.type === "emoji" ? (
                  <span className="text-sm leading-none">{visual.value}</span>
                ) : (
                  <visual.icon className="w-3.5 h-3.5 text-purple-600" />
                )}
                <span>{c.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                    isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* 📦 PRODUCTS LIST: DESKTOP TABLE & MOBILE TOUCH CARDS                     */}
        {/* ========================================================================= */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-200 shadow-xs flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
            <span className="text-sm font-semibold">Loading product catalog...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-500 border border-gray-200 shadow-xs">
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                <Package className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-gray-800">No products found</h4>
              <p className="text-xs text-gray-500">
                {search
                  ? `No items match "${search}"`
                  : "No items found for the selected category or stock filter."}
              </p>
              <Button size="sm" onClick={openAddModal} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs">
                <Plus className="w-4 h-4 mr-1" /> Add New Product
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* ------------------------------------------------------------- */}
            {/* 📱 MOBILE TOUCH PRODUCT CARDS (Optimized for Phone Screens)  */}
            {/* ------------------------------------------------------------- */}
            <div className="md:hidden space-y-3 pb-16">
              {filteredProducts.map((p) => {
                const stock = Number(p.current_stock) || 0;
                const minStock = Number(p.minimum_stock) || 0;
                const isOutOfStock = stock <= 0;
                const isLowStock = stock > 0 && stock <= minStock;
                const cost = Number(p.purchase_price || 0);
                const sell = Number(p.selling_price || 0);
                const profit = sell - cost;
                const marginPercent = sell > 0 ? Math.round((profit / sell) * 100) : 0;
                const visual = resolveCategoryVisual(p.category_id || "", p.category?.name || "General");

                return (
                  <div
                    key={p.id}
                    className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs space-y-3 hover:border-purple-300 transition-all"
                  >
                    {/* Top Row: Photo + Title + Brand + Category */}
                    <div className="flex items-start gap-3">
                      {/* Product Thumbnail with 1-Tap Camera */}
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 relative active:scale-95 transition-transform"
                      >
                        {p.image_url ? (
                          <img
                            src={p.image_url.split("|||")[0]}
                            alt={p.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-purple-600">
                            <Camera className="w-5 h-5" />
                            <span className="text-[8px] font-black uppercase mt-0.5">+Photo</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 right-0 p-1 bg-black/60 text-white rounded-tl-lg">
                          <Camera className="w-2.5 h-2.5" />
                        </div>
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h4
                            onClick={() => openEditModal(p)}
                            className="font-bold text-gray-900 text-sm truncate leading-snug cursor-pointer hover:text-purple-600"
                          >
                            {p.name}
                          </h4>
                          {p.name_hindi && (
                            <div className="text-xs text-purple-700 font-semibold truncate leading-tight mt-0.5">
                              {p.name_hindi}
                            </div>
                          )}
                        </div>
                        {p.brand && <div className="text-xs text-gray-500 font-medium">{p.brand}</div>}

                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-semibold text-gray-700">
                            {visual.type === "emoji" ? (
                              <span>{visual.value}</span>
                            ) : (
                              <visual.icon className="w-2.5 h-2.5 text-purple-600" />
                            )}
                            <span>{p.category?.name || "General"}</span>
                          </span>
                          {p.barcode && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                              <Barcode className="w-2.5 h-2.5" />
                              {p.barcode}
                            </span>
                          )}
                          {/* 1-Click Online Store Status Toggle */}
                          {(() => {
                            const onlineCfg = getProductOnlineConfig(p);
                            const isOnline = onlineCfg.isOnline;
                            const onlinePrice = onlineCfg.onlinePrice;
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleOnline(p);
                                }}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer select-none active:scale-95 ${
                                  isOnline
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                    : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"
                                }`}
                                title={
                                  isOnline
                                    ? "Live on Online Store (/store). Click to make Store Only."
                                    : "Store Only (POS counter). Click to publish Online."
                                }
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-gray-400"}`} />
                                <span>{isOnline ? "Online" : "Store Only"}</span>
                                {onlinePrice && isOnline && (
                                  <span className="text-[9px] bg-emerald-200/90 text-emerald-900 px-1 rounded">
                                    ₹{onlinePrice}
                                  </span>
                                )}
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Middle Row: Price & Profit Margins */}
                    <div className="flex items-center justify-between bg-gray-50/80 p-2 rounded-xl border border-gray-100">
                      <div>
                        <span className="text-[10px] text-gray-400 font-semibold uppercase block">Selling Price</span>
                        <span className="text-base font-black text-purple-950">{formatCurrency(sell)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 font-semibold uppercase block">Cost: {formatCurrency(cost)}</span>
                        <span
                          className={`inline-flex items-center text-[10px] font-black px-1.5 py-0.5 rounded ${
                            marginPercent >= 25
                              ? "bg-emerald-100 text-emerald-800"
                              : marginPercent > 10
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-200 text-gray-800"
                          }`}
                        >
                          {marginPercent}% (+{formatCurrency(profit)})
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: 1-Tap Stock Stepper + Quick Actions */}
                    <div className="flex items-center justify-between pt-1">
                      {/* 1-Tap Stock Stepper */}
                      <div className="flex items-center bg-gray-100 rounded-xl p-0.5 border border-gray-200">
                        <button
                          type="button"
                          onClick={() => handleQuickStepStock(p, -1)}
                          disabled={stock <= 0}
                          className="w-8 h-8 rounded-lg bg-white active:bg-gray-200 flex items-center justify-center text-gray-700 font-black shadow-2xs disabled:opacity-30 cursor-pointer"
                          title="Decrease Stock (-1)"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => openQuickStockAdjust(p)}
                          className={`px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                            isOutOfStock
                              ? "text-rose-700"
                              : isLowStock
                              ? "text-amber-800"
                              : "text-emerald-800"
                          }`}
                          title="Click for exact stock count"
                        >
                          {stock} in stock
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuickStepStock(p, 1)}
                          className="w-8 h-8 rounded-lg bg-purple-600 active:bg-purple-700 flex items-center justify-center text-white font-black shadow-2xs cursor-pointer"
                          title="Increase Stock (+1)"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Actions Strip */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="p-2 rounded-xl bg-purple-50 text-purple-700 active:bg-purple-100 transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrintProduct(p)}
                          className="p-2 rounded-xl bg-indigo-50 text-indigo-700 active:bg-indigo-100 transition-colors"
                          title="Print Barcode"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className="p-2 rounded-xl bg-rose-50 text-rose-600 active:bg-rose-100 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ------------------------------------------------------------- */}
            {/* 💻 DESKTOP TABLE VIEW (For larger screens)                    */}
            {/* ------------------------------------------------------------- */}
            <div className="hidden md:block">
              <Card className="rounded-2xl shadow-xs overflow-hidden border-gray-200">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50/90 text-xs font-bold text-gray-600 uppercase border-b border-gray-200">
                        <tr>
                          <th className="px-5 py-3.5">Product Name & Brand</th>
                          <th className="px-5 py-3.5">Category</th>
                          <th className="px-5 py-3.5 text-center">Online Store</th>
                          <th className="px-5 py-3.5">SKU / Barcode</th>
                          <th className="px-5 py-3.5 text-right">Cost Price</th>
                          <th className="px-5 py-3.5 text-right">Retail Price</th>
                          <th className="px-5 py-3.5 text-right">Margin / Unit</th>
                          <th className="px-5 py-3.5 text-center">Live Stock</th>
                          <th className="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredProducts.map((p) => {
                          const stock = Number(p.current_stock) || 0;
                          const minStock = Number(p.minimum_stock) || 0;
                          const isOutOfStock = stock <= 0;
                          const isLowStock = stock > 0 && stock <= minStock;
                          const cost = Number(p.purchase_price || 0);
                          const sell = Number(p.selling_price || 0);
                          const profit = sell - cost;
                          const marginPercent = sell > 0 ? Math.round((profit / sell) * 100) : 0;
                          const visual = resolveCategoryVisual(p.category_id || "", p.category?.name || "General");

                          const onlineCfg = getProductOnlineConfig(p);
                          const isOnline = onlineCfg.isOnline;
                          const onlinePrice = onlineCfg.onlinePrice;

                          return (
                            <tr key={p.id} className="hover:bg-purple-50/30 transition-colors group">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(p)}
                                    className="w-11 h-11 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 hover:ring-2 hover:ring-purple-500 transition-all cursor-pointer relative group/img shadow-2xs"
                                    title="Click to view or change product photo"
                                  >
                                    {p.image_url ? (
                                      <img
                                        src={p.image_url.split("|||")[0]}
                                        alt={p.name}
                                        loading="lazy"
                                        decoding="async"
                                        className="w-full h-full object-contain p-0.5"
                                      />
                                    ) : (
                                      <div className="flex flex-col items-center justify-center text-gray-400 group-hover/img:text-purple-600 transition-colors">
                                        <Camera className="w-4 h-4" />
                                        <span className="text-[8px] font-black uppercase mt-0.5">+Photo</span>
                                      </div>
                                    )}
                                  </button>
                                  <div className="min-w-0">
                                    <div className="font-black text-gray-900 text-xs sm:text-sm truncate max-w-xs">{p.name}</div>
                                    {p.name_hindi && (
                                      <div className="text-[11px] text-purple-700 font-semibold truncate max-w-xs leading-tight mt-0.5">
                                        {p.name_hindi}
                                      </div>
                                    )}
                                    {p.brand && <div className="text-[11px] text-gray-500 font-medium">{p.brand}</div>}
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-3.5 text-xs text-gray-700">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-100 font-medium">
                                  {visual.type === "emoji" ? (
                                    <span>{visual.value}</span>
                                  ) : (
                                    <visual.icon className="w-3 h-3 text-purple-600" />
                                  )}
                                  <span>{p.category?.name || "General"}</span>
                                </span>
                              </td>

                              <td className="px-5 py-3.5 text-xs text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleOnline(p)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
                                    isOnline
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                      : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"
                                  }`}
                                  title={
                                    isOnline
                                      ? "Live on Online Store (/store). Click to make Store Only."
                                      : "Store Only (POS counter). Click to publish Online."
                                  }
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-gray-400"}`} />
                                  <span>{isOnline ? "🌐 Online" : "🔒 Store Only"}</span>
                                  {onlinePrice && isOnline && (
                                    <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-bold">
                                      ₹{onlinePrice}
                                    </span>
                                  )}
                                </button>
                              </td>

                              <td className="px-5 py-3.5 font-mono text-xs text-gray-600">
                                <div>{p.sku || "—"}</div>
                                {p.barcode && (
                                  <div className="text-[10px] text-indigo-700 font-bold flex items-center gap-1">
                                    <Barcode className="w-3 h-3" /> {p.barcode}
                                  </div>
                                )}
                              </td>

                              <td className="px-5 py-3.5 text-xs text-gray-500 text-right tabular-nums">
                                {formatCurrency(cost)}
                              </td>

                              <td className="px-5 py-3.5 text-xs sm:text-sm font-black text-purple-900 text-right tabular-nums">
                                {formatCurrency(sell)}
                              </td>

                              <td className="px-5 py-3.5 text-right">
                                <span
                                  className={`inline-flex items-center text-[11px] font-black px-2 py-0.5 rounded-md tabular-nums ${
                                    marginPercent >= 25
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : marginPercent > 10
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {marginPercent}% (+{formatCurrency(profit)})
                                </span>
                              </td>

                              <td className="px-5 py-3.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => openQuickStockAdjust(p)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-bold text-xs transition-all cursor-pointer group-hover:ring-2 group-hover:ring-purple-400 ${
                                    isOutOfStock
                                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                                      : isLowStock
                                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                                      : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  }`}
                                  title="Click to quickly adjust stock count"
                                >
                                  <span>{stock} in stock</span>
                                  <span className="text-[10px] text-purple-700 bg-white/80 px-1 py-0.2 rounded font-black">
                                    ✏️ +/-
                                  </span>
                                </button>
                              </td>

                              <td className="px-5 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(p)}
                                    className="p-1.5 rounded-lg text-purple-700 hover:bg-purple-50 transition-colors"
                                    title="Add / Change Photo"
                                  >
                                    <Camera className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openQuickStockAdjust(p)}
                                    className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors"
                                    title="Quick Stock Adjust (+/-)"
                                  >
                                    <Boxes className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPrintProduct(p)}
                                    className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                    title="Print Barcode Label Sticker"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(p)}
                                    className="p-1.5 rounded-lg text-gray-500 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                                    title="Edit Product Details & Prices"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(p.id)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Deactivate Product"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 📱 MOBILE STICKY FLOATING ACTION BAR */}
            <div className="md:hidden fixed bottom-4 left-4 right-4 z-40 flex items-center gap-2 p-1.5 bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10">
              <button
                type="button"
                onClick={openAddModal}
                className="flex-1 py-3 px-4 rounded-xl bg-purple-600 active:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Product</span>
              </button>
              <button
                type="button"
                onClick={() => setIsFalconAiModalOpen(true)}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 active:from-amber-600 active:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg"
              >
                <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
                <span>AI Add</span>
              </button>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* ⚡ QUICK STOCK ADJUSTMENT MODAL                                           */}
        {/* ========================================================================= */}
        {stockAdjustProduct && (
          <Modal
            isOpen={!!stockAdjustProduct}
            onClose={() => setStockAdjustProduct(null)}
            title="📦 Quick Stock Adjustment"
            description={`Adjust live physical stock for "${stockAdjustProduct.name}"`}
            maxWidth="sm"
          >
            <form onSubmit={handleApplyStockAdjustment} className="space-y-4">
              {/* Product Info & Current Stock */}
              <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-gray-500 block">Current Available Stock:</span>
                  <span className="text-lg font-black text-purple-950">
                    {stockAdjustProduct.current_stock} units
                  </span>
                </div>
                <Badge variant={Number(stockAdjustProduct.current_stock) > 0 ? "success" : "danger"}>
                  {Number(stockAdjustProduct.current_stock) > 0 ? "In Stock" : "Out of Stock"}
                </Badge>
              </div>

              {/* Adjustment Mode Switcher */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAdjustMode("add")}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    adjustMode === "add" ? "bg-emerald-600 text-white shadow-2xs" : "text-gray-700 hover:bg-white"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustMode("deduct")}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    adjustMode === "deduct" ? "bg-rose-600 text-white shadow-2xs" : "text-gray-700 hover:bg-white"
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Deduct (-)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustMode("set")}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    adjustMode === "set" ? "bg-purple-600 text-white shadow-2xs" : "text-gray-700 hover:bg-white"
                  }`}
                >
                  <span>Set Total (=)</span>
                </button>
              </div>

              {/* Quantity Input with Quick Presets */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  {adjustMode === "add"
                    ? "Units to Add (+)"
                    : adjustMode === "deduct"
                    ? "Units to Deduct (-)"
                    : "New Total Exact Stock (=)"}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                    className="flex-1 text-center text-lg font-black p-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none"
                    autoFocus
                  />
                </div>

                {/* Quick Add Presets (+1, +6, +12, +24) */}
                {adjustMode !== "set" && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] font-bold text-gray-400">Quick:</span>
                    {[1, 6, 12, 24, 50].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setAdjustQty(num)}
                        className="px-2 py-0.5 bg-gray-100 hover:bg-purple-100 hover:text-purple-800 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        +{num}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Calculated Result Preview */}
              <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-bold flex items-center justify-between">
                <span className="text-gray-600">New Resulting Stock:</span>
                <span className="text-sm font-black text-purple-900">
                  {adjustMode === "add"
                    ? (Number(stockAdjustProduct.current_stock) || 0) + Math.max(0, adjustQty)
                    : adjustMode === "deduct"
                    ? Math.max(0, (Number(stockAdjustProduct.current_stock) || 0) - Math.max(0, adjustQty))
                    : Math.max(0, adjustQty)}{" "}
                  units
                </span>
              </div>

              {/* Audit Reason Note */}
              <Input
                label="Reason / Audit Note (Optional)"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. New purchase delivery, Damaged goods, Physical audit"
              />

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setStockAdjustProduct(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isAdjustingStock}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-5 rounded-xl shadow-md"
                >
                  <Check className="w-4 h-4 mr-1" /> Update Stock Now
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* ========================================================================= */}
        {/* UNIFIED ADD / EDIT PRODUCT MODAL                                          */}
        {/* ========================================================================= */}
        <UnifiedAddProductModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProduct(null);
          }}
          onSuccess={(savedProduct) => {
            // Update local state immediately for seamless experience
            if (editingProduct) {
              setProducts((prev) => prev.map((p) => (p.id === savedProduct.id ? savedProduct : p)));
            } else {
              setProducts((prev) => [savedProduct, ...prev]);
            }
            loadData();
          }}
          editingProduct={editingProduct}
          shopId={activeShopId}
          categories={categories}
          suppliers={suppliers}
          units={units}
          existingProducts={products}
          onCategoryCreated={(newCat) => setCategories((prev) => [...prev, newCat])}
          onSupplierCreated={(newSupp) => setSuppliers((prev) => [...prev, newSupp])}
          onUnitCreated={(newUnit) => setUnits((prev) => [...prev, newUnit])}
        />

        {/* ========================================================================= */}
        {/* FALCON AI PRODUCT SHOWROOM & MULTI-ANGLE STUDIO MODAL                      */}
        {/* ========================================================================= */}
        <FalconAiProductModal
          isOpen={isFalconAiModalOpen}
          onClose={() => setIsFalconAiModalOpen(false)}
          onProductCreated={() => {
            setIsFalconAiModalOpen(false);
            loadData();
          }}
          shopId={activeShopId}
          categories={categories}
          suppliers={suppliers}
          units={units}
          existingProducts={products}
          onOpenManualModal={() => {
            setIsFalconAiModalOpen(false);
            openAddModal();
          }}
        />

        {/* Barcode Label Print & Generator Modal */}
        {printProduct && (
          <Modal
            isOpen={!!printProduct}
            onClose={() => setPrintProduct(null)}
            title="🏷️ Barcode Sticker Label Studio"
            maxWidth="md"
          >
            <BarcodeLabelGenerator
              product={printProduct}
              shopName={currentStore?.name || "AGS STORE"}
              onClose={() => setPrintProduct(null)}
              onUpdateBarcode={async (newBarcode) => {
                await productsRepository.update(printProduct.id, { barcode: newBarcode });
                loadData();
              }}
            />
          </Modal>
        )}

        {/* Excel / CSV Bulk Product & Category Importer */}
        <ExcelBulkImportModal
          isOpen={isExcelImportOpen}
          onClose={() => setIsExcelImportOpen(false)}
          shopId={activeShopId}
          existingCategories={categories}
          onImportComplete={() => {
            setIsExcelImportOpen(false);
            loadData();
          }}
        />

        {/* Manage Categories Modal */}
        <ManageCategoriesModal
          isOpen={isCategoriesModalOpen}
          onClose={() => setIsCategoriesModalOpen(false)}
          shopId={activeShopId}
          categories={categories}
          products={products}
          onCategoriesUpdated={() => {
            loadData();
          }}
        />

        {/* Manage Packaging Units Modal */}
        <UnitManagementModal
          isOpen={isUnitsModalOpen}
          onClose={() => setIsUnitsModalOpen(false)}
          shopId={activeShopId}
          units={units}
          onUnitsUpdated={(updatedUnits) => {
            setUnits(updatedUnits);
          }}
        />
      </div>
    </MainLayout>
  );
}
