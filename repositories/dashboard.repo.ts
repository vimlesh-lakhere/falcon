import { supabase } from "@/lib/supabase/client";
import { Sale, Product, ProductRequest, PurchaseOrder } from "@/types/database";

export interface DashboardMetrics {
  todaySalesTotal: number;
  todaySalesCount: number;
  todayProfit: number;
  todayReturnsTotal: number;
  lowStockCount: number;
  pendingRequestsCount: number;
  pendingPurchasesCount: number;
  topProducts: {
    product: Product;
    totalQuantity: number;
    totalRevenue: number;
  }[];
  recentSales: Sale[];
}

export const dashboardRepository = {
  async getMetrics(shopId: string): Promise<DashboardMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    // These five reads are independent, so fire them together instead of one after another
    // (same number of Supabase calls, but the dashboard opens far faster).
    const [
      { data: salesData },
      { data: productsData },
      { count: pendingRequestsCount },
      { count: pendingPurchasesCount },
      { data: recentSalesData },
      { data: returnsData },
    ] = await Promise.all([
      // 1. Today's sales (for totals, profit and top products)
      supabase
        .from("sales")
        .select("*, items:sale_items(*, product:products(*)), customer:customers(*)")
        .eq("shop_id", shopId)
        .gte("created_at", todayIso)
        .order("created_at", { ascending: false }),
      // 2. Low-stock check (light columns only)
      supabase
        .from("products")
        .select("id, current_stock, minimum_stock")
        .eq("shop_id", shopId)
        .eq("is_active", true),
      // 3. Pending requests count
      supabase
        .from("product_requests")
        .select("*", { count: "exact", head: true })
        .eq("shop_id", shopId)
        .in("status", ["requested", "searching", "ordered_from_supplier"]),
      // 4. Pending purchases count
      supabase
        .from("purchase_orders")
        .select("*", { count: "exact", head: true })
        .eq("shop_id", shopId)
        .in("status", ["draft", "partially_received"]),
      // 5. Recent sales (all-time, latest 6)
      supabase
        .from("sales")
        .select("*, customer:customers(*), items:sale_items(*)")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })
        .limit(6),
      // 6. Today's returns, with the ORIGINAL sale date, to net off sales & profit
      supabase
        .from("returns")
        .select("total_refund, created_at, sale:sales(created_at), items:return_items(quantity, sale_item:sale_items(unit_price, cost_price))")
        .eq("shop_id", shopId)
        .gte("created_at", todayIso),
    ]);

    const todaySales = (salesData as Sale[]) || [];
    const grossSalesTotal = todaySales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const todaySalesCount = todaySales.length;

    let grossProfit = 0;
    todaySales.forEach((sale) => {
      sale.items?.forEach((item) => {
        const rev = Number(item.unit_price) * Number(item.quantity);
        const cost = Number(item.cost_price || 0) * Number(item.quantity);
        grossProfit += rev - cost;
      });
    });

    // Net returns off today's sales/profit — but ONLY returns whose original sale was ALSO today.
    // Refunding a bill from a previous day is a cash return, not a reduction of today's selling, so
    // it must not push "Today's Sales" negative.
    const todayMs = today.getTime();
    let todayReturnsTotal = 0;
    let todayReturnsProfit = 0;
    ((returnsData as any[]) || []).forEach((r) => {
      const saleDate = r.sale?.created_at;
      if (!saleDate || new Date(saleDate).getTime() < todayMs) return;
      todayReturnsTotal += Number(r.total_refund || 0);
      (r.items || []).forEach((ri: any) => {
        const up = Number(ri.sale_item?.unit_price || 0);
        const cp = Number(ri.sale_item?.cost_price || 0);
        todayReturnsProfit += (up - cp) * Number(ri.quantity || 0);
      });
    });

    const todaySalesTotal = grossSalesTotal - todayReturnsTotal;
    const todayProfit = grossProfit - todayReturnsProfit;

    const products = productsData || [];
    const lowStockCount = products.filter((p) => Number(p.current_stock) <= Number(p.minimum_stock)).length;

    // Top products aggregation
    const productStats: Record<string, { product: Product; totalQuantity: number; totalRevenue: number }> = {};
    todaySales.forEach((sale) => {
      sale.items?.forEach((it) => {
        if (it.product) {
          if (!productStats[it.product.id]) {
            productStats[it.product.id] = {
              product: it.product,
              totalQuantity: 0,
              totalRevenue: 0,
            };
          }
          productStats[it.product.id].totalQuantity += Number(it.quantity);
          productStats[it.product.id].totalRevenue += Number(it.unit_price) * Number(it.quantity);
        }
      });
    });

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    return {
      todaySalesTotal,
      todaySalesCount,
      todayProfit,
      todayReturnsTotal,
      lowStockCount,
      pendingRequestsCount: pendingRequestsCount || 0,
      pendingPurchasesCount: pendingPurchasesCount || 0,
      topProducts,
      recentSales: (recentSalesData as Sale[]) || [],
    };
  }
};
