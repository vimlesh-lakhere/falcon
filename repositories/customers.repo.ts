import { supabase } from "@/lib/supabase/client";
import { Customer, CustomerPrice } from "@/types/database";

export const customersRepository = {
  async getAll(shopId: string, search?: string) {
    let query = supabase
      .from("customers")
      .select("*")
      .eq("shop_id", shopId)
      .order("name", { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as Customer[]) || [];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as Customer;
  },

  async create(customer: Partial<Customer>) {
    const { data, error } = await supabase
      .from("customers")
      .insert([customer])
      .select()
      .single();

    if (error) throw error;
    return data as Customer;
  },

  async update(id: string, customer: Partial<Customer>) {
    const { data, error } = await supabase
      .from("customers")
      .update(customer)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Customer;
  },

  async getCustomerPrices(customerId: string) {
    const { data, error } = await supabase
      .from("customer_prices")
      .select("*, product:products(*)")
      .eq("customer_id", customerId);

    if (error) throw error;
    return data || [];
  },

  async setCustomerPrice(customerId: string, productId: string, price: number) {
    const { data, error } = await supabase
      .from("customer_prices")
      .upsert({
        customer_id: customerId,
        product_id: productId,
        price,
      })
      .select()
      .single();

    if (error) throw error;
    return data as CustomerPrice;
  }
};
