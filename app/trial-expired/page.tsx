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
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Shop } from "@/types/database";

export default function TrialExpiredPage() {
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<Shop | null>(null);
  const [userName, setUserName] = useState<string>("Store Owner");
  const [retentionDaysLeft, setRetentionDaysLeft] = useState<number>(16);

  useEffect(() => {
    async function checkStoreStatus() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
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

              // If already activated, redirect to dashboard!
              if (shopData.plan !== "trial" || (shopData.is_active && shopData.status === "active")) {
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

  const getWhatsAppReactivationUrl = () => {
    const storeName = shop?.name || "My Store";
    const phone = shop?.phone || "";
    const text = encodeURIComponent(
      `Namaste Vimlesh ji,\nMy 14-day free trial for "${storeName}" on Falcon 360 ERP has ended.\nOwner: ${userName}\nPhone: ${phone}\n\nI want to reactivate my account and upgrade to the Pro plan. Please share the subscription details!`
    );
    return `https://wa.me/919340362381?text=${text}`;
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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5">
            <div className="w-full h-full bg-[#0B0F19] rounded-[10px] flex items-center justify-center font-black text-indigo-400">
              F
            </div>
          </div>
          <span className="text-lg font-black tracking-tight text-white font-mono">
            FALCON <span className="text-indigo-400">360</span>
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
      <main className="relative z-10 flex-1 max-w-4xl mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-semibold mb-6 animate-pulse">
          <Clock className="w-4 h-4 text-rose-400" />
          <span>14-Day Free Trial Concluded</span>
        </div>

        {/* Primary Heading */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight max-w-2xl">
          Your Free Trial Has Ended.
          <span className="block mt-2 bg-gradient-to-r from-rose-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            Activate Now to Continue.
          </span>
        </h1>

        <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed">
          Hello <strong className="text-slate-200">{userName}</strong>! The 14-day evaluation period for{" "}
          <strong className="text-indigo-300">{shop?.name || "your store"}</strong> has completed. Your account is temporarily
          deactivated until activated by the Falcon administrator.
        </p>

        {/* 30-Day Data Retention Guarantee Card */}
        <div className="w-full mt-8 p-6 rounded-2xl bg-[#0F1422] border border-indigo-500/20 shadow-xl text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">30-Day Data Retention Policy Active</h2>
                <p className="text-xs text-slate-400">
                  Your products, inventory, customers, and billing records are safe.
                </p>
              </div>
            </div>

            <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold font-mono">
              ⏳ {retentionDaysLeft} Days Left Until Purge
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Catalog & Products Saved</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Customer Invoices Saved</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>One-Click Store Reactivation</span>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-slate-500">
            Note: If your subscription is not confirmed within the 30-day window, unconfirmed trial data is permanently
            deleted from our cloud servers.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {/* WhatsApp Direct */}
          <a
            href={getWhatsAppReactivationUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2.5 group"
          >
            <MessageCircle className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
            <span>Chat on WhatsApp to Activate</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          {/* Direct Phone Call */}
          <a
            href="tel:+919340362381"
            className="px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-bold text-sm transition-all flex items-center justify-center gap-2.5"
          >
            <Phone className="w-4 h-4 text-indigo-400" />
            <span>Call Support (+91 9340362381)</span>
          </a>

          {/* Check Again Button */}
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-3.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
            title="Refresh if admin just activated your store"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Status</span>
          </button>
        </div>

        {/* Pro Plan Feature Bullets */}
        <div className="mt-12 w-full max-w-2xl text-left border-t border-white/10 pt-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Included When You Upgrade to Falcon 360 Pro
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-2.5">
              <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1 shrink-0" />
              <div>
                <strong className="text-white block font-semibold">High-Speed POS & Billing</strong>
                <span>Thermal receipts, barcode scanner integration & Hindi print support.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-2.5">
              <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1 shrink-0" />
              <div>
                <strong className="text-white block font-semibold">Real-Time Multi-Branch Stock</strong>
                <span>Automated inventory tracking, low-stock alerts & warehouse transfers.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-2.5">
              <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1 shrink-0" />
              <div>
                <strong className="text-white block font-semibold">Automated GST & P&L Reports</strong>
                <span>Generate GSTR reports, profit & loss statements, and daily sales summaries.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-2.5">
              <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1 shrink-0" />
              <div>
                <strong className="text-white block font-semibold">Daily Cloud Backups</strong>
                <span>Encrypted Google Drive backups with one-click disaster recovery.</span>
              </div>
            </div>
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
