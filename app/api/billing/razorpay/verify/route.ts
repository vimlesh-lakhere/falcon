import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import { SUBSCRIPTION_PLANS, LIFETIME_PLAN } from "@/lib/plans";
import { saasTrialsRepository } from "@/repositories/saas-trials.repo";
import { supabase } from "@/lib/supabase";
import { requireStaff } from "@/lib/auth/server";

const MASTER_SHOP_ID = "a0000000-0000-0000-0000-000000000001";

export async function POST(request: NextRequest) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("Razorpay API credentials missing in environment variables (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).");
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
      // Must authenticate the caller via requireStaff to verify store access
      const auth = await requireStaff(request);
      if (auth instanceof NextResponse) {
        return auth;
      }

      // Do not treat client-supplied shopId as authoritative; verify it matches the caller's store_id
      if (shopId && auth.shopId !== shopId) {
        console.error("Store authorization mismatch during subscription activation", {
          callerStoreId: auth.shopId,
          requestedShopId: shopId,
        });
        return NextResponse.json({ error: "Store authorization mismatch." }, { status: 403 });
      }

      const targetShopId = auth.shopId;

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

      // Activate shop subscription using authenticated store ID
      await saasTrialsRepository.activateShop(targetShopId, {
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
