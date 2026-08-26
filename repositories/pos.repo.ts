import { supabase } from "@/lib/supabase/client";
import { Sale, SaleItem, Payment } from "@/types/database";

export interface CheckoutPayload {
  shop_id: string;
  customer_id?: string | null;
  cashier_id?: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  items: {
    product_id: string;
    variant_id?: string | null;
    quantity: number;
    unit_price: number;
    cost_price: number;
    is_price_overridden?: boolean;
  }[];
  payments: {
    method: 'cash' | 'upi' | 'card' | 'other';
    amount: number;
    reference_no?: string;
  }[];
}

export const posRepository = {
  async checkout(payload: CheckoutPayload): Promise<Sale> {
    // Generate invoice number
    const timestamp = Date.now().toString().slice(-6);
    const invoice_number = `INV-${new Date().getFullYear()}-${timestamp}`;

    // 1. Insert sale record
    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .insert([
        {
          shop_id: payload.shop_id,
          invoice_number,
          customer_id: payload.customer_id || null,
          cashier_id: payload.cashier_id || null,
          subtotal: payload.subtotal,
          discount_amount: payload.discount_amount,
          tax_amount: payload.tax_amount,
          total_amount: payload.total_amount,
          status: "completed",
          notes: payload.notes || null,
        },
      ])
      .select("*, customer:customers(*)")
      .single();

    if (saleError) throw saleError;
    const sale = saleData as Sale;

    // 2. Insert sale items
    const saleItems = payload.items.map((item) => ({
      sale_id: sale.id,
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      cost_price: item.cost_price,
      is_price_overridden: item.is_price_overridden || false,
    }));

    const { error: itemsError } = await supabase.from("sale_items").insert(saleItems);
    if (itemsError) throw itemsError;

    // 3. Insert payments
    const payments = payload.payments.map((p) => ({
      sale_id: sale.id,
      method: p.method,
      amount: p.amount,
      reference_no: p.reference_no || null,
    }));

    const { error: paymentError } = await supabase.from("payments").insert(payments);
    if (paymentError) throw paymentError;

    // 4. Insert stock movements for each item (triggers automatically deduct product current_stock)
    const stockMovements = payload.items.map((item) => ({
      shop_id: payload.shop_id,
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      movement_type: "sale",
      quantity_delta: -Math.abs(item.quantity),
      reference_table: "sales",
      reference_id: sale.id,
      notes: `POS Sale: ${invoice_number}`,
    }));

    const { error: stockError } = await supabase.from("stock_movements").insert(stockMovements);
    // 5. Fetch and return the fully joined sale object with products and customer
    const { data: fullSale, error: fetchError } = await supabase
      .from("sales")
      .select("*, customer:customers(*), items:sale_items(*, product:products(*)), payments:payments(*)")
      .eq("id", sale.id)
      .single();

    if (!fetchError && fullSale) {
      return fullSale as Sale;
    }

    // Fallback if select fails
    return {
      ...sale,
      customer: payload.customer_id ? { id: payload.customer_id, name: "Customer" } as any : undefined,
      items: saleItems as SaleItem[],
      payments: payments as Payment[],
    };
  },

  async getRecentSales(shopId: string, limit = 20): Promise<Sale[]> {
    const { data, error } = await supabase
      .from("sales")
      .select("*, customer:customers(*), items:sale_items(*, product:products(*)), payments:payments(*)")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as Sale[]) || [];
  },

  async getSaleById(id: string): Promise<Sale> {
    const { data, error } = await supabase
      .from("sales")
      .select("*, customer:customers(*), items:sale_items(*, product:products(*)), payments:payments(*)")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as Sale;
  }
};
