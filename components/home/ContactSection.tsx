"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Globe, MessageCircle, ShieldCheck, Zap } from "lucide-react";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";

const WHATSAPP_NUMBER = "919340362381";

const REASONS = [
  {
    icon: Zap,
    title: "Fast when the shop is busy",
    text: "No lag during festival rush. Your cashier never gets stuck behind a spinner.",
  },
  {
    icon: ShieldCheck,
    title: "Your data stays yours",
    text: "Automated backups, per-shop data isolation and encrypted cloud storage in Mumbai.",
  },
  {
    icon: Globe,
    title: "Your brand, your domain",
    text: "Run your online store on your own address, with your logo and colours.",
  },
];

const FIELD =
  "w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/15";

export function ContactSection() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", businessName: "", service: "all", phone: "", message: "" });

  const whatsappUrl = () => {
    const text = encodeURIComponent(
      `Hi Vimlesh ji (Falcon 360),\nI am interested in your solutions.\nName: ${form.name || "Client"}\nBusiness: ${form.businessName || "Retail Store"}\nService: ${form.service}\nPhone: ${form.phone}\nMessage: ${form.message || "Please provide 14-day free trial setup and pricing details."}`
    );
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit inquiry.");
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to submit inquiry. Please connect via WhatsApp directly."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="relative scroll-mt-16 overflow-hidden bg-[#070A13] py-20 text-white sm:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-20 h-[460px] w-[460px] rounded-full bg-indigo-600/20 blur-[130px]" />
        <div className="absolute -right-40 bottom-0 h-[420px] w-[420px] rounded-full bg-teal-500/15 blur-[130px]" />
      </div>

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <Reveal>
          <div className="space-y-8">
            <SectionHead
              dark
              align="left"
              eyebrow="Engineered for Indian commerce"
              title={
                <>
                  Why shops choose <span className="text-teal-300">Falcon 360.</span>
                </>
              }
              sub="Built around the daily reality of Indian retail: heavy foot traffic, barcode labels, GST, supplier credit and instant WhatsApp communication."
            />
            <div className="space-y-3">
              {REASONS.map((r) => (
                <div key={r.title} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-300">
                    <r.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{r.title}</h3>
                    <p className="mt-0.5 text-sm text-slate-400">{r.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="rounded-3xl border border-white/12 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-6 shadow-2xl backdrop-blur-xl sm:p-9">
            <h3 className="font-display text-2xl font-bold">Start your project with us</h3>
            <p className="mt-1.5 text-sm text-slate-400">
              Want a custom website, dedicated POS or a full Cloud ERP? Tell us what you need and we&apos;ll call you.
            </p>

            {submitted ? (
              <div className="mt-6 space-y-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
                <h4 className="text-base font-bold">Thank you for reaching out!</h4>
                <p className="text-sm text-slate-300">
                  We received your inquiry. Our team will contact you on <strong>{form.phone}</strong> shortly.
                </p>
                <a
                  href={whatsappUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-400"
                >
                  <MessageCircle className="h-4 w-4" />
                  Connect now on WhatsApp
                </a>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="lead-name" className="text-xs font-semibold text-slate-300">
                    Your full name *
                  </label>
                  <input
                    id="lead-name"
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={FIELD}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="lead-biz" className="text-xs font-semibold text-slate-300">
                      Business / store name
                    </label>
                    <input
                      id="lead-biz"
                      type="text"
                      placeholder="e.g. Apex Retail Store"
                      value={form.businessName}
                      onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                      className={FIELD}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="lead-phone" className="text-xs font-semibold text-slate-300">
                      Mobile / WhatsApp no. *
                    </label>
                    <input
                      id="lead-phone"
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className={FIELD}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="lead-service" className="text-xs font-semibold text-slate-300">
                    What are you interested in?
                  </label>
                  <select
                    id="lead-service"
                    value={form.service}
                    onChange={(e) => setForm({ ...form, service: e.target.value })}
                    className={`${FIELD} bg-[#0B1026]`}
                  >
                    <option value="all">Complete Falcon 360 (ERP + POS + Website)</option>
                    <option value="erp">Cloud ERP (Inventory, GST, Branches)</option>
                    <option value="pos">High-speed POS software &amp; hardware</option>
                    <option value="custom-web">Custom website development</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="lead-msg" className="text-xs font-semibold text-slate-300">
                    Requirements (optional)
                  </label>
                  <textarea
                    id="lead-msg"
                    rows={3}
                    placeholder="Tell us your store type, number of branches or what you need built..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className={FIELD}
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div>
                )}

                <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-teal-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-opacity hover:opacity-95 disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit inquiry"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <a
                    href={whatsappUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 py-3.5 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp direct
                  </a>
                </div>

                <p className="pt-1 text-center text-xs text-slate-400">
                  Prefer self-service?{" "}
                  <Link href="/register" className="font-semibold text-indigo-300 hover:underline">
                    Start your instant 14-day free trial &rarr;
                  </Link>
                </p>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
