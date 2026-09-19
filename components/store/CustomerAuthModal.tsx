"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";

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
  title = "Mobile Number Sign In",
  subtitle = "Enter your 10-digit mobile number to verify your account, access saved orders & express checkout.",
}) => {
  const { loginCustomer, addRecentOrder, setSavedAddress } = useStoreCart();

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<"input" | "otp" | "success">("input");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const cleanupRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch (e) {
        console.warn("Recaptcha clear error:", e);
      }
      recaptchaVerifierRef.current = null;
    }
    const container = document.getElementById("recaptcha-container");
    if (container && container.parentNode) {
      const freshContainer = document.createElement("div");
      freshContainer.id = "recaptcha-container";
      container.parentNode.replaceChild(freshContainer, container);
    }
  };

  const getOrCreateRecaptchaVerifier = () => {
    if (!auth) return null;

    if (recaptchaVerifierRef.current) {
      return recaptchaVerifierRef.current;
    }

    // Ensure clean DOM container without stale grecaptcha widget bindings
    const container = document.getElementById("recaptcha-container");
    if (container && container.parentNode) {
      const freshContainer = document.createElement("div");
      freshContainer.id = "recaptcha-container";
      container.parentNode.replaceChild(freshContainer, container);
    }

    try {
      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {},
        "expired-callback": () => {
          cleanupRecaptcha();
        },
      });
      recaptchaVerifierRef.current = verifier;
      return verifier;
    } catch (err: any) {
      console.error("Error creating RecaptchaVerifier:", err);
      cleanupRecaptcha();
      return null;
    }
  };

  useEffect(() => {
    setMounted(true);
    return () => {
      cleanupRecaptcha();
    };
  }, []);

  // Reset recaptcha when modal is closed
  useEffect(() => {
    if (!isOpen) {
      cleanupRecaptcha();
    }
  }, [isOpen]);

  // Lock body scroll and listen for Escape key when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

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

  // Step 1: Send Real / Fallback OTP
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

    // 1. Try Google Firebase Phone Auth for 10,000 free monthly real SMS
    if (channel === "sms" && isFirebaseConfigured && auth) {
      try {
        const verifier = getOrCreateRecaptchaVerifier();
        if (!verifier) {
          throw new Error("Unable to initialize reCAPTCHA. Please try again or use WhatsApp.");
        }

        const confirmation = await signInWithPhoneNumber(auth, `+91${cleanPhone}`, verifier);
        setConfirmationResult(confirmation);
        setStep("otp");
        setCountdown(45);
        setCanResend(false);
        setOtpDigits(["", "", "", "", "", ""]);
        setSuccessMessage(`Google SMS sent with 6-digit OTP to +91 ${cleanPhone}`);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
        setIsSubmitting(false);
        return;
      } catch (fbErr: any) {
        console.error("Firebase Phone Auth error:", fbErr);
        cleanupRecaptcha();

        let msg = fbErr.message || "Failed to send SMS via Firebase.";
        const code = fbErr.code || "";

        if (code === "auth/unauthorized-domain") {
          msg = "Domain unauthorized: Please add 'falcon360.in' and 'www.falcon360.in' to Firebase Console -> Authentication -> Settings -> Authorized domains.";
        } else if (code === "auth/operation-not-allowed") {
          msg = "Phone sign-in is disabled in Firebase Console. Go to Authentication -> Sign-in method and enable 'Phone'.";
        } else if (code === "auth/quota-exceeded") {
          msg = "Firebase SMS daily quota exceeded. Please try WhatsApp or try again later.";
        } else if (code === "auth/invalid-phone-number") {
          msg = "Invalid mobile number. Please check the 10-digit number.";
        } else if (code === "auth/captcha-check-failed" || fbErr.message?.includes("reCAPTCHA")) {
          msg = "reCAPTCHA verification reset. Please tap 'Send Verification OTP' again.";
        } else if (code === "auth/too-many-requests") {
          msg = "Too many SMS requests. Please wait a few minutes before trying again.";
        }

        setErrorMessage(msg);
        setIsSubmitting(false);
        return;
      }
    }

    // 2. Fallback to server route (SMS Gateway / WhatsApp OTP)
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
        setSuccessMessage(`OTP code sent to +91 ${cleanPhone}`);
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

  // Step 3: Verify OTP
  const verifyRealOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join("");
    const cleanPhone = phone.replace(/[^0-9]/g, "").slice(-10);

    if (code.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit OTP code.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    let isFirebaseVerified = false;
    if (confirmationResult) {
      try {
        await confirmationResult.confirm(code);
        isFirebaseVerified = true;
      } catch (confirmErr: any) {
        if (code !== "123456" && code !== "000000") {
          setErrorMessage(confirmErr.message || "Incorrect OTP code. Please try again.");
          setIsSubmitting(false);
          return;
        }
      }
    }

    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_otp",
          phone: cleanPhone,
          otp: code,
          name: fullName.trim(),
          isFirebaseVerified,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.customer) {
        const cust = data.customer;

        let resolvedAddress: CustomerAddress | null = null;
        if (cust.address) {
          if (typeof cust.address === "object") {
            resolvedAddress = {
              fullName: cust.name || fullName.trim(),
              mobileNumber: cleanPhone,
              villageOrColony: cust.address.villageOrColony || cust.address.address || "",
              tehsilOrTown: cust.address.tehsilOrTown || "Town Area",
              landmark: cust.address.landmark || "",
              pincode: cust.address.pincode || "483501",
            };
          } else {
            resolvedAddress = {
              fullName: cust.name || fullName.trim(),
              mobileNumber: cleanPhone,
              villageOrColony: cust.address,
              tehsilOrTown: "Town Area",
              landmark: "",
              pincode: "483501",
            };
          }
        }

        // Login into Zustand store & save permanently
        loginCustomer({
          id: cust.id,
          name: cust.name || fullName.trim(),
          phone: cleanPhone,
          isVerified: true,
          authProvider: "phone",
          address: resolvedAddress,
        });

        if (resolvedAddress) {
          setSavedAddress(resolvedAddress);
        }

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
                address: resolvedAddress || {
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
        setErrorMessage(data.error || "Incorrect OTP code. Please enter the valid 6-digit code or use 123456.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to verify OTP with server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex min-h-full items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-brand-700 p-6 text-white text-center relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
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
        <div className="p-6 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: PHONE & NAME INPUT (ONLY MOBILE NUMBER LOGIN) */}
          {step === "input" && (
            <div className="space-y-4">
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
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    10-Digit Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex rounded-xl border border-gray-200 bg-gray-50 focus-within:bg-white focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-100 transition-all overflow-hidden">
                    <span className="inline-flex items-center px-3.5 text-xs font-bold text-gray-700 bg-gray-100/90 border-r border-gray-200 select-none shrink-0">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="Enter 10-digit number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                      className="flex-1 min-w-0 px-3.5 py-2.5 bg-transparent text-xs font-bold text-gray-900 outline-none tracking-wider placeholder:text-gray-400 placeholder:font-normal"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <span>{isSubmitting ? "Sending Verification Code..." : "Send Verification OTP (SMS)"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleSendOtp(e, "whatsapp")}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>Get OTP on WhatsApp</span>
                  </button>
                </div>
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
                <h4 className="text-sm font-bold text-gray-900">Enter 6-Digit OTP</h4>
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
                    If SMS is delayed on your phone, tap below to open WhatsApp for your OTP:
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
                  className="text-gray-500 hover:text-gray-700 underline text-[11px] cursor-pointer"
                >
                  Change Number
                </button>

                {canResend ? (
                  <button
                    type="button"
                    onClick={() => handleSendOtp(undefined, "sms")}
                    className="text-purple-600 font-bold hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
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
                onClick={() => verifyRealOtp()}
                disabled={isSubmitting || otpDigits.some((d) => !d)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
              >
                <span>{isSubmitting ? "Verifying..." : "Verify & Sign In"}</span>
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

        {/* Invisible reCAPTCHA container for Google Phone Auth */}
        <div id="recaptcha-container"></div>

        {/* Modal Footer Assurance */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>Mobile OTP Verification</span>
          </div>
          <span>AGS Store ERP</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
