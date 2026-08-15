import { supabase } from "@/lib/supabase/client";
import { PurchaseOrder, PurchaseOrderItem } from "@/types/database";

export interface CreatePOPayload {
  shop_id: string;
  supplier_id: string;
  order_number?: string;
  total_amount: number;
  discount_amount?: number;
  tax_amount?: number;
  notes?: string;
  items: {
    product_id: string;
    quantity_ordered: number;
    unit_price: number;
  }[];
}

export const purchasesRepository = {
  async getAll(shopId: string) {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*, supplier:suppliers(*), items:purchase_order_items(*, product:products(*))")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as PurchaseOrder[]) || [];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*, supplier:suppliers(*), items:purchase_order_items(*, product:products(*))")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as PurchaseOrder;
  },

  async create(payload: CreatePOPayload) {
    const timestamp = Date.now().toString().slice(-5);
    const order_number = payload.order_number || `PO-${new Date().getFullYear()}-${timestamp}`;

    const { data: poData, error: poError } = await supabase
      .from("purchase_orders")
      .insert([
        {
          shop_id: payload.shop_id,
          supplier_id: payload.supplier_id,
          order_number,
          total_amount: payload.total_amount,
          discount_amount: payload.discount_amount || 0,
          tax_amount: payload.tax_amount || 0,
          status: "draft",
          notes: payload.notes || null,
        },
      ])
      .select()
      .single();

    if (poError) throw poError;
    const po = poData as PurchaseOrder;

    const items = payload.items.map((it) => ({
      purchase_order_id: po.id,
      product_id: it.product_id,
      quantity_ordered: it.quantity_ordered,
      quantity_received: 0,
      unit_price: it.unit_price,
    }));

    const { error: itemsError } = await supabase.from("purchase_order_items").insert(items);
    if (itemsError) throw itemsError;

    return this.getById(po.id);
  },

  async receiveStock(payload: {
    shop_id: string;
    purchase_order_id: string;
    items: {
      item_id: string;
      product_id: string;
      quantity_received: number;
    }[];
  }) {
    // 1. Update received quantity on purchase order items
    for (const it of payload.items) {
      const { error: updateErr } = await supabase
        .from("purchase_order_items")
        .update({ quantity_received: it.quantity_received })
        .eq("id", it.item_id);

      if (updateErr) throw updateErr;

      // 2. Add stock movements for received goods
      if (it.quantity_received > 0) {
        await supabase.from("stock_movements").insert([
          {
            shop_id: payload.shop_id,
            product_id: it.product_id,
            movement_type: "purchase_receipt",
            quantity_delta: it.quantity_received,
            reference_table: "purchase_orders",
            reference_id: payload.purchase_order_id,
            notes: `Stock received for PO: ${payload.purchase_order_id}`,
          },
        ]);
      }
    }

    // 3. Mark PO as received
    await supabase
      .from("purchase_orders")
      .update({ status: "received" })
      .eq("id", payload.purchase_order_id);

    return this.getById(payload.purchase_order_id);
  }
};
