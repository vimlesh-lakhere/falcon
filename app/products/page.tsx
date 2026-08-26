"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { productsRepository } from "@/repositories/products.repo";
import { suppliersRepository } from "@/repositories/suppliers.repo";
import { Product, Category, Supplier, Unit } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { AddProductSplitButton } from "@/components/products/AddProductSplitButton";
import { UnifiedAddProductModal } from "@/components/products/UnifiedAddProductModal";
import { ExcelBulkImportModal } from "@/components/products/ExcelBulkImportModal";
import { ManageCategoriesModal } from "@/components/products/ManageCategoriesModal";

const FALLBACK_SHOP_ID = "a0000000-0000-0000-0000-000000000001";

export default function ProductsPage() {
  const currentStore = useAuthStore((state) => state.currentStore);
  const activeShopId = currentStore?.id || FALLBACK_SHOP_ID;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");

  // Unified Add / Edit Product Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Excel Bulk Import Modal state
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);

  // Category Management Modal state
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  // Barcode Label Print Modal state
  const [printProduct, setPrintProduct] = useState<Product | null>(null);
  const [printQuantity, setPrintQuantity] = useState(1);

  // Falcon AI Modal state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeShopId]);

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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this product?")) return;
    try {
      await productsRepository.delete(id);
      loadData();
    } catch (err: any) {
      alert("Failed to delete product: " + err.message);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCat === "all" || p.category_id === selectedCat;
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <MainLayout
      title="Product Catalog & Pricing"
      subtitle="Manage items, barcodes, cost and wholesale selling prices"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-surface-border shadow-sm">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search products by name, SKU, or barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
              />
            </div>

            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCategoriesModalOpen(true)}
              className="gap-1.5 text-xs text-purple-700 bg-purple-50/50 hover:bg-purple-100/70 border-purple-200 font-bold"
              title="Manage, Edit & Delete Categories"
            >
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>Manage Categories ({categories.length})</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExcelImportOpen(true)}
              className="gap-1.5 text-xs text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100/70 border-indigo-200 font-bold"
              title="Bulk Import Products from Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
              <span>Import Excel (.xlsx)</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="gap-1.5 text-xs text-gray-700 hover:bg-gray-50 border-gray-200"
              title="Export Inventory to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </Button>

            {/* Primary Add Product Action */}
            <AddProductSplitButton
              onOpenAiCreation={openAddModal}
              onOpenManualCreation={openAddModal}
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCat("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
              selectedCat === "all"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            All Products ({products.length})
          </button>
          {categories.map((c) => {
            const count = products.filter((p) => p.category_id === c.id).length;
            const isSelected = selectedCat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCat(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <span>{c.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSelected ? "bg-purple-700 text-purple-100" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setIsCategoriesModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-purple-600 hover:bg-purple-50 border border-dashed border-purple-300 shrink-0 transition-all flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Add / Edit Categories</span>
          </button>
        </div>

        {/* Product Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5">Product Name</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">SKU / Barcode</th>
                    <th className="px-6 py-3.5 text-right">Cost Price</th>
                    <th className="px-6 py-3.5 text-right">Retail Price</th>
                    <th className="px-6 py-3.5 text-right">Margin</th>
                    <th className="px-6 py-3.5 text-center">Stock</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                        Loading product catalog...
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                        No products found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isLowStock = Number(p.current_stock) <= Number(p.minimum_stock);
                      const cost = Number(p.purchase_price || 0);
                      const sell = Number(p.selling_price || 0);
                      const marginPercent = sell > 0 ? Math.round(((sell - cost) / sell) * 100) : 0;

                      return (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900 text-xs">{p.name}</div>
                            {p.brand && <div className="text-[11px] text-gray-400">{p.brand}</div>}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-600">
                            {p.category?.name || "General"}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-gray-600">
                            <div>{p.sku || "—"}</div>
                            {p.barcode && (
                              <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Barcode className="w-3 h-3" /> {p.barcode}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500 text-right tabular-nums">
                            {formatCurrency(p.purchase_price)}
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-brand-700 text-right tabular-nums">
                            {formatCurrency(p.selling_price)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span
                              className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                marginPercent >= 30
                                  ? "bg-emerald-50 text-emerald-700"
                                  : marginPercent >= 15
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {marginPercent}% ({formatCurrency(sell - cost)})
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge variant={isLowStock ? "warning" : "success"}>
                              {p.current_stock} in stock
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setPrintProduct(p)}
                                className="p-1.5 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title="Print Barcode Label Sticker"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setIsAiModalOpen(true)}
                                className="p-1.5 rounded-md text-purple-600 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                                title="AI Showroom & Image Studio"
                              >
                                <Sparkles className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openEditModal(p)}
                                className="p-1.5 rounded-md text-gray-400 hover:text-brand-600 hover:bg-gray-100 transition-colors"
                                title="Edit Product"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(p.id)}
                                className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Deactivate Product"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Unified Fast Product Creation & Edit Modal */}
        <UnifiedAddProductModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProduct(null);
          }}
          onSuccess={() => {
            loadData();
          }}
          editingProduct={editingProduct}
          shopId={activeShopId}
          categories={categories}
          suppliers={suppliers}
          units={units}
          onCategoryCreated={(newCat) => setCategories((prev) => [...prev, newCat])}
          onSupplierCreated={(newSupp) => setSuppliers((prev) => [...prev, newSupp])}
        />

        {/* Barcode Label Print Preview Modal */}
        {printProduct && (
          <Modal
            isOpen={!!printProduct}
            onClose={() => setPrintProduct(null)}
            title="Print Barcode Sticker Label"
            maxWidth="md"
          >
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center">
                {/* 50x25mm Label Simulator */}
                <div className="bg-white border-2 border-dashed border-gray-400 p-4 rounded-lg shadow-sm text-center w-64">
                  <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                    {currentStore?.name || "FALCON RETAIL"}
                  </div>
                  <div className="font-bold text-xs text-gray-900 mt-1 truncate">
                    {printProduct.name}
                  </div>
                  <div className="font-mono text-sm tracking-widest my-2 font-black py-1 bg-gray-100 rounded">
                    ||| | || |||| | |||
                  </div>
                  <div className="font-mono text-[10px] text-gray-500">
                    {printProduct.barcode || printProduct.sku || "890123456789"}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                    <span className="text-[10px] text-gray-400 line-through">
                      MRP: {formatCurrency(Math.round(printProduct.selling_price * 1.15))}
                    </span>
                    <span className="text-xs font-black text-brand-700">
                      Our Price: {formatCurrency(printProduct.selling_price)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-700">Print Quantity:</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={printQuantity}
                    onChange={(e) => setPrintQuantity(parseInt(e.target.value) || 1)}
                    className="w-16 h-8 text-xs border border-gray-300 rounded px-2 text-center"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setPrintProduct(null)}>
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      window.print();
                    }}
                    className="gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    Print {printQuantity} Labels
                  </Button>
                </div>
              </div>
            </div>
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
      </div>
    </MainLayout>
  );
}
