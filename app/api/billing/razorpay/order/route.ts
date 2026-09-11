import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { SUBSCRIPTION_PLANS, LIFETIME_PLAN } from "@/lib/plans";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      planId,
      customAmount,
      customDescription,
      shopId,
      customerName,
      customerEmail,
      customerPhone,
    } = body;

    let finalAmount = 0;
    let plan = null;

    if (customAmount && Number(customAmount) > 0) {
      finalAmount = Number(customAmount);
    } else {
      plan = [...SUBSCRIPTION_PLANS, LIFETIME_PLAN].find((p) => p.id === planId);
      if (!plan) {
        return NextResponse.json({ error: "Invalid subscription plan or amount selected." }, { status: 400 });
      }
      finalAmount = plan.price;
    }

    const DEFAULT_KEY_ID = "rzp_live_TakMuhWA7kMBGw";
    const DEFAULT_KEY_SECRET = "ssdPgkth99A3bjuPccXVZG1z";

    const keyId =
      process.env.RAZORPAY_KEY_ID ||
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      DEFAULT_KEY_ID;
    const keySecret =
      process.env.RAZORPAY_KEY_SECRET ||
      DEFAULT_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        {
          error: "Razorpay API keys are not configured yet.",
          requiresConfig: true,
          plan,
        },
        { status: 503 }
      );
    }

    const instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const options = {
      amount: Math.round(finalAmount * 100), // in paise
      currency: "INR",
      receipt: `rcpt_${Date.now().toString().slice(-8)}_${(shopId || "client").slice(0, 6)}`,
      notes: {
        planId: plan ? plan.id : "custom_project",
        planName: plan ? plan.name : (customDescription || "Website Development Payment"),
        shopId: shopId || "",
        customerName: customerName || "",
        customerEmail: customerEmail || "",
        customerPhone: customerPhone || "",
      },
    };

    const order = await instance.orders.create(options);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      plan,
    });
  } catch (err: any) {
    console.error("Razorpay order creation error:", err);
    return NextResponse.json({ error: err.message || "Failed to create payment order" }, { status: 500 });
  }
}
