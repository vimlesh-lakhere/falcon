import { supabase } from "@/lib/supabase";
import { Shop } from "@/types/database";

export interface TenantShopWithMetrics extends Shop {
  trialDaysRemaining: number;
  retentionDaysRemaining: number;
  subscriptionDaysRemaining: number;
  isExpiringSoon: boolean; // within 48h for trial
  isExpired: boolean;
  isPurgeReady: boolean; // past 30 days
  isSubscriptionExpired: boolean;
  isSubscriptionExpiringSoon: boolean; // within 7 days
  ownerProfile?: {
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
}

export const saasTrialsRepository = {
  /**
   * Fetch all tenant shops with calculated trial & paid subscription metrics
   */
  async getAllTenantShops(): Promise<TenantShopWithMetrics[]> {
    const { data: shops, error: shopsError } = await supabase
      .from("shops")
      .select("*")
      .order("created_at", { ascending: false });

    if (shopsError) throw shopsError;

    // Fetch corresponding profiles for owner contact details
    const { data: profiles } = await supabase
      .from("profiles")
      .select("store_id, full_name, email, phone, role")
      .eq("role", "Owner");

    const profileMap = new Map<string, { full_name: string; email: string; phone: string | null }>();
    if (profiles) {
      profiles.forEach((p: any) => {
        if (p.store_id) {
          profileMap.set(p.store_id, {
            full_name: p.full_name,
            email: p.email,
            phone: p.phone,
          });
        }
      });
    }

    const now = new Date().getTime();

    return (shops || []).map((shop: Shop) => {
      const trialEnds = shop.trial_ends_at ? new Date(shop.trial_ends_at).getTime() : null;
      const retentionEnds = shop.data_retention_until ? new Date(shop.data_retention_until).getTime() : null;
      const subEnds = shop.subscription_ends_at ? new Date(shop.subscription_ends_at).getTime() : null;

      let trialDaysRemaining = 0;
      let isExpiringSoon = false;
      let isExpired = false;

      if (trialEnds) {
        const diffMs = trialEnds - now;
        trialDaysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        isExpired = diffMs <= 0;
        isExpiringSoon = !isExpired && diffMs <= 48 * 60 * 60 * 1000; // <= 48 hours
      }

      let retentionDaysRemaining = 0;
      let isPurgeReady = false;

      if (retentionEnds) {
        const diffMs = retentionEnds - now;
        retentionDaysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        isPurgeReady = isExpired && diffMs <= 0;
      }

      let subscriptionDaysRemaining = 0;
      let isSubscriptionExpired = false;
      let isSubscriptionExpiringSoon = false;

      if (subEnds) {
        const diffMs = subEnds - now;
        subscriptionDaysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        isSubscriptionExpired = diffMs <= 0;
        isSubscriptionExpiringSoon = !isSubscriptionExpired && diffMs <= 7 * 24 * 60 * 60 * 1000; // <= 7 days
      }

      return {
        ...shop,
        trialDaysRemaining,
        retentionDaysRemaining,
        subscriptionDaysRemaining,
        isExpiringSoon,
        isExpired,
        isPurgeReady,
        isSubscriptionExpired,
        isSubscriptionExpiringSoon,
        ownerProfile: profileMap.get(shop.id) || null,
      };
    });
  },

  /**
   * Activate / upgrade a shop to a Paid Subscription with specific duration
   * @param shopId Store ID
   * @param options durationMonths: 1 (1 mo), 3 (3 mo), 6 (6 mo), 12 (1 yr), or 0 for lifetime
   */
  async activateShop(
    shopId: string,
    options?: {
      plan?: string;
      durationMonths?: number;
      amountPaid?: number;
    }
  ): Promise<Shop> {
    const plan = options?.plan || "pro";
    const durationMonths = options?.durationMonths !== undefined ? options.durationMonths : 1;
    const amountPaid = options?.amountPaid || 0;

    let subscriptionEndsAt: string | null = null;
    if (durationMonths > 0) {
      const endsDate = new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000);
      subscriptionEndsAt = endsDate.toISOString();
    }

    const { data, error } = await supabase
      .from("shops")
      .update({
        plan,
        is_active: true,
        status: "active",
        trial_ends_at: null, // Removes Free Trial!
        data_retention_until: null,
        subscription_starts_at: new Date().toISOString(),
        subscription_ends_at: subscriptionEndsAt,
        subscription_duration_months: durationMonths,
        subscription_amount: amountPaid,
      })
      .eq("id", shopId)
      .select()
      .single();

    if (error) throw error;

    // Ensure profiles for this store are active
    await supabase.from("profiles").update({ is_active: true }).eq("store_id", shopId);

    // Update corresponding lead status if exists
    await supabase
      .from("leads")
      .update({ status: "won", deal_value: amountPaid })
      .eq("store_id", shopId);

    // Alert Master Admin of successful paid activation
    await supabase.from("notifications").insert([
      {
        shop_id: "a0000000-0000-0000-0000-000000000001",
        type: "subscription_activated",
        entity_table: "shops",
        entity_id: shopId,
        message: `🎉 Paid Subscription Activated: "${data.name}" upgraded to ${plan.toUpperCase()} for ${
          durationMonths > 0 ? `${durationMonths} month(s)` : "Lifetime"
        } (Expires: ${subscriptionEndsAt ? new Date(subscriptionEndsAt).toLocaleDateString() : "Never"}). Amount: ₹${amountPaid}`,
      },
    ]);

    return data as Shop;
  },

