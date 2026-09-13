import { supabase } from "@/lib/supabase/client";
import { StockMovement, Product } from "@/types/database";

export const inventoryRepository = {
  async getMovements(shopId: string, limit = 50) {
    const { data, error } = await supabase
      .from("stock_movements")
      .select("*, product:products(*)")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as StockMovement[]) || [];
  },

  async adjustStock(payload: {
    shop_id: string;
    product_id: string;
    variant_id?: string | null;
    quantity_delta: number;
    movement_type: "adjustment" | "damage" | "return_in" | "return_out" | "purchase_receipt" | "sale";
    notes: string;
  }) {
    if (payload.quantity_delta === 0) {
      throw new Error("Quantity delta cannot be zero.");
    }

    // Insert into stock_movements ledger.
    // The database trigger 'trg_stock_movement_recompute' automatically updates
    // products.current_stock = current_stock + quantity_delta upon insertion.
    // DO NOT manually update products.current_stock beforehand to avoid double delta!
    const { data, error } = await supabase
      .from("stock_movements")
      .insert([
        {
          shop_id: payload.shop_id,
          product_id: payload.product_id,
          variant_id: payload.variant_id || null,
          movement_type: payload.movement_type,
          quantity_delta: payload.quantity_delta,
          notes: payload.notes,
        },
      ])
      .select("*, product:products(*)")
      .single();

    if (error) {
      console.warn("Stock movement insert failed, falling back to direct update:", error);
      // Fallback only if stock_movements table or trigger failed
      const { data: prod } = await supabase
        .from("products")
        .select("current_stock")
        .eq("id", payload.product_id)
        .single();
      const currentStock = Number(prod?.current_stock) || 0;
      const newStock = Math.max(0, currentStock + Number(payload.quantity_delta));
      await supabase
        .from("products")
        .update({ current_stock: newStock })
        .eq("id", payload.product_id);
      throw error;
    }

    return data as StockMovement;
  },

  async setExactStock(payload: {
    shop_id: string;
    product_id: string;
    new_stock: number;
    notes?: string;
  }) {
    // 1. Fetch current product stock
    const { data: prod, error: prodErr } = await supabase
      .from("products")
      .select("current_stock")
      .eq("id", payload.product_id)
      .single();

    if (prodErr) throw prodErr;

    const currentStock = Number(prod?.current_stock) || 0;
    const targetStock = Math.max(0, Number(payload.new_stock));
    const delta = targetStock - currentStock;

    if (delta === 0) return targetStock;

    // 2. Insert into stock_movements ledger.
    // The database trigger will recompute: current_stock = current_stock + delta = targetStock
    const { error: moveErr } = await supabase.from("stock_movements").insert([
      {
        shop_id: payload.shop_id,
        product_id: payload.product_id,
        movement_type: "adjustment",
        quantity_delta: delta,
        notes: payload.notes || `Stock audit reset: ${currentStock} -> ${targetStock}`,
      },
    ]);

    if (moveErr) {
      console.warn("Could not insert stock movement for exact reset, applying direct fallback:", moveErr);
      await supabase
        .from("products")
        .update({ current_stock: targetStock })
        .eq("id", payload.product_id);
    }

    return targetStock;
  },

  async getLowStockProducts(shopId: string) {
    const { data, error } = await supabase
      .from("products")
      .select("*, category:categories(*)")
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .order("current_stock", { ascending: true });

    if (error) throw error;
    const products = (data as Product[]) || [];
    return products.filter((p) => Number(p.current_stock) <= Number(p.minimum_stock));
  },
};
