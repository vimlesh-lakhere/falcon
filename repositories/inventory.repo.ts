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
    movement_type: 'adjustment' | 'damage' | 'return_in' | 'return_out';
    notes: string;
  }) {
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

    if (error) throw error;
    return data as StockMovement;
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
  }
};
