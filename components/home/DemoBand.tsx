import Link from "next/link";
import { ArrowUpRight, BarChart3, ShoppingCart, Store } from "lucide-react";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";

const DEMOS = [
  {
    href: "/store",
    icon: Store,
    kicker: "Customer facing",
    title: "Live storefront",
    text: "Browse products, view offers, fill a cart and place a test order like a real customer.",
    cta: "Open storefront",
    glow: "from-teal-500/30",
  },
  {
    href: "/pos",
    icon: ShoppingCart,
    kicker: "Cashier terminal",
    title: "High-speed POS",
    text: "Try barcode billing, keyboard shortcuts, split payments and receipt printing.",
    cta: "Launch POS",
    glow: "from-violet-500/30",
  },
  {
    href: "/login",
    icon: BarChart3,
    kicker: "Owner control",
    title: "ERP dashboard",
    text: "Sign in to see sales analytics, purchases, inventory, customer demand and supplier ledgers.",
    cta: "Log in to ERP",
    glow: "from-indigo-500/30",
  },
];

export function DemoBand() {
  return (
    <section id="demos" className="relative scroll-mt-16 overflow-hidden bg-[#070A13] py-20 text-white sm:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[140px]" />
      </div>
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHead
            dark
            eyebrow="Try it live"
            title={
              <>
                See Falcon 360 <span className="text-teal-300">working, not just described.</span>
              </>
            }
            sub="These are the real screens, not screenshots. Click in and look around."
          />
        </Reveal>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {DEMOS.map((d, i) => (
            <Reveal key={d.href} delay={i * 90}>
              <Link
                href={d.href}
                className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-white/25"
              >
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br ${d.glow} to-transparent opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100`}
                />
                <span className="relative mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <d.icon className="h-5 w-5" />
                </span>
                <p className="relative text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{d.kicker}</p>
                <h3 className="relative mt-1.5 font-display text-2xl font-bold">{d.title}</h3>
                <p className="relative mt-3 flex-1 text-[15px] leading-relaxed text-slate-300">{d.text}</p>
                <span className="relative mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                  {d.cta}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
