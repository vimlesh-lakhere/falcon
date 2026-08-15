import { supabase } from "@/lib/supabase/client";
import { ProductRequest } from "@/types/database";

export const requestsRepository = {
  async getAll(shopId: string, status?: string) {
    let query = supabase
      .from("product_requests")
      .select("*, customer:customers(*), product:products(*)")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as ProductRequest[]) || [];
  },

  async create(request: Partial<ProductRequest>) {
    const { data, error } = await supabase
      .from("product_requests")
      .insert([request])
      .select("*, customer:customers(*), product:products(*)")
      .single();

    if (error) throw error;
    return data as ProductRequest;
  },

  async updateStatus(id: string, status: ProductRequest["status"], notes?: string) {
    const updatePayload: any = { status };
    if (notes !== undefined) updatePayload.notes = notes;

    const { data, error } = await supabase
      .from("product_requests")
      .update(updatePayload)
      .eq("id", id)
      .select("*, customer:customers(*), product:products(*)")
      .single();

    if (error) throw error;
    return data as ProductRequest;
  }
};
