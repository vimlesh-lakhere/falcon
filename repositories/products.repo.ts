import { supabase } from "@/lib/supabase/client";
import { Product, Category, Unit, Supplier } from "@/types/database";

export const productsRepository = {
  async getAll(shopId: string, options?: { categoryId?: string; search?: string; isActive?: boolean }) {
    let query = supabase
      .from("products")
      .select("*, category:categories(*), supplier:suppliers(*)")
      .eq("shop_id", shopId)
      .order("name", { ascending: true });

    if (options?.categoryId) {
      query = query.eq("category_id", options.categoryId);
    }
    if (options?.isActive !== undefined) {
      query = query.eq("is_active", options.isActive);
    }
    if (options?.search) {
      query = query.or(`name.ilike.%${options.search}%,sku.ilike.%${options.search}%,barcode.ilike.%${options.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as Product[]) || [];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("products")
      .select("*, category:categories(*), supplier:suppliers(*)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as Product;
  },

  async create(product: Partial<Product>) {
    const { data, error } = await supabase
      .from("products")
      .insert([product])
      .select("*, category:categories(*), supplier:suppliers(*)")
      .single();
    if (error) throw error;
    return data as Product;
  },

  async update(id: string, product: Partial<Product>) {
    const { data, error } = await supabase
      .from("products")
      .update(product)
      .eq("id", id)
      .select("*, category:categories(*), supplier:suppliers(*)")
      .single();
    if (error) throw error;
    return data as Product;
  },

  async delete(id: string) {
    const { error } = await supabase.from("products").update({ is_active: false }).eq("id", id);
    if (error) throw error;
    return true;
  },

  async getCategories(shopId: string) {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    return (data as Category[]) || [];
  },

  async createCategory(category: Partial<Category>) {
    const { data, error } = await supabase
      .from("categories")
      .insert([category])
      .select()
      .single();
    if (error) throw error;
    return data as Category;
  },

  async getUnits(shopId: string) {
    const { data, error } = await supabase
      .from("units")
      .select("*")
      .eq("shop_id", shopId)
      .order("name");
    if (error) throw error;
    return (data as Unit[]) || [];
  }
};
