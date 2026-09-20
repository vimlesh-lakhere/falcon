"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CreditCard, MessageCircle, Sparkles } from "lucide-react";
import { LIFETIME_PLAN, SUBSCRIPTION_PLANS, type PricingPlan } from "@/lib/plans";
import { PaymentModal } from "./PaymentModal";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";

const LIFETIME_AS_PLAN: PricingPlan = { ...LIFETIME_PLAN, perMonthPrice: 0, features: [] };
const lifetimeWhatsApp =
  "https://wa.me/919340362381?text=Namaste%20Vimlesh%20ji,%20I%20am%20interested%20in%20the%20Falcon%20360%20Lifetime%20License%20for%20Rs%2014999.%20Please%20guide%20me!";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function PricingSection() {
  const [selected, setSelected] = useState<PricingPlan | null>(null);

  return (
    <section id="pricing" className="relative scroll-mt-16 border-t border-slate-200/70 bg-[#F5F6FA] py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHead
            eyebrow="Simple pricing"
            title={
              <>
                Pick a plan. <span className="text-indigo-600">Every one starts with a free trial.</span>
              </>
            }
            sub="Pay online in seconds with UPI, GPay, PhonePe or card. Longer plans cost less per month."
          />
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {SUBSCRIPTION_PLANS.map((plan, i) => {
            const best = !!plan.isBestValue;
            return (
              <Reveal key={plan.id} delay={i * 80}>
                <div
                  className={`relative flex h-full flex-col rounded-3xl p-6 transition-transform duration-300 hover:-translate-y-1 ${
                    best
                      ? "border border-indigo-500/40 bg-[#0B1026] text-white shadow-[0_40px_80px_-30px_rgba(79,70,229,0.7)]"
                      : plan.isPopular
                        ? "border-2 border-indigo-500 bg-white shadow-[0_30px_70px_-34px_rgba(79,70,229,0.5)]"
                        : "border border-slate-200 bg-white"
                  }`}
                >
                  {plan.badge && (
                    <span
                      className={`absolute -top-3 left-6 rounded-full px-3 py-1 text-[11px] font-bold ${
                        best ? "bg-gradient-to-r from-teal-400 to-indigo-400 text-slate-900" : "bg-indigo-600 text-white"
                      }`}
                    >
                      {plan.badge}
                    </span>
                  )}

                  <h3 className={`font-display text-lg font-bold ${best ? "text-white" : "text-slate-900"}`}>{plan.name}</h3>
                  <p className={`mt-1 min-h-[3.2rem] text-[13px] leading-snug ${best ? "text-slate-300" : "text-slate-500"}`}>
                    {plan.description}
                  </p>

                  <div className="mt-5 flex items-end gap-2">
                    <span className={`font-display text-4xl font-extrabold tracking-tight ${best ? "text-white" : "text-slate-900"}`}>
                      {inr(plan.price)}
                    </span>
                    <span className={`pb-1.5 text-xs ${best ? "text-slate-400" : "text-slate-500"}`}>/ {plan.durationLabel}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-400 line-through">
                      {inr(plan.originalPrice)}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">
                      Save {plan.savingsPercentage}%
                    </span>
                    {plan.durationMonths > 1 && (
                      <span className={best ? "text-teal-300" : "text-indigo-600"}>&asymp; {inr(plan.perMonthPrice)}/month</span>
                    )}
                  </div>

                  <ul className="mt-6 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className={`flex items-start gap-2.5 text-[13px] ${best ? "text-slate-200" : "text-slate-700"}`}>
                        <Check className={`mt-0.5 h-4 w-4 shrink-0 ${best ? "text-teal-300" : "text-emerald-500"}`} strokeWidth={3} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-7 space-y-2.5">
                    <button
                      type="button"
                      onClick={() => setSelected(plan)}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-transform hover:scale-[1.02] active:scale-[0.98] ${
                        best
                          ? "bg-gradient-to-r from-teal-400 to-indigo-400 text-slate-900"
                          : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25"
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      Pay with Razorpay
                    </button>
                    <Link
                      href="/register"
                      className={`flex w-full items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[13px] font-semibold ${
                        best
                          ? "border-white/20 text-white hover:bg-white/10"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Start free trial first
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-8">
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#070A13] p-7 text-white sm:p-10">
            <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-violet-600/30 blur-[100px]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-amber-200">
                  <Sparkles className="h-3.5 w-3.5" /> {LIFETIME_PLAN.badge}
                </span>
                <h3 className="mt-3 font-display text-2xl font-bold sm:text-3xl">{LIFETIME_PLAN.name}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-300">{LIFETIME_PLAN.description}</p>
              </div>
              <div className="flex flex-col items-start gap-4 lg:items-end">
                <div className="flex items-end gap-3">
                  <span className="pb-1 text-sm text-slate-400 line-through">{inr(LIFETIME_PLAN.originalPrice)}</span>
                  <span className="font-display text-5xl font-extrabold tracking-tight">{inr(LIFETIME_PLAN.price)}</span>
                </div>
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setSelected(LIFETIME_AS_PLAN)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-transform hover:scale-[1.03]"
                  >
                    <CreditCard className="h-4 w-4" />
                    Pay once with Razorpay
                  </button>
                  <a
                    href={lifetimeWhatsApp}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-6 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Ask on WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      {selected && <PaymentModal plan={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
