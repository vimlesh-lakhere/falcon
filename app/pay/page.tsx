"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  CreditCard,
  Tag,
  ArrowLeft,
  Search,
  Phone,
  FileText,
  Printer,
  Share2,
  AlertCircle,
  Clock,
  RotateCcw,
  Check,
} from "lucide-react";
import { initiateRazorpayCheckout } from "@/lib/razorpay-client";

interface ProjectInvoice {
  id: string;
  clientName: string;
  businessName: string;
  phone: string;
  location: string;
  invoiceNo: string;
  invoiceDate: string;
  projectTitle: string;
  projectDescription?: string;
  baseAmount: number;
  deliverables: string[];
  couponRules?: {
    code: string;
    discount: number;
  }[];
}

interface PaidRecord {
  status: "PAID";
  paymentId: string;
  amount: number;
  invoiceNo: string;
  clientName: string;
  businessName: string;
  phone: string;
  paidAt: string;
  timestamp: number;
}

// Pre-registered client database in Falcon 360
const CLIENT_INVOICES_REGISTRY: Record<string, ProjectInvoice> = {
  "8375053689": {
    id: "hrb-harsh-01",
    clientName: "Harsh",
    businessName: "The House of HRB (Harsh Rubber Band)",
    phone: "8375053689",
    location: "Rui Mandi, Sadar Bazar, Delhi (Est. 1998)",
    invoiceNo: "INV-FLC-2026-HRB01",
    invoiceDate: "11 Sep 2026",
    projectTitle: "B2B Wholesale Catalog Web Application & Payment Gateway Development",
    projectDescription:
      "Custom wholesale digital presence for Sadar Bazar's premier manufacturer and wholesale distributor of fashion hair accessories, pure rubber bands, and salon essentials.",
    baseAmount: 19000,
    deliverables: [
      "Full Custom Wholesale Web Application (The House of HRB)",
      "40+ Hair Accessories Product Lines with Dual Unit/Carton Pricing",
      "Interactive B2B RFQ Cart Drawer & A4 Proforma Invoice Modal",
      "Master Carton Packing (₹500/ctn) & Transport Bilty/LR Booking Calculator",
      "Direct WhatsApp Ordering",
      "Responsive Mobile-First Architecture & Cloud CDN Deployment",
      "1 Year Priority Cloud Hosting & Technical Maintenance",
    ],
    couponRules: [
      {
        code: "HRBFIRST",
        discount: 10000,
      },
    ],
  },
  "9340362381": {
    id: "demo-gateway-01",
    clientName: "Demo",
    businessName: "Demo (Live Gateway Test)",
    phone: "9340362381",
    location: "India",
    invoiceNo: "INV-FLC-DEMO-10",
    invoiceDate: "11 Sep 2026",
    projectTitle: "Falcon 360 Live Razorpay Gateway & Receipt Demo",
    projectDescription:
      "Demo project invoice for testing live checkout, UPI payment flow, and instant automated digital receipt generation.",
    baseAmount: 10,
    deliverables: [
      "Live Razorpay Payment Gateway Testing (₹10 Live Verification)",
      "Instant UPI (GPay / PhonePe / Paytm / QR) Transaction Test",
      "Automated Digital Tax Receipt & Paid-in-Full Settlement",
      "WhatsApp Settlement Confirmation Alert",
    ],
    couponRules: [
      {
        code: "DEMO5",
        discount: 5,
      },
    ],
  },
};

const STORAGE_KEY_PAID = "falcon_settled_invoices";

