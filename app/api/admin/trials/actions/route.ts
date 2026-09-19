import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/server";
import { DEFAULT_FALLBACK_SHOP_ID } from "@/lib/tenant";
import { saasTrialsRepository } from "@/repositories/saas-trials.repo";

export async function POST(request: NextRequest) {
  // Platform-level actions (activate / extend / deactivate / purge) are for the
  // master store's Owner/Admin only, never for tenant or storefront users.
  const auth = await requireStaff(request, ["Owner", "Admin"]);
  if (auth instanceof NextResponse) return auth;
  if (auth.shopId !== DEFAULT_FALLBACK_SHOP_ID) {
    return NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, shopId, plan, additionalDays, durationMonths, amountPaid } = body;

    if (!action) {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }

    if (action === "activate") {
      if (!shopId) return NextResponse.json({ error: "shopId is required" }, { status: 400 });
      const shop = await saasTrialsRepository.activateShop(shopId, {
        plan: plan || "pro",
        durationMonths: durationMonths !== undefined ? Number(durationMonths) : 1,
        amountPaid: amountPaid ? Number(amountPaid) : 0,
      });
      return NextResponse.json({
        success: true,
        shop,
        message: `Store activated to ${plan || "pro"} for ${
          durationMonths > 0 ? `${durationMonths} month(s)` : "Lifetime"
        } successfully.`,
      });
    }

    if (action === "extend") {
      if (!shopId) return NextResponse.json({ error: "shopId is required" }, { status: 400 });
      const shop = await saasTrialsRepository.extendTrial(shopId, additionalDays || 7);
      return NextResponse.json({ success: true, shop, message: `Trial extended by ${additionalDays || 7} days.` });
    }

    if (action === "deactivate") {
      if (!shopId) return NextResponse.json({ error: "shopId is required" }, { status: 400 });
      const shop = await saasTrialsRepository.deactivateShop(shopId);
      return NextResponse.json({ success: true, shop, message: "Store deactivated successfully." });
    }

    if (action === "purge") {
      if (!shopId) return NextResponse.json({ error: "shopId is required" }, { status: 400 });
      const result = await saasTrialsRepository.purgeShopData(shopId);
      return NextResponse.json({ success: true, message: result.message });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error: any) {
    console.error("Admin trial action error:", error);
    return NextResponse.json({ error: error.message || "Action failed" }, { status: 500 });
  }
}
