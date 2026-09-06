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
  Pencil,
  Tag,
  Sparkles,
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
import { EditInvoiceModal } from "@/components/sales/EditInvoiceModal";
import { ThermalReceipt } from "@/components/pos/ThermalReceipt";
import { ShippingParcelLabelModal } from "@/components/pos/ShippingParcelLabelModal";
import { parseFreightCharge } from "@/lib/thermal-printer";
import { useAuthStore } from "@/store/useAuthStore";

function SalesHistoryContent() {
  const { currentStore, profile, fetchSession } = useAuthStore();
  const SHOP_ID = currentStore?.id || profile?.store_id || "";
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "online" ? "online" : "all";

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [whatsAppSale, setWhatsAppSale] = useState<Sale | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [printingSale, setPrintingSale] = useState<Sale | null>(null);
  const [parcelSale, setParcelSale] = useState<Sale | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "online" | "pos">(initialTab);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadSales = async () => {
    if (!SHOP_ID) return;
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
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (SHOP_ID) {
      loadSales();
    }
  }, [SHOP_ID]);

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

        {/* Sales & Gross Profit KPI Summary Cards */}
        {(() => {
          const totalRev = filteredSales.reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0);
          const totalCst = filteredSales.reduce((acc, s) => {
            const cost = (s.items || []).reduce(
              (sum, it: any) =>
                sum + ((Number(it.cost_price) || Number(it.product?.purchase_price) || 0) * Number(it.quantity || 1)),
              0
            );
            return acc + cost;
          }, 0);
          const totalPrf = totalRev - totalCst;
          const avgMrg = totalRev > 0 ? (totalPrf / totalRev) * 100 : 0;

          return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-xs space-y-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Total Revenue
                </span>
                <div className="text-base sm:text-xl font-black text-gray-900 tabular-nums">
                  {formatCurrency(totalRev)}
                </div>
                <div className="text-[10px] sm:text-[11px] text-gray-500 font-medium truncate">
                  {filteredSales.length} Total Invoices
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/70 p-3 sm:p-4 rounded-2xl border border-emerald-200 shadow-xs space-y-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  Gross Profit (कमाई)
                </span>
                <div className="text-base sm:text-xl font-black text-emerald-700 tabular-nums flex items-baseline gap-1">
                  <span>+{formatCurrency(totalPrf)}</span>
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-emerald-800 truncate">
                  ⚡ {avgMrg.toFixed(1)}% Margin
                </div>
              </div>

              <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-xs space-y-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Inventory Cost
                </span>
                <div className="text-base sm:text-xl font-black text-gray-700 tabular-nums">
                  {formatCurrency(totalCst)}
                </div>
                <div className="text-[10px] sm:text-[11px] text-gray-500 font-medium truncate">
                  Product purchase costs
                </div>
              </div>

              <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-xs space-y-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Avg. Basket
                </span>
                <div className="text-base sm:text-xl font-black text-purple-700 tabular-nums">
                  {formatCurrency(totalRev / (filteredSales.length || 1))}
                </div>
                <div className="text-[10px] sm:text-[11px] text-gray-500 font-medium truncate">
                  Per transaction average
                </div>
              </div>
            </div>
          );
        })()}

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

        {/* Invoices & Orders Container (Dual Responsive View) */}
        <Card>
          <CardContent className="p-0">
            {/* 📱 Mobile View: Touch-Friendly Card Rows (Zero horizontal scrolling) */}
            <div className="block sm:hidden divide-y divide-gray-100">
              {loading ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  Loading transaction records...
                </div>
              ) : filteredSales.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  {activeTab === "online"
                    ? "No online orders found."
                    : activeTab === "pos"
                    ? "No in-store POS sales found."
                    : "No records found."}
                </div>
              ) : (
                filteredSales.map((sale) => {
                  const isOnline = isOnlineOrder(sale);
                  const items = sale.items || [];
                  const billCost = items.reduce(
                    (sum: number, it: any) =>
                      sum +
                      ((Number(it.cost_price) || Number(it.product?.purchase_price) || 0) *
                        Number(it.quantity || 1)),
                    0
                  );
                  const billTotal = Number(sale.total_amount) || Number(sale.subtotal) || 0;
                  const billProfit = billTotal - billCost;
                  const billMargin = billTotal > 0 ? (billProfit / billTotal) * 100 : 0;

                  return (
                    <div
                      key={sale.id}
                      className={`p-4 transition-colors ${
                        isOnline && sale.status === "received"
                          ? "bg-purple-50/50"
                          : "bg-white hover:bg-gray-50/50"
                      }`}
                    >
                      {/* Row 1: Channel + Invoice # + Status Badge */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isOnline ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold shrink-0">
                              <Globe className="w-3 h-3" /> Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-bold shrink-0">
                              <Store className="w-3 h-3" /> POS
                            </span>
                          )}
                          <span className="font-mono text-xs font-bold text-gray-900 truncate">
                            {sale.invoice_number}
                          </span>
                        </div>
                        <div className="shrink-0">{getStatusBadge(sale.status)}</div>
                      </div>

                      {/* Row 2: Customer & Date */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-gray-900 truncate">
                            {sale.customer ? sale.customer.name : "Walk-in Customer"}
                          </div>
                          {sale.customer?.phone && (
                            <a
                              href={`tel:${sale.customer.phone}`}
                              className="inline-flex items-center gap-1 text-[11px] text-brand-600 font-mono font-medium hover:underline mt-0.5"
                            >
                              <Phone className="w-3 h-3 text-brand-500" />
                              <span>{sale.customer.phone}</span>
                            </a>
                          )}
                          {sale.customer?.address && (
                            <div className="text-[10px] text-gray-500 truncate mt-0.5" title={sale.customer.address}>
                              📍 {sale.customer.address}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-mono text-gray-400">
                            {formatDateTime(sale.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Row 3: Financials Summary Box (Amount + Profit + Payment Mode) */}
                      <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 mb-3 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-gray-400">Total Billed</div>
                          <div className="text-sm font-black text-brand-700 tabular-nums">
                            {formatCurrency(sale.total_amount)}
                          </div>
                          <div className="text-[9px] font-semibold text-gray-500 uppercase mt-0.5">
                            Paid via {sale.payments?.[0]?.method || (sale.notes?.includes("UPI") ? "UPI" : "Cash")}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold text-gray-400">Est. Profit</div>
                          <div className="text-xs font-black text-emerald-700 tabular-nums">
                            +{formatCurrency(billProfit)}
                          </div>
                          <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded mt-0.5">
                            {billMargin.toFixed(1)}% margin
                          </span>
                        </div>
                      </div>

                      {/* Online Order Quick Workflow Transition Button (if applicable) */}
                      {isOnline && (
                        <div className="mb-2.5">
                          {sale.status === "received" && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(sale.id, "confirmed")}
                              disabled={updatingId === sale.id}
                              className="w-full text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Accept & Confirm Order
                            </Button>
                          )}
                          {sale.status === "confirmed" && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(sale.id, "packing")}
                              disabled={updatingId === sale.id}
                              className="w-full text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5"
                            >
                              <PackageCheck className="w-3.5 h-3.5" /> Start Packing
                            </Button>
                          )}
                          {sale.status === "packing" && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(sale.id, "out_for_delivery")}
                              disabled={updatingId === sale.id}
                              className="w-full text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white font-bold gap-1.5"
                            >
                              <Truck className="w-3.5 h-3.5" /> Dispatch / Out for Delivery
                            </Button>
                          )}
                          {sale.status === "out_for_delivery" && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(sale.id, "completed")}
                              disabled={updatingId === sale.id}
                              className="w-full text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Mark Delivered & Paid
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Row 4: Action Buttons Bar */}
                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedSale(sale)}
                          className="text-[11px] h-7 px-1 flex items-center justify-center gap-1 font-semibold"
                        >
                          <Eye className="w-3 h-3 text-gray-500" />
                          <span>Details</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingSale(sale)}
                          className="text-[11px] h-7 px-1 flex items-center justify-center gap-1 font-semibold text-purple-700 border-purple-200 hover:bg-purple-50"
                        >
                          <Pencil className="w-3 h-3 text-purple-600" />
                          <span>Edit</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPrintingSale(sale)}
                          className="text-[11px] h-7 px-1 flex items-center justify-center gap-1 font-semibold text-gray-700 border-gray-300 hover:bg-gray-100"
                        >
                          <Printer className="w-3 h-3 text-gray-700" />
                          <span>Print</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setWhatsAppSale(sale)}
                          className="text-[11px] h-7 px-1 flex items-center justify-center gap-1 font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>WA</span>
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 💻 Desktop View: Full Data Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3.5">Type & Invoice #</th>
                    <th className="px-5 py-3.5">Customer & Delivery</th>
                    <th className="px-5 py-3.5">Date & Time</th>
                    <th className="px-5 py-3.5">Payment</th>
                    <th className="px-5 py-3.5 text-right">Total Amount</th>
                    <th className="px-5 py-3.5 text-right">Profit (मुनाफा)</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Fulfillment Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                        Loading transaction records...
                      </td>
                    </tr>
                  ) : filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
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
                      const items = sale.items || [];
                      const billCost = items.reduce(
                        (sum: number, it: any) =>
                          sum +
                          ((Number(it.cost_price) || Number(it.product?.purchase_price) || 0) *
                            Number(it.quantity || 1)),
                        0
                      );
                      const billTotal = Number(sale.total_amount) || Number(sale.subtotal) || 0;
                      const billProfit = billTotal - billCost;
                      const billMargin = billTotal > 0 ? (billProfit / billTotal) * 100 : 0;

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

                          {/* Profit & Margin on this Bill */}
                          <td className="px-5 py-4 text-right tabular-nums">
                            <div className="text-xs font-black text-emerald-700">
                              +{formatCurrency(billProfit)}
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-md">
                              {billMargin.toFixed(1)}% margin
                            </span>
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

                              {/* ✏️ Edit Invoice Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingSale(sale)}
                                className="text-xs font-bold h-7 gap-1 text-purple-700 hover:bg-purple-50 border-purple-300"
                                title="Edit items, prices, discount or freight for this invoice"
                              >
                                <Pencil className="w-3.5 h-3.5 text-purple-600" />
                                <span>Edit</span>
                              </Button>

                              {/* 🖨️ Thermal Print Receipt Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPrintingSale(sale)}
                                className="text-xs font-semibold h-7 gap-1 text-gray-700 hover:bg-gray-100 border-gray-300"
                                title="Print 80mm/58mm Thermal Bill"
                              >
                                <Printer className="w-3.5 h-3.5 text-gray-700" />
                                <span className="hidden md:inline">Print</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setWhatsAppSale(sale)}
                                className="text-xs font-semibold h-7 gap-1 text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                                title="Share Cash Bill via WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="hidden lg:inline">WhatsApp</span>
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

              {/* Profit Breakdown Panel for this Bill */}
              {(() => {
                const items = selectedSale.items || [];
                const totalBilled = Number(selectedSale.total_amount) || Number(selectedSale.subtotal) || 0;
                const costOfGoods = items.reduce(
                  (sum, it: any) =>
                    sum +
                    ((Number(it.cost_price) || Number(it.product?.purchase_price) || 0) *
                      Number(it.quantity || 1)),
                  0
                );
                const grossProfit = totalBilled - costOfGoods;
                const marginPct = totalBilled > 0 ? (grossProfit / totalBilled) * 100 : 0;

                return (
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50/80 rounded-2xl border border-emerald-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1">
                        <span>💰 Bill Profit & Margin Analysis (इस बिल की शुद्ध कमाई)</span>
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-700 text-white rounded-full text-xs font-black">
                        {marginPct.toFixed(1)}% Gross Margin
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                        <span className="text-[10px] text-gray-500 block font-semibold">Total Billed (विक्रय मूल्य)</span>
                        <span className="text-sm font-black text-gray-900 tabular-nums">
                          {formatCurrency(totalBilled)}
                        </span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                        <span className="text-[10px] text-gray-500 block font-semibold">Cost of Goods (लागत मूल्य)</span>
                        <span className="text-sm font-bold text-gray-700 tabular-nums">
                          {formatCurrency(costOfGoods)}
                        </span>
                      </div>
                      <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-xs">
                        <span className="text-[10px] text-emerald-100 block font-bold">Net Profit (शुद्ध मुनाफा)</span>
                        <span className="text-sm font-black tabular-nums">
                          +{formatCurrency(grossProfit)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Printable Invoice / Receipt View with per-item profit breakdown */}
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

                <div className="border-t border-b border-dashed border-gray-300 py-2 space-y-2">
                  {selectedSale.items?.map((it, idx) => {
                    const itCost = Number(it.cost_price) || Number(it.product?.purchase_price) || 0;
                    const itSelling = Number(it.unit_price) || 0;
                    const itProfit = (itSelling - itCost) * Number(it.quantity || 1);

                    return (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between font-semibold">
                          <span className="truncate max-w-[220px]">{it.product?.name || "Product Item"}</span>
                          <span className="tabular-nums">
                            {it.quantity} × {formatCurrency(itSelling)} = {formatCurrency(itSelling * Number(it.quantity))}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 font-sans">
                          <span>Cost: ₹{itCost.toFixed(2)} /unit</span>
                          <span className="font-bold text-emerald-700">Profit: +₹{itProfit.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-1 text-right font-bold text-xs pt-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  {Number(selectedSale.discount_amount) > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount:</span>
                      <span>-{formatCurrency(selectedSale.discount_amount)}</span>
                    </div>
                  )}
                  {parseFreightCharge(selectedSale) > 0 && (
                    <div className="flex justify-between text-amber-800">
                      <span>🚚 भाड़ा / Freight:</span>
                      <span>+{formatCurrency(parseFreightCharge(selectedSale))}</span>
                    </div>
                  )}
                  {Number(selectedSale.tax_amount) > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Tax / GST:</span>
                      <span>+{formatCurrency(selectedSale.tax_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-gray-900 pt-1 border-t border-gray-200">
                    <span>Grand Total:</span>
                    <span className="text-brand-700">{formatCurrency(selectedSale.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* ✏️ Edit Invoice Button */}
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingSale(selectedSale);
                    setSelectedSale(null);
                  }}
                  className="flex-1 gap-1.5 text-xs font-black text-purple-700 border-purple-300 hover:bg-purple-50"
                >
                  <Pencil className="w-4 h-4 text-purple-600" />
                  Edit Invoice (बिल एडिट करें)
                </Button>

                {/* 🖨️ Thermal Print Receipt */}
                <Button
                  variant="outline"
                  onClick={() => {
                    setPrintingSale(selectedSale);
                    setSelectedSale(null);
                  }}
                  className="flex-1 gap-1.5 text-xs font-bold text-gray-800 hover:bg-gray-100"
                >
                  <Printer className="w-4 h-4 text-gray-700" />
                  Thermal Print (80mm/58mm)
                </Button>

                {/* 🏷️ Shipping Parcel Sticker */}
                <Button
                  variant="outline"
                  onClick={() => {
                    setParcelSale(selectedSale);
                    setSelectedSale(null);
                  }}
                  className="flex-1 gap-1.5 text-xs font-bold text-amber-800 border-amber-300 hover:bg-amber-50"
                >
                  <Tag className="w-4 h-4 text-amber-600" />
                  Parcel Sticker
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setWhatsAppSale(selectedSale)}
                  className="flex-1 gap-1.5 text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  WhatsApp Bill
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

        {/* Edit Invoice Modal */}
        {editingSale && (
          <EditInvoiceModal
            isOpen={!!editingSale}
            onClose={() => setEditingSale(null)}
            sale={editingSale}
            shopId={SHOP_ID}
            onSuccess={(updatedSale) => {
              setEditingSale(null);
              loadSales();
              setPrintingSale(updatedSale);
            }}
          />
        )}

        {/* Thermal Print Receipt Modal */}
        {printingSale && (
          <Modal
            isOpen={!!printingSale}
            onClose={() => setPrintingSale(null)}
            title={`🧾 Thermal Receipt #${printingSale.invoice_number}`}
            description="80mm / 58mm POS thermal print, Bluetooth ESC/POS and sharing"
            maxWidth="lg"
          >
            <ThermalReceipt
              sale={printingSale}
              customer={printingSale.customer}
              shopId={SHOP_ID}
              onDone={() => setPrintingSale(null)}
            />
          </Modal>
        )}

        {/* Shipping Parcel Label Modal */}
        {parcelSale && (
          <ShippingParcelLabelModal
            isOpen={!!parcelSale}
            onClose={() => setParcelSale(null)}
            shopId={SHOP_ID}
            initialCustomerName={parcelSale.customer?.name || undefined}
            initialCustomerPhone={parcelSale.customer?.phone || undefined}
            initialAddress={parcelSale.customer?.address || undefined}
            initialInvoiceNo={parcelSale.invoice_number}
            initialOrderValue={Number(parcelSale.total_amount) || 0}
          />
        )}

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
