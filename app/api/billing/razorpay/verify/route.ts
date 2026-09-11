import { NextResponse } from "next/server";
import crypto from "crypto";
import { SUBSCRIPTION_PLANS, LIFETIME_PLAN } from "@/lib/plans";
import { saasTrialsRepository } from "@/repositories/saas-trials.repo";
import { supabase } from "@/lib/supabase";

const MASTER_SHOP_ID = "a0000000-0000-0000-0000-000000000001";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
      shopId,
      customerName,
      customerEmail,
      customerPhone,
    } = body;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json({ error: "Razorpay Secret Key not configured on server." }, { status: 500 });
    }

    // 1. Verify Razorpay cryptographic signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto.createHmac("sha256", keySecret).update(text).digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error("Razorpay signature verification failed!", {
        expected: expectedSignature,
        received: razorpay_signature,
      });
      return NextResponse.json({ error: "Cryptographic signature verification failed." }, { status: 400 });
    }

    // 2. Identify the purchased plan
    const plan = [...SUBSCRIPTION_PLANS, LIFETIME_PLAN].find((p) => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 400 });
    }

    // 3. If a shopId is provided (e.g., active trial or expired store purchasing subscription)
    if (shopId && shopId !== MASTER_SHOP_ID) {
      await saasTrialsRepository.activateShop(shopId, {
        plan: "pro",
        durationMonths: plan.durationMonths,
        amountPaid: plan.price,
      });

      // Insert verification notification for admin
      await supabase.from("notifications").insert([
        {
          shop_id: MASTER_SHOP_ID,
          type: "payment_success",
          entity_table: "shops",
          entity_id: shopId,
          message: `💰 Online Razorpay Payment Verified: ₹${plan.price} received for "${plan.name}" (${plan.durationLabel})! Payment ID: ${razorpay_payment_id}. Store automatically activated.`,
        },
      ]);
    } else {
      // 4. If purchased directly from website without existing shopId yet
      await supabase.from("leads").insert([
        {
          name: customerName || "New Customer",
          phone: customerPhone || "",
          email: customerEmail || "",
          business_name: customerName ? `${customerName}'s Store` : "Paid Customer",
          service: `Cloud ERP (${plan.name})`,
          message: `Paid online via Razorpay. Payment ID: ${razorpay_payment_id}, Order ID: ${razorpay_order_id}`,
          status: "won",
          deal_value: plan.price,
        },
      ]);

      await supabase.from("notifications").insert([
        {
          shop_id: MASTER_SHOP_ID,
          type: "new_lead",
          message: `🎉 New Direct Customer Payment: ${customerName || "Customer"} paid ₹${plan.price} for ${plan.name} via Razorpay! Contact phone: ${customerPhone}.`,
        },
      ]);
    }

    return NextResponse.json({
      success: true,
      message: `Payment of ₹${plan.price} verified! Plan ${plan.name} (${plan.durationLabel}) activated.`,
      paymentId: razorpay_payment_id,
      durationMonths: plan.durationMonths,
    });
  } catch (err: any) {
    console.error("Razorpay verification error:", err);
    return NextResponse.json({ error: err.message || "Failed to verify payment." }, { status: 500 });
  }
}
