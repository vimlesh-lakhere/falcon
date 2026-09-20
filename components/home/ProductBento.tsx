import Link from "next/link";
import { ArrowRight, Boxes, Check, MessageCircle, Receipt, ScanBarcode, Store, TrendingUp } from "lucide-react";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";
import { Tilt } from "./Tilt";

const CARD =
  "relative h-full overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_1px_0_rgba(15,23,42,0.04),0_30px_70px_-34px_rgba(30,41,90,0.35)] sm:p-8";

function Chips({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2.5 sm:grid-cols-2">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-2.5 text-sm text-slate-700">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
          {t}
        </li>
      ))}
    </ul>
  );
}

function ErpMock() {
  return (
    <div className="rounded-2xl bg-[#0B1026] p-4 text-white shadow-xl sm:p-5">
      <div className="mb-4 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        <span>Store overview</span>
        <span className="flex items-center gap-1.5 text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-xl bg-white/[0.06] p-3">
          <p className="text-[10px] text-slate-400">Today&apos;s sales</p>
          <p className="mt-1 text-lg font-bold">&#8377;84,250</p>
          <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-emerald-300">
            <TrendingUp className="h-3 w-3" /> 18.2%
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.06] p-3">
          <p className="text-[10px] text-slate-400">Net margin</p>
          <p className="mt-1 text-lg font-bold">28.4%</p>
          <p className="mt-0.5 text-[10px] font-semibold text-indigo-300">COGS &amp; tax live</p>
        </div>
        <div className="rounded-xl bg-white/[0.06] p-3">
          <p className="text-[10px] text-slate-400">Low stock</p>
          <p className="mt-1 text-lg font-bold">12 items</p>
          <p className="mt-0.5 text-[10px] font-semibold text-amber-300">Reorder ready</p>
        </div>
      </div>
      <svg viewBox="0 0 400 120" className="mt-4 h-28 w-full" role="img" aria-label="Sales trend rising through the day">
        <defs>
          <linearGradient id="erp-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#5EEAD4" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#5EEAD4" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0,92 C40,84 62,98 100,74 C140,48 172,78 212,54 C252,30 292,60 332,32 C356,16 380,24 400,10 L400,120 L0,120 Z"
          fill="url(#erp-area)"
        />
        <path
          d="M0,92 C40,84 62,98 100,74 C140,48 172,78 212,54 C252,30 292,60 332,32 C356,16 380,24 400,10"
          fill="none"
          stroke="#5EEAD4"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="400" cy="10" r="5" fill="#5EEAD4" />
      </svg>
    </div>
  );
}

