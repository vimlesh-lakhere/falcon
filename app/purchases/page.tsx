"use client";

import React, { useState, useEffect } from "react";
import { Truck, Plus, CheckCircle, PackageCheck, Clock, Layers } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { purchasesRepository } from "@/repositories/purchases.repo";
import { suppliersRepository } from "@/repositories/suppliers.repo";
import { productsRepository } from "@/repositories/products.repo";
import { PurchaseOrder, Supplier, Product } from "@/types/database";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

export default function PurchasesPage() {
  const { currentStore, profile, fetchSession } = useAuthStore();
  const SHOP_ID = currentStore?.id || profile?.store_id || "";

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // New PO Modal state
  const [isNewPoModalOpen, setIsNewPoModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [poItems, setPoItems] = useState<{ productId: string; quantity: number; unitPrice: number }[]>([
    { productId: "", quantity: 1, unitPrice: 0 },
  ]);
  const [poNotes, setPoNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Receive PO Modal
  const [selectedPoForReceive, setSelectedPoForReceive] = useState<PurchaseOrder | null>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const [isReceiving, setIsReceiving] = useState(false);

  const loadData = async () => {
    if (!SHOP_ID) return;
    try {
      setLoading(true);
      const [pos, supps, prods] = await Promise.all([
        purchasesRepository.getAll(SHOP_ID),
        suppliersRepository.getAll(SHOP_ID),
        productsRepository.getAll(SHOP_ID, { isActive: true }),
      ]);
      setPurchaseOrders(pos);
      setSuppliers(supps);
      setProducts(prods);
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
    if (SHOP_ID) {
      loadData();
    }
  }, [SHOP_ID]);

  const handleAddItemRow = () => {
    setPoItems([...poItems, { productId: "", quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    const updated = [...poItems];
    updated.splice(idx, 1);
    setPoItems(updated);
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || poItems.some((it) => !it.productId || it.quantity <= 0)) {
      alert("Please ensure all items have a valid product and quantity.");
      return;
    }

    try {
      setIsSaving(true);
      const total_amount = poItems.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);

      await purchasesRepository.create({
        shop_id: SHOP_ID,
        supplier_id: selectedSupplierId,
        total_amount,
        notes: poNotes,
        items: poItems.map((it) => ({
          product_id: it.productId,
          quantity_ordered: it.quantity,
          unit_price: it.unitPrice,
        })),
      });

      setIsNewPoModalOpen(false);
      setSelectedSupplierId("");
      setPoItems([{ productId: "", quantity: 1, unitPrice: 0 }]);
      setPoNotes("");
      loadData();
    } catch (err: any) {
      console.error(err);
      alert("Failed to create PO: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const openReceiveModal = (po: PurchaseOrder) => {
    setSelectedPoForReceive(po);
    const initialReceiveMap: Record<string, number> = {};
    po.items?.forEach((it) => {
      initialReceiveMap[it.id] = Number(it.quantity_ordered) - Number(it.quantity_received || 0);
    });
    setReceiveQuantities(initialReceiveMap);
  };

  const handleConfirmReceive = async () => {
    if (!selectedPoForReceive) return;
    try {
      setIsReceiving(true);
      const itemsToReceive = (selectedPoForReceive.items || []).map((it) => ({
        item_id: it.id,
        product_id: it.product_id,
        quantity_received: receiveQuantities[it.id] || 0,
      }));

      await purchasesRepository.receiveStock({
        shop_id: SHOP_ID,
        purchase_order_id: selectedPoForReceive.id,
        items: itemsToReceive,
      });

      setSelectedPoForReceive(null);
      loadData();
    } catch (err: any) {
      console.error(err);
      alert("Failed to receive goods: " + err.message);
    } finally {
      setIsReceiving(false);
    }
  };

  return (
    <MainLayout
      title="Purchases & Supplier Replenishment"
      subtitle="Issue purchase orders, track inbound shipments, and receive warehouse stock"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            All Purchase Orders
          </div>
          <Button
            onClick={() => setIsNewPoModalOpen(true)}
            className="gap-1.5 font-semibold text-xs bg-brand-600 text-white shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Purchase Order
          </Button>
        </div>

        {/* PO Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5">PO Number</th>
                    <th className="px-6 py-3.5">Supplier</th>
                    <th className="px-6 py-3.5">Created Date</th>
                    <th className="px-6 py-3.5 text-right">Total Amount</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                        Loading purchase orders...
                      </td>
                    </tr>
                  ) : purchaseOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                        No purchase orders recorded yet.
                      </td>
                    </tr>
                  ) : (
                    purchaseOrders.map((po) => (
                      <tr key={po.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs font-bold text-gray-900">
                          {po.order_number}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-gray-800">
                          {po.supplier?.name || "Supplier"}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                          {formatDateTime(po.created_at)}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-900 text-right tabular-nums">
                          {formatCurrency(po.total_amount)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge
                            variant={
                              po.status === "received"
                                ? "success"
                                : po.status === "partially_received"
                                ? "warning"
                                : "neutral"
                            }
                          >
                            {po.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {po.status !== "received" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openReceiveModal(po)}
                              className="text-xs font-semibold gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              Receive Goods
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Create PO Modal */}
        <Modal
          isOpen={isNewPoModalOpen}
          onClose={() => setIsNewPoModalOpen(false)}
          title="New Purchase Order"
          maxWidth="2xl"
        >
          <form onSubmit={handleCreatePo} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Select Supplier *
              </label>
              <select
                required
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full text-xs h-9 bg-white border border-gray-300 rounded-md px-3 font-medium text-gray-900 focus:ring-2 focus:ring-brand-600 focus:outline-none"
              >
                <option value="">Choose Supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.phone || "No phone"})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-700">Order Items *</label>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="text-xs text-brand-600 hover:underline font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </button>
              </div>

              {poItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    required
                    value={item.productId}
                    onChange={(e) => {
                      const updated = [...poItems];
                      const selectedProd = products.find((p) => p.id === e.target.value);
                      updated[idx].productId = e.target.value;
                      if (selectedProd) {
                        updated[idx].unitPrice = Number(selectedProd.purchase_price);
                      }
                      setPoItems(updated);
                    }}
                    className="flex-1 text-xs h-9 bg-white border border-gray-300 rounded-md px-2 font-medium"
                  >
                    <option value="">Select Product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={item.quantity === 0 ? "" : item.quantity}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => {
                      const updated = [...poItems];
                      updated[idx].quantity = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                      setPoItems(updated);
                    }}
                    className="w-20 text-xs h-9 border border-gray-300 rounded-md px-2 font-semibold text-right"
                  />

                  <input
                    type="number"
                    placeholder="0.00"
                    value={item.unitPrice === 0 ? "" : item.unitPrice}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => {
                      const updated = [...poItems];
                      updated[idx].unitPrice = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                      setPoItems(updated);
                    }}
                    className="w-24 text-xs h-9 border border-gray-300 rounded-md px-2 font-semibold text-right"
                  />

                  {poItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      className="text-gray-400 hover:text-red-600 p-1 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <Input
              label="Order Notes / Delivery Instructions"
              value={poNotes}
              onChange={(e) => setPoNotes(e.target.value)}
              placeholder="e.g. Deliver by Friday afternoon"
            />

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => setIsNewPoModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSaving}>
                Create Purchase Order
              </Button>
            </div>
          </form>
        </Modal>

        {/* Receive Goods Modal */}
        <Modal
          isOpen={!!selectedPoForReceive}
          onClose={() => setSelectedPoForReceive(null)}
          title={`Receive Stock — ${selectedPoForReceive?.order_number}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Enter the verified physical quantities received into the store. Submitting will
              automatically update inventory stock levels via automated triggers.
            </p>

            <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg p-2">
              {selectedPoForReceive?.items?.map((it) => (
                <div key={it.id} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900">{it.product?.name}</div>
                    <div className="text-gray-500 text-[11px]">
                      Ordered: {it.quantity_ordered} units
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Receive:</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={receiveQuantities[it.id] ?? it.quantity_ordered}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) =>
                        setReceiveQuantities({
                          ...receiveQuantities,
                          [it.id]: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-20 text-xs p-1.5 border border-gray-300 rounded font-bold text-right"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
              <Button variant="outline" onClick={() => setSelectedPoForReceive(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmReceive}
                isLoading={isReceiving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Confirm & Stock In
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
}
