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
import dynamic from "next/dynamic";

const FalconAiProductModal = dynamic(
  () =>
    import("@/components/products/FalconAiProductModal").then(
      (mod) => mod.FalconAiProductModal
    ),
  { ssr: false }
);

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

  // Add / Edit Modal state (Manual)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Falcon AI Modal state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    barcode: "",
    brand: "",
    category_id: "",
    supplier_id: "",
    unit_id: "",
    purchase_price: 0,
    selling_price: 0,
    wholesale_price: 0,
    minimum_selling_price: 0,
    current_stock: 0,
    minimum_stock: 5,
    description: "",
  });

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

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      sku: `SKU-${Date.now().toString().slice(-4)}`,
      barcode: "",
      brand: "",
      category_id: categories[0]?.id || "",
      supplier_id: suppliers[0]?.id || "",
      unit_id: units[0]?.id || "",
      purchase_price: 0,
      selling_price: 0,
      wholesale_price: 0,
      minimum_selling_price: 0,
      current_stock: 0,
      minimum_stock: 5,
      description: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku || "",
      barcode: p.barcode || "",
      brand: p.brand || "",
      category_id: p.category_id || "",
      supplier_id: p.supplier_id || "",
      unit_id: p.unit_id || "",
      purchase_price: Number(p.purchase_price || 0),
      selling_price: Number(p.selling_price || 0),
      wholesale_price: Number(p.wholesale_price || 0),
      minimum_selling_price: Number(p.minimum_selling_price || 0),
      current_stock: Number(p.current_stock || 0),
      minimum_stock: Number(p.minimum_stock || 0),
      description: p.description || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const payload: Partial<Product> = {
        shop_id: activeShopId,
        name: formData.name,
        sku: formData.sku || null,
        barcode: formData.barcode || null,
        brand: formData.brand || null,
        category_id: formData.category_id || null,
        supplier_id: formData.supplier_id || null,
        unit_id: formData.unit_id || null,
        purchase_price: formData.purchase_price,
        selling_price: formData.selling_price,
        wholesale_price: formData.wholesale_price || null,
        minimum_selling_price: formData.minimum_selling_price || null,
        minimum_stock: formData.minimum_stock,
        description: formData.description || null,
      };

      if (editingProduct) {
        await productsRepository.update(editingProduct.id, payload);
      } else {
        payload.current_stock = formData.current_stock;
        await productsRepository.create(payload);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      alert("Failed to save product: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this product?")) return;
    try {
      await productsRepository.delete(id);
      loadData();
    } catch (err: any) {
      console.error(err);
      alert("Failed to deactivate: " + err.message);
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

          {/* Upgraded Split Action: Falcon AI (Primary) vs Manual Entry */}
          <AddProductSplitButton
            onOpenAiCreation={() => setIsAiModalOpen(true)}
            onOpenManualCreation={openAddModal}
          />
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
                    <th className="px-6 py-3.5 text-right">Wholesale</th>
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
                          <td className="px-6 py-4 text-xs font-semibold text-gray-700 text-right tabular-nums">
                            {p.wholesale_price ? formatCurrency(p.wholesale_price) : "—"}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge variant={isLowStock ? "warning" : "success"}>
                              {p.current_stock} in stock
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
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

        {/* Product Add / Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingProduct ? "Edit Product Details" : "Add New Product"}
          maxWidth="2xl"
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Product Name *"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Argan Oil Nourishing Shampoo"
              />
              <Input
                label="Brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g. Lumina Skin"
              />
              <Input
                label="SKU"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g. SKN-001"
              />
              <Input
                label="Barcode (EAN / UPC)"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Scan or enter barcode"
              />

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full text-xs h-9 bg-white border border-gray-300 rounded-md px-3 font-medium text-gray-900 focus:ring-2 focus:ring-brand-600 focus:outline-none"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Supplier</label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className="w-full text-xs h-9 bg-white border border-gray-300 rounded-md px-3 font-medium text-gray-900 focus:ring-2 focus:ring-brand-600 focus:outline-none"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                type="number"
                label="Purchase / Cost Price (₹)"
                required
                value={formData.purchase_price}
                onChange={(e) =>
                  setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })
                }
              />

              <Input
                type="number"
                label="Selling / Retail Price (₹) *"
                required
                value={formData.selling_price}
                onChange={(e) =>
                  setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })
                }
              />

              <Input
                type="number"
                label="Wholesale Price (₹)"
                value={formData.wholesale_price}
                onChange={(e) =>
                  setFormData({ ...formData, wholesale_price: parseFloat(e.target.value) || 0 })
                }
              />

              <Input
                type="number"
                label="Minimum Reorder Stock Alert"
                value={formData.minimum_stock}
                onChange={(e) =>
                  setFormData({ ...formData, minimum_stock: parseFloat(e.target.value) || 0 })
                }
              />
            </div>

            {!editingProduct && (
              <Input
                type="number"
                label="Initial Stock Quantity"
                value={formData.current_stock}
                onChange={(e) =>
                  setFormData({ ...formData, current_stock: parseFloat(e.target.value) || 0 })
                }
              />
            )}

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSaving}>
                {editingProduct ? "Save Changes" : "Create Product"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Falcon AI Smart Product Creation Modal */}
        <FalconAiProductModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          onProductCreated={loadData}
          shopId={activeShopId}
          categories={categories}
          suppliers={suppliers}
          units={units}
          existingProducts={products}
          onOpenManualModal={() => {
            setEditingProduct(null);
            setFormData({
              name: "",
              sku: "",
              barcode: "",
              brand: "",
              category_id: "",
              supplier_id: "",
              unit_id: "",
              purchase_price: 0,
              selling_price: 0,
              wholesale_price: 0,
              minimum_selling_price: 0,
              current_stock: 0,
              minimum_stock: 5,
              description: "",
            });
            setIsModalOpen(true);
          }}
        />
      </div>
    </MainLayout>
  );
}
