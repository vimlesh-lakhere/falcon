"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  MessageCircle,
  Phone,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
  Check,
  Shield,
  Send,
  X,
  Trash2,
  UserCheck,
  Lock,
  Unlock,
  Building2,
  Database,
  Calendar,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { saasTrialsRepository, TenantShopWithMetrics } from "@/repositories/saas-trials.repo";
import { leadsRepository } from "@/repositories/leads.repo";
import { Lead } from "@/types/database";
import { sanitizeIndianPhone, getWhatsAppShareUrl } from "@/lib/whatsapp-invoice";
import { useAuthStore } from "@/store/useAuthStore";

export default function AdminTrialsCrmPage() {
  const { profile } = useAuthStore();
  const [shops, setShops] = useState<TenantShopWithMetrics[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "expiring" | "expired" | "converted">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // WhatsApp Drawer / Modal State
  const [selectedTarget, setSelectedTarget] = useState<{
    name: string;
    business: string;
    phone: string;
    trialDaysRemaining?: number;
    retentionDaysRemaining?: number;
    isExpired?: boolean;
    service?: string;
  } | null>(null);

  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [customMessage, setCustomMessage] = useState("");

  // Subscription Activation Modal State
  const [activationTarget, setActivationTarget] = useState<{
    id: string;
    name: string;
    ownerName: string;
    phone: string;
    currentPlan?: string;
  } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("pro");
  const [selectedDurationMonths, setSelectedDurationMonths] = useState<number>(1);
  const [amountPaid, setAmountPaid] = useState<number>(999);
  const [isActivating, setIsActivating] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [shopsData, leadsData] = await Promise.all([
        saasTrialsRepository.getAllTenantShops(),
        leadsRepository.getAll(),
      ]);
      setShops(shopsData);
      setLeads(leadsData);
    } catch (err: any) {
      console.error("Failed to load trial CRM data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunMaintenance = async () => {
    try {
      setIsRefreshing(true);
      setStatusMessage("Running trial check and synchronization...");
      const res = await fetch("/api/cron/trials-maintenance", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(
          `Sync complete: ${data.summary.deactivatedExpiredTrials} trials locked, ${data.summary.deactivatedExpiredSubscriptions || 0} expired subscriptions locked, ${data.summary.alertedExpiringSoon} deals alerted.`
        );
      }
      await loadData();
    } catch (err: any) {
      console.error(err);
      setStatusMessage("Maintenance check failed.");
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setStatusMessage(null), 6000);
    }
  };

  const handleOpenActivationModal = (shop: TenantShopWithMetrics) => {
    const ownerName = shop.ownerProfile?.full_name || shop.owner_name || "Store Owner";
    const phone = shop.phone || shop.ownerProfile?.phone || "";
    setActivationTarget({
      id: shop.id,
      name: shop.name,
      ownerName,
      phone,
      currentPlan: shop.plan,
    });
    setSelectedPlan(shop.plan === "enterprise" ? "enterprise" : "pro");
    setSelectedDurationMonths(1);
    setAmountPaid(599);
  };

  const handleConfirmActivation = async () => {
    if (!activationTarget) return;
    try {
      setIsActivating(true);
      await saasTrialsRepository.activateShop(activationTarget.id, {
        plan: selectedPlan,
        durationMonths: selectedDurationMonths,
        amountPaid: Number(amountPaid) || 0,
      });
      setStatusMessage(
        `🎉 Paid subscription activated for "${activationTarget.name}" for ${
          selectedDurationMonths > 0 ? `${selectedDurationMonths} month(s)` : "Lifetime"
        }!`
      );
      setActivationTarget(null);
      await loadData();
    } catch (err: any) {
      alert("Activation failed: " + err.message);
    } finally {
      setIsActivating(false);
    }
  };

  const handleExtendTrial = async (shopId: string, days: number = 7) => {
    try {
      await saasTrialsRepository.extendTrial(shopId, days);
      setStatusMessage(`Trial successfully extended by ${days} days!`);
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleDeactivateStore = async (shopId: string) => {
    if (!confirm("Are you sure you want to deactivate and lock this store?")) return;
    try {
      await saasTrialsRepository.deactivateShop(shopId);
      setStatusMessage("Store locked and deactivated.");
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handlePurgeStore = async (shopId: string, storeName: string) => {
    if (
      !confirm(
        `WARNING: Are you sure you want to permanently purge store "${storeName}" and ALL its data? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await saasTrialsRepository.purgeShopData(shopId);
      setStatusMessage(`Store "${storeName}" purged successfully.`);
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Metrics Calculations
  const tenantShops = shops.filter((s) => s.id !== "a0000000-0000-0000-0000-000000000001");
  const activeTrialsCount = tenantShops.filter((s) => s.plan === "trial" && s.is_active && !s.isExpired).length;
  const expiringSoonCount = tenantShops.filter((s) => s.plan === "trial" && s.isExpiringSoon).length;
  const expiredCount = tenantShops.filter((s) => s.plan === "trial" && (s.isExpired || !s.is_active)).length;
  const convertedCount = tenantShops.filter((s) => s.plan === "pro" || s.plan === "enterprise" || s.plan === "lifetime").length;
  const totalInquiries = leads.length;

  // Filtered Shops
  const filteredShops = tenantShops.filter((shop) => {
    const ownerName = shop.ownerProfile?.full_name || shop.owner_name || "";
    const matchesSearch =
      shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shop.phone && shop.phone.includes(searchQuery));

    if (!matchesSearch) return false;

    if (activeTab === "active") return shop.plan === "trial" && shop.is_active && !shop.isExpired;
    if (activeTab === "expiring") return shop.plan === "trial" && shop.isExpiringSoon;
    if (activeTab === "expired") return shop.plan === "trial" && (shop.isExpired || !shop.is_active);
    if (activeTab === "converted") return shop.plan === "pro" || shop.plan === "enterprise";
    return true;
  });

  // Sales Templates
  const getTemplates = (target: typeof selectedTarget) => {
    if (!target) return [];
    const name = target.name || "Customer";
    const business = target.business || "Store";
    const daysLeft = target.trialDaysRemaining ?? 0;
    const purgeDaysLeft = target.retentionDaysRemaining ?? 16;

    return [
      {
        id: "welcome",
        title: "1. Welcome & Free Demo Walkthrough (Day 1-3)",
        text: `नमस्ते ${name} जी,\nFalcon 360 Cloud ERP में आपका स्वागत है!\nआपके स्टोर '${business}' का 14-दिन का फ्री ट्रायल चालू हो गया है।\n\nक्या हम आपके लिए 10 मिनट का क्विक डेमो या बारकोड व बिलिंग प्रिंटर सेटअप कॉल शेड्यूल कर सकते हैं? हमारी टीम आपकी पूरी सहायता करेगी।\n\nसादर,\nविमलेश लाखेरे\nFalcon 360 Enterprise ERP\n📞 +91 9340362381`,
      },
      {
        id: "mid_trial",
        title: "2. Mid-Trial Check-in (Day 7)",
        text: `Hello ${name} ji,\nHow is your experience with Falcon ERP at '${business}'?\nDid you test our fast barcode billing, GST invoices, and low-stock alerts?\n\nLet me know if you need any custom features or training for your staff!\n\nBest regards,\nVimlesh Lakhere\nFalcon 360 Cloud ERP`,
      },
      {
        id: "urgency_deal",
        title: "3. Hot Deal: 48-Hour Trial Expiry (Special 20% OFF)",
        text: `नमस्ते ${name} जी,\nआपके स्टोर '${business}' का 14-दिन का फ्री ट्रायल सिर्फ ${Math.max(1, daysLeft)} दिनों में समाप्त हो रहा है।\n\nआज ही अपग्रेड करने पर हम आपको दे रहे हैं:\n🎁 20% स्पेशल इनॉग्रल डिस्काउंट\n🚀 1 साल का फ्री ऑटोमैटिक गूगल ड्राइव बैकअप\n⚡ 24/7 प्रायोरिटी टेक्निकल सपोर्ट\n\nक्या हम आपका अकाउंट एक्टिवेट करें?\n- विमलेश लाखेरे (+91 9340362381)`,
      },
      {
        id: "trial_expired",
        title: "4. Trial Expired: Reactivate Now (Data Safe for 30 Days)",
        text: `नमस्ते ${name} जी,\nआपके स्टोर '${business}' का 14-दिन का फ्री ट्रायल समाप्त हो गया है और स्टोर अभी डीएक्टिवेट है।\n\nचिंता न करें: आपका सारा डेटा (कैटलॉग, प्रोडक्ट्स और बिलिंग रिकॉर्ड्स) हमारी 30-दिन की डेटा सुरक्षा पॉलिसी के तहत पूरी तरह से सुरक्षित है।\n\nअपने स्टोर की बिलिंग बिना रुकावट चालू रखने के लिए आज ही अपना प्रो प्लान एक्टिवेट करवाएं।\n\nसंपर्क करें: +91 9340362381`,
      },
      {
        id: "purge_warning",
        title: "5. 30-Day Purge Warning (Final Notice before Data Deletion)",
        text: `⚠️ अंतिम सूचना (Final Notice):\nनमस्ते ${name} जी, आपके स्टोर '${business}' का 30-दिन का डेटा सुरक्षित रखने का समय अगले ${purgeDaysLeft} दिनों में पूरा हो जाएगा, जिसके बाद सर्वर से डेटा हमेशा के लिए डिलीट हो जाएगा।\n\nअपना डेटा और स्टोर एक्टिवेट रखने के लिए कृपया तुरंत संपर्क करें।\n\nविमलेश लाखेरे, Falcon 360\n📞 +91 9340362381`,
      },
    ];
  };

  const openWhatsAppDrawer = (target: typeof selectedTarget) => {
    setSelectedTarget(target);
    const templates = getTemplates(target);
    // Auto pick appropriate template
    if (target?.isExpired) {
      setSelectedTemplateIndex(3);
      setCustomMessage(templates[3]?.text || "");
    } else if (target?.trialDaysRemaining !== undefined && target.trialDaysRemaining <= 2) {
      setSelectedTemplateIndex(2);
      setCustomMessage(templates[2]?.text || "");
    } else {
      setSelectedTemplateIndex(0);
      setCustomMessage(templates[0]?.text || "");
    }
  };

  const handleSendWhatsApp = () => {
    if (!selectedTarget?.phone) {
      alert("No valid phone number for this customer.");
      return;
    }
    const clean = sanitizeIndianPhone(selectedTarget.phone);
    const textToSend = customMessage.trim();
    const url = getWhatsAppShareUrl(clean, textToSend);
    window.open(url, "_blank");
  };

  return (
    <MainLayout>
      <div className="space-y-6 pb-12">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 shadow-md shadow-indigo-500/20">
                <div className="w-full h-full bg-[#0B0F19] rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                SaaS Leads & 14-Day Trials CRM
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold font-mono">
                Admin Center
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Automated 14-day trials, auto-deactivations, 30-day retention policies, and one-click WhatsApp deal closing.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunMaintenance}
              disabled={isRefreshing}
              className="flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              title="Checks all shops, auto-deactivates expired trials, sends 48h deal alerts, and purges 30-day unconfirmed stores"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Syncing..." : "Run Trial Check & Sync"}</span>
            </Button>
          </div>
        </div>

        {/* Status Toast Banner */}
        {statusMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-emerald-600 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Total Inquiries */}
          <Card className="border-surface-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Total Leads</span>
                <Building2 className="w-4 h-4 text-gray-400" />
              </div>
              <div className="text-2xl font-black text-gray-900 font-mono">{totalInquiries}</div>
              <div className="text-[11px] text-gray-500 mt-1">Inquiries & Signups</div>
            </CardContent>
          </Card>

          {/* Active 14-Day Trials */}
          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-emerald-800 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Active Trials</span>
                <Clock className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-900 font-mono">{activeTrialsCount}</div>
              <div className="text-[11px] text-emerald-700 mt-1">Running within 14 days</div>
            </CardContent>
          </Card>

          {/* Expiring Soon (<48h) */}
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-amber-800 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Hot Deals (&lt;48h)</span>
                <Flame className="w-4 h-4 text-amber-600 animate-bounce" />
              </div>
              <div className="text-2xl font-black text-amber-900 font-mono">{expiringSoonCount}</div>
              <div className="text-[11px] text-amber-700 mt-1 font-semibold">Priority follow-up needed</div>
            </CardContent>
          </Card>

          {/* Expired / Locked */}
          <Card className="border-rose-200 bg-rose-50/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-rose-800 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Locked / Expired</span>
                <Lock className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black text-rose-900 font-mono">{expiredCount}</div>
              <div className="text-[11px] text-rose-700 mt-1">30-day retention ticking</div>
            </CardContent>
          </Card>

          {/* Converted / Pro */}
          <Card className="border-indigo-200 bg-indigo-50/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-indigo-800 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Paid / Pro</span>
                <Shield className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-indigo-900 font-mono">{convertedCount}</div>
              <div className="text-[11px] text-indigo-700 mt-1">Converted businesses</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "all" ? "bg-white text-gray-900 shadow-xs font-bold" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              All Stores ({tenantShops.length})
            </button>
            <button
              onClick={() => setActiveTab("active")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "active" ? "bg-white text-emerald-700 shadow-xs font-bold" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Active Trials ({activeTrialsCount})
            </button>
            <button
              onClick={() => setActiveTab("expiring")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "expiring" ? "bg-white text-amber-700 shadow-xs font-bold" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Hot Deals (&lt;48h) ({expiringSoonCount})
            </button>
            <button
              onClick={() => setActiveTab("expired")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "expired" ? "bg-white text-rose-700 shadow-xs font-bold" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Expired / Locked ({expiredCount})
            </button>
            <button
              onClick={() => setActiveTab("converted")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "converted" ? "bg-white text-indigo-700 shadow-xs font-bold" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Pro / Converted ({convertedCount})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search store, owner, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {/* Main Stores & Trials Table */}
        <Card className="border-surface-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Store & Business</th>
                  <th className="py-3 px-4">Owner & Contact</th>
                  <th className="py-3 px-4">Plan & Status</th>
                  <th className="py-3 px-4">14-Day Trial Timeline</th>
                  <th className="py-3 px-4">30-Day Retention</th>
                  <th className="py-3 px-4 text-right">Instant Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                      Loading SaaS customer trials and leads...
                    </td>
                  </tr>
                ) : filteredShops.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      No customer stores found matching this filter.
                    </td>
                  </tr>
                ) : (
                  filteredShops.map((shop) => {
                    const ownerName = shop.ownerProfile?.full_name || shop.owner_name || "Store Owner";
                    const phone = shop.phone || shop.ownerProfile?.phone || "";
                    const isPro = shop.plan === "pro" || shop.plan === "enterprise";

                    return (
                      <tr key={shop.id} className="hover:bg-gray-50/80 transition-colors">
                        {/* Store Info */}
                        <td className="py-3.5 px-4 font-medium">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 shrink-0">
                              {shop.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-xs">{shop.name}</div>
                              <div className="text-[10px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono">ID: {shop.id.slice(0, 8)}</span>
                                <span>•</span>
                                <span>{new Date(shop.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Owner & Contact */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-gray-800">{ownerName}</div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                            {phone ? (
                              <span className="font-mono text-indigo-600 font-medium">{phone}</span>
                            ) : (
                              <span className="text-gray-400 italic">No phone</span>
                            )}
                            {shop.ownerProfile?.email && (
                              <span className="text-[10px] text-gray-400 max-w-[120px] truncate" title={shop.ownerProfile.email}>
                                {shop.ownerProfile.email}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Plan & Status */}
                        <td className="py-3.5 px-4">
                          {isPro ? (
                            shop.isSubscriptionExpired ? (
                              <Badge variant="danger" className="font-mono">
                                SUB EXPIRED
                              </Badge>
                            ) : shop.isSubscriptionExpiringSoon ? (
                              <Badge variant="warning" className="font-mono animate-pulse">
                                RENEW &lt;7D
                              </Badge>
                            ) : (
                              <Badge variant="success" className="font-mono">
                                {shop.subscription_duration_months ? `PRO (${shop.subscription_duration_months}M)` : "PRO ACTIVE"}
                              </Badge>
                            )
                          ) : shop.isExpired || !shop.is_active ? (
                            <Badge variant="danger" className="font-mono">
                              TRIAL LOCKED
                            </Badge>
                          ) : shop.isExpiringSoon ? (
                            <Badge variant="warning" className="font-mono animate-pulse">
                              HOT: &lt;48H
                            </Badge>
                          ) : (
                            <Badge variant="info" className="font-mono">
                              14D TRIAL
                            </Badge>
                          )}
                        </td>

                        {/* 14-Day Timeline / Paid Subscription Timeline */}
                        <td className="py-3.5 px-4">
                          {isPro ? (
                            shop.subscription_ends_at ? (
                              <div className="space-y-1 max-w-[140px]">
                                <div className="flex items-center justify-between text-[10px] font-bold">
                                  <span className={shop.isSubscriptionExpired ? "text-rose-600" : shop.isSubscriptionExpiringSoon ? "text-amber-600" : "text-emerald-700"}>
                                    {shop.isSubscriptionExpired ? "Expired" : `${shop.subscriptionDaysRemaining}d left`}
                                  </span>
                                  <span className="text-gray-400 font-mono">
                                    {new Date(shop.subscription_ends_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      shop.isSubscriptionExpired
                                        ? "bg-rose-500 w-full"
                                        : shop.isSubscriptionExpiringSoon
                                        ? "bg-amber-500 w-[85%]"
                                        : "bg-emerald-600 w-[60%]"
                                    }`}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" />
                                Lifetime Permanent
                              </span>
                            )
                          ) : (
                            <div className="space-y-1 max-w-[140px]">
                              <div className="flex items-center justify-between text-[10px] font-bold">
                                <span className={shop.isExpired ? "text-rose-600" : shop.isExpiringSoon ? "text-amber-600" : "text-emerald-600"}>
                                  {shop.isExpired ? "Expired" : `${shop.trialDaysRemaining} days left`}
                                </span>
                                <span className="text-gray-400 font-mono">
                                  {shop.trial_ends_at ? new Date(shop.trial_ends_at).toLocaleDateString() : "-"}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    shop.isExpired
                                      ? "bg-rose-500 w-full"
                                      : shop.isExpiringSoon
                                      ? "bg-amber-500 w-[85%]"
                                      : "bg-emerald-500 w-[50%]"
                                  }`}
                                />
                              </div>
                            </div>
                          )}
                        </td>

                        {/* 30-Day Retention */}
                        <td className="py-3.5 px-4">
                          {isPro ? (
                            <span className="text-gray-400 text-[11px]">Permanent Data</span>
                          ) : (
                            <div className="text-[11px]">
                              <div className="flex items-center gap-1 font-semibold text-gray-700">
                                <Database className="w-3.5 h-3.5 text-gray-400" />
                                <span>{Math.max(0, shop.retentionDaysRemaining)} days left</span>
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {shop.isPurgeReady ? (
                                  <span className="text-rose-600 font-bold">Purge Ready</span>
                                ) : (
                                  "Protected in Grace"
                                )}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* WhatsApp Messenger */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                openWhatsAppDrawer({
                                  name: ownerName,
                                  business: shop.name,
                                  phone: phone,
                                  trialDaysRemaining: shop.trialDaysRemaining,
                                  retentionDaysRemaining: shop.retentionDaysRemaining,
                                  isExpired: shop.isExpired || !shop.is_active,
                                  service: shop.service_type || "erp",
                                })
                              }
                              className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 text-[11px] h-7 px-2"
                              title="1-Click WhatsApp Deal Messenger"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>WhatsApp</span>
                            </Button>

                            {/* Activate to Paid / Renew Subscription */}
                            {!isPro ? (
                              <Button
                                size="sm"
                                onClick={() => handleOpenActivationModal(shop)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] h-7 px-2.5 flex items-center gap-1 shadow-xs"
                                title="Activate Paid Subscription (1, 3, 6, 12 months or lifetime)"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Activate</span>
                              </Button>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenActivationModal(shop)}
                                  className="bg-amber-600 hover:bg-amber-500 text-white text-[11px] h-7 px-2 flex items-center gap-1 shadow-xs"
                                  title="Renew Paid Subscription"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Renew</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeactivateStore(shop.id)}
                                  className="text-gray-500 hover:text-rose-600 text-[11px] h-7 px-2"
                                  title="Lock Store"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}

                            {/* Extend Trial */}
                            {!isPro && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleExtendTrial(shop.id, 7)}
                                className="text-gray-600 hover:text-indigo-600 text-[11px] h-7 px-2"
                                title="Extend trial by +7 days"
                              >
                                +7d
                              </Button>
                            )}

                            {/* Purge Store Data */}
                            {!isPro && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handlePurgeStore(shop.id, shop.name)}
                                className="text-gray-400 hover:text-rose-600 text-[11px] h-7 px-1.5"
                                title="Purge Store Data"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Inquiries / Landing Page Leads Section */}
        <div className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">Website Service Inquiries & Leads</h2>
              <p className="text-xs text-gray-500">Incoming inquiries submitted through the Falcon 360 landing page.</p>
            </div>
            <span className="text-xs font-bold text-indigo-600">{leads.length} Total Inquiries</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {leads.slice(0, 6).map((lead) => (
              <Card key={lead.id} className="border-surface-border hover:shadow-sm transition-shadow">
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-gray-900">{lead.name}</h3>
                      <p className="text-[11px] text-gray-500">{lead.business_name || "New Business"}</p>
                    </div>
                    <Badge variant="neutral" className="text-[10px] uppercase font-mono">
                      {lead.service}
                    </Badge>
                  </div>

                  {lead.message && (
                    <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg italic line-clamp-2">
                      &quot;{lead.message}&quot;
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                    <span className="font-mono text-gray-600 font-semibold">{lead.phone}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        openWhatsAppDrawer({
                          name: lead.name,
                          business: lead.business_name || "Store",
                          phone: lead.phone,
                          service: lead.service,
                        })
                      }
                      className="text-emerald-700 bg-emerald-50 border-emerald-200 h-7 text-[11px] flex items-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Message</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 1-Click WhatsApp Deal Messenger Modal */}
        {selectedTarget && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95">
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-900">WhatsApp Deal Messenger</h3>
                    <p className="text-[11px] text-emerald-800">
                      Target: {selectedTarget.name} ({selectedTarget.business})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTarget(null)}
                  className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4">
                {/* Contact Info Pill */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                  <div>
                    <span className="text-gray-500">Phone: </span>
                    <strong className="font-mono text-gray-900">{selectedTarget.phone}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Status: </span>
                    <strong className={selectedTarget.isExpired ? "text-rose-600" : "text-emerald-600"}>
                      {selectedTarget.isExpired ? "Trial Expired" : `${selectedTarget.trialDaysRemaining ?? 14}d left`}
                    </strong>
                  </div>
                </div>

                {/* Template Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Choose Deal Closing Template:</label>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {getTemplates(selectedTarget).map((tpl, idx) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          setSelectedTemplateIndex(idx);
                          setCustomMessage(tpl.text);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl text-xs transition-all border ${
                          selectedTemplateIndex === idx
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold shadow-2xs"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {tpl.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Editor */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Message Preview (Editable):</label>
                  <textarea
                    rows={5}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 text-xs text-gray-800 font-sans focus:outline-none focus:border-emerald-500 bg-gray-50"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setSelectedTarget(null)}>
                  Cancel
                </Button>

                <Button
                  onClick={handleSendWhatsApp}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 px-5 py-2 rounded-xl shadow-md shadow-emerald-600/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send on WhatsApp</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Paid Subscription Activation & Renewal Modal */}
        {activationTarget && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95">
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-900">
                      {activationTarget.currentPlan === "pro" || activationTarget.currentPlan === "enterprise"
                        ? "Renew Paid Subscription"
                        : "Activate Paid Subscription (End Free Trial)"}
                    </h3>
                    <p className="text-[11px] text-indigo-800">
                      Store: <strong className="text-indigo-950">{activationTarget.name}</strong> • Owner: {activationTarget.ownerName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActivationTarget(null)}
                  className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4">
                {/* Notice banner */}
                <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Free Trial Removal & Instant Activation</p>
                    <p className="text-[11px] text-indigo-700 mt-0.5">
                      Activating immediately clears the free trial and assigns a paid plan with an exact expiry date. Once expired, the software automatically locks and prompts for renewal.
                    </p>
                  </div>
                </div>

                {/* Plan Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Choose ERP Edition:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPlan("pro")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedPlan === "pro"
                          ? "bg-indigo-50 border-indigo-400 text-indigo-950 shadow-2xs font-bold"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black">Pro ERP</span>
                        {selectedPlan === "pro" && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 font-normal">Billing, Inventory, GST, Barcodes</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPlan("enterprise")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedPlan === "enterprise"
                          ? "bg-purple-50 border-purple-400 text-purple-950 shadow-2xs font-bold"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black">Enterprise ERP</span>
                        {selectedPlan === "enterprise" && <Check className="w-3.5 h-3.5 text-purple-600" />}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 font-normal">Multi-branch, AI, Unlimited Users</p>
                    </button>
                  </div>
                </div>

                {/* Duration Selection (1, 3, 6, 12 Months, Lifetime) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Select Subscription Duration:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { months: 1, label: "1 Month", days: "30 Days", defaultPrice: 599 },
                      { months: 3, label: "3 Months", days: "90 Days", defaultPrice: 1499, tag: "Popular" },
                      { months: 6, label: "6 Months", days: "180 Days", defaultPrice: 2599 },
                      { months: 12, label: "1 Year", days: "365 Days", defaultPrice: 4499, tag: "Best Value" },
                      { months: 0, label: "Lifetime", days: "Unlimited", defaultPrice: 14999 },
                    ].map((item) => (
                      <button
                        key={item.months}
                        type="button"
                        onClick={() => {
                          setSelectedDurationMonths(item.months);
                          setAmountPaid(item.defaultPrice);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all relative ${
                          selectedDurationMonths === item.months
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                            : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50"
                        }`}
                      >
                        {item.tag && (
                          <span
                            className={`absolute -top-1.5 right-1 px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                              selectedDurationMonths === item.months
                                ? "bg-amber-400 text-amber-950"
                                : "bg-indigo-100 text-indigo-700"
                            }`}
                          >
                            {item.tag}
                          </span>
                        )}
                        <div className="text-xs font-bold">{item.label}</div>
                        <div
                          className={`text-[10px] ${
                            selectedDurationMonths === item.months ? "text-indigo-100" : "text-gray-500"
                          }`}
                        >
                          {item.days}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expiry & Lifecycle Preview */}
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      Activation Date:
                    </span>
                    <span className="font-semibold text-gray-800">
                      {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      Valid Until (Auto-Expiry):
                    </span>
                    <span className="font-bold text-indigo-700">
                      {selectedDurationMonths > 0
                        ? new Date(Date.now() + selectedDurationMonths * 30 * 86400000).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Never (Lifetime Access)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-gray-200 text-[11px]">
                    <span className="text-gray-500">Auto-Expiry Behavior:</span>
                    <span className="text-amber-700 font-semibold">Automatically locks software on expiry date</span>
                  </div>
                </div>

                {/* Amount Paid Recording */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Amount Paid (₹):</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">₹</span>
                    <Input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(Number(e.target.value))}
                      className="pl-7 text-xs font-bold font-mono"
                      placeholder="Enter amount paid"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Will be recorded as Won Deal value in your CRM metrics.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActivationTarget(null)}
                  disabled={isActivating}
                >
                  Cancel
                </Button>

                <Button
                  onClick={handleConfirmActivation}
                  disabled={isActivating}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 px-5 py-2 rounded-xl shadow-md shadow-indigo-600/20"
                >
                  {isActivating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Activating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm & Activate Subscription</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
