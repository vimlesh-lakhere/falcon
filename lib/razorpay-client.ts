import { PricingPlan } from "./plans";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface InitiateCheckoutOptions {
  plan: PricingPlan;
  shopId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (errMessage: string) => void;
  onRequiresConfig?: () => void;
}

export async function initiateRazorpayCheckout({
  plan,
  shopId,
  customerName,
  customerEmail,
  customerPhone,
  onSuccess,
  onError,
  onRequiresConfig,
}: InitiateCheckoutOptions) {
  try {
    // 1. Create order on server
    const res = await fetch("/api/billing/razorpay/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: plan.id,
        shopId,
        customerName,
        customerEmail,
        customerPhone,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.requiresConfig) {
        if (onRequiresConfig) {
          onRequiresConfig();
        } else {
          alert(
            "Razorpay API Keys are not yet added in .env.local. Admin can add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to accept live payments."
          );
        }
        return;
      }
      throw new Error(data.error || "Could not initialize checkout order");
    }

    // 2. Load script
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      throw new Error("Unable to connect to Razorpay payment gateway. Please check your internet connection.");
    }

    // 3. Open Razorpay modal
    const options = {
      key: data.keyId,
      amount: data.amount,
      currency: data.currency || "INR",
      name: "Falcon 360 ERP",
      description: `${plan.name} (${plan.durationLabel}) Subscription`,
      order_id: data.orderId,
      prefill: {
        name: customerName || "",
        email: customerEmail || "",
        contact: customerPhone || "",
      },
      theme: {
        color: "#4F46E5", // Indigo theme
      },
      handler: async function (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) {
        try {
          // Verify on backend
          const verifyRes = await fetch("/api/billing/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...response,
              planId: plan.id,
              shopId,
              customerName,
              customerEmail,
              customerPhone,
            }),
          });

          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.success) {
            if (onSuccess) onSuccess(response.razorpay_payment_id);
          } else {
            throw new Error(verifyData.error || "Payment verification failed.");
          }
        } catch (verifyErr: any) {
          if (onError) onError(verifyErr.message || "Failed to verify transaction");
        }
      },
      modal: {
        ondismiss: function () {
          console.log("Razorpay checkout modal closed by user.");
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (err: any) {
    console.error("Checkout initiation error:", err);
    if (onError) onError(err.message || "Failed to start payment.");
  }
}
