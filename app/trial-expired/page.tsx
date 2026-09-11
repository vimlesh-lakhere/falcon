"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  ShieldCheck,
  MessageCircle,
  Phone,
  ArrowRight,
  LogOut,
  AlertTriangle,
  Database,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  CreditCard,
  Check,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Shop } from "@/types/database";
import { SUBSCRIPTION_PLANS, PricingPlan } from "@/lib/plans";
import { initiateRazorpayCheckout } from "@/lib/razorpay-client";

export default function TrialExpiredPage() {
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<Shop | null>(null);
  const [userName, setUserName] = useState<string>("Store Owner");
  const [userEmail, setUserEmail] = useState<string>("");
  const [retentionDaysLeft, setRetentionDaysLeft] = useState<number>(16);

  // Pricing & Payment State
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan>(
    SUBSCRIPTION_PLANS.find((p) => p.isBestValue) || SUBSCRIPTION_PLANS[3]
  );
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    async function checkStoreStatus() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          if (user.email) setUserEmail(user.email);
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, store_id")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.full_name) {
            setUserName(profile.full_name);
          }

          if (profile?.store_id) {
            const { data: shopData } = await supabase
              .from("shops")
              .select("*")
              .eq("id", profile.store_id)
              .maybeSingle();

            if (shopData) {
              setShop(shopData);

              // If already activated or renewed, redirect to dashboard!
              if (
                shopData.plan !== "trial" &&
                shopData.is_active &&
                shopData.status === "active" &&
                (!shopData.subscription_ends_at || new Date() < new Date(shopData.subscription_ends_at))
              ) {
                window.location.href = "/dashboard";
                return;
              }

              // Calculate retention days left
              if (shopData.data_retention_until) {
                const diffMs = new Date(shopData.data_retention_until).getTime() - new Date().getTime();
                const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                setRetentionDaysLeft(days);
              }
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    checkStoreStatus();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const getWhatsAppReactivationUrl = (plan?: PricingPlan) => {
    const storeName = shop?.name || "My Store";
    const phone = shop?.phone || "";
    const chosen = plan || selectedPlan;
    const text = encodeURIComponent(
      `Namaste Vimlesh ji,\nMy trial/subscription for "${storeName}" on Falcon 360 ERP has ended.\nOwner: ${userName}\nPhone: ${phone}\n\nI want to reactivate my account and upgrade to ${chosen.name} (${chosen.durationLabel} for ₹${chosen.price}). Please share QR / payment link!`
    );
    return `https://wa.me/919340362381?text=${text}`;
  };

  const handlePayOnline = async () => {
    try {
      setIsPaying(true);
      setPaymentError(null);
      setPaymentSuccess(null);

      await initiateRazorpayCheckout({
        plan: selectedPlan,
        shopId: shop?.id,
        customerName: userName,
        customerEmail: userEmail,
        customerPhone: shop?.phone || "",
        onSuccess: (paymentId) => {
          setPaymentSuccess(
            `🎉 Payment Successful! (ID: ${paymentId}). Your store is reactivated for ${selectedPlan.durationLabel}. Redirecting...`
          );
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1500);
        },
        onError: (err) => {
          setPaymentError(err);
        },
        onRequiresConfig: () => {
          setPaymentError("Payment gateway is initializing. Please try again in a moment.");
        },
      });
    } catch (err: any) {
      setPaymentError(err.message || "Failed to start payment.");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 selection:bg-indigo-500 selection:text-white font-sans antialiased flex flex-col justify-between relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[25%] w-[600px] h-[600px] bg-rose-600/10 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-10%] right-[20%] w-[550px] h-[550px] bg-indigo-600/10 rounded-full blur-[150px]" />
      </div>

      {/* Top Navbar */}
      <nav className="relative z-10 border-b border-white/10 bg-[#07090E]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 shrink-0 flex items-center justify-center">
            <img
              src="/falcon-icon.png"
              alt="Falcon 360 Logo"
              className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(20,184,166,0.4)]"
            />
          </div>
          <span className="text-lg font-black tracking-tight text-white font-mono">
            FALCON <span className="text-teal-400">360</span>
          </span>
        </Link>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto px-4 py-10 flex flex-col items-center justify-center text-center">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-semibold mb-5 animate-pulse">
          <Clock className="w-4 h-4 text-rose-400" />
          <span>Software Deactivated • Subscription Renewal Required</span>
        </div>

        {/* Primary Heading */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight max-w-2xl">
          Continue Using Falcon 360.
          <span className="block mt-2 bg-gradient-to-r from-rose-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            Select a Plan to Reactivate Instantly.
          </span>
        </h1>

        <p className="mt-3 text-sm text-slate-400 max-w-xl leading-relaxed">
          Hello <strong className="text-slate-200">{userName}</strong>! The trial or subscription for{" "}
          <strong className="text-indigo-300">{shop?.name || "your store"}</strong> has completed. Choose your preferred
          plan below to pay online via Razorpay (UPI, GPay, PhonePe, Cards) or WhatsApp.
        </p>

        {/* Payment Alert Banners */}
        {paymentSuccess && (
          <div className="w-full mt-4 p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center justify-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{paymentSuccess}</span>
          </div>
        )}

        {paymentError && (
          <div className="w-full mt-4 p-4 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center justify-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{paymentError}</span>
          </div>
        )}

        {/* Interactive Subscription Plan Cards */}
        <div className="w-full mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isSelected = selectedPlan.id === plan.id;
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`cursor-pointer rounded-2xl p-5 transition-all relative flex flex-col justify-between border ${
                  isSelected
                    ? "bg-gradient-to-b from-indigo-950/80 to-[#0F1423] border-indigo-500 shadow-xl shadow-indigo-950/50 scale-[1.02]"
                    : "bg-[#0C101D]/70 border-white/10 hover:border-white/20 hover:bg-[#0F1423]"
                }`}
              >
                {plan.badge && (
                  <span
                    className={`absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      plan.isBestValue
                        ? "bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 shadow-md"
                        : "bg-indigo-500/30 text-indigo-300 border border-indigo-500/40"
                    }`}
                  >
                    {plan.badge}
                  </span>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">{plan.name}</h3>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? "border-indigo-400 bg-indigo-600 text-white" : "border-white/20"
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5" />}
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1.5 pt-1">
                    <span className="text-2xl font-black text-white font-mono">₹{plan.price}</span>
                    <span className="text-xs text-slate-400 line-through">₹{plan.originalPrice}</span>
                  </div>

                  <div className="text-[11px] font-semibold text-emerald-400">
                    Effective ₹{plan.perMonthPrice}/mo • {plan.durationLabel}
                  </div>

                  <p className="text-[11px] text-slate-400 leading-snug pt-1">{plan.description}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-white/10 space-y-1.5 text-[11px] text-slate-300">
                  {plan.features.slice(0, 3).map((f, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <Check className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Plan Summary & Razorpay Instant Pay Button */}
        <div className="w-full mt-6 p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-[#0F1423] to-purple-950/60 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left space-y-0.5">
            <div className="text-xs text-indigo-300 font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Selected: <strong>{selectedPlan.name}</strong> ({selectedPlan.durationLabel})</span>
            </div>
            <div className="text-xl font-black text-white font-mono">
              Total: ₹{selectedPlan.price}{" "}
              <span className="text-xs font-normal text-slate-400 font-sans">
                (Save {selectedPlan.savingsPercentage}%)
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* Online Razorpay Pay Button */}
            <button
              onClick={handlePayOnline}
              disabled={isPaying}
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4" />
              <span>{isPaying ? "Opening Razorpay..." : `Pay ₹${selectedPlan.price} via Razorpay (UPI/Card)`}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* WhatsApp Alternative */}
            <a
              href={getWhatsAppReactivationUrl(selectedPlan)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all"
            >
              <MessageCircle className="w-4 h-4 text-white" />
              <span>Pay via WhatsApp QR</span>
            </a>
          </div>
        </div>

        {/* 30-Day Data Retention Guarantee Card */}
        <div className="w-full mt-8 p-5 rounded-2xl bg-[#0F1422] border border-indigo-500/20 shadow-xl text-left relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white">30-Day Data Retention Policy Active</h2>
                <p className="text-[11px] text-slate-400">
                  Your products, inventory, customers, and billing records are safe on our servers.
                </p>
              </div>
            </div>

            <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold font-mono">
              ⏳ {retentionDaysLeft} Days Remaining Until Purge
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <span>Support Helpline: <strong>+91 9340362381</strong> (Vimlesh Lakhere)</span>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1 text-indigo-400 hover:underline text-xs"
            >
              <RefreshCw className="w-3 h-3" /> Check Activation Status
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6 px-4 text-center text-xs text-slate-500">
        <p>© 2026 Falcon 360 Cloud ERP. Enterprise Grade • SSL Secured • ap-south-1 (Mumbai)</p>
      </footer>
    </div>
  );
}
