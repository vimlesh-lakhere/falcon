"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Plus, Clock, CheckCircle2, Search, ArrowRight, User } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { requestsRepository } from "@/repositories/requests.repo";
import { customersRepository } from "@/repositories/customers.repo";
import { productsRepository } from "@/repositories/products.repo";
import { ProductRequest, Customer, Product } from "@/types/database";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const SHOP_ID = process.env.DEFAULT_SHOP_ID || "a0000000-0000-0000-0000-000000000001";

export default function CustomerRequestsPage() {
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  // New Request Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [expectedPrice, setExpectedPrice] = useState<number>(0);
  const [priority, setPriority] = useState<ProductRequest["priority"]>("normal");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reqs, custs, prods] = await Promise.all([
        requestsRepository.getAll(SHOP_ID, statusFilter),
        customersRepository.getAll(SHOP_ID),
        productsRepository.getAll(SHOP_ID, { isActive: true }),
      ]);
      setRequests(reqs);
      setCustomers(custs);
      setProducts(prods);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !productName.trim()) return;

    try {
      setIsSaving(true);
      await requestsRepository.create({
        shop_id: SHOP_ID,
        customer_id: customerId,
        requested_product_name: productName,
        quantity,
        expected_price: expectedPrice || null,
        priority,
        status: "requested",
        notes,
      });

      setIsModalOpen(false);
      setCustomerId("");
      setProductName("");
      setQuantity(1);
      setExpectedPrice(0);
      setNotes("");
      loadData();
    } catch (err: any) {
      console.error(err);
      alert("Failed to create request: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: ProductRequest["status"]) => {
    try {
      await requestsRepository.updateStatus(id, newStatus);
      loadData();
    } catch (err: any) {
      console.error(err);
      alert("Failed to update status: " + err.message);
    }
  };

  return (
    <MainLayout
      title="Customer Product Requests"
      subtitle="Track out-of-stock customer requests from procurement to customer notification"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-surface-border shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto">
            {["all", "requested", "searching", "ordered_from_supplier", "available", "customer_notified", "completed"].map(
              (st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize whitespace-nowrap transition-all ${
                    statusFilter === st
                      ? "bg-brand-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {st.replace(/_/g, " ")}
                </button>
              )
            )}
          </div>

          <Button onClick={() => setIsModalOpen(true)} className="gap-1.5 font-semibold text-xs shadow-sm">
            <Plus className="w-4 h-4" />
            Log Customer Request
          </Button>
        </div>

        {/* Requests Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5">Customer</th>
                    <th className="px-6 py-3.5">Requested Item</th>
                    <th className="px-6 py-3.5 text-center">Qty</th>
                    <th className="px-6 py-3.5 text-right">Expected Price</th>
                    <th className="px-6 py-3.5 text-center">Priority</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                    <th className="px-6 py-3.5 text-right">Update Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                        Loading customer requests...
                      </td>
                    </tr>
                  ) : requests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                        No product requests in this view.
                      </td>
                    </tr>
                  ) : (
                    requests.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900 text-xs">{r.customer?.name}</div>
                          <div className="text-[11px] text-gray-500">{r.customer?.phone}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900 text-xs">
                            {r.requested_product_name || r.product?.name}
                          </div>
                          {r.notes && <div className="text-[11px] text-gray-400">{r.notes}</div>}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-xs text-gray-800">
                          {r.quantity}
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-semibold text-gray-700 tabular-nums">
                          {r.expected_price ? formatCurrency(r.expected_price) : "Open"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge
                            variant={
                              r.priority === "urgent" || r.priority === "high"
                                ? "danger"
                                : "neutral"
                            }
                          >
                            {r.priority}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge
                            variant={
                              r.status === "completed"
                                ? "success"
                                : r.status === "available"
                                ? "info"
                                : "warning"
                            }
                          >
                            {r.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <select
                            value={r.status}
                            onChange={(e) => handleStatusChange(r.id, e.target.value as any)}
                            className="text-xs bg-white border border-gray-300 rounded-md py-1 px-2 font-medium text-gray-800 focus:ring-1 focus:ring-brand-600"
                          >
                            <option value="requested">Requested</option>
                            <option value="searching">Searching</option>
                            <option value="ordered_from_supplier">Ordered from Supplier</option>
                            <option value="available">Available in Store</option>
                            <option value="customer_notified">Customer Notified</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Log Request Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Log Customer Product Request"
          maxWidth="md"
        >
          <form onSubmit={handleCreateRequest} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Select Customer *
              </label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full text-xs h-9 bg-white border border-gray-300 rounded-md px-3 font-medium text-gray-900 focus:ring-2 focus:ring-brand-600 focus:outline-none"
              >
                <option value="">Choose customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone || "No phone"})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Requested Product Name *"
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Rare Beauty Liquid Blush (Joy)"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                min="1"
                placeholder="1"
                label="Quantity Needed"
                value={quantity === 0 ? "" : quantity}
                onChange={(e) => setQuantity(e.target.value === "" ? 0 : parseFloat(e.target.value) || 1)}
              />
              <Input
                type="number"
                label="Target / Expected Price (₹)"
                value={expectedPrice || ""}
                onChange={(e) => setExpectedPrice(parseFloat(e.target.value) || 0)}
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full text-xs h-9 bg-white border border-gray-300 rounded-md px-3 font-medium text-gray-900 focus:ring-2 focus:ring-brand-600 focus:outline-none"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
                <option value="low">Low</option>
              </select>
            </div>

            <Input
              label="Customer Note / Specifications"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Specific shade Joy or Bliss only"
            />

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSaving}>
                Log Request
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
}
