import type { Metadata } from "next";
import { Sora } from "next/font/google";
import { ContactSection } from "@/components/home/ContactSection";
import { DemoBand } from "@/components/home/DemoBand";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { HeroSection } from "@/components/home/HeroSection";
import { HomeNav } from "@/components/home/HomeNav";
import { PricingSection } from "@/components/home/PricingSection";
import { ProductBento } from "@/components/home/ProductBento";
import { SiteFooter } from "@/components/home/SiteFooter";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });

export const metadata: Metadata = {
  title: "Falcon 360 | Cloud ERP, Smart POS & Online Store for Indian Retail",
  description:
    "Billing, stock, udhar and your online store in one system. GST invoices, UPI, thermal printing and barcode scanning. Start a 14-day free trial.",
};

export default function FalconHomePage() {
  return (
    <div className={`${sora.variable} min-h-screen overflow-x-hidden bg-[#F5F6FA] font-sans text-slate-900 antialiased`}>
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 px-4 py-2 text-center text-xs font-medium text-white">
        <span className="font-semibold">14-day free trial is live.</span> Full ERP, POS &amp; online store. No setup fee.
      </div>
      <HomeNav />
      <main>
        <HeroSection />
        <ProductBento />
        <FeatureGrid />
        <DemoBand />
        <PricingSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </div>
  );
}
