"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Receipt,
  Eye,
  Printer,
  Search,
  ArrowDownLeft,
  RotateCcw,
  Globe,
  Store,
  CheckCircle2,
  Clock,
  PackageCheck,
  Truck,
  Phone,
  MessageCircle,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { posRepository } from "@/repositories/pos.repo";
import { createClient } from "@/lib/supabase/client";
import { Sale } from "@/types/database";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { WhatsAppInvoiceModal } from "@/components/pos/WhatsAppInvoiceModal";

const SHOP_ID = process.env.DEFAULT_SHOP_ID || "a0000000-0000-0000-0000-000000000001";

function SalesHistoryContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "online" ? "online" : "all";

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [whatsAppSale, setWhatsAppSale] = useState<Sale | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "online" | "pos">(initialTab);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadSales = async () => {
    try {
      setLoading(true);
      const data = await posRepository.getRecentSales(SHOP_ID, 100);
      setSales(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  // Update order status in Supabase
  const handleUpdateStatus = async (saleId: string, newStatus: string) => {
    try {
      setUpdatingId(saleId);
      const supabase = createClient();
      const { error } = await supabase
        .from("sales")
        .update({ status: newStatus })
        .eq("id", saleId);

      if (error) throw error;

      // Update local state
      setSales((prev) =>
        prev.map((s) => (s.id === saleId ? ({ ...s, status: newStatus as any } as Sale) : s))
      );

      if (selectedSale && selectedSale.id === saleId) {
        setSelectedSale((prev) => (prev ? ({ ...prev, status: newStatus as any } as Sale) : null));
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update order status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const isOnlineOrder = (sale: Sale) => {
    return (
      sale.invoice_number.startsWith("ORD-") ||
      (sale.notes && sale.notes.includes("[Online Order")) ||
      ["received", "confirmed", "packing", "out_for_delivery", "pending"].includes(sale.status)
    );
  };

  const onlineOrdersCount = sales.filter((s) => isOnlineOrder(s) && s.status !== "completed" && s.status !== "delivered" && s.status !== "cancelled").length;

  const filteredSales = sales.filter((s) => {
    // Tab filter
    if (activeTab === "online" && !isOnlineOrder(s)) return false;
    if (activeTab === "pos" && isOnlineOrder(s)) return false;

    // Search filter
    return (
      !search ||
      s.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      s.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (s.notes && s.notes.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "received":
      case "pending":
        return <Badge variant="warning">🟡 New / Received</Badge>;
      case "confirmed":
        return <Badge variant="info">🔵 Confirmed</Badge>;
      case "packing":
        return <Badge variant="neutral">📦 Packing</Badge>;
      case "out_for_delivery":
        return <Badge variant="info">🚚 Out for Delivery</Badge>;
      case "delivered":
      case "completed":
        return <Badge variant="success">✅ Completed</Badge>;
      case "cancelled":
        return <Badge variant="danger">❌ Cancelled</Badge>;
      case "held":
        return <Badge variant="neutral">⏸️ Held</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <MainLayout
      title="Sales, Invoices & Online Orders"
      subtitle="Manage POS billing records and fulfill incoming customer online storefront orders"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-surface-border shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "all"
                  ? "bg-brand-600 text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              All Invoices ({sales.length})
            </button>

            <button
              onClick={() => setActiveTab("online")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "online"
                  ? "bg-purple-700 text-white shadow-xs"
                  : "text-purple-700 bg-purple-50 hover:bg-purple-100"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>🌐 Online Orders</span>
              {onlineOrdersCount > 0 && (
                <span className="bg-amber-400 text-amber-950 px-2 py-0.2 text-[10px] font-black rounded-full animate-pulse">
                  {onlineOrdersCount} New
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("pos")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "pos"
                  ? "bg-brand-600 text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>POS In-Store Sales</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search invoice or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Online Orders Processing Guidance Banner (Visible in online tab) */}
        {activeTab === "online" && (
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-5 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-purple-500/30 text-purple-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-purple-400/30">
                  Customer Storefront Dispatch Center
                </span>
                <span className="text-xs text-purple-200">Real-time sync with customer live tracker</span>
              </div>
              <h3 className="text-base font-bold">Online Order Fulfillment Pipeline</h3>
              <p className="text-xs text-purple-200/90 max-w-2xl">
                When you change status here (Received ➔ Confirmed ➔ Packing ➔ Out for Delivery ➔ Completed), the customer sees the update on their live tracking screen immediately!
              </p>
            </div>
          </div>
        )}

        {/* Invoices & Orders Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3.5">Type & Invoice #</th>
                    <th className="px-5 py-3.5">Customer & Delivery</th>
                    <th className="px-5 py-3.5">Date & Time</th>
                    <th className="px-5 py-3.5">Payment</th>
                    <th className="px-5 py-3.5 text-right">Total Amount</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Fulfillment Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                        Loading transaction records...
                      </td>
                    </tr>
                  ) : filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                        {activeTab === "online"
                          ? "No online orders found."
                          : activeTab === "pos"
                          ? "No in-store POS sales found."
                          : "No records found."}
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((sale) => {
                      const isOnline = isOnlineOrder(sale);
                      return (
                        <tr
                          key={sale.id}
                          className={`transition-colors ${
                            isOnline && sale.status === "received"
                              ? "bg-purple-50/40 hover:bg-purple-50/70"
                              : "hover:bg-gray-50/50"
                          }`}
                        >
                          {/* Invoice & Channel */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              {isOnline ? (
                                <span className="p-1 rounded-md bg-purple-100 text-purple-800" title="Online Store Order">
                                  <Globe className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <span className="p-1 rounded-md bg-gray-100 text-gray-700" title="POS In-Store Billing">
                                  <Store className="w-3.5 h-3.5" />
                                </span>
                              )}
                              <div>
                                <div className="font-mono text-xs font-bold text-gray-900">
                                  {sale.invoice_number}
                                </div>
                                <span className="text-[10px] text-gray-500 font-medium">
                                  {isOnline ? "Online Store" : "POS Billing"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Customer & Location */}
                          <td className="px-5 py-4 text-xs">
                            <div className="font-semibold text-gray-900">
                              {sale.customer ? sale.customer.name : "Walk-in Customer"}
                            </div>
                            {sale.customer?.phone && (
                              <div className="text-gray-500 font-mono text-[11px] flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-gray-400" />
                                <span>{sale.customer.phone}</span>
                              </div>
                            )}
                            {sale.customer?.address && (
                              <div className="text-[10px] text-gray-500 truncate max-w-xs mt-0.5" title={sale.customer.address}>
                                📍 {sale.customer.address}
                              </div>
                            )}
                          </td>

                          {/* Date */}
                          <td className="px-5 py-4 text-xs text-gray-500 font-mono">
                            {formatDateTime(sale.created_at)}
                          </td>

                          {/* Payment */}
                          <td className="px-5 py-4 text-xs">
                            <span className="font-semibold text-gray-800 uppercase">
                              {sale.payments?.[0]?.method || (sale.notes?.includes("UPI") ? "UPI" : "Cash")}
                            </span>
                          </td>

                          {/* Total Amount */}
                          <td className="px-5 py-4 text-xs font-bold text-brand-700 text-right tabular-nums">
                            {formatCurrency(sale.total_amount)}
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4 text-center">
                            {getStatusBadge(sale.status)}
                          </td>

                          {/* Action Buttons */}
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Workflow buttons for Online Orders */}
                              {isOnline && (
                                <>
                                  {sale.status === "received" && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateStatus(sale.id, "confirmed")}
                                      disabled={updatingId === sale.id}
                                      className="text-[11px] h-7 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                    >
                                      Accept & Confirm
                                    </Button>
                                  )}

                                  {sale.status === "confirmed" && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateStatus(sale.id, "packing")}
                                      disabled={updatingId === sale.id}
                                      className="text-[11px] h-7 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                                    >
                                      Start Packing
                                    </Button>
                                  )}

                                  {sale.status === "packing" && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateStatus(sale.id, "out_for_delivery")}
                                      disabled={updatingId === sale.id}
                                      className="text-[11px] h-7 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                                    >
                                      Dispatch / Out for Delivery
                                    </Button>
                                  )}

                                  {sale.status === "out_for_delivery" && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateStatus(sale.id, "completed")}
                                      disabled={updatingId === sale.id}
                                      className="text-[11px] h-7 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                    >
                                      Mark Delivered & Paid
                                    </Button>
                                  )}
                                </>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setWhatsAppSale(sale)}
                                className="text-xs font-semibold h-7 gap-1 text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                                title="Share Cash Bill via WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="hidden sm:inline">WhatsApp</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedSale(sale)}
                                className="text-xs font-medium h-7 gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" /> Details
                              </Button>
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

        {/* Invoice & Online Order Detail Modal */}
        <Modal
          isOpen={!!selectedSale}
          onClose={() => setSelectedSale(null)}
          title={`Order / Invoice #${selectedSale?.invoice_number}`}
          maxWidth="lg"
        >
          {selectedSale && (
            <div className="space-y-4">
              {/* If online order, show status control bar */}
              {isOnlineOrder(selectedSale) && (
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                        Online Order Status Management
                      </span>
                      <h4 className="text-sm font-black text-purple-950">
                        Current Status: {selectedSale.status.toUpperCase()}
                      </h4>
                    </div>
                    <div>{getStatusBadge(selectedSale.status)}</div>
                  </div>

                  {/* Status Progression Buttons */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <Button
                      size="sm"
                      variant={selectedSale.status === "received" ? "primary" : "outline"}
                      onClick={() => handleUpdateStatus(selectedSale.id, "received")}
                      disabled={updatingId === selectedSale.id}
                      className="text-xs h-8"
                    >
                      1. Received
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedSale.status === "confirmed" ? "primary" : "outline"}
                      onClick={() => handleUpdateStatus(selectedSale.id, "confirmed")}
                      disabled={updatingId === selectedSale.id}
                      className="text-xs h-8"
                    >
                      2. Confirmed
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedSale.status === "packing" ? "primary" : "outline"}
                      onClick={() => handleUpdateStatus(selectedSale.id, "packing")}
                      disabled={updatingId === selectedSale.id}
                      className="text-xs h-8"
                    >
                      3. Packing
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedSale.status === "out_for_delivery" ? "primary" : "outline"}
                      onClick={() => handleUpdateStatus(selectedSale.id, "out_for_delivery")}
                      disabled={updatingId === selectedSale.id}
                      className="text-xs h-8"
                    >
                      4. Out for Delivery
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedSale.status === "completed" || selectedSale.status === "delivered" ? "primary" : "outline"}
                      onClick={() => handleUpdateStatus(selectedSale.id, "completed")}
                      disabled={updatingId === selectedSale.id}
                      className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      5. Completed & Delivered
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        if (confirm("Are you sure you want to cancel this order?")) {
                          handleUpdateStatus(selectedSale.id, "cancelled");
                        }
                      }}
                      disabled={updatingId === selectedSale.id}
                      className="text-xs h-8 ml-auto"
                    >
                      Cancel Order
                    </Button>
                  </div>
                </div>
              )}

              {/* Customer & Address Details */}
              {selectedSale.customer && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs space-y-1.5">
                  <div className="font-bold text-gray-900 text-sm flex items-center justify-between">
                    <span>Customer: {selectedSale.customer.name}</span>
                    {selectedSale.customer.phone && (
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://wa.me/91${selectedSale.customer.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                            `Namaste ${selectedSale.customer.name}, updates on your AGS Store Order #${selectedSale.invoice_number}: Status is now ${selectedSale.status.toUpperCase()}. Total: ₹${selectedSale.total_amount}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                        <a
                          href={`tel:${selectedSale.customer.phone}`}
                          className="px-2.5 py-1 bg-gray-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="text-gray-700">Phone: {selectedSale.customer.phone || "N/A"}</div>
                  <div className="text-gray-700">Address: {selectedSale.customer.address || "Local Address"}</div>
                  {selectedSale.notes && (
                    <div className="text-purple-800 font-medium pt-1 border-t border-gray-200">
                      Notes: {selectedSale.notes}
                    </div>
                  )}
                </div>
              )}

              {/* Printable Invoice / Receipt View */}
              <div className="p-4 border border-gray-200 rounded-xl bg-white space-y-3 font-mono text-xs text-gray-800">
                <div className="text-center pb-3 border-b border-dashed border-gray-300">
                  <h2 className="font-bold text-sm text-gray-900">AGS STORE</h2>
                  <p className="text-[11px] text-gray-500">Retail & Wholesale Cosmetics & Essentials</p>
                  <p className="text-[10px] text-gray-400">Invoice: {selectedSale.invoice_number}</p>
                </div>

                <div className="flex justify-between text-[11px]">
                  <span>Date: {formatDateTime(selectedSale.created_at)}</span>
                  <span>Channel: {isOnlineOrder(selectedSale) ? "Online Store" : "POS Billing"}</span>
                </div>

                <div className="border-t border-b border-dashed border-gray-300 py-2 space-y-1">
                  {selectedSale.items?.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="truncate max-w-[220px]">{it.product?.name || "Product Item"}</span>
                      <span className="tabular-nums">
                        {it.quantity} × {formatCurrency(it.unit_price)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 text-right font-bold text-xs pt-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-900 pt-1 border-t border-gray-200">
                    <span>Grand Total:</span>
                    <span className="text-brand-700">{formatCurrency(selectedSale.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => setWhatsAppSale(selectedSale)}
                  className="flex-1 gap-1.5 text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  Send WhatsApp Bill
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="flex-1 gap-1.5 text-xs font-semibold"
                >
                  <Printer className="w-4 h-4" />
                  Print Delivery Slip / Invoice
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setSelectedSale(null)}
                  className="text-xs font-semibold"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* WhatsApp Invoice Modal */}
        {whatsAppSale && (
          <WhatsAppInvoiceModal
            isOpen={!!whatsAppSale}
            onClose={() => setWhatsAppSale(null)}
            sale={whatsAppSale}
            customer={whatsAppSale.customer}
            shopId={SHOP_ID}
          />
        )}
      </div>
    </MainLayout>
  );
}

export default function SalesHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium text-gray-500">Loading sales records...</p>
          </div>
        </div>
      }
    >
      <SalesHistoryContent />
    </Suspense>
  );
}
