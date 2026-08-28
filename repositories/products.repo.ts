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

  async updateStock(id: string, newStock: number, reason: string = "Stock adjustment", shopId?: string) {
    const currentProd = await this.getById(id);
    const prevStock = Number(currentProd.current_stock) || 0;
    const delta = newStock - prevStock;

    const { data, error } = await supabase
      .from("products")
      .update({ current_stock: Math.max(0, newStock) })
      .eq("id", id)
      .select("*, category:categories(*), supplier:suppliers(*)")
      .single();

    if (error) throw error;

    // Log movement in stock_movements ledger if delta != 0
    if (delta !== 0 && (shopId || currentProd.shop_id)) {
      try {
        await supabase.from("stock_movements").insert([
          {
            shop_id: shopId || currentProd.shop_id,
            product_id: id,
            movement_type: delta > 0 ? "adjustment" : "adjustment",
            quantity_delta: delta,
            notes: `${reason} (${prevStock} -> ${newStock})`,
          },
        ]);
      } catch (logErr) {
        console.warn("Could not log stock movement:", logErr);
      }
    }

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

  async updateCategory(id: string, category: Partial<Category>) {
    const { data, error } = await supabase
      .from("categories")
      .update(category)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Category;
  },

  async deleteCategory(id: string) {
    // Unassign products from this category first so they don't break
    await supabase.from("products").update({ category_id: null }).eq("category_id", id);
    const { error } = await supabase.from("categories").update({ is_active: false }).eq("id", id);
    if (error) throw error;
    return true;
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
