import { supabase } from "@/lib/supabase";
import { Lead } from "@/types/database";

export const leadsRepository = {
  /**
   * Create a new lead inquiry from the landing page or registration
   */
  async create(lead: Omit<Lead, "id" | "created_at" | "updated_at">): Promise<Lead> {
    const { data, error } = await supabase
      .from("leads")
      .insert([
        {
          name: lead.name,
          business_name: lead.business_name || null,
          phone: lead.phone,
          email: lead.email || null,
          service: lead.service || "all",
          message: lead.message || null,
          status: lead.status || "new",
          store_id: lead.store_id || null,
          trial_started_at: lead.trial_started_at || null,
          trial_ends_at: lead.trial_ends_at || null,
          data_retention_until: lead.data_retention_until || null,
          deal_value: lead.deal_value || 0,
          admin_notes: lead.admin_notes || null,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data as Lead;
  },

  /**
   * Fetch all leads with optional status and search filtering
   */
  async getAll(filter?: { status?: string; search?: string }): Promise<Lead[]> {
    let query = supabase.from("leads").select("*").order("created_at", { ascending: false });

    if (filter?.status && filter.status !== "all") {
      query = query.eq("status", filter.status);
    }

    if (filter?.search && filter.search.trim() !== "") {
      const term = `%${filter.search.trim()}%`;
      query = query.or(`name.ilike.${term},business_name.ilike.${term},phone.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Lead[];
  },

  /**
   * Fetch single lead by ID
   */
  async getById(id: string): Promise<Lead | null> {
    const { data, error } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as Lead | null;
  },

  /**
   * Update lead status, notes, or deal value
   */
  async update(id: string, updates: Partial<Lead>): Promise<Lead> {
    const { data, error } = await supabase
      .from("leads")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Lead;
  },

  /**
   * Delete lead
   */
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) throw error;
    return true;
  },
};
