import Link from "next/link";
import { ArrowRight, BadgePercent, Cloud, Printer, Sparkles, Wallet } from "lucide-react";
import { HeroScene } from "./HeroScene";

const FACTS = [
  { icon: BadgePercent, title: "GST invoices", text: "HSN-ready, one tap" },
  { icon: Wallet, title: "UPI, cash, card, udhar", text: "Split any bill" },
  { icon: Printer, title: "58 / 80mm thermal", text: "Plug in and print" },
  { icon: Cloud, title: "Cloud backups", text: "Hosted in Mumbai" },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#070A13] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-[640px] w-[920px] -translate-x-1/2 rounded-full bg-indigo-600/25 blur-[150px]" />
        <div className="absolute -right-40 top-1/3 h-[480px] w-[480px] rounded-full bg-teal-500/15 blur-[130px]" />
        <div className="absolute -left-32 bottom-0 h-[380px] w-[380px] rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute inset-0 [background-image:radial-gradient(rgba(148,163,184,0.22)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_72%)]" />
      </div>

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-4 px-4 pb-6 pt-12 sm:px-6 lg:grid-cols-[0.8fr_1.4fr] lg:gap-2 lg:px-8 lg:pb-10 lg:pt-16">
        <div className="relative z-10 max-w-xl space-y-7">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-white/[0.06] py-1.5 pl-2 pr-4 text-xs font-medium text-slate-200 backdrop-blur-md">
            <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-teal-400/20">
              <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-teal-400/70" />
              <span className="relative h-2 w-2 rounded-full bg-teal-300" />
            </span>
            Built for Indian retail &mdash; GST, UPI &amp; udhar ready
          </div>

          <h1 className="font-display text-[2.6rem] font-bold leading-[1.04] tracking-tight sm:text-6xl lg:text-[4rem]">
            Run your whole shop from{" "}
            <span className="bg-gradient-to-r from-teal-300 via-indigo-300 to-violet-300 bg-clip-text text-transparent">
              one screen.
            </span>
          </h1>

          <p className="text-base leading-relaxed text-slate-300 sm:text-lg">
            Falcon 360 brings billing, stock, udhar and your online store together &mdash; so the counter, the godown
            and your WhatsApp orders always tell the same story.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-r from-indigo-500 to-teal-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_-14px_rgba(79,70,229,0.8)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4" />
              Start 14-day free trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#demos"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-white/[0.05] px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/10"
            >
              Try the live demo
            </a>
          </div>

          <p className="text-xs text-slate-400">
            No card needed &nbsp;&middot;&nbsp; Set up in minutes &nbsp;&middot;&nbsp; Works on phone, tablet &amp; PC
          </p>
        </div>

        <div className="relative h-[360px] sm:h-[520px] lg:h-[640px]">
          <HeroScene className="absolute inset-0" />
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 backdrop-blur-md lg:grid-cols-4">
          {FACTS.map((f) => (
            <div key={f.title} className="flex items-center gap-3 bg-[#0B1026]/85 px-5 py-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-teal-300">
                <f.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{f.title}</p>
                <p className="text-xs text-slate-400">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
