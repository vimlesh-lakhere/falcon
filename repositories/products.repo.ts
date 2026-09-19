import { supabase } from "@/lib/supabase/client";
import { uploadProductImageCompound } from "@/lib/supabase/storage";
import { Product, Category, Unit, Supplier } from "@/types/database";
import { capitalizeFirstLetter } from "@/lib/utils";
import {
  attachOnlineConfigToDescription,
  getProductOnlineConfig,
  stripOnlineConfigFromDescription,
} from "@/lib/product-online";

export const productsRepository = {
  async getAll(shopId: string, options?: { categoryId?: string; search?: string; isActive?: boolean }) {
    let query = supabase
      .from("products")
      .select("*, category:categories(*), supplier:suppliers(*), unit:units(*)")
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
      .select("*, category:categories(*), supplier:suppliers(*), unit:units(*)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as Product;
  },

  async create(product: Partial<Product>) {
    const isOnline = product.is_online !== undefined ? product.is_online : true;
    const onlinePrice = product.online_price !== undefined ? product.online_price : null;

    // Automatically convert any base64 image data to Supabase Storage bucket WebP file
    let cleanImageUrl = product.image_url;
    if (cleanImageUrl && cleanImageUrl.includes("data:image/")) {
      try {
        cleanImageUrl = await uploadProductImageCompound(cleanImageUrl, product.sku || product.barcode || "prod");
      } catch (uploadErr) {
        console.warn("Storage upload notice during product create:", uploadErr);
      }
    }

    // Always embed online config in description as a guaranteed persistence fallback
    const originalDesc = product.description || "";
    const descWithOnline = attachOnlineConfigToDescription(originalDesc, isOnline, onlinePrice);

    const sanitizedProduct: any = {
      ...product,
      image_url: cleanImageUrl,
      description: descWithOnline,
      ...(product.name ? { name: capitalizeFirstLetter(product.name.trim()) } : {}),
      ...(product.brand ? { brand: capitalizeFirstLetter(product.brand.trim()) } : {}),
    };

    try {
      const { data, error } = await supabase
        .from("products")
        .insert([sanitizedProduct])
        .select("*, category:categories(*), supplier:suppliers(*)")
        .single();

      if (!error && data) {
        return { ...(data as Product), is_online: isOnline, online_price: onlinePrice };
      }
      if (error && error.message.includes("is_online")) {
        throw error;
      }
      if (error) throw error;
      return data as Product;
    } catch (err: any) {
      // If table doesn't have is_online / online_price columns yet, strip them and retry
      if (err?.message?.includes("is_online") || err?.message?.includes("online_price")) {
        delete sanitizedProduct.is_online;
        delete sanitizedProduct.online_price;
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("products")
          .insert([sanitizedProduct])
          .select("*, category:categories(*), supplier:suppliers(*)")
          .single();
        if (fallbackError) throw fallbackError;
        return { ...(fallbackData as Product), is_online: isOnline, online_price: onlinePrice };
      }
      throw err;
    }
  },

  async update(id: string, product: Partial<Product>) {
    const isOnline = product.is_online;
    const onlinePrice = product.online_price;

    let updatedDescription = product.description;
    if (isOnline !== undefined || onlinePrice !== undefined) {
      const baseDesc = product.description !== undefined ? (product.description || "") : "";
      const effectiveOnline = isOnline !== undefined ? isOnline : true;
      updatedDescription = attachOnlineConfigToDescription(baseDesc, effectiveOnline, onlinePrice);
    }

    // Automatically convert any base64 image data to Supabase Storage bucket WebP file
    let cleanImageUrl = product.image_url;
    if (cleanImageUrl && cleanImageUrl.includes("data:image/")) {
      try {
        cleanImageUrl = await uploadProductImageCompound(cleanImageUrl, product.sku || product.barcode || id);
      } catch (uploadErr) {
        console.warn("Storage upload notice during product update:", uploadErr);
      }
    }

    const sanitizedProduct: any = {
      ...product,
      ...(cleanImageUrl !== undefined ? { image_url: cleanImageUrl } : {}),
      ...(updatedDescription !== undefined ? { description: updatedDescription } : {}),
      ...(product.name ? { name: capitalizeFirstLetter(product.name.trim()) } : {}),
      ...(product.brand ? { brand: capitalizeFirstLetter(product.brand.trim()) } : {}),
    };

    try {
      const { data, error } = await supabase
        .from("products")
        .update(sanitizedProduct)
        .eq("id", id)
        .select("*, category:categories(*), supplier:suppliers(*)")
        .single();

      if (!error && data) {
        return {
          ...(data as Product),
          is_online: isOnline !== undefined ? isOnline : (data as Product).is_online,
          online_price: onlinePrice !== undefined ? onlinePrice : (data as Product).online_price,
        };
      }
      if (error && (error.message.includes("is_online") || error.message.includes("online_price"))) {
        throw error;
      }
      if (error) throw error;
      return data as Product;
    } catch (err: any) {
      if (err?.message?.includes("is_online") || err?.message?.includes("online_price")) {
        delete sanitizedProduct.is_online;
        delete sanitizedProduct.online_price;
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("products")
          .update(sanitizedProduct)
          .eq("id", id)
          .select("*, category:categories(*), supplier:suppliers(*)")
          .single();
        if (fallbackError) throw fallbackError;
        return {
          ...(fallbackData as Product),
          is_online: isOnline !== undefined ? isOnline : true,
          online_price: onlinePrice !== undefined ? onlinePrice : null,
        };
      }
      throw err;
    }
  },

  async toggleOnlineVisibility(id: string, isOnline: boolean, currentProduct?: Product | null) {
    const prod = currentProduct || await this.getById(id);
    const cfg = getProductOnlineConfig(prod);
    const updatedDesc = attachOnlineConfigToDescription(prod.description || "", isOnline, cfg.onlinePrice);

    try {
      const { data, error } = await supabase
        .from("products")
        .update({ is_online: isOnline, description: updatedDesc })
        .eq("id", id)
        .select("*, category:categories(*), supplier:suppliers(*)")
        .single();

      if (!error && data) {
        return { ...(data as Product), is_online: isOnline, online_price: cfg.onlinePrice };
      }
    } catch {}

    // Resilient fallback without direct is_online column
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("products")
      .update({ description: updatedDesc })
      .eq("id", id)
      .select("*, category:categories(*), supplier:suppliers(*)")
      .single();

    if (fallbackError) throw fallbackError;
    return { ...(fallbackData as Product), is_online: isOnline, online_price: cfg.onlinePrice };
  },

  async updateStock(id: string, newStock: number, reason: string = "Stock adjustment", shopId?: string) {
    const currentProd = await this.getById(id);
    const prevStock = Number(currentProd.current_stock) || 0;
    const targetStock = Math.max(0, newStock);
    const delta = targetStock - prevStock;

    if (delta === 0) {
      return currentProd;
    }

    const sId = shopId || currentProd.shop_id;

    // Supabase trigger 'trg_stock_movement_recompute' automatically adds NEW.quantity_delta
    // to products.current_stock on insert into stock_movements.
    // Therefore, we MUST NOT manually update products.current_stock beforehand!
    let movementSucceeded = false;
    if (sId) {
      try {
        const { error: moveErr } = await supabase.from("stock_movements").insert([
          {
            shop_id: sId,
            product_id: id,
            movement_type: "adjustment",
            quantity_delta: delta,
            notes: `${reason} (${prevStock} -> ${targetStock})`,
          },
        ]);
        if (!moveErr) {
          movementSucceeded = true;
        } else {
          console.warn("Stock movement insert failed, falling back to direct update:", moveErr);
        }
      } catch (logErr) {
        console.warn("Could not log stock movement:", logErr);
      }
    }

    // Direct update fallback only if stock_movements insert failed or shopId was missing
    if (!movementSucceeded) {
      const { data, error } = await supabase
        .from("products")
        .update({ current_stock: targetStock })
        .eq("id", id)
        .select("*, category:categories(*), supplier:suppliers(*)")
        .single();
      if (error) throw error;
      return data as Product;
    }

    // Re-fetch product to get the trigger-updated current_stock
    const updated = await this.getById(id);
    return updated;
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
  },

  async createUnit(unit: Partial<Unit>): Promise<Unit> {
    const { data, error } = await supabase
      .from("units")
      .insert([
        {
          shop_id: unit.shop_id,
          name: unit.name,
          base_unit_id: unit.base_unit_id || null,
          conversion_factor: unit.conversion_factor !== undefined ? Number(unit.conversion_factor) : 1,
        },
      ])
      .select("*")
      .single();
    if (error) throw error;
    return data as Unit;
  },

  async updateUnit(id: string, updates: Partial<Unit>): Promise<Unit> {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.conversion_factor !== undefined) payload.conversion_factor = Number(updates.conversion_factor);
    if (updates.base_unit_id !== undefined) payload.base_unit_id = updates.base_unit_id;

    const { data, error } = await supabase
      .from("units")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as Unit;
  },

  async deleteUnit(id: string): Promise<boolean> {
    // Unassign products from this unit first so they don't break
    await supabase.from("products").update({ unit_id: null }).eq("unit_id", id);
    const { error } = await supabase.from("units").delete().eq("id", id);
    if (error) throw error;
    return true;
  },

  async getOrCreateQuickSaleProduct(shopId: string): Promise<Product> {
    try {
      const { data: existing } = await supabase
        .from("products")
        .select("*, category:categories(*), supplier:suppliers(*), unit:units(*)")
        .eq("shop_id", shopId)
        .eq("sku", "QUICK-CALC-SALE")
        .maybeSingle();

      if (existing) return existing as Product;

      const { data: created } = await supabase
        .from("products")
        .insert([
          {
            shop_id: shopId,
            name: "Quick Counter Sale",
            sku: "QUICK-CALC-SALE",
            selling_price: 1,
            purchase_price: 0,
            current_stock: 99999,
            minimum_stock: 0,
            is_active: true,
          },
        ])
        .select("*, category:categories(*), supplier:suppliers(*)")
        .single();

      if (created) return created as Product;
    } catch (e) {
      console.warn("Using offline fallback quick product:", e);
    }

    return {
      id: "quick-calc-sale-virtual",
      shop_id: shopId,
      name: "Quick Item",
      sku: "QUICK-CALC-SALE",
      barcode: null,
      brand: null,
      category_id: null,
      supplier_id: null,
      unit_id: null,
      purchase_price: 0,
      selling_price: 1,
      wholesale_price: null,
      minimum_selling_price: null,
      current_stock: 99999,
      minimum_stock: 0,
      image_url: null,
      description: "Quick calculator sale item",
      is_active: true,
      created_at: new Date().toISOString(),
    };
  }
};
