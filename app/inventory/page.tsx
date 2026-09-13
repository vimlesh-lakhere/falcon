"use client";

import React, { useState, useEffect } from "react";
import {
  Boxes,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { inventoryRepository } from "@/repositories/inventory.repo";
import { productsRepository } from "@/repositories/products.repo";
import { StockMovement, Product } from "@/types/database";
import { formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

export default function InventoryPage() {
  const { currentStore, profile, fetchSession } = useAuthStore();
  const activeShopId = currentStore?.id || profile?.store_id || "";

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [adjustMode, setAdjustMode] = useState<"exact" | "delta">("exact");
  const [targetStock, setTargetStock] = useState<number | "">("");
  const [movementType, setMovementType] = useState<"adjustment" | "damage" | "return_in" | "return_out">("adjustment");
  const [qtyDelta, setQtyDelta] = useState(0);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedProduct = allProducts.find((p) => p.id === selectedProductId);

  const loadData = async () => {
    if (!activeShopId) return;
    try {
      setLoading(true);
      const [movs, low, prods] = await Promise.all([
        inventoryRepository.getMovements(activeShopId),
        inventoryRepository.getLowStockProducts(activeShopId),
        productsRepository.getAll(activeShopId, { isActive: true }),
      ]);
      setMovements(movs);
      setLowStockProducts(low);
      setAllProducts(prods);
    } catch (err) {
      console.error(err);
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

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    try {
      setIsSaving(true);
      if (adjustMode === "exact") {
        const finalCount = targetStock === "" ? 0 : Number(targetStock);
        await inventoryRepository.setExactStock({
          shop_id: activeShopId,
          product_id: selectedProductId,
          new_stock: finalCount,
          notes: notes || `Physical Stock Audit: count set to ${finalCount}`,
        });
      } else {
        if (qtyDelta === 0) return;
        await inventoryRepository.adjustStock({
          shop_id: activeShopId,
          product_id: selectedProductId,
          quantity_delta: qtyDelta,
          movement_type: movementType,
          notes: notes || `Manual stock ${movementType}`,
        });
      }

      setIsAdjustModalOpen(false);
      setSelectedProductId("");
      setTargetStock("");
      setQtyDelta(0);
      setNotes("");
      loadData();
    } catch (err: any) {
      console.error(err);
      alert("Adjustment failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MainLayout
      title="Inventory Management & Stock Ledger"
      subtitle="Audit stock movements, reconcile inventory, and resolve low stock alerts"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Low Stock Warning Alert if any */}
        {lowStockProducts.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">
                  {lowStockProducts.length} Product(s) Below Minimum Reorder Level
                </h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  The following items require purchase replenishment:{" "}
                  {lowStockProducts.map((p) => `${p.name} (${p.current_stock} left)`).join(", ")}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setSelectedProductId(lowStockProducts[0]?.id || "");
                setIsAdjustModalOpen(true);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0"
            >
              Reconcile Stock
            </Button>
          </div>
        )}

        {/* Action Header */}
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Real-Time Audit Trail
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={loadData}
              className="text-xs font-medium gap-1 text-gray-700"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Ledger
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAdjustModalOpen(true)}
              className="gap-1.5 font-semibold text-xs bg-brand-600 text-white"
            >
              <Plus className="w-4 h-4" />
              Stock Adjustment
            </Button>
          </div>
        </div>

        {/* Movements Ledger Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-brand-600" />
              Recent Stock Movements & Adjustments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5">Timestamp</th>
                    <th className="px-6 py-3.5">Product</th>
                    <th className="px-6 py-3.5">Movement Type</th>
                    <th className="px-6 py-3.5 text-right">Quantity Delta</th>
                    <th className="px-6 py-3.5">Notes / Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                        Loading inventory ledger...
                      </td>
                    </tr>
                  ) : movements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                        No stock movements logged yet.
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => {
                      const isPositive = Number(m.quantity_delta) > 0;
                      return (
                        <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-3.5 text-xs text-gray-500 font-mono">
                            {formatDateTime(m.created_at)}
                          </td>
                          <td className="px-6 py-3.5 text-xs font-bold text-gray-900">
                            {m.product?.name || "Product"}
                          </td>
                          <td className="px-6 py-3.5">
                            <Badge
                              variant={
                                m.movement_type === "sale"
                                  ? "neutral"
                                  : m.movement_type === "purchase_receipt"
                                  ? "success"
                                  : "warning"
                              }
                            >
                              {m.movement_type.replace("_", " ")}
                            </Badge>
                          </td>
                          <td
                            className={`px-6 py-3.5 text-xs font-bold text-right tabular-nums ${
                              isPositive ? "text-emerald-700" : "text-red-600"
                            }`}
                          >
                            {isPositive ? `+${m.quantity_delta}` : m.quantity_delta}
                          </td>
                          <td className="px-6 py-3.5 text-xs text-gray-500">
                            {m.notes || m.reference_table || "—"}
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

        {/* Stock Adjustment Modal */}
        <Modal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          title="Manual Stock Adjustment & Audit"
          description="Directly adjust or reconcile physical inventory quantity with audit tracking"
          maxWidth="md"
        >
          <form onSubmit={handleAdjustSubmit} className="space-y-4">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg text-xs font-semibold text-gray-600">
              <button
                type="button"
                onClick={() => setAdjustMode("exact")}
                className={`py-1.5 rounded-md transition-all ${
                  adjustMode === "exact"
                    ? "bg-white text-brand-600 shadow-sm font-bold"
                    : "hover:text-gray-900"
                }`}
              >
                Set Exact Shelf Count
              </button>
              <button
                type="button"
                onClick={() => setAdjustMode("delta")}
                className={`py-1.5 rounded-md transition-all ${
                  adjustMode === "delta"
                    ? "bg-white text-brand-600 shadow-sm font-bold"
                    : "hover:text-gray-900"
                }`}
              >
                Quick Delta (+ / -)
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Select Product *
              </label>
              <select
                required
                value={selectedProductId}
                onChange={(e) => {
                  const pid = e.target.value;
                  setSelectedProductId(pid);
                  const p = allProducts.find((item) => item.id === pid);
                  if (p && adjustMode === "exact") {
                    setTargetStock(Number(p.current_stock) || 0);
                  }
                }}
                className="w-full text-xs h-9 bg-white border border-gray-300 rounded-md px-3 font-medium text-gray-900 focus:ring-2 focus:ring-brand-600 focus:outline-none"
              >
                <option value="">Choose product...</option>
                {allProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Current Stock: {p.current_stock})
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-500 font-medium">System Stock:</span>{" "}
                  <span className="font-bold text-gray-900 font-mono">{selectedProduct.current_stock} units</span>
                </div>
                {adjustMode === "exact" && targetStock !== "" && (
                  <div>
                    <span className="text-gray-500 font-medium">Reconciliation Delta:</span>{" "}
                    <span
                      className={`font-bold font-mono ${
                        Number(targetStock) - Number(selectedProduct.current_stock) >= 0
                          ? "text-emerald-700"
                          : "text-red-600"
                      }`}
                    >
                      {Number(targetStock) - Number(selectedProduct.current_stock) >= 0 ? "+" : ""}
                      {Number(targetStock) - Number(selectedProduct.current_stock)} units
                    </span>
                  </div>
                )}
              </div>
            )}

            {adjustMode === "exact" ? (
              <Input
                type="number"
                label="Physical Inventory Count on Shelf (Target Stock) *"
                required
                min={0}
                value={targetStock === "" ? "" : targetStock}
                onChange={(e) => setTargetStock(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                placeholder="e.g. 50"
              />
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Adjustment Reason / Type *
                  </label>
                  <select
                    value={movementType}
                    onChange={(e) => setMovementType(e.target.value as any)}
                    className="w-full text-xs h-9 bg-white border border-gray-300 rounded-md px-3 font-medium text-gray-900 focus:ring-2 focus:ring-brand-600 focus:outline-none"
                  >
                    <option value="adjustment">Stock Count Audit / Correction</option>
                    <option value="damage">Damaged or Expired Goods</option>
                    <option value="return_in">Return Inwards (Customer)</option>
                    <option value="return_out">Return Outwards (Supplier)</option>
                  </select>
                </div>

                <Input
                  type="number"
                  label="Quantity Delta (+ for stock in, - for stock out) *"
                  required
                  value={qtyDelta === 0 ? "" : qtyDelta}
                  onChange={(e) => setQtyDelta(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 10 or -5"
                />
              </>
            )}

            <Input
              label="Audit Note / Reason"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Physical inventory count correction"
            />

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => setIsAdjustModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSaving}>
                Apply Adjustment
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
}