function PosMock() {
  const rows = [
    ["Basmati Rice 5kg", "560"],
    ["Amul Butter 500g", "570"],
    ["Tata Salt 1kg", "84"],
  ];
  return (
    <div className="rounded-2xl bg-[#0B1026] p-4 text-white shadow-xl">
      <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        <span>Counter 01</span>
        <span className="text-indigo-300">[N] New bill</span>
      </div>
      <div className="relative mb-3 overflow-hidden rounded-xl bg-white/[0.06] p-3">
        <div className="flex h-10 items-stretch gap-[3px] opacity-90">
          {Array.from({ length: 34 }).map((_, i) => (
            <span key={i} className="bg-white" style={{ width: `${2 + ((i * 7) % 4)}px` }} />
          ))}
        </div>
        <span className="absolute inset-x-3 h-[2px] animate-scanline rounded-full bg-rose-500 shadow-[0_0_12px_2px_rgba(244,63,94,0.8)]" />
      </div>
      <div className="space-y-1.5">
        {rows.map(([n, a]) => (
          <div key={n} className="flex items-center justify-between rounded-lg bg-white/[0.05] px-3 py-2 text-xs">
            <span className="text-slate-200">{n}</span>
            <span className="font-semibold">&#8377;{a}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-gradient-to-r from-indigo-500 to-teal-500 px-3.5 py-2.5">
        <span className="text-xs font-semibold">Total (GST incl.)</span>
        <span className="text-base font-extrabold">&#8377;1,214</span>
      </div>
    </div>
  );
}

function StoreMock() {
  const tiles = [
    ["Basmati Rice 5kg", "560", "from-amber-200 to-orange-300"],
    ["Amul Butter", "285", "from-yellow-100 to-amber-200"],
    ["Surf Excel 1kg", "210", "from-sky-200 to-indigo-300"],
    ["Tata Salt 1kg", "28", "from-slate-200 to-slate-300"],
  ];
  return (
    <div className="mx-auto w-full max-w-[290px] rounded-[26px] border border-slate-200 bg-slate-50 p-3 shadow-xl">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-[11px] font-bold text-slate-800">Your Store</span>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Open now</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map(([n, p, g]) => (
          <div key={n} className="rounded-2xl border border-slate-200 bg-white p-2">
            <div className={`mb-2 h-16 rounded-xl bg-gradient-to-br ${g}`} />
            <p className="truncate text-[11px] font-semibold text-slate-800">{n}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-900">&#8377;{p}</span>
              <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">Add</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2 text-[11px] font-bold text-white">
        <MessageCircle className="h-3.5 w-3.5" /> Order on WhatsApp
      </div>
    </div>
  );
}

export function ProductBento() {
  return (
    <section className="relative bg-[#F5F6FA] py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHead
            eyebrow="One system, three superpowers"
            title={
              <>
                Everything your shop runs on, <span className="text-indigo-600">finally connected.</span>
              </>
            }
            sub="Stop juggling a billing app, a stock register and a separate website. Falcon 360 keeps them in one place, so every sale updates every screen."
          />
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-6">
          <Reveal className="lg:col-span-4">
            <Tilt className="h-full">
              <div id="erp" className={`${CARD} flex flex-col justify-center scroll-mt-24`}>
                <div className="grid items-center gap-8 xl:grid-cols-[1fr_1.05fr]">
                  <div className="space-y-5">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                      <Boxes className="h-5 w-5" />
                    </span>
                    <h3 className="font-display text-2xl font-bold leading-tight text-slate-900 sm:text-[1.9rem]">
                      Cloud ERP for stock, branches &amp; cash flow
                    </h3>
                    <p className="text-[15px] leading-relaxed text-slate-600">
                      See sales, profit and low stock in real time &mdash; across every branch, from any phone.
                    </p>
                    <Chips
                      items={[
                        "Multi-branch live stock",
                        "Automated GST invoicing",
                        "Supplier ledger & purchases",
                        "Kharidi parchi shortage pad",
                        "Margin & profit reports",
                        "Owner, manager & cashier roles",
                      ]}
                    />
                    <Link
                      href="/login"
                      className="group inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      Open the ERP dashboard
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                  <ErpMock />
                </div>
              </div>
            </Tilt>
          </Reveal>

          <Reveal delay={90} className="lg:col-span-2">
            <Tilt className="h-full">
              <div id="pos" className={`${CARD} flex flex-col gap-6 scroll-mt-24`}>
                <div className="space-y-4">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                    <Receipt className="h-5 w-5" />
                  </span>
                  <h3 className="font-display text-2xl font-bold leading-tight text-slate-900">
                    Smart POS that never keeps a customer waiting
                  </h3>
                  <p className="text-[15px] leading-relaxed text-slate-600">
                    Scan, bill, print. Works with barcode scanners and 58/80mm thermal printers.
                  </p>
                </div>
                <PosMock />
                <div className="mt-auto space-y-3">
                  <ul className="space-y-2 text-sm text-slate-700">
                    {["Hold & recall multiple carts", "Split tender: UPI, cash, card, udhar", "Keyboard-only billing shortcuts"].map(
                      (t) => (
                        <li key={t} className="flex items-center gap-2.5">
                          <ScanBarcode className="h-4 w-4 shrink-0 text-violet-500" />
                          {t}
                        </li>
                      )
                    )}
                  </ul>
                  <Link
                    href="/pos"
                    className="group inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700"
                  >
                    Launch the POS demo
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </Tilt>
          </Reveal>

          <Reveal delay={60} className="lg:col-span-6">
            <Tilt className="h-full" max={3}>
              <div id="custom-web" className={`${CARD} flex flex-col justify-center scroll-mt-24`}>
                <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
                  <div className="space-y-5">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-600">
                      <Store className="h-5 w-5" />
                    </span>
                    <h3 className="font-display text-2xl font-bold leading-tight text-slate-900 sm:text-[1.9rem]">
                      An online store that shares your shelf
                    </h3>
                    <p className="max-w-xl text-[15px] leading-relaxed text-slate-600">
                      Customers browse and order on your own store link, and every order lands in the same ERP as your
                      counter sales. Need something bespoke? We build custom websites on your own domain, synced with
                      your stock.
                    </p>
                    <Chips
                      items={[
                        "Your own store link & branding",
                        "Live stock, no double selling",
                        "WhatsApp & UPI order flow",
                        "Custom website on your domain",
                      ]}
                    />
                    <Link
                      href="/store"
                      className="group inline-flex items-center gap-2 text-sm font-semibold text-teal-600 hover:text-teal-700"
                    >
                      See a live storefront
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                  <StoreMock />
                </div>
              </div>
            </Tilt>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
