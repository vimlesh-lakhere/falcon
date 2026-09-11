import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const MASTER_SHOP_ID = "a0000000-0000-0000-0000-000000000001";

export async function GET(request: Request) {
  return handleMaintenance();
}

export async function POST(request: Request) {
  return handleMaintenance();
}

async function handleMaintenance() {
  try {
    const now = new Date();
    const nowIso = now.toISOString();
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

    let deactivatedCount = 0;
    let alertedSoonCount = 0;
    let purgedCount = 0;

    // =========================================================================
    // 1. AUTO-DEACTIVATE EXPIRED 14-DAY TRIALS
    // =========================================================================
    const { data: expiredShops, error: expiredError } = await supabase
      .from("shops")
      .select("id, name, phone, trial_ends_at, data_retention_until")
      .eq("plan", "trial")
      .eq("is_active", true)
      .neq("id", MASTER_SHOP_ID)
      .lt("trial_ends_at", nowIso);

    if (expiredError) {
      console.error("Error fetching expired shops:", expiredError);
    } else if (expiredShops && expiredShops.length > 0) {
      for (const shop of expiredShops) {
        // Deactivate shop
        await supabase
          .from("shops")
          .update({
            is_active: false,
            status: "trial_expired",
          })
          .eq("id", shop.id);

        // Deactivate profiles
        await supabase.from("profiles").update({ is_active: false }).eq("store_id", shop.id);

        // Update lead status
        await supabase.from("leads").update({ status: "expired" }).eq("store_id", shop.id);

        // Notify Master Admin
        await supabase.from("notifications").insert([
          {
            shop_id: MASTER_SHOP_ID,
            type: "trial_expired",
            entity_table: "shops",
            entity_id: shop.id,
            message: `⚠️ 14-Day Trial Expired: "${shop.name}". Account automatically locked. Customer data is safe for 16 more days under the 30-day retention policy. Contact them now to close the deal!`,
          },
        ]);

        deactivatedCount++;
      }
    }

    // =========================================================================
    // 2. 48-HOUR URGENT EXPIRY ALERT (HOT DEAL ALERT)
    // =========================================================================
    const { data: soonShops } = await supabase
      .from("shops")
      .select("id, name, phone, trial_ends_at")
      .eq("plan", "trial")
      .eq("is_active", true)
      .neq("id", MASTER_SHOP_ID)
      .gte("trial_ends_at", nowIso)
      .lte("trial_ends_at", in48Hours);

    if (soonShops && soonShops.length > 0) {
      for (const shop of soonShops) {
        // Check if an alert was already sent in the last 24h
        const { data: existingAlerts } = await supabase
          .from("notifications")
          .select("id")
          .eq("shop_id", MASTER_SHOP_ID)
          .eq("type", "trial_expiring_soon")
          .eq("entity_id", shop.id)
          .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (!existingAlerts || existingAlerts.length === 0) {
          const hoursLeft = Math.max(1, Math.round((new Date(shop.trial_ends_at!).getTime() - now.getTime()) / (1000 * 60 * 60)));
          await supabase.from("notifications").insert([
            {
              shop_id: MASTER_SHOP_ID,
              type: "trial_expiring_soon",
              entity_table: "shops",
              entity_id: shop.id,
              message: `🔥 Hot Deal Alert: "${shop.name}" trial ends in ${hoursLeft} hours! Message them on WhatsApp today with a discount deal.`,
            },
          ]);
          alertedSoonCount++;
        }
      }
    }

    // =========================================================================
    // 3. AUTO-PURGE EXPIRED UNCONFIRMED DATA AFTER 30 DAYS
    // =========================================================================
    const { data: purgeShops, error: purgeFetchError } = await supabase
      .from("shops")
      .select("id, name, data_retention_until")
      .eq("plan", "trial")
      .eq("status", "trial_expired")
      .neq("id", MASTER_SHOP_ID)
      .lt("data_retention_until", nowIso);

    if (purgeFetchError) {
      console.error("Error fetching purge shops:", purgeFetchError);
    } else if (purgeShops && purgeShops.length > 0) {
      for (const shop of purgeShops) {
        // Strict guard
        if (shop.id === MASTER_SHOP_ID) continue;

        // Cascade delete tenant records
        await supabase.from("products").delete().eq("shop_id", shop.id);
        await supabase.from("sales").delete().eq("shop_id", shop.id);
        await supabase.from("customers").delete().eq("shop_id", shop.id);
        await supabase.from("suppliers").delete().eq("shop_id", shop.id);
        await supabase.from("categories").delete().eq("shop_id", shop.id);
        await supabase.from("notifications").delete().eq("shop_id", shop.id);
        await supabase.from("profiles").delete().eq("store_id", shop.id);
        await supabase.from("leads").update({ store_id: null, status: "expired" }).eq("store_id", shop.id);

        const { error: deleteError } = await supabase.from("shops").delete().eq("id", shop.id);

        if (!deleteError) {
          await supabase.from("notifications").insert([
            {
              shop_id: MASTER_SHOP_ID,
              type: "data_purged",
              message: `🗑️ Data Auto-Purged: Expired store "${shop.name}" and its associated data were permanently deleted after completing 30 days of data retention.`,
            },
          ]);
          purgedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: nowIso,
      summary: {
        deactivatedExpiredTrials: deactivatedCount,
        alertedExpiringSoon: alertedSoonCount,
        purged30DayStores: purgedCount,
      },
    });
  } catch (err: any) {
    console.error("Trial maintenance cron error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
