import { supabase } from "@/lib/supabase/client";
import { Sale, Product, ProductRequest, PurchaseOrder } from "@/types/database";

export interface DashboardMetrics {
  todaySalesTotal: number;
  todaySalesCount: number;
  todayProfit: number;
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
    ]);

    const todaySales = (salesData as Sale[]) || [];
    const todaySalesTotal = todaySales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const todaySalesCount = todaySales.length;

    let todayProfit = 0;
    todaySales.forEach((sale) => {
      sale.items?.forEach((item) => {
        const rev = Number(item.unit_price) * Number(item.quantity);
        const cost = Number(item.cost_price || 0) * Number(item.quantity);
        todayProfit += rev - cost;
      });
    });

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
      lowStockCount,
      pendingRequestsCount: pendingRequestsCount || 0,
      pendingPurchasesCount: pendingPurchasesCount || 0,
      topProducts,
      recentSales: (recentSalesData as Sale[]) || [],
    };
  }
};
