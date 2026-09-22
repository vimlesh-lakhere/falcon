"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Receipt,
  AlertTriangle,
  Package,
  ShoppingCart,
  Boxes,
  ArrowRight,
  Clock,
  CheckCircle2,
  DollarSign,
  Truck,
  MessageSquare,
  ClipboardList,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { dashboardRepository, DashboardMetrics } from "@/repositories/dashboard.repo";
import { suppliersRepository } from "@/repositories/suppliers.repo";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { QuickDemandPadModal } from "@/components/dashboard/QuickDemandPadModal";
import { quickDemandNotesService } from "@/lib/quick-demand-notes";
import { Supplier } from "@/types/database";

import { useAuthStore } from "@/store/useAuthStore";

export default function DashboardPage() {
  const { currentStore, profile, fetchSession } = useAuthStore();
  const shopId = currentStore?.id || profile?.store_id;

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeOnlineOrders, setActiveOnlineOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isQuickDemandPadOpen, setIsQuickDemandPadOpen] = useState(false);
  const [demandStats, setDemandStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    byGroup: {} as Record<string, number>,
  });

  const updateDemandStats = () => {
    if (!shopId) return;
    setDemandStats(quickDemandNotesService.getStats(shopId));
  };

  const loadData = async () => {
    if (!shopId) return;
    try {
      setLoading(true);
      const [data, salesRes, suppsRes] = await Promise.all([
        dashboardRepository.getMetrics(shopId),
        (async () => {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          return supabase
            .from("sales")
            .select("*, customer:customers(*)")
            .eq("shop_id", shopId)
            .in("status", ["received", "pending", "confirmed", "packing", "out_for_delivery"])
            .order("created_at", { ascending: false });
        })(),
        suppliersRepository.getAll(shopId).catch(() => []),
      ]);

      setMetrics(data);
      if (salesRes?.data) {
        setActiveOnlineOrders(salesRes.data);
      }
      setSuppliers(suppsRes || []);
    } catch (err) {
      console.error("Failed to load dashboard metrics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (shopId) {
      loadData();
      updateDemandStats();
    }
  }, [shopId]);

  useEffect(() => {
    const handleDemandNotesUpdated = () => updateDemandStats();
    window.addEventListener("falcon_demand_notes_updated", handleDemandNotesUpdated);
    return () => window.removeEventListener("falcon_demand_notes_updated", handleDemandNotesUpdated);
  }, []);

  // Handle URL query for auto-opening Quick Note (e.g. from PWA app icon shortcut)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("action") === "quick-note") {
        setIsQuickDemandPadOpen(true);
      }
    }
  }, []);

  // Global Keyboard shortcut 'Q' or 'Alt+Q' to open Quick Demand Pad
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (!isInput && (e.key.toLowerCase() === "q" || (e.altKey && e.key.toLowerCase() === "q"))) {
        e.preventDefault();
        setIsQuickDemandPadOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <MainLayout
      title="Store Overview & Analytics"
      subtitle="Real-time daily operations, live inventory health, and billing status"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Active Online Store Orders Alert Banner */}
        {activeOnlineOrders.length > 0 && (
          <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white rounded-2xl p-5 shadow-lg border border-purple-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-purple-500/30 border border-purple-400/30 flex items-center justify-center text-white shrink-0">
                <Boxes className="w-6 h-6 text-purple-200 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {activeOnlineOrders.length} New Orders
                  </span>
                  <span className="text-xs text-purple-200">Customer Storefront</span>
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Incoming Online Orders Pending Fulfillment
                </h3>
                <p className="text-xs text-purple-200">
                  Latest: Order #{activeOnlineOrders[0].invoice_number} from {activeOnlineOrders[0].customer?.name || "Customer"} (₹{activeOnlineOrders[0].total_amount})
                </p>
              </div>
            </div>

            <Link href="/sales?tab=online">
              <Button
                size="sm"
                className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold shadow-md gap-1.5 shrink-0"
              >
                <span>Manage Online Orders</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        )}

        {/* Quick Launch POS Banner */}
        <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-md">
                POS Billing Terminal
              </span>
              <span className="text-xs text-indigo-100 font-mono">Press &apos;N&apos; or &apos;G P&apos;</span>
            </div>
            <h2 className="text-xl font-bold">Fast Keyboard & Barcode Billing</h2>
            <p className="text-sm text-indigo-100 max-w-xl">
              High-speed retail & wholesale checkout with barcode scanning, custom client pricing, and instant receipt generation.
            </p>
          </div>
          <Link href="/pos">
            <Button
              size="lg"
              className="bg-white text-brand-700 hover:bg-indigo-50 font-bold shadow-md gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              Launch POS Terminal
            </Button>
          </Link>
        </div>

        {/* Top KPI Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Today's Sales */}
          <Card className="hover:shadow-md transition-shadow border-brand-100">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Today&apos;s Sales
                </span>
                <div className="text-2xl font-bold text-gray-900 tabular-nums">
                  {loading ? "..." : formatCurrency(metrics?.todaySalesTotal || 0)}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1 flex-wrap">
                  <span>{metrics?.todaySalesCount || 0} completed invoices</span>
                  {(metrics?.todayReturnsTotal || 0) > 0 && (
                    <span className="text-amber-700 font-semibold">· −{formatCurrency(metrics!.todayReturnsTotal)} returns</span>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <Receipt className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          {/* Today's Est. Profit */}
          <Card className="hover:shadow-md transition-shadow border-emerald-100">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Today&apos;s Net Profit
                </span>
                <div className="text-2xl font-bold text-emerald-600 tabular-nums">
                  {loading ? "..." : formatCurrency(metrics?.todayProfit || 0)}
                </div>
                <div className="text-xs text-emerald-700 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Gross margin estimate</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Link href="/inventory" className="block">
            <Card className="hover:shadow-md transition-shadow border-amber-200 bg-amber-50/20">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                    Low Stock Items
                  </span>
                  <div className="text-2xl font-bold text-amber-700 tabular-nums">
                    {loading ? "..." : metrics?.lowStockCount || 0}
                  </div>
                  <div className="text-xs text-amber-700 flex items-center gap-1">
                    <span>Needs reordering</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Pending Customer Requests */}
          <Link href="/requests" className="block">
            <Card className="hover:shadow-md transition-shadow border-sky-100">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Customer Requests
                  </span>
                  <div className="text-2xl font-bold text-sky-600 tabular-nums">
                    {loading ? "..." : metrics?.pendingRequestsCount || 0}
                  </div>
                  <div className="text-xs text-gray-500">Awaiting sourcing</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* ⚡ Quick Demand Pad (Kharidi Parchi) */}
          <div
            onClick={() => setIsQuickDemandPadOpen(true)}
            className="cursor-pointer block"
          >
            <Card className="hover:shadow-md transition-all border-purple-300 bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/40 hover:border-purple-500 group h-full">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                      Demand Pad
                    </span>
                    <span className="text-[9px] font-black bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full uppercase">
                      Kharidi
                    </span>
                  </div>
                  <div className="text-2xl font-black text-purple-950 tabular-nums">
                    {demandStats.pending}{" "}
                    <span className="text-xs font-normal text-gray-500">to order</span>
                  </div>
                  <div className="text-[11px] text-purple-700 truncate max-w-[140px] font-medium">
                    {Object.keys(demandStats.byGroup).length > 0
                      ? Object.entries(demandStats.byGroup)
                          .slice(0, 2)
                          .map(([g, c]) => `${g}: ${c}`)
                          .join(" • ")
                      : "Tap to jot down (Q)"}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                  <ClipboardList className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Content Section: Recent Transactions & Top Selling Products */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions (2 cols) */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-600" />
                Recent Sales Transactions
              </CardTitle>
              <Link href="/sales">
                <Button variant="ghost" size="sm" className="text-xs text-brand-600 gap-1">
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {/* 📱 Mobile View: Responsive Card Rows */}
              <div className="block sm:hidden divide-y divide-gray-100">
                {loading ? (
                  <div className="px-4 py-8 text-center text-xs text-gray-400">
                    Loading transactions...
                  </div>
                ) : metrics?.recentSales.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-gray-400">
                    No transactions recorded yet today.
                  </div>
                ) : (
                  metrics?.recentSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-3.5 hover:bg-gray-50/70 active:bg-gray-100/50 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-gray-900 truncate">
                            {sale.customer ? sale.customer.name : "Walk-in Customer"}
                          </span>
                          <Badge
                            variant={sale.status === "completed" ? "success" : "warning"}
                            className="text-[10px] px-1.5 py-0.2 shrink-0"
                          >
                            {sale.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500">
                          <span className="font-mono font-medium text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                            {sale.invoice_number}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-gray-400">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(sale.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-gray-900 tabular-nums">
                          {formatCurrency(sale.total_amount)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 💻 Desktop View: Full-featured Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3">Invoice</th>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Time</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                      <th className="px-6 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                          Loading transactions...
                        </td>
                      </tr>
                    ) : metrics?.recentSales.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                          No transactions recorded yet today.
                        </td>
                      </tr>
                    ) : (
                      metrics?.recentSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-3.5 font-mono text-xs font-semibold text-gray-900">
                            {sale.invoice_number}
                          </td>
                          <td className="px-6 py-3.5 text-xs text-gray-700">
                            {sale.customer ? sale.customer.name : "Walk-in Customer"}
                          </td>
                          <td className="px-6 py-3.5 text-xs text-gray-500">
                            {formatDateTime(sale.created_at)}
                          </td>
                          <td className="px-6 py-3.5 text-xs font-bold text-gray-900 text-right tabular-nums">
                            {formatCurrency(sale.total_amount)}
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            <Badge variant={sale.status === "completed" ? "success" : "warning"}>
                              {sale.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Quick Operations & Top Products (1 col) */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold text-gray-900">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {/* ⚡ Quick Demand Pad Action */}
                <div
                  onClick={() => setIsQuickDemandPadOpen(true)}
                  className="flex items-center justify-between p-3 rounded-lg border border-purple-200 bg-purple-50/40 hover:bg-purple-100/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                      ⚡
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <span>Quick Demand Pad</span>
                        <span className="text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-300 px-1.5 py-0.2 rounded">
                          Press &apos;Q&apos;
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {demandStats.pending > 0
                          ? `${demandStats.pending} shortages pending`
                          : "Jot customer & party demands"}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-purple-600" />
                </div>

                <Link href="/pos" className="block">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-brand-100 bg-brand-50/30 hover:bg-brand-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="w-5 h-5 text-brand-600" />
                      <div>
                        <div className="text-xs font-bold text-gray-900">New Bill / POS</div>
                        <div className="text-[11px] text-gray-500">Instant walk-in checkout</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-brand-600" />
                  </div>
                </Link>

                <Link href="/products" className="block">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="text-xs font-bold text-gray-900">Add Product</div>
                        <div className="text-[11px] text-gray-500">Catalog & Barcodes</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>

                <Link href="/purchases" className="block">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="text-xs font-bold text-gray-900">Receive Stock</div>
                        <div className="text-[11px] text-gray-500">Purchase orders</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold text-gray-900">
                  System Health & Sync
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Database Engine</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Supabase Postgres
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Region</span>
                  <span className="font-medium text-gray-700">ap-south-1 (Mumbai)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Stock Triggers</span>
                  <span className="font-semibold text-emerald-600">Active</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ⚡ Quick Demand Pad / Kharidi Parchi Modal */}
      {isQuickDemandPadOpen && (
        <QuickDemandPadModal
          isOpen={isQuickDemandPadOpen}
          onClose={() => setIsQuickDemandPadOpen(false)}
          shopId={shopId || ""}
          suppliers={suppliers}
          onAddAsProduct={(name, suppId) => {
            window.location.href = `/products?action=add&name=${encodeURIComponent(name)}${
              suppId ? `&supplierId=${encodeURIComponent(suppId)}` : ""
            }`;
          }}
        />
      )}
    </MainLayout>
  );
}
