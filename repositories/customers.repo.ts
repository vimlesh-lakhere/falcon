import { supabase } from "@/lib/supabase/client";
import { Customer, CustomerPrice } from "@/types/database";

export const customersRepository = {
  async getAll(shopId: string, search?: string) {
    let query = supabase
      .from("customers")
      .select("*")
      .eq("shop_id", shopId)
      .order("name", { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as Customer[]) || [];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as Customer;
  },

  async create(customer: Partial<Customer>) {
    const { data, error } = await supabase
      .from("customers")
      .insert([customer])
      .select()
      .single();

    if (error) throw error;
    return data as Customer;
  },

  async update(id: string, customer: Partial<Customer>) {
    const { data, error } = await supabase
      .from("customers")
      .update(customer)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Customer;
  },

  async getCustomerPrices(customerId: string) {
    const { data, error } = await supabase
      .from("customer_prices")
      .select("*, product:products(*)")
      .eq("customer_id", customerId);

    if (error) throw error;
    return data || [];
  },

  async setCustomerPrice(customerId: string, productId: string, price: number) {
    const { data, error } = await supabase
      .from("customer_prices")
      .upsert({
        customer_id: customerId,
        product_id: productId,
        price,
      })
      .select()
      .single();

    if (error) throw error;
    return data as CustomerPrice;
  },

  /**
   * Fetches detailed lifetime purchases, total spend, and exact gross profit earned from a specific customer
   */
  async getCustomerProfitAnalytics(customerId: string): Promise<{
    customer: Customer;
    totalBills: number;
    lifetimeSpend: number;
    lifetimeCost: number;
    lifetimeProfit: number;
    profitMarginPercent: number;
    averageOrderValue: number;
    lastPurchaseDate: string | null;
    sales: Array<{
      id: string;
      invoice_number: string;
      created_at: string;
      total_amount: number;
      subtotal: number;
      cost_amount: number;
      profit_amount: number;
      profit_margin: number;
      items_count: number;
      status: string;
      items: any[];
    }>;
  }> {
    const [customerRes, salesRes] = await Promise.all([
      supabase.from("customers").select("*").eq("id", customerId).single(),
      supabase
        .from("sales")
        .select("*, items:sale_items(*, product:products(purchase_price, name))")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false }),
    ]);

    if (customerRes.error) throw customerRes.error;
    const customer = customerRes.data as Customer;
    const rawSales = salesRes.data || [];

    let lifetimeSpend = 0;
    let lifetimeCost = 0;

    const formattedSales = rawSales.map((sale: any) => {
      const items = sale.items || [];
      const totalAmount = Number(sale.total_amount) || Number(sale.subtotal) || 0;
      const subtotal = Number(sale.subtotal) || totalAmount;

      const costAmount = items.reduce((sum: number, it: any) => {
        const itemCost = Number(it.cost_price) || Number(it.product?.purchase_price) || 0;
        return sum + itemCost * Number(it.quantity || 1);
      }, 0);

      const profitAmount = totalAmount - costAmount;
      const profitMargin = totalAmount > 0 ? (profitAmount / totalAmount) * 100 : 0;

      lifetimeSpend += totalAmount;
      lifetimeCost += costAmount;

      return {
        id: sale.id,
        invoice_number: sale.invoice_number,
        created_at: sale.created_at,
        total_amount: totalAmount,
        subtotal,
        cost_amount: costAmount,
        profit_amount: profitAmount,
        profit_margin: profitMargin,
        items_count: items.length,
        status: sale.status,
        items,
      };
    });

    const lifetimeProfit = lifetimeSpend - lifetimeCost;
    const profitMarginPercent = lifetimeSpend > 0 ? (lifetimeProfit / lifetimeSpend) * 100 : 0;
    const averageOrderValue = rawSales.length > 0 ? lifetimeSpend / rawSales.length : 0;
    const lastPurchaseDate = rawSales.length > 0 ? rawSales[0].created_at : null;

    return {
      customer,
      totalBills: rawSales.length,
      lifetimeSpend,
      lifetimeCost,
      lifetimeProfit,
      profitMarginPercent,
      averageOrderValue,
      lastPurchaseDate,
      sales: formattedSales,
    };
  },

  /**
   * Fetches all customers along with their lifetime spend and lifetime profit aggregations
   */
  async getAllWithProfitSummary(shopId: string, search?: string): Promise<Array<Customer & {
    totalBills: number;
    calculatedLifetimeSpend: number;
    calculatedLifetimeProfit: number;
    profitMarginPercent: number;
  }>> {
    const customers = await this.getAll(shopId, search);

    // Fetch all sales with items for this shop to aggregate per-customer profit
    const { data: salesData } = await supabase
      .from("sales")
      .select("id, customer_id, total_amount, subtotal, items:sale_items(quantity, cost_price, product:products(purchase_price))")
      .eq("shop_id", shopId);

    const customerSalesMap: Record<string, { totalSpend: number; totalCost: number; billCount: number }> = {};

    (salesData || []).forEach((sale: any) => {
      if (!sale.customer_id) return;
      if (!customerSalesMap[sale.customer_id]) {
        customerSalesMap[sale.customer_id] = { totalSpend: 0, totalCost: 0, billCount: 0 };
      }

      const total = Number(sale.total_amount) || Number(sale.subtotal) || 0;
      const cost = (sale.items || []).reduce((sum: number, it: any) => {
        const itemCost = Number(it.cost_price) || Number(it.product?.purchase_price) || 0;
        return sum + itemCost * Number(it.quantity || 1);
      }, 0);

      customerSalesMap[sale.customer_id].totalSpend += total;
      customerSalesMap[sale.customer_id].totalCost += cost;
      customerSalesMap[sale.customer_id].billCount += 1;
    });

    return customers.map((c) => {
      const stats = customerSalesMap[c.id] || { totalSpend: Number(c.total_spend) || 0, totalCost: 0, billCount: 0 };
      const lifetimeSpend = stats.totalSpend;
      const lifetimeProfit = stats.totalSpend - stats.totalCost;
      const profitMarginPercent = lifetimeSpend > 0 ? (lifetimeProfit / lifetimeSpend) * 100 : 0;

      return {
        ...c,
        totalBills: stats.billCount,
        calculatedLifetimeSpend: lifetimeSpend,
        calculatedLifetimeProfit: lifetimeProfit,
        profitMarginPercent,
      };
    });
  }
};
