import { supabase } from "@/lib/supabase/client";

export interface ReturnLineInput {
  sale_item_id: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number; // in the sold unit (same granularity as the sale line)
  unit_price: number; // the sale line's unit price
}

export interface ProcessReturnPayload {
  shop_id: string;
  sale_id: string;
  customer_id?: string | null;
  processed_by?: string | null;
  reason?: string;
  refund_method: "cash" | "khata" | "upi";
  lines: ReturnLineInput[];
}

export interface ProcessReturnResult {
  returnId: string;
  totalRefund: number;
  newCustomerBalance: number | null;
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export const returnsRepository = {
  /**
   * Quantity already returned per sale_item for a sale, so the UI can cap what's still returnable.
   */
  async getAlreadyReturned(saleId: string): Promise<Record<string, number>> {
    const { data: rets } = await supabase.from("returns").select("id").eq("sale_id", saleId);
    const ids = (rets || []).map((r: any) => r.id);
    if (ids.length === 0) return {};
    const { data: items } = await supabase
      .from("return_items")
      .select("sale_item_id, quantity")
      .in("return_id", ids);
    const map: Record<string, number> = {};
    (items || []).forEach((it: any) => {
      map[it.sale_item_id] = (map[it.sale_item_id] || 0) + (Number(it.quantity) || 0);
    });
    return map;
  },

  /**
   * Records a return against a sale: writes returns + return_items, restores inventory via a
   * `return_in` stock movement (the DB trigger adds it back to product stock), and — for a khata
   * refund — reduces the customer's outstanding balance. Cash/UPI refunds are just recorded.
   *
   * Stock is restored in BASE PIECES. Because sale_items don't store the unit multiplier, we derive
   * the base-per-sold-unit for each product from the original sale's `sale` stock movements, so pack
   * (box/ladi) sales restore the correct number of pieces, not just the pack count.
   */
  async processReturn(payload: ProcessReturnPayload): Promise<ProcessReturnResult> {
    const lines = payload.lines.filter((l) => Number(l.quantity) > 0);
    if (lines.length === 0) throw new Error("Return ke liye kam se kam ek item chunna zaroori hai.");

    const totalRefund = round2(lines.reduce((s, l) => s + Number(l.quantity) * (Number(l.unit_price) || 0), 0));

    // 1. Return header
    const { data: retRow, error: retErr } = await supabase
      .from("returns")
      .insert([
        {
          shop_id: payload.shop_id,
          sale_id: payload.sale_id,
          processed_by: payload.processed_by || null,
          reason: payload.reason || null,
          refund_method: payload.refund_method,
          total_refund: totalRefund,
        },
      ])
      .select()
      .single();
    if (retErr) throw retErr;
    const returnId = retRow.id as string;

    // 2. Return line items
    const retItems = lines.map((l) => ({
      return_id: returnId,
      sale_item_id: l.sale_item_id,
      quantity: Number(l.quantity),
      refund_amount: round2(Number(l.quantity) * (Number(l.unit_price) || 0)),
    }));
    const { error: riErr } = await supabase.from("return_items").insert(retItems);
    if (riErr) throw riErr;

    // 3. Restore inventory (base pieces). Derive base-per-sold-unit from the sale's own movements.
    const [{ data: saleMoves }, { data: saleItems }] = await Promise.all([
      supabase
        .from("stock_movements")
        .select("product_id, quantity_delta")
        .eq("reference_table", "sales")
        .eq("reference_id", payload.sale_id)
        .eq("movement_type", "sale"),
      supabase.from("sale_items").select("product_id, quantity").eq("sale_id", payload.sale_id),
    ]);

    const baseDeducted: Record<string, number> = {};
    (saleMoves || []).forEach((m: any) => {
      baseDeducted[m.product_id] = (baseDeducted[m.product_id] || 0) + Math.abs(Number(m.quantity_delta) || 0);
    });
    const soldUnits: Record<string, number> = {};
    (saleItems || []).forEach((s: any) => {
      soldUnits[s.product_id] = (soldUnits[s.product_id] || 0) + (Number(s.quantity) || 0);
    });

    const moves = lines
      .map((l) => {
        const perUnit =
          soldUnits[l.product_id] > 0 && baseDeducted[l.product_id] > 0
            ? baseDeducted[l.product_id] / soldUnits[l.product_id]
            : 1;
        const restore = Math.round(Number(l.quantity) * perUnit);
        return {
          shop_id: payload.shop_id,
          product_id: l.product_id,
          variant_id: l.variant_id || null,
          movement_type: "return_in" as const,
          quantity_delta: Math.max(0, restore),
          reference_table: "returns",
          reference_id: returnId,
          notes: `Return${payload.reason ? ` — ${payload.reason}` : ""}`,
        };
      })
      .filter((m) => m.quantity_delta > 0);

    if (moves.length > 0) {
      const { error: smErr } = await supabase.from("stock_movements").insert(moves);
      if (smErr) throw smErr;
    }

    // 4. Refund: khata reduces the customer's due; cash/upi are handed back at the counter.
    let newCustomerBalance: number | null = null;
    if (payload.refund_method === "khata" && payload.customer_id) {
      const { data: cust } = await supabase
        .from("customers")
        .select("outstanding_balance")
        .eq("id", payload.customer_id)
        .single();
      const prev = Number(cust?.outstanding_balance) || 0;
      newCustomerBalance = Math.max(0, round2(prev - totalRefund));
      const { error: balErr } = await supabase
        .from("customers")
        .update({ outstanding_balance: newCustomerBalance })
        .eq("id", payload.customer_id);
      if (balErr) throw balErr;
    }

    return { returnId, totalRefund, newCustomerBalance };
  },
};