  /**
   * Extend trial for a customer by X days
   */
  async extendTrial(shopId: string, additionalDays: number = 7): Promise<Shop> {
    const { data: currentShop } = await supabase.from("shops").select("*").eq("id", shopId).single();
    if (!currentShop) throw new Error("Store not found");

    const baseDate = currentShop.trial_ends_at && new Date(currentShop.trial_ends_at) > new Date()
      ? new Date(currentShop.trial_ends_at)
      : new Date();

    const newTrialEnds = new Date(baseDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);
    // Retention gives 16 extra days after trial ends (total 30 days window)
    const newRetentionEnds = new Date(newTrialEnds.getTime() + 16 * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from("shops")
      .update({
        trial_ends_at: newTrialEnds.toISOString(),
        data_retention_until: newRetentionEnds.toISOString(),
        is_active: true,
        status: "trial_active",
      })
      .eq("id", shopId)
      .select()
      .single();

    if (error) throw error;

    await supabase.from("profiles").update({ is_active: true }).eq("store_id", shopId);
    await supabase.from("leads").update({ status: "trial_active", trial_ends_at: newTrialEnds.toISOString() }).eq("store_id", shopId);

    return data as Shop;
  },

  /**
   * Manually lock/deactivate a store
   */
  async deactivateShop(shopId: string): Promise<Shop> {
    const { data, error } = await supabase
      .from("shops")
      .update({
        is_active: false,
        status: "trial_expired",
      })
      .eq("id", shopId)
      .select()
      .single();

    if (error) throw error;
    await supabase.from("profiles").update({ is_active: false }).eq("store_id", shopId);
    await supabase.from("leads").update({ status: "expired" }).eq("store_id", shopId);

    return data as Shop;
  },

  /**
   * Permanently purge expired store data after 30 days
   * Strict Safety Check: Flagship store a0000000-0000-0000-0000-000000000001 is NEVER deleted.
   */
  async purgeShopData(shopId: string): Promise<{ success: boolean; message: string }> {
    if (shopId === "a0000000-0000-0000-0000-000000000001") {
      throw new Error("Cannot purge the flagship Master AGS Store.");
    }

    // Cascading deletes on tenant tables
    await supabase.from("products").delete().eq("shop_id", shopId);
    await supabase.from("sales").delete().eq("shop_id", shopId);
    await supabase.from("customers").delete().eq("shop_id", shopId);
    await supabase.from("suppliers").delete().eq("shop_id", shopId);
    await supabase.from("categories").delete().eq("shop_id", shopId);
    await supabase.from("notifications").delete().eq("shop_id", shopId);
    await supabase.from("profiles").delete().eq("store_id", shopId);
    
    // Unlink lead
    await supabase.from("leads").update({ store_id: null, status: "expired" }).eq("store_id", shopId);

    // Delete shop
    const { error: shopDeleteError } = await supabase.from("shops").delete().eq("id", shopId);
    if (shopDeleteError) throw shopDeleteError;

    return { success: true, message: `Store ${shopId} and all associated data permanently purged.` };
  },
};
