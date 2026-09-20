"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";

const LINKS = [
  { href: "#erp", label: "Cloud ERP" },
  { href: "#pos", label: "Smart POS" },
  { href: "#custom-web", label: "Online Store" },
  { href: "#pricing", label: "Pricing" },
  { href: "#contact", label: "Contact" },
];

export function HomeNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        scrolled ? "border-white/10 bg-[#070A13]/90 backdrop-blur-xl" : "border-transparent bg-[#070A13] backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-[68px] w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="Falcon 360 home">
          <Image
            src="/falcon-icon.png"
            alt=""
            width={38}
            height={38}
            priority
            className="h-[38px] w-[38px] object-contain drop-shadow-[0_0_14px_rgba(45,212,191,0.4)] transition-transform group-hover:scale-105"
          />
          <span className="font-display text-[1.25rem] font-bold tracking-tight text-white">
            Falcon{" "}
            <span className="bg-gradient-to-r from-teal-300 to-indigo-300 bg-clip-text text-transparent">360</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="group inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_8px_24px_-10px_rgba(255,255,255,0.5)] transition-transform hover:scale-[1.03]"
          >
            Start free trial
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[#070A13]/95 px-4 pb-5 pt-3 backdrop-blur-xl lg:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-base font-medium text-slate-200 hover:bg-white/5"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-white/15 py-3 text-center text-sm font-semibold text-white"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-white py-3 text-center text-sm font-semibold text-slate-900"
            >
              Start free trial
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
