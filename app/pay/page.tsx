"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  CreditCard,
  Tag,
  ArrowRight,
  ArrowLeft,
  Search,
  Phone,
  Building2,
  Calendar,
  FileText,
  Printer,
  Share2,
  ExternalLink,
  Check,
  AlertCircle,
  HelpCircle,
  Clock,
  Zap,
} from "lucide-react";
import { initiateRazorpayCheckout } from "@/lib/razorpay-client";

interface ProjectInvoice {
  clientName: string;
  businessName: string;
  phone: string;
  location: string;
  invoiceNo: string;
  invoiceDate: string;
  projectTitle: string;
  baseAmount: number;
  deliverables: string[];
}

const DEFAULT_HRB_INVOICE: ProjectInvoice = {
  clientName: "Harsh",
  businessName: "The House of HRB (Harsh Rubber Band)",
  phone: "8375053689",
  location: "Rui Mandi, Sadar Bazar, Delhi (Est. 1998)",
  invoiceNo: "INV-FLC-2026-HRB01",
  invoiceDate: "11 Sep 2026",
  projectTitle: "B2B Wholesale Catalog Web Application & Payment Gateway Development",
  baseAmount: 19000,
  deliverables: [
    "Full Custom Wholesale Web Application (The House of HRB)",
    "40+ Hair Accessories Product Lines with Dual Unit/Carton Pricing",
    "Interactive B2B RFQ Cart Drawer & A4 Proforma Invoice Modal",
    "Master Carton Packing (₹500/ctn) & Transport Bilty/LR Calculator",
    "Integrated Razorpay Online Payment Gateway & Direct WhatsApp Ordering",
    "Responsive Mobile-First Architecture & Cloud CDN Deployment",
    "1 Year Priority Cloud Hosting & Technical Maintenance",
  ],
};

