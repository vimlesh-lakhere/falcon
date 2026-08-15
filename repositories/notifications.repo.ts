import { supabase } from "@/lib/supabase/client";
import { Notification } from "@/types/database";

export const notificationsRepository = {
  async getAll(shopId: string, limit = 20) {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as Notification[]) || [];
  },

  async markAsRead(id: string) {
    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Notification;
  },

  async markAllAsRead(shopId: string) {
    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("shop_id", shopId)
      .eq("is_read", false);

    if (error) throw error;
    return true;
  }
};
