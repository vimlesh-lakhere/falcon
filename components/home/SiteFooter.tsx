import Image from "next/image";
import Link from "next/link";
import { Globe, Mail, MessageCircle } from "lucide-react";

const COLUMNS = [
  {
    title: "Solutions",
    links: [
      { href: "#erp", label: "Cloud ERP" },
      { href: "#pos", label: "Smart POS" },
      { href: "#custom-web", label: "Online store & websites" },
      { href: "#pricing", label: "Pricing" },
    ],
  },
  {
    title: "Live access",
    links: [
      { href: "/login", label: "ERP login" },
      { href: "/store", label: "Storefront demo" },
      { href: "/pos", label: "POS terminal" },
      { href: "/pay", label: "Client payment" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#04060C] px-4 pb-10 pt-16 text-slate-400 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <Image src="/falcon-icon.png" alt="" width={34} height={34} className="h-[34px] w-[34px] object-contain" />
            <span className="font-display text-lg font-bold text-white">
              Falcon <span className="text-teal-300">360</span>
            </span>
          </div>
          <p className="max-w-xs text-sm leading-relaxed">
            Cloud ERP, fast POS and online stores for Indian retail and wholesale.
          </p>
          <p className="font-mono text-[11px] text-slate-500">Hosted in Mumbai (ap-south-1) &middot; SSL secured</p>
        </div>

        {COLUMNS.map((c) => (
          <div key={c.title} className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">{c.title}</h4>
            <ul className="space-y-2 text-sm">
              {c.links.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith("#") ? (
                    <a href={l.href} className="transition-colors hover:text-white">
                      {l.label}
                    </a>
                  ) : (
                    <Link href={l.href} className="transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">Contact &amp; support</h4>
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-indigo-300" /> falcon360.in
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-indigo-300" /> support@falcon360.in
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-emerald-400" /> WhatsApp Business active
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-12 flex w-full max-w-7xl flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-8 text-xs text-slate-500 sm:flex-row">
        <p>&copy; 2026 Falcon 360. All rights reserved.</p>
        <p>GST ready &middot; Multi-branch ready &middot; Made in India</p>
      </div>
    </footer>
  );
}