export default function ClientPaymentPage() {
  const searchParams = useSearchParams();

  // Input states
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSearched, setIsSearched] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<ProjectInvoice | null>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Payment states
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccessId, setPaymentSuccessId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Handle URL query parameters (e.g. /pay?phone=8375053689&code=HRBFIRST)
  useEffect(() => {
    const urlPhone = searchParams.get("phone");
    const urlCode = searchParams.get("code") || searchParams.get("coupon");

    if (urlPhone) {
      const clean = urlPhone.replace(/[^0-9]/g, "").slice(-10);
      setPhoneNumber(clean);
      handleLookup(clean);
    } else {
      // Default to ready-to-pay invoice state for instant client convenience
      setActiveInvoice(DEFAULT_HRB_INVOICE);
      setPhoneNumber(DEFAULT_HRB_INVOICE.phone);
      setIsSearched(true);
    }

    if (urlCode && urlCode.toUpperCase() === "HRBFIRST") {
      setCouponCode("HRBFIRST");
      setAppliedCoupon("HRBFIRST");
      setDiscountAmount(10000);
    }
  }, [searchParams]);

  const handleLookup = (phoneToSearch?: string) => {
    const targetPhone = (phoneToSearch || phoneNumber).replace(/[^0-9]/g, "").slice(-10);
    if (!targetPhone) {
      setPaymentError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setPaymentError(null);
    setIsSearched(true);

    // If matches Harsh or any number entered, associate with the HRB project invoice
    setActiveInvoice({
      ...DEFAULT_HRB_INVOICE,
      phone: targetPhone,
    });
  };

  const handleApplyCoupon = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCouponError(null);

    const clean = couponCode.trim().toUpperCase();
    if (!clean) {
      setCouponError("Please enter a coupon code.");
      return;
    }

    if (clean === "HRBFIRST") {
      setAppliedCoupon("HRBFIRST");
      setDiscountAmount(10000);
      setCouponError(null);
    } else {
      setCouponError("Invalid coupon code. Try entering 'HRBFIRST'.");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode("");
    setCouponError(null);
  };

  const basePrice = activeInvoice?.baseAmount || 19000;
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
          setPaymentSuccessId(paymentId);
          setIsProcessing(false);
        },
        onError: (errMsg) => {
          setPaymentError(errMsg);
          setIsProcessing(false);
        },
      });
    } catch (err: any) {
      setPaymentError(err.message || "Failed to start payment.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 selection:bg-indigo-500 selection:text-white font-sans antialiased flex flex-col justify-between relative overflow-hidden">
      {/* Ambient Lighting Gradients */}
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
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Client Portal
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Official Digital Invoicing & Payments</p>
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

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {paymentSuccessId ? (
          /* ============================================================
             PAYMENT SUCCESSFUL RECEIPT VIEW
             ============================================================ */
          <div className="rounded-3xl bg-[#0D1220] border border-emerald-500/40 p-6 sm:p-10 shadow-2xl space-y-8 animate-in zoom-in-95">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                Payment Verified & Received
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Thank You, {activeInvoice?.clientName}!
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                Your payment of <strong className="text-white">₹{finalPayable.toLocaleString("en-IN")}</strong> for{" "}
                <strong className="text-indigo-300">{activeInvoice?.businessName}</strong> has been received
                successfully via Razorpay.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-6 space-y-4 font-mono text-xs">
              <div className="flex justify-between pb-3 border-b border-white/10 text-slate-400">
                <span>RECEIPT DETAILS</span>
                <span className="text-emerald-400 font-bold uppercase">PAID IN FULL</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-300">
                <div>
                  <span className="text-slate-500 block">Payment Transaction ID:</span>
                  <span className="font-bold text-white text-sm">{paymentSuccessId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Invoice Number:</span>
                  <span className="font-bold text-white text-sm">{activeInvoice?.invoiceNo}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Client / Business:</span>
                  <span className="text-white font-semibold">
                    {activeInvoice?.clientName} ({activeInvoice?.businessName})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Contact Phone:</span>
                  <span className="text-white font-semibold">{activeInvoice?.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Amount Paid:</span>
                  <span className="text-emerald-400 font-bold text-base font-mono">
                    ₹{finalPayable.toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Service Delivered:</span>
                  <span className="text-slate-200">Custom B2B Wholesale Website & Catalog</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button
                onClick={() => window.print()}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Receipt</span>
              </button>

              <button
                onClick={() => {
                  const text = encodeURIComponent(
                    `Namaste Vimlesh ji,\nI have completed the payment of ₹${finalPayable.toLocaleString(
                      "en-IN"
                    )} for The House of HRB website development.\n\nPayment ID: ${paymentSuccessId}\nInvoice: ${activeInvoice?.invoiceNo}\nClient: ${activeInvoice?.clientName} (${activeInvoice?.phone})`
                  );
                  window.open(`https://wa.me/919340362381?text=${text}`, "_blank");
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Confirmation on WhatsApp</span>
              </button>

              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <span>Return to Falcon Home</span>
              </Link>
            </div>
          </div>
        ) : (
          /* ============================================================
             STANDARD CLIENT INVOICE & PAYMENT VIEW
             ============================================================ */
          <div className="space-y-8">
            {/* Header Title */}
            <div className="text-center space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Verified Client Invoicing Portal</span>
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Client Project Checkout
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
                Pay for your website design, software setup, and digital services securely via Razorpay. No login required.
              </p>
            </div>

            {/* Step 1: Mobile Number Lookup Bar */}
            <div className="rounded-2xl bg-[#0D1220] border border-white/10 p-5 sm:p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-teal-400" />
                  <span>Enter Client Registered Mobile Number</span>
                </label>
                {isSearched && (
                  <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Account Located
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="e.g. 8375053689"
                    value={phoneNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setPhoneNumber(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLookup();
                    }}
                    className="w-full pl-14 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-teal-400 transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleLookup()}
                  className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 transition-all cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Fetch Invoice</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 pt-1">
                <span>Quick client shortcuts:</span>
                <button
                  type="button"
                  onClick={() => {
                    setPhoneNumber("8375053689");
                    handleLookup("8375053689");
                  }}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-indigo-300 border border-white/10 transition-colors"
                >
                  Harsh (8375053689)
                </button>
              </div>
            </div>

            {paymentError && (
              <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 animate-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Step 2: Invoice & Deliverables Card */}
            {activeInvoice && (
              <div className="rounded-3xl bg-[#0B0F19] border border-indigo-500/30 overflow-hidden shadow-2xl animate-in fade-in-50 duration-300">
                {/* Card Header */}
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
                    <div>Invoice: <strong className="text-white">{activeInvoice.invoiceNo}</strong></div>
                    <div>Date: {activeInvoice.invoiceDate}</div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 sm:p-8 space-y-6">
                  {/* Project Overview */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <span>{activeInvoice.projectTitle}</span>
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Custom wholesale digital presence for Sadar Bazar's premier manufacturer and wholesale distributor
                      of fashion hair accessories, pure rubber bands, and salon essentials.
                    </p>
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

                  {/* Coupon Code Section */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Apply Client Discount Coupon</span>
                      </span>
                      {appliedCoupon ? (
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="text-[11px] text-rose-400 hover:underline font-semibold"
                        >
                          Remove Coupon
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          Have coupon? Enter <strong className="text-teal-400 font-mono">HRBFIRST</strong>
                        </span>
                      )}
                    </div>

                    {appliedCoupon ? (
                      <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            Coupon <strong className="font-mono text-white">HRBFIRST</strong> Applied! Flat ₹10,000 Special Client Discount
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-300">-₹10,000</span>
                      </div>
                    ) : (
                      <form onSubmit={handleApplyCoupon} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter coupon code (e.g. HRBFIRST)"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-xs uppercase focus:outline-none focus:border-indigo-400 transition-colors placeholder:text-slate-500"
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
                        <span>Client Special Discount (HRBFIRST):</span>
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
                          ? "Opening Razorpay Gateway..."
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
