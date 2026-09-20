"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CreditCard, MessageCircle, X } from "lucide-react";
import type { PricingPlan } from "@/lib/plans";
import { initiateRazorpayCheckout } from "@/lib/razorpay-client";

const WHATSAPP_NUMBER = "919340362381";

const INPUT =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10";

export function PaymentModal({ plan, onClose }: { plan: PricingPlan; onClose: () => void }) {
  const [contact, setContact] = useState({ name: "", phone: "", email: "", businessName: "" });
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.phone || !contact.name) {
      setError("Please provide your name and WhatsApp/mobile phone number.");
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      await initiateRazorpayCheckout({
        plan,
        customerName: contact.name,
        customerEmail: contact.email,
        customerPhone: contact.phone,
        onSuccess: (paymentId) => {
          setSuccess(`Payment successful! (ID: ${paymentId}). Plan ${plan.name} activated. Welcome to Falcon 360!`);
          setTimeout(onClose, 3500);
        },
        onError: (msg) => setError(msg),
        onRequiresConfig: () => setError("Payment gateway is initializing. Please try again in a moment."),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not launch checkout.");
    } finally {
      setProcessing(false);
    }
  };

  const payViaWhatsApp = () => {
    const text = encodeURIComponent(
      `Namaste Vimlesh ji,\nI want to pay ₹${plan.price} for ${plan.name} via UPI QR.\nMy Name: ${contact.name || "Customer"}\nPhone: ${contact.phone}`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, "_blank");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pay-title"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <h3 id="pay-title" className="text-sm font-bold">
                Subscribe to Falcon 360
              </h3>
              <p className="text-xs text-indigo-100">
                {plan.name} &bull; &#8377;{plan.price.toLocaleString("en-IN")} ({plan.durationLabel})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handlePay} className="space-y-4 p-6">
          {success && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-xl bg-slate-50 p-4 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Plan duration</span>
              <span className="font-semibold text-slate-900">{plan.durationLabel}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-extrabold text-slate-900">
              <span>Payable amount</span>
              <span className="text-indigo-600">&#8377;{plan.price.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pay-name" className="text-xs font-semibold text-slate-700">
              Your full name *
            </label>
            <input
              id="pay-name"
              type="text"
              required
              placeholder="e.g. Ramesh Patel"
              value={contact.name}
              onChange={(e) => setContact({ ...contact, name: e.target.value })}
              className={INPUT}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="pay-phone" className="text-xs font-semibold text-slate-700">
              WhatsApp / mobile number *
            </label>
            <input
              id="pay-phone"
              type="tel"
              required
              placeholder="e.g. 9876543210"
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              className={INPUT}
            />
            <p className="text-[11px] text-slate-500">We will send your invoice and login details here.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="pay-email" className="text-xs font-semibold text-slate-700">
                Email (optional)
              </label>
              <input
                id="pay-email"
                type="email"
                placeholder="store@gmail.com"
                value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
                className={INPUT}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="pay-biz" className="text-xs font-semibold text-slate-700">
                Shop name (optional)
              </label>
              <input
                id="pay-biz"
                type="text"
                placeholder="Patel Supermarket"
                value={contact.businessName}
                onChange={(e) => setContact({ ...contact, businessName: e.target.value })}
                className={INPUT}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={processing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            <CreditCard className="h-4 w-4" />
            {processing ? "Opening Razorpay..." : `Pay ₹${plan.price.toLocaleString("en-IN")} (UPI / Card)`}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={payViaWhatsApp}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Or pay via WhatsApp UPI QR code
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