function ClientPaymentContent() {
  const searchParams = useSearchParams();

  // Search & input state - completely empty by default
  const [phoneNumber, setPhoneNumber] = useState("");
  const [activeInvoice, setActiveInvoice] = useState<ProjectInvoice | null>(null);
  const [isSearched, setIsSearched] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Coupon state - empty by default, no hints
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Payment states
  const [isProcessing, setIsProcessing] = useState(false);
  const [paidRecord, setPaidRecord] = useState<PaidRecord | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Helper to retrieve saved settlements from localStorage
  const getSavedSettlement = (invoiceNo?: string, phone?: string): PaidRecord | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PAID);
      if (!raw) return null;
      const parsed: Record<string, PaidRecord> = JSON.parse(raw);
      if (invoiceNo && parsed[invoiceNo]) return parsed[invoiceNo];
      if (phone && parsed[phone]) return parsed[phone];
      return null;
    } catch {
      return null;
    }
  };

  // Helper to persist paid record to localStorage
  const saveSettlement = (record: PaidRecord) => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PAID);
      const records: Record<string, PaidRecord> = raw ? JSON.parse(raw) : {};
      records[record.invoiceNo] = record;
      records[record.phone] = record;
      localStorage.setItem(STORAGE_KEY_PAID, JSON.stringify(records));
    } catch (e) {
      console.error("Failed to save settlement record:", e);
    }
  };

  // Check URL query parameters only if explicitly provided in link (e.g. from an invoice SMS/WhatsApp)
  useEffect(() => {
    const urlPhone = searchParams.get("phone");
    const urlInvoice = searchParams.get("invoice");

    if (urlPhone) {
      const clean = urlPhone.replace(/[^0-9]/g, "").slice(-10);
      setPhoneNumber(clean);
      performLookup(clean);
    } else if (urlInvoice) {
      performLookup(urlInvoice);
    }
    // If no query parameters are present, initial state remains completely empty as requested
  }, [searchParams]);

  // Core lookup logic for multiple clients
  const performLookup = (queryInput?: string) => {
    const q = (queryInput !== undefined ? queryInput : phoneNumber).trim();
    const cleanPhone = q.replace(/[^0-9]/g, "").slice(-10);

    setLookupError(null);
    setPaymentError(null);

    if (!q && !cleanPhone) {
      setLookupError("Please enter your 10-digit mobile number or invoice number.");
      return;
    }

    setIsSearched(true);

    // 1. Match from pre-registered registry
    let foundInvoice: ProjectInvoice | null = null;
    if (cleanPhone && CLIENT_INVOICES_REGISTRY[cleanPhone]) {
      foundInvoice = CLIENT_INVOICES_REGISTRY[cleanPhone];
    } else {
      // Check by invoice number
      const matchByInv = Object.values(CLIENT_INVOICES_REGISTRY).find(
        (inv) => inv.invoiceNo.toLowerCase() === q.toLowerCase()
      );
      if (matchByInv) {
        foundInvoice = matchByInv;
      }
    }

    // 2. If not found in static registry, generate a universal verified invoice for ANY client
    if (!foundInvoice) {
      const phoneDigits = cleanPhone || q;
      foundInvoice = {
        id: `client-${phoneDigits}`,
        clientName: "Valued Client",
        businessName: "Web & Digital Solutions Client",
        phone: phoneDigits,
        location: "India",
        invoiceNo: `INV-FLC-${phoneDigits.slice(-4) || "2026"}`,
        invoiceDate: new Date().toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        projectTitle: "Custom Web Application & Digital Platform Development",
        projectDescription:
          "Professional software development, web application deployment, mobile-responsive UI design, and cloud maintenance provided by Falcon 360.",
        baseAmount: 15000,
        deliverables: [
          "Custom Web Application Architecture & UI Development",
          "Responsive Mobile & Desktop Optimization",
          "Secure Payment Gateway Integration",
          "Production Cloud Deployment & Domain Routing",
          "Technical Support & Maintenance",
        ],
        couponRules: [],
      };
    }

    setActiveInvoice(foundInvoice);

    // 3. Check if this invoice has already been settled previously!
    const settled = getSavedSettlement(foundInvoice.invoiceNo, foundInvoice.phone);
    if (settled) {
      setPaidRecord(settled);
    } else {
      setPaidRecord(null);
    }

    // Reset coupon whenever looking up an invoice
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode("");
    setCouponError(null);
  };

  const handleApplyCoupon = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCouponError(null);

    const clean = couponCode.trim().toUpperCase();
    if (!clean) {
      setCouponError("Please enter a coupon code.");
      return;
    }

    // Strict client-specific validation:
    // Only allow coupons explicitly assigned to this specific client's active invoice
    const matchedRule = activeInvoice?.couponRules?.find(
      (r) => r.code.toUpperCase() === clean
    );

    if (matchedRule) {
      setAppliedCoupon(matchedRule.code);
      setDiscountAmount(matchedRule.discount);
      setCouponError(null);
    } else {
      // Check if the entered code belongs to another party / client
      const isOtherClientCoupon = Object.values(CLIENT_INVOICES_REGISTRY).some(
        (client) =>
          client.phone !== activeInvoice?.phone &&
          client.couponRules?.some((r) => r.code.toUpperCase() === clean)
      );

      if (isOtherClientCoupon) {
        setCouponError(
          `Coupon code '${clean}' is exclusive to another client and cannot be applied to this mobile number.`
        );
      } else {
        setCouponError("Invalid coupon code. Please verify and try again.");
      }
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode("");
    setCouponError(null);
  };

  const basePrice = activeInvoice?.baseAmount || 0;
  const finalPayable = Math.max(0, basePrice - discountAmount);

  const handleProceedPayment = async () => {
    if (!activeInvoice) return;
    try {
      setIsProcessing(true);
      setPaymentError(null);

      await initiateRazorpayCheckout({
        customAmount: finalPayable,
        customDescription: `${activeInvoice.projectTitle} - Invoice: ${activeInvoice.invoiceNo}`,
        customerName: activeInvoice.clientName,
        customerPhone: activeInvoice.phone,
        onSuccess: (paymentId) => {
          const newRecord: PaidRecord = {
            status: "PAID",
            paymentId,
            amount: finalPayable,
            invoiceNo: activeInvoice.invoiceNo,
            clientName: activeInvoice.clientName,
            businessName: activeInvoice.businessName,
            phone: activeInvoice.phone,
            paidAt: new Date().toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
            timestamp: Date.now(),
          };

          saveSettlement(newRecord);
          setPaidRecord(newRecord);
          setIsProcessing(false);
        },
        onError: (errMsg) => {
          setPaymentError(errMsg);
          setIsProcessing(false);
        },
      });
    } catch (err: any) {
      setPaymentError(err.message || "Failed to initiate payment.");
      setIsProcessing(false);
    }
  };

  const handleResetSearch = () => {
    setActiveInvoice(null);
    setPaidRecord(null);
    setPhoneNumber("");
    setIsSearched(false);
    setLookupError(null);
    setPaymentError(null);
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode("");
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 selection:bg-indigo-500 selection:text-white font-sans antialiased flex flex-col justify-between relative overflow-hidden">
      {/* Background Ambient Lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 -right-20 w-[500px] h-[500px] bg-teal-600/10 rounded-full blur-[160px]" />
        <div className="absolute -bottom-20 left-10 w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-[140px]" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 border-b border-white/10 bg-[#07090E]/80 backdrop-blur-md px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="/falcon-icon.png"
              alt="Falcon 360 Logo"
              className="w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(20,184,166,0.4)] group-hover:scale-105 transition-transform"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white font-mono">FALCON</span>
                <span className="bg-gradient-to-r from-teal-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent text-lg font-black font-mono">
                  360
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Client Portal
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Digital Invoicing & Payments Infrastructure</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {paidRecord ? (
          /* ============================================================
             VIEW 1: PERSISTENT SUCCESSFUL / SETTLED RECEIPT
             (Client never re-prompted to pay)
             ============================================================ */
          <div className="rounded-3xl bg-[#0D1220] border border-emerald-500/40 p-6 sm:p-10 shadow-2xl space-y-8 animate-in zoom-in-95">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                <Check className="w-3.5 h-3.5" />
                <span>PAYMENT STATUS: SUCCESSFUL / PAID IN FULL</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Payment Settled, {paidRecord.clientName}!
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                Your payment of{" "}
                <strong className="text-emerald-400">₹{paidRecord.amount.toLocaleString("en-IN")}</strong> for{" "}
                <strong className="text-white">{paidRecord.businessName}</strong> has been received and verified.
              </p>
            </div>

            {/* Official Receipt Card */}
            <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-6 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 text-slate-400">
                <span>OFFICIAL TAX / TRANSACTION RECEIPT</span>
                <span className="text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  PAID IN FULL
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-300">
                <div>
                  <span className="text-slate-500 block">Transaction ID:</span>
                  <span className="font-bold text-white text-sm select-all">{paidRecord.paymentId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Invoice Number:</span>
                  <span className="font-bold text-white text-sm">{paidRecord.invoiceNo}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Client / Business:</span>
                  <span className="text-white font-semibold">
                    {paidRecord.clientName} ({paidRecord.businessName})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Contact Phone:</span>
                  <span className="text-white font-semibold">+91 {paidRecord.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Settlement Date:</span>
                  <span className="text-slate-200">{paidRecord.paidAt}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Amount Paid:</span>
                  <span className="text-emerald-400 font-bold text-lg font-mono">
                    ₹{paidRecord.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {activeInvoice && (
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <span className="text-[11px] font-bold uppercase text-slate-400 block font-sans">
                    Delivered Project Deliverables:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-sans">
                    {activeInvoice.deliverables.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Receipt</span>
              </button>

              <button
                onClick={() => {
                  const text = encodeURIComponent(
                    `Namaste Vimlesh ji,\nPayment of ₹${paidRecord.amount.toLocaleString(
                      "en-IN"
                    )} is confirmed for ${paidRecord.businessName}.\n\nPayment ID: ${paidRecord.paymentId}\nInvoice: ${paidRecord.invoiceNo}\nDate: ${paidRecord.paidAt}`
                  );
                  window.open(`https://wa.me/919340362381?text=${text}`, "_blank");
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Confirmation on WhatsApp</span>
              </button>

              <button
                onClick={handleResetSearch}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 border border-white/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Look Up Another Invoice</span>
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================
             VIEW 2: CLIENT SEARCH & INVOICE PAYMENT VIEW
             ============================================================ */
          <div className="space-y-8">
            {/* Header Title */}
            <div className="text-center space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Official Falcon 360 Client Checkout</span>
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Client Project Invoicing & Payment
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
                Pay for your custom website design, software setup, and digital services securely via Razorpay.
              </p>
            </div>

            {/* Mobile / Invoice Lookup Input Card */}
            <div className="rounded-2xl bg-[#0D1220] border border-white/10 p-5 sm:p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-teal-400" />
                  <span>Enter Registered Mobile Number or Invoice ID</span>
                </label>
                {isSearched && activeInvoice && (
                  <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Invoice Found
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                    +91
                  </span>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="Enter 10-digit mobile number"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      if (lookupError) setLookupError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") performLookup();
                    }}
                    className="w-full pl-14 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-teal-400 transition-colors placeholder:text-slate-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => performLookup()}
                  className="px-6 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 transition-all cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Fetch Invoice</span>
                </button>
              </div>

              {lookupError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{lookupError}</span>
                </div>
              )}
            </div>

            {/* Error notifications */}
            {paymentError && (
              <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 animate-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Active Invoice Card (Only displayed AFTER lookup) */}
            {activeInvoice && (
              <div className="rounded-3xl bg-[#0B0F19] border border-indigo-500/30 overflow-hidden shadow-2xl animate-in fade-in-50 duration-300">
                {/* Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-indigo-950/80 via-[#0D1220] to-teal-950/60 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-black text-white">{activeInvoice.businessName}</h2>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        Verified Project
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Client Contact: <strong className="text-white">{activeInvoice.clientName}</strong> • Phone:{" "}
                      <span className="font-mono text-indigo-300">+91 {activeInvoice.phone}</span>
                    </p>
                  </div>

                  <div className="text-left sm:text-right font-mono text-xs text-slate-400">
                    <div>
                      Invoice: <strong className="text-white">{activeInvoice.invoiceNo}</strong>
                    </div>
                    <div>Date: {activeInvoice.invoiceDate}</div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 sm:p-8 space-y-6">
                  {/* Project Overview */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <span>{activeInvoice.projectTitle}</span>
                    </h3>
                    {activeInvoice.projectDescription && (
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {activeInvoice.projectDescription}
                      </p>
                    )}
                  </div>

                  {/* Deliverables Checklist */}
                  <div className="space-y-2.5 pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Scope of Work Delivered:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {activeInvoice.deliverables.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Coupon Code Section (Clean, no prefilled text, no background hints) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Discount Coupon</span>
                      </span>
                      {appliedCoupon && (
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="text-[11px] text-rose-400 hover:underline font-semibold cursor-pointer"
                        >
                          Remove Coupon
                        </button>
                      )}
                    </div>

                    {appliedCoupon ? (
                      <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            Coupon <strong className="font-mono text-white">{appliedCoupon}</strong> Applied Successfully
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-300">
                          -₹{discountAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    ) : (
                      <form onSubmit={handleApplyCoupon} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter coupon code"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-xs uppercase focus:outline-none focus:border-indigo-400 transition-colors placeholder:text-slate-600"
                        />
                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors cursor-pointer"
                        >
                          Apply
                        </button>
                      </form>
                    )}

                    {couponError && (
                      <p className="text-[11px] text-rose-400 font-semibold">{couponError}</p>
                    )}
                  </div>

                  {/* Financial Bill Breakdown */}
                  <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10 space-y-2.5 font-mono text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Standard Development & Deployment:</span>
                      <span>₹{basePrice.toLocaleString("en-IN")}</span>
                    </div>

                    {appliedCoupon && (
                      <div className="flex justify-between text-emerald-400 font-semibold">
                        <span>Client Special Discount ({appliedCoupon}):</span>
                        <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
                      </div>
                    )}

                    <div className="pt-3 border-t border-white/15 flex items-baseline justify-between text-white">
                      <div>
                        <span className="text-sm font-bold block font-sans">Final Net Payable:</span>
                        <span className="text-[10px] text-slate-400 font-sans font-normal">
                          Inclusive of all setup, deployment & Razorpay processing fees
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                          ₹{finalPayable.toLocaleString("en-IN")}
                        </span>
                        {appliedCoupon && (
                          <span className="text-xs text-slate-500 line-through block">
                            ₹{basePrice.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Call-to-Action Checkout Button */}
                  <div className="space-y-3 pt-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleProceedPayment}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-bold text-sm sm:text-base shadow-xl shadow-teal-500/25 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                    >
                      <CreditCard className="w-5 h-5" />
                      <span>
                        {isProcessing
                          ? "Connecting to Razorpay..."
                          : `Proceed to Pay ₹${finalPayable.toLocaleString("en-IN")} via Razorpay`}
                      </span>
                    </button>

                    <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% Safe 256-Bit SSL
                      </span>
                      <span>•</span>
                      <span>UPI (GPay / PhonePe / Paytm)</span>
                      <span>•</span>
                      <span>Debit & Credit Cards</span>
                      <span>•</span>
                      <span>NetBanking</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-[#05060A] py-6 px-4 text-center text-xs text-slate-500">
        <p>© 2026 Falcon 360 Inc. • Official Invoicing & Payments Infrastructure</p>
      </footer>
    </div>
  );
}

// Next.js App Router Suspense Wrapper
export default function ClientPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090E] flex items-center justify-center text-slate-400">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500"></div>
            <p className="text-xs font-mono">Loading Payment Portal...</p>
          </div>
        </div>
      }
    >
      <ClientPaymentContent />
    </Suspense>
  );
}
