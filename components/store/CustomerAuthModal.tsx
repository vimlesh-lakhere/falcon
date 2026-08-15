"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Phone,
  User,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Lock,
  RotateCcw,
  AlertCircle,
  KeyRound,
  MessageSquare,
} from "lucide-react";
import { useStoreCart, CustomerAddress } from "@/store/useStoreCart";
import { createClient } from "@/lib/supabase/client";

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "Customer Sign In",
  subtitle = "Verify with Google or 6-digit Mobile OTP to access orders and express checkout.",
}) => {
  const { loginCustomer, addRecentOrder } = useStoreCart();

  // State: "input" (phone/name) | "otp" (enter 6 digits) | "success"
  const [step, setStep] = useState<"input" | "otp" | "success">("input");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const [previewOtp, setPreviewOtp] = useState<string | null>(null);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "otp" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  if (!isOpen) return null;

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setErrorMessage(null);
      const supabase = createClient();
      const callbackUrl = `${window.location.origin}/store/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setErrorMessage(error.message || "Failed to initiate Google sign in.");
        setIsGoogleLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Google sign in error.");
      setIsGoogleLoading(false);
    }
  };

  // Step 1: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_otp",
          phone: cleanPhone,
          name: fullName.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStep("otp");
        setCountdown(45);
        setCanResend(false);
        setOtpDigits(["", "", "", "", "", ""]);
        if (data.previewOtp) {
          setPreviewOtp(data.previewOtp);
        }
        setSuccessMessage(`OTP sent to +91 ${cleanPhone}`);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      } else {
        setErrorMessage(data.error || "Failed to send OTP. Please try again.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to connect to verification server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Handle OTP input change
  const handleOtpChange = (index: number, value: string) => {
    const cleanValue = value.replace(/[^0-9]/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanValue;
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (cleanValue && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto verify if all 6 digits entered
    if (cleanValue && index === 5 && newDigits.every((d) => d !== "")) {
      const fullOtp = newDigits.join("");
      verifyOtpCode(fullOtp);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Step 3: Verify OTP code
  const verifyOtpCode = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join("");
    const cleanPhone = phone.replace(/[^0-9]/g, "");

    if (code.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit OTP code.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_otp",
          phone: cleanPhone,
          otp: code,
          name: fullName.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.customer) {
        const cust = data.customer;

        // Login in Zustand store
        loginCustomer({
          id: cust.id,
          name: cust.name || fullName.trim(),
          phone: cleanPhone,
          isVerified: true,
          authProvider: "otp",
          address: cust.address
            ? {
                fullName: cust.name || fullName.trim(),
                mobileNumber: cleanPhone,
                villageOrColony: cust.address,
                tehsilOrTown: "Town Area",
                landmark: "",
                pincode: "483501",
              }
            : null,
        });

        // Sync past orders from Supabase sales
        try {
          const supabase = createClient();
          const { data: pastSales } = await supabase
            .from("sales")
            .select("*, customer:customers(*), items:sale_items(*, product:products(*))")
            .eq("customer_id", cust.id)
            .order("created_at", { ascending: false })
            .limit(10);

          if (pastSales && pastSales.length > 0) {
            pastSales.forEach((sale) => {
              addRecentOrder({
                orderId: sale.id,
                invoiceNumber: sale.invoice_number,
                createdAt: sale.created_at,
                totalAmount: sale.total_amount,
                itemCount: sale.items?.length || 1,
                status: sale.status as any,
                items:
                  sale.items?.map((it: any) => ({
                    productId: it.product_id,
                    productName: it.product?.name || "Product",
                    quantity: it.quantity,
                    price: it.unit_price,
                    imageUrl: it.product?.image_url,
                  })) || [],
                address: {
                  fullName: sale.customer?.name || fullName,
                  mobileNumber: cleanPhone,
                  villageOrColony: sale.customer?.address || "Local Area",
                  tehsilOrTown: "Town Area",
                  landmark: "",
                  pincode: "483501",
                },
                paymentMethod: "cod",
              });
            });
          }
        } catch {
          // Non-blocking
        }

        setStep("success");
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1200);
      } else {
        setErrorMessage(data.error || "Incorrect OTP. Please try again.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to verify OTP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-brand-700 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center mx-auto mb-3 shadow-inner">
            <ShieldCheck className="w-6 h-6 text-emerald-300" />
          </div>

          <h3 className="text-lg font-black tracking-tight">{title}</h3>
          <p className="text-xs text-purple-100 mt-1 max-w-xs mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: INPUT PHONE / NAME OR GOOGLE SIGN IN */}
          {step === "input" && (
            <div className="space-y-4">
              {/* Option A: Google Sign In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-[0.99] disabled:opacity-50"
              >
                {/* Official Google 'G' Logo SVG */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isGoogleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-gray-200"></div>
                <span className="shrink mx-3 text-[10px] uppercase font-bold text-gray-400">
                  Or verify with Mobile OTP
                </span>
                <div className="grow border-t border-gray-200"></div>
              </div>

              {/* Option B: Mobile OTP Form */}
              <form onSubmit={handleSendOtp} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Your Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Sharma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    10-Digit Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-500 border-r border-gray-200 pr-2">
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                      className="w-full pl-18 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all outline-hidden tracking-wider"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  <span>{isSubmitting ? "Sending OTP Code..." : "Send Verification OTP"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: ENTER 6-DIGIT OTP */}
          {step === "otp" && (
            <div className="space-y-4 text-center">
              <div>
                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">Enter Verification Code</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  6-digit code sent to <span className="font-bold text-gray-800">+91 {phone}</span>
                </p>
              </div>

              {previewOtp && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] font-semibold flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Demo OTP Code: <strong className="font-mono text-xs">{previewOtp}</strong></span>
                </div>
              )}

              {/* 6 Digit Input Boxes */}
              <div className="flex items-center justify-center gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-12 text-center text-lg font-black text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-hidden transition-all"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-xs pt-1 px-1">
                <button
                  type="button"
                  onClick={() => setStep("input")}
                  className="text-gray-500 hover:text-gray-700 underline text-[11px]"
                >
                  Change Number
                </button>

                {canResend ? (
                  <button
                    type="button"
                    onClick={(e) => handleSendOtp(e)}
                    className="text-purple-600 font-bold hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Resend OTP
                  </button>
                ) : (
                  <span className="text-gray-400 text-[11px]">
                    Resend in <strong className="text-gray-700">{countdown}s</strong>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => verifyOtpCode()}
                disabled={isSubmitting || otpDigits.some((d) => !d)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                <span>{isSubmitting ? "Verifying OTP..." : "Verify & Sign In"}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 3: SUCCESS CELEBRATION */}
          {step === "success" && (
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-black text-gray-900">Verified Successfully!</h4>
              <p className="text-xs text-gray-500">
                Welcome, <span className="font-bold text-gray-800">{fullName || "Customer"}</span>! Signed in as verified customer.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Assurance */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>Secure 256-bit Encrypted</span>
          </div>
          <span>AGS Store Direct</span>
        </div>
      </div>
    </div>
  );
};
