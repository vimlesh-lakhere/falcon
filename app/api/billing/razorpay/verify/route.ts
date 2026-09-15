import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import { SUBSCRIPTION_PLANS, LIFETIME_PLAN } from "@/lib/plans";
import { saasTrialsRepository } from "@/repositories/saas-trials.repo";
import { supabase } from "@/lib/supabase";
import { createRequestClient } from "@/lib/auth/server";

const MASTER_SHOP_ID = "a0000000-0000-0000-0000-000000000001";
const DEFAULT_KEY_ID = "rzp_live_TakMuhWA7kMBGw";
const DEFAULT_KEY_SECRET = "ssdPgkth99A3bjuPccXVZG1z";

export async function POST(request: NextRequest) {
  try {
    const keyId =
      process.env.RAZORPAY_KEY_ID ||
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      DEFAULT_KEY_ID;
    const keySecret =
      process.env.RAZORPAY_KEY_SECRET ||
      DEFAULT_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("Razorpay API credentials missing in environment variables.");
      return NextResponse.json({ error: "Payment gateway configuration error." }, { status: 500 });
    }

    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
      customDescription,
      shopId,
      customerName,
      customerEmail,
      customerPhone,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing required Razorpay verification parameters." }, { status: 400 });
    }

    // 1. Verify Razorpay cryptographic signature using constant-time comparison
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto.createHmac("sha256", keySecret).update(text).digest("hex");
    const expectedBuf = Buffer.from(expectedSignature, "utf8");
    const receivedBuf = Buffer.from(razorpay_signature, "utf8");

    if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
      console.error("Razorpay signature verification failed!", {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });
      return NextResponse.json({ error: "Cryptographic signature verification failed." }, { status: 400 });
    }

    // 2. Fetch actual payment and order records from Razorpay to verify state server-to-server
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const payment = (await razorpay.payments.fetch(razorpay_payment_id)) as any;

    if (!payment) {
      console.error("Payment not found on Razorpay", { paymentId: razorpay_payment_id });
      return NextResponse.json({ error: "Payment verification failed with gateway." }, { status: 400 });
    }

    if (payment.order_id !== razorpay_order_id) {
      console.error("Payment order ID mismatch", {
        paymentOrderId: payment.order_id,
        expectedOrderId: razorpay_order_id,
      });
      return NextResponse.json({ error: "Order reference mismatch." }, { status: 400 });
    }

    if (payment.status !== "captured" && payment.status !== "authorized") {
      console.error("Payment status invalid", { status: payment.status });
      return NextResponse.json({ error: `Payment is not completed (status: ${payment.status}).` }, { status: 400 });
    }

    if (payment.currency !== "INR") {
      console.error("Payment currency invalid", { currency: payment.currency });
      return NextResponse.json({ error: "Invalid payment currency." }, { status: 400 });
    }

    // 3. Subscription Activation path
    const plan = [...SUBSCRIPTION_PLANS, LIFETIME_PLAN].find((p) => p.id === planId);

    if (plan) {
      // Verify that the actual amount paid matches the server-side plan price (in paise)
      const expectedAmountPaise = Math.round(plan.price * 100);
      if (payment.amount !== expectedAmountPaise) {
        console.error("Payment amount mismatch for subscription plan", {
          planId: plan.id,
          expectedPaise: expectedAmountPaise,
          paidPaise: payment.amount,
        });
        return NextResponse.json(
          { error: "Paid amount does not match the subscription plan price." },
          { status: 400 }
        );
      }

      // Determine target store ID:
      // Option A: Try reading store from logged in profile (works even if store is expired)
      let targetShopId: string | null = null;
      try {
        const reqClient = createRequestClient(request);
        const { data: { user } } = await reqClient.auth.getUser();
        if (user) {
          const { data: profile } = await reqClient
            .from("profiles")
            .select("store_id, role")
            .eq("id", user.id)
            .maybeSingle();
          if (profile?.store_id) {
            targetShopId = profile.store_id;
          }
        }
      } catch (authErr) {
        console.warn("User auth resolution notice:", authErr);
      }

      // Option B: Or from shopId passed from /trial-expired or explicit param
      if (!targetShopId && shopId && shopId !== MASTER_SHOP_ID) {
        const { data: existingShop } = await supabase
          .from("shops")
          .select("id")
          .eq("id", shopId)
          .maybeSingle();
        if (existingShop) {
          targetShopId = existingShop.id;
        }
      }

      // If a valid existing shop ID was resolved, activate the shop
      if (targetShopId) {
        await saasTrialsRepository.activateShop(targetShopId, {
          plan: "pro",
          durationMonths: plan.durationMonths,
          amountPaid: plan.price,
        });

        await supabase.from("notifications").insert([
          {
            shop_id: MASTER_SHOP_ID,
            type: "payment_success",
            entity_table: "shops",
            entity_id: targetShopId,
            message: `💰 Online Razorpay Payment Verified: ₹${plan.price} received for "${plan.name}" (${plan.durationLabel})! Payment ID: ${razorpay_payment_id}. Store automatically activated.`,
          },
        ]);

        return NextResponse.json({
          success: true,
          message: `Subscription "${plan.name}" activated successfully!`,
          paymentId: razorpay_payment_id,
          durationMonths: plan.durationMonths,
          plan,
          amountPaid: plan.price,
        });
      }

      // Option C: If no existing shop ID (e.g. new customer buying plan from landing page)
      const amountPaidRupees = Number((payment.amount / 100).toFixed(2));
      await supabase.from("leads").insert([
        {
          name: customerName || "Online Subscriber",
          phone: customerPhone || "",
          email: customerEmail || "",
          business_name: customerName ? `${customerName}` : "New Subscription",
          service: `Subscription: ${plan.name} (${plan.durationLabel})`,
          message: `Paid online via Razorpay. Payment ID: ${razorpay_payment_id}, Order ID: ${razorpay_order_id}. Plan: ${plan.name}, Amount: ₹${amountPaidRupees}`,
          status: "won",
          deal_value: amountPaidRupees,
        },
      ]);

      await supabase.from("notifications").insert([
        {
          shop_id: MASTER_SHOP_ID,
          type: "payment_success",
          message: `🎉 New Subscription Purchased: ${customerName || "Customer"} (${customerPhone || customerEmail}) paid ₹${amountPaidRupees} for "${plan.name}" (${plan.durationLabel}) via Razorpay! Payment ID: ${razorpay_payment_id}. Please provision store access.`,
        },
      ]);

      return NextResponse.json({
        success: true,
        message: `Subscription "${plan.name}" payment received successfully! Our team will activate your store shortly.`,
        paymentId: razorpay_payment_id,
        durationMonths: plan.durationMonths,
        plan,
        amountPaid: plan.price,
      });
    }

    // 4. Non-subscription client project payment (e.g. from public /pay portal)
    const amountPaidRupees = Number((payment.amount / 100).toFixed(2));
    const serviceName = customDescription || "Custom Client Payment";

    await supabase.from("leads").insert([
      {
        name: customerName || "Online Client",
        phone: customerPhone || "",
        email: customerEmail || "",
        business_name: customerName ? `${customerName}` : "Client Project",
        service: serviceName,
        message: `Paid online via Razorpay. Payment ID: ${razorpay_payment_id}, Order ID: ${razorpay_order_id}. Amount: ₹${amountPaidRupees}`,
        status: "won",
        deal_value: amountPaidRupees,
      },
    ]);

    await supabase.from("notifications").insert([
      {
        shop_id: MASTER_SHOP_ID,
        type: "new_lead",
        message: `🎉 Client Payment Received: ${customerName || "Client"} paid ₹${amountPaidRupees} for "${serviceName}" via Razorpay! Contact: ${customerPhone}. Payment ID: ${razorpay_payment_id}.`,
      },
    ]);

    return NextResponse.json({
      success: true,
      message: `Payment of ₹${amountPaidRupees} verified successfully!`,
      paymentId: razorpay_payment_id,
      amountPaid: amountPaidRupees,
    });
  } catch (err: any) {
    console.error("Razorpay verification error:", err);
    return NextResponse.json({ error: err.message || "Failed to verify payment." }, { status: 500 });
  }
}
