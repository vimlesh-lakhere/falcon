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
      customAmount,
      customDescription,
      shopId,
      customerName,
      customerEmail,
      customerPhone,
    } = body;

    const keySecret = process.env.RAZORPAY_KEY_SECRET || "ssdPgkth99A3bjuPccXVZG1z";

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

    // 2. Identify plan or custom project amount
    const plan = [...SUBSCRIPTION_PLANS, LIFETIME_PLAN].find((p) => p.id === planId);
    const amountPaid = Number(customAmount) || (plan ? plan.price : 0);
    const serviceName = customDescription || (plan ? `Cloud ERP (${plan.name})` : "Custom Website Development");

    // 3. If a shopId is provided (e.g., active trial or expired store purchasing subscription)
    if (shopId && shopId !== MASTER_SHOP_ID && plan) {
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
      // 4. If purchased directly from website / client payment portal
      await supabase.from("leads").insert([
        {
          name: customerName || "Harsh (The House of HRB)",
          phone: customerPhone || "",
          email: customerEmail || "",
          business_name: customerName ? `${customerName}` : "The House of HRB (Delhi)",
          service: serviceName,
          message: `Paid online via Razorpay. Payment ID: ${razorpay_payment_id}, Order ID: ${razorpay_order_id}. Coupon applied if any.`,
          status: "won",
          deal_value: amountPaid,
        },
      ]);

      await supabase.from("notifications").insert([
        {
          shop_id: MASTER_SHOP_ID,
          type: "new_lead",
          message: `🎉 Client Payment Received: ${customerName || "Harsh"} paid ₹${amountPaid} for "${serviceName}" via Razorpay! Contact: ${customerPhone}. Payment ID: ${razorpay_payment_id}.`,
        },
      ]);
    }

    return NextResponse.json({
      success: true,
      message: `Payment of ₹${amountPaid} verified successfully!`,
      paymentId: razorpay_payment_id,
      durationMonths: plan ? plan.durationMonths : 12,
      plan: plan || null,
      amountPaid,
    });
  } catch (err: any) {
    console.error("Razorpay verification error:", err);
    return NextResponse.json({ error: err.message || "Failed to verify payment." }, { status: 500 });
  }
}
