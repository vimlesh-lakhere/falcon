import { supabase } from "@/lib/supabase/client";
import { Supplier, SupplierPayment } from "@/types/database";

export const suppliersRepository = {
  async getAll(shopId: string, search?: string) {
    let query = supabase
      .from("suppliers")
      .select("*")
      .eq("shop_id", shopId)
      .order("name", { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as Supplier[]) || [];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as Supplier;
  },

  async create(supplier: Partial<Supplier>) {
    const { data, error } = await supabase
      .from("suppliers")
      .insert([supplier])
      .select()
      .single();

    if (error) throw error;
    return data as Supplier;
  },

  async update(id: string, supplier: Partial<Supplier>) {
    const { data, error } = await supabase
      .from("suppliers")
      .update(supplier)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Supplier;
  },

  async recordPayment(payload: {
    shop_id: string;
    supplier_id: string;
    amount: number;
    method: string;
    reference_no?: string;
    notes?: string;
  }) {
    const { data, error } = await supabase
      .from("supplier_payments")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data as SupplierPayment;
  }
};
