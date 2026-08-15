"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { posRepository } from "@/repositories/pos.repo";
import { productsRepository } from "@/repositories/products.repo";
import { Sale, Product } from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/utils";

const SHOP_ID = process.env.DEFAULT_SHOP_ID || "a0000000-0000-0000-0000-000000000001";

export default function ReportsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("all");

  const loadData = async () => {
    try {
      setLoading(true);
      const [salesData, prods] = await Promise.all([
        posRepository.getRecentSales(SHOP_ID, 200),
        productsRepository.getAll(SHOP_ID, { isActive: true }),
      ]);
      setSales(salesData);
      setProducts(prods);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Revenue, Cost, Gross Profit, Total Invoices
  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  let totalCost = 0;
  sales.forEach((s) => {
    s.items?.forEach((it) => {
      totalCost += Number(it.cost_price || 0) * Number(it.quantity || 1);
    });
  });
  const grossProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : "0";

  // Category breakdown
  const categoryRevenueMap: Record<string, { name: string; revenue: number; itemsSold: number }> = {};
  sales.forEach((s) => {
    s.items?.forEach((it) => {
      const catName = it.product?.category?.name || "General";
      if (!categoryRevenueMap[catName]) {
        categoryRevenueMap[catName] = { name: catName, revenue: 0, itemsSold: 0 };
      }
      categoryRevenueMap[catName].revenue += Number(it.unit_price) * Number(it.quantity);
      categoryRevenueMap[catName].itemsSold += Number(it.quantity);
    });
  });

  const categoryBreakdown = Object.values(categoryRevenueMap).sort((a, b) => b.revenue - a.revenue);

  return (
    <MainLayout
      title="Financial Reports & P&L Analysis"
      subtitle="Comprehensive revenue statements, cost margins, and category velocity"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Date Filter & Export Bar */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-surface-border shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Period:</span>
            {["all", "today", "week", "month"].map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-all ${
                  dateRange === r
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {r === "all" ? "All Time" : r}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="text-xs font-semibold gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export P&L Report
          </Button>
        </div>

        {/* P&L KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5 space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Gross Revenue
              </span>
              <div className="text-2xl font-bold text-gray-900 tabular-nums">
                {formatCurrency(totalRevenue)}
              </div>
              <div className="text-xs text-gray-500">{sales.length} completed transactions</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Cost of Goods Sold (COGS)
              </span>
              <div className="text-2xl font-bold text-gray-900 tabular-nums">
                {formatCurrency(totalCost)}
              </div>
              <div className="text-xs text-gray-500">Inventory cost basis</div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/20">
            <CardContent className="p-5 space-y-1">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                Gross Profit
              </span>
              <div className="text-2xl font-bold text-emerald-700 tabular-nums">
                {formatCurrency(grossProfit)}
              </div>
              <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> {profitMargin}% margin
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Active Catalog Items
              </span>
              <div className="text-2xl font-bold text-gray-900 tabular-nums">
                {products.length}
              </div>
              <div className="text-xs text-gray-500">Live SKUs</div>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown & Sales Velocity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-600" />
                Category Turnover & Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3">Category</th>
                      <th className="px-6 py-3 text-center">Items Sold</th>
                      <th className="px-6 py-3 text-right">Revenue</th>
                      <th className="px-6 py-3 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {categoryBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-6 text-center text-gray-400 text-xs">
                          No category turnover recorded yet.
                        </td>
                      </tr>
                    ) : (
                      categoryBreakdown.map((cat, idx) => {
                        const share = totalRevenue > 0 ? ((cat.revenue / totalRevenue) * 100).toFixed(1) : 0;
                        return (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="px-6 py-3.5 font-bold text-xs text-gray-900">
                              {cat.name}
                            </td>
                            <td className="px-6 py-3.5 text-center text-xs font-semibold text-gray-700">
                              {cat.itemsSold}
                            </td>
                            <td className="px-6 py-3.5 text-right font-bold text-xs text-brand-700 tabular-nums">
                              {formatCurrency(cat.revenue)}
                            </td>
                            <td className="px-6 py-3.5 text-right text-xs text-gray-500 tabular-nums">
                              {share}%
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

          {/* Tax / GST Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-gray-900">
                GST / Tax Summary Report
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Taxable Turnover</span>
                <span className="font-bold text-gray-900 tabular-nums">{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Output CGST (9%)</span>
                <span className="font-bold text-gray-900 tabular-nums">{formatCurrency(totalRevenue * 0.09)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Output SGST (9%)</span>
                <span className="font-bold text-gray-900 tabular-nums">{formatCurrency(totalRevenue * 0.09)}</span>
              </div>
              <div className="flex justify-between py-2 font-bold text-sm text-gray-900 pt-2">
                <span>Total Tax Collected</span>
                <span className="text-brand-700 tabular-nums">{formatCurrency(totalRevenue * 0.18)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
