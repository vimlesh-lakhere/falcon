import {
  BadgePercent,
  BookOpen,
  Bell,
  Cloud,
  MessageCircle,
  Printer,
  ScanBarcode,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";

const STEPS = [
  {
    n: "01",
    title: "Sign up in a minute",
    text: "Create your store, no card needed. Your 14-day trial starts instantly with every feature switched on.",
  },
  {
    n: "02",
    title: "Add your products",
    text: "Type them in, import a sheet, or let the camera and barcode scanner do the work. Print your own labels.",
  },
  {
    n: "03",
    title: "Bill, sell & grow",
    text: "Bill at the counter, take online orders, track udhar, and watch profit update after every sale.",
  },
];

const FEATURES = [
  { icon: BadgePercent, title: "GST-ready invoices", text: "HSN codes, tax breakup and Excel export for your CA." },
  { icon: BookOpen, title: "Udhar / khata ledger", text: "Customer and supplier balances with payment history." },
  { icon: ScanBarcode, title: "Barcode & labels", text: "Scan to bill and print your own barcode stickers." },
  { icon: Printer, title: "Thermal printing", text: "58mm and 80mm ESC/POS receipts, Bluetooth or USB." },
  { icon: MessageCircle, title: "WhatsApp invoices", text: "Send bills and payment reminders in one tap." },
  { icon: Bell, title: "Low-stock alerts", text: "Know what to reorder before the shelf runs empty." },
  { icon: Users, title: "Staff roles", text: "Owner, manager and cashier logins with the right access." },
  { icon: Cloud, title: "Cloud backup", text: "Your data lives in Mumbai and syncs to Google Drive." },
  { icon: ShieldCheck, title: "Private by design", text: "Every shop's data is isolated from every other shop." },
];

export function FeatureGrid() {
  return (
    <section className="relative border-t border-slate-200/70 bg-white py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHead
            eyebrow="How it works"
            title={
              <>
                From sign-up to first bill in <span className="text-indigo-600">one sitting.</span>
              </>
            }
          />
        </Reveal>

        <div className="relative mt-14 grid gap-6 md:grid-cols-3">
          <div
            aria-hidden
            className="pointer-events-none absolute left-[16%] right-[16%] top-8 hidden h-px bg-gradient-to-r from-transparent via-indigo-300 to-transparent md:block"
          />
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <div className="relative h-full rounded-3xl border border-slate-200 bg-[#F8F9FC] p-7">
                <span className="relative mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 font-display text-lg font-bold text-white shadow-lg shadow-slate-900/20">
                  {s.n}
                </span>
                <h3 className="font-display text-xl font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-24">
          <Reveal>
            <SectionHead
              eyebrow="Built for the counter"
              title={
                <>
                  Everything a shop needs, <span className="text-indigo-600">nothing it doesn&apos;t.</span>
                </>
              }
              sub="Made around how Indian shops actually work: rush-hour billing, GST, udhar and WhatsApp."
            />
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 80}>
                <div className="group h-full rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_24px_50px_-28px_rgba(79,70,229,0.45)]">
                  <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-base font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
