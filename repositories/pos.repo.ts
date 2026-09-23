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
    unit_name?: string;
    unit_multiplier?: number;
    base_quantity?: number;
    is_price_overridden?: boolean;
  }[];
  payments: {
    method: 'cash' | 'upi' | 'card' | 'other';
    amount: number;
    reference_no?: string;
  }[];
  /** Extra amount the customer paid toward their PREVIOUS balance in this same bill. */
  khata_payment?: number;
  /** Method for that extra amount ('cash' | 'upi' | 'card'); defaults to cash. */
  khata_method?: string;
}

export interface UpdateSalePayload {
  sale_id: string;
  shop_id: string;
  customer_id?: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  items: {
    id?: string;
    product_id: string;
    variant_id?: string | null;
    quantity: number;
    unit_price: number;
    cost_price: number;
    unit_name?: string;
    unit_multiplier?: number;
    base_quantity?: number;
    is_price_overridden?: boolean;
  }[];
  payments?: {
    method: 'cash' | 'upi' | 'card' | 'other';
    amount: number;
    reference_no?: string;
  }[];
}

export const posRepository = {
  async checkout(payload: CheckoutPayload): Promise<Sale> {
    // Preferred path: one atomic Postgres transaction (sale + items + payments + stock + balance)
    // via the pos_checkout() function. This is a single round-trip, cannot leave an orphan sale or
    // un-deducted stock, and keeps Supabase usage low. Falls back to the legacy multi-call path if
    // the function is not installed yet (migration 012), so billing never breaks mid-rollout.
    const { data: rpcData, error: rpcError } = await supabase.rpc("pos_checkout", {
      payload: payload as unknown as Record<string, unknown>,
    });

    if (!rpcError && rpcData && (rpcData as any).id) {
      return await this.getSaleById((rpcData as any).id as string);
    }

    const functionMissing =
      !!rpcError &&
      ((rpcError as any).code === "42883" ||
        (rpcError as any).code === "PGRST202" ||
        /pos_checkout|could not find the function|does not exist/i.test(rpcError.message || ""));

    // A real failure inside the transaction rolled everything back — surface it, do NOT re-run the
    // legacy path (that would risk a double write). Only fall back when the function is absent.
    if (rpcError && !functionMissing) {
      throw rpcError;
    }

    return await this.legacyCheckout(payload);
  },

  async legacyCheckout(payload: CheckoutPayload): Promise<Sale> {
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

    // 3. Insert payments if any were tendered at counter
    const payments = (payload.payments || []).map((p) => ({
      sale_id: sale.id,
      method: p.method,
      amount: p.amount,
      reference_no: p.reference_no || null,
    }));

    if (payments.length > 0) {
      const { error: paymentError } = await supabase.from("payments").insert(payments);
      if (paymentError) throw paymentError;
    }

    // 3b. Update customer's outstanding_balance: add this bill's udhaar, and subtract any extra the
    //     customer paid toward their previous balance (recorded as a customer_payments row).
    const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const dueAmount = Math.max(0, Number(payload.total_amount) - totalPaid);
    const khataPayment = Math.max(0, Number(payload.khata_payment) || 0);

    if ((dueAmount > 0 || khataPayment > 0) && payload.customer_id) {
      if (khataPayment > 0) {
        await supabase.from("customer_payments").insert([
          {
            shop_id: payload.shop_id,
            customer_id: payload.customer_id,
            amount: khataPayment,
            payment_method: (payload.khata_method || "cash").toLowerCase(),
            notes: `POS ${invoice_number} — extra toward previous balance`,
            payment_date: new Date().toISOString(),
          },
        ]);
      }

      const { data: custData } = await supabase
        .from("customers")
        .select("outstanding_balance")
        .eq("id", payload.customer_id)
        .single();

      const prevBal = Number(custData?.outstanding_balance) || 0;
      await supabase
        .from("customers")
        .update({ outstanding_balance: Math.max(0, prevBal + dueAmount - khataPayment) })
        .eq("id", payload.customer_id);
    }

    // 4. Insert stock movements for each item (triggers automatically deduct product current_stock in base units)
    const stockMovements = payload.items.map((item) => {
      const deductionQty = item.base_quantity || (item.quantity * (item.unit_multiplier || 1));
      return {
        shop_id: payload.shop_id,
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        movement_type: "sale",
        quantity_delta: -Math.abs(deductionQty),
        reference_table: "sales",
        reference_id: sale.id,
        notes: `POS Sale: ${invoice_number}${item.unit_name ? ` (${item.quantity} ${item.unit_name})` : ""}`,
      };
    });

    const { error: stockError } = await supabase.from("stock_movements").insert(stockMovements);
    if (stockError) {
      // Do not fail silently: without this insert the sale exists but stock was never deducted,
      // which desyncs inventory. Surface it loudly so it can be reconciled.
      console.error("POS checkout: stock movement insert FAILED (stock not deducted)", stockError);
    }
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

  async updateSale(payload: UpdateSalePayload): Promise<Sale> {
    // 1. Fetch existing sale and items for stock reversal
    const { data: existingSale, error: fetchOldError } = await supabase
      .from("sales")
      .select("*, items:sale_items(*)")
      .eq("id", payload.sale_id)
      .single();

    if (fetchOldError) throw fetchOldError;

    // 2. Reverse previous item stock deductions (use exact previous stock_movements to avoid losing multi-unit quantities)
    const { data: previousMovements } = await supabase
      .from("stock_movements")
      .select("product_id, variant_id, quantity_delta")
      .eq("reference_table", "sales")
      .eq("reference_id", payload.sale_id)
      .eq("movement_type", "sale");

    if (previousMovements && previousMovements.length > 0) {
      const returnMovements = previousMovements.map((mov: any) => ({
        shop_id: payload.shop_id,
        product_id: mov.product_id,
        variant_id: mov.variant_id || null,
        movement_type: "adjustment",
        quantity_delta: Math.abs(mov.quantity_delta),
        reference_table: "sales",
        reference_id: payload.sale_id,
        notes: `Reversal for Edit Invoice: ${existingSale.invoice_number}`,
      }));
      await supabase.from("stock_movements").insert(returnMovements);
    } else if (existingSale?.items && existingSale.items.length > 0) {
      // Fallback: fetch product unit conversion factor if previous movements were missing
      const returnMovements = await Promise.all(
        existingSale.items.map(async (it: any) => {
          const { data: prod } = await supabase
            .from("products")
            .select("unit:units(conversion_factor)")
            .eq("id", it.product_id)
            .single();
          const factor = Number((prod as any)?.unit?.conversion_factor) || 1;
          const baseQty = Math.abs(it.quantity) * factor;
          return {
            shop_id: payload.shop_id,
            product_id: it.product_id,
            variant_id: it.variant_id || null,
            movement_type: "adjustment",
            quantity_delta: baseQty,
            reference_table: "sales",
            reference_id: payload.sale_id,
            notes: `Reversal for Edit Invoice: ${existingSale.invoice_number}`,
          };
        })
      );
      await supabase.from("stock_movements").insert(returnMovements);
    }

    // 3. Update sale header
    const { error: saleUpdateError } = await supabase
      .from("sales")
      .update({
        customer_id: payload.customer_id || null,
        subtotal: payload.subtotal,
        discount_amount: payload.discount_amount,
        tax_amount: payload.tax_amount,
        total_amount: payload.total_amount,
        notes: payload.notes || null,
      })
      .eq("id", payload.sale_id);

    if (saleUpdateError) throw saleUpdateError;

    // 4. Replace sale items (delete old, insert new)
    await supabase.from("sale_items").delete().eq("sale_id", payload.sale_id);

    const newSaleItems = payload.items.map((item) => ({
      sale_id: payload.sale_id,
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      cost_price: item.cost_price,
      is_price_overridden: item.is_price_overridden || false,
    }));

    const { error: itemsInsertError } = await supabase.from("sale_items").insert(newSaleItems);
    if (itemsInsertError) throw itemsInsertError;

    // 5. Insert new stock movements for revised items
    const newStockMovements = payload.items.map((item) => {
      const deductionQty = item.base_quantity || (item.quantity * (item.unit_multiplier || 1));
      return {
        shop_id: payload.shop_id,
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        movement_type: "sale",
        quantity_delta: -Math.abs(deductionQty),
        reference_table: "sales",
        reference_id: payload.sale_id,
        notes: `Updated POS Sale: ${existingSale.invoice_number}${item.unit_name ? ` (${item.quantity} ${item.unit_name})` : ""}`,
      };
    });

    await supabase.from("stock_movements").insert(newStockMovements);

    // 6. Update payment if provided
    if (payload.payments && payload.payments.length > 0) {
      await supabase.from("payments").delete().eq("sale_id", payload.sale_id);
      const newPayments = payload.payments.map((p) => ({
        sale_id: payload.sale_id,
        method: p.method,
        amount: p.amount,
        reference_no: p.reference_no || null,
      }));
      await supabase.from("payments").insert(newPayments);
    }

    // 7. Return refreshed sale
    return await this.getSaleById(payload.sale_id);
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
