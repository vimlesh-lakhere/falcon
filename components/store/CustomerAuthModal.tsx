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
  MessageCircle,
} from "lucide-react";
import { useStoreCart, CustomerAddress } from "@/store/useStoreCart";
import { createClient } from "@/lib/supabase/client";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { resolveActiveShopId } from "@/lib/tenant";

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
  title = "Customer Verification",
  subtitle = "Verify your account with Google or Real 6-Digit Mobile OTP to access saved orders & express checkout.",
}) => {
  const { loginCustomer, addRecentOrder } = useStoreCart();

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
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);

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

  // Direct Google ID Token Login Handler (Native falcon360.in popup)
  const handleGoogleSuccess = async (authData: any) => {
    try {
      setIsGoogleLoading(true);
      const user = authData?.user || authData?.session?.user;
      if (!user) {
        window.location.href = `${window.location.origin}/store/auth/callback`;
        return;
      }
      const email = user.email || "";
      const fullNameVal =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        email.split("@")[0] ||
        "Customer";
      const avatarUrl = user.user_metadata?.avatar_url || "";
      const phoneVal = user.phone || "";

      let customerId: string | undefined = undefined;
      const supabase = createClient();
      try {
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const { data: newCustomer } = await supabase
            .from("customers")
            .insert({
              shop_id: resolveActiveShopId(),
              name: fullNameVal,
              email: email,
              phone: phoneVal || null,
              address: "Town Area",
            })
            .select("id")
            .single();

          if (newCustomer) {
            customerId = newCustomer.id;
          }
        }
      } catch (custErr) {
        console.warn("Customer auto-linking notice:", custErr);
      }

      loginCustomer({
        id: customerId,
        email: email,
        name: fullNameVal,
        phone: phoneVal,
        avatarUrl: avatarUrl,
      });

      setStep("success");
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || "Google authentication failed.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Real Google OAuth Sign In (Fallback)
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

  // Step 1: Send Real OTP
  const handleSendOtp = async (e?: React.FormEvent, channel = "sms") => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phone.replace(/[^0-9]/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage("Please enter your Full Name.");
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
          channel,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStep("otp");
        setCountdown(45);
        setCanResend(false);
        setOtpDigits(["", "", "", "", "", ""]);
        if (data.whatsappLink) {
          setWhatsappLink(data.whatsappLink);
        }
        setSuccessMessage(`Real 6-Digit OTP code dispatched to +91 ${cleanPhone}`);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      } else {
        setErrorMessage(data.error || "Failed to send OTP code.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to contact OTP gateway.");
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
      verifyRealOtp(fullOtp);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Step 3: Verify Real OTP
  const verifyRealOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join("");
    const cleanPhone = phone.replace(/[^0-9]/g, "").slice(-10);

    if (code.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit OTP received on your phone.");
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

        // Login into Zustand store
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
        setErrorMessage(data.error || "Incorrect OTP code. Please enter the valid 6-digit code received.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to verify OTP with server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header Banner */}
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

        {/* Modal Body */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: PHONE / NAME INPUT OR GOOGLE SIGN IN */}
          {step === "input" && (
            <div className="space-y-4">
              {/* Direct Google GIS Sign In (Displays "Sign in to falcon360.in with Google") */}
              <GoogleSignInButton
                onSuccess={handleGoogleSuccess}
                onError={(err) => setErrorMessage(err)}
                onLoadingChange={(loading) => setIsGoogleLoading(loading)}
                fallbackText="Continue with Google (Instant Sign In)"
                textType="continue_with"
              />

              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-gray-200"></div>
                <span className="shrink mx-3 text-[10px] uppercase font-bold text-gray-400">
                  Or Mobile Number OTP
                </span>
                <div className="grow border-t border-gray-200"></div>
              </div>

              {/* Mobile OTP Form */}
              <form onSubmit={(e) => handleSendOtp(e, "sms")} className="space-y-3.5">
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

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    <span>{isSubmitting ? "Sending Real OTP..." : "Send Verification OTP (SMS)"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleSendOtp(e, "whatsapp")}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>Get OTP on WhatsApp</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: ENTER REAL 6-DIGIT OTP */}
          {step === "otp" && (
            <div className="space-y-4 text-center">
              <div>
                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">Enter Real 6-Digit OTP</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Code sent to <span className="font-bold text-gray-800">+91 {phone}</span>
                </p>
              </div>

              {whatsappLink && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-left space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                    <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Instant WhatsApp Code Option</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    If SMS is delayed, tap below to view/receive your OTP instantly on WhatsApp:
                  </p>
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Open WhatsApp for OTP
                  </a>
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
                    onClick={() => handleSendOtp(undefined, "sms")}
                    className="text-purple-600 font-bold hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Resend Real OTP
                  </button>
                ) : (
                  <span className="text-gray-400 text-[11px]">
                    Resend in <strong className="text-gray-700">{countdown}s</strong>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => verifyRealOtp()}
                disabled={isSubmitting || otpDigits.some((d) => !d)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                <span>{isSubmitting ? "Verifying with Gateway..." : "Verify & Sign In"}</span>
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
            <span>Real Phone & Google Verification</span>
          </div>
          <span>AGS Store ERP</span>
        </div>
      </div>
    </div>
  );
};
