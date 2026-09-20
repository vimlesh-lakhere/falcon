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
  MapPin,
  Home,
  Building2,
} from "lucide-react";
import { useStoreCart, CustomerAddress } from "@/store/useStoreCart";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { getPublicShopId } from "@/lib/tenant";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { LocationPicker } from "@/components/store/LocationPicker";

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
  subtitle = "Enter your 10-digit mobile number to verify your account & express checkout.",
}) => {
  const { loginCustomer, addRecentOrder, setSavedAddress } = useStoreCart();

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<"input" | "otp" | "onboarding" | "success">("input");
  const [phone, setPhone] = useState("");

  // Onboarding fields for new user:
  const [fullName, setFullName] = useState("");
  const [villageOrColony, setVillageOrColony] = useState("");
  const [tehsilOrTown, setTehsilOrTown] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("483501");
  const [coords, setCoords] = useState<{ latitude?: number; longitude?: number; mapAddress?: string }>({});

  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(45);
  const [canResend, setCanResend] = useState(false);
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

  // Load the invisible reCAPTCHA as soon as the modal opens, so "Send OTP" does not wait for it.
  useEffect(() => {
    if (!isOpen || !mounted) return;
    try {
      void getOrCreateRecaptchaVerifier()?.render().catch(() => cleanupRecaptcha());
    } catch {
      // Non-blocking: it is created again on demand when the customer taps "Send OTP".
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mounted]);

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

  // Step 1: Send the OTP by SMS through Firebase Phone Auth (Google sends and checks the code).
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phone.replace(/[^0-9]/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!isFirebaseConfigured || !auth) {
      setErrorMessage("SMS login is not available right now. Please try again later.");
      return;
    }

    setIsSubmitting(true);
    try {
      const verifier = getOrCreateRecaptchaVerifier();
      if (!verifier) {
        throw new Error("Unable to initialize reCAPTCHA. Please try again.");
      }

      const confirmation = await signInWithPhoneNumber(auth, `+91${cleanPhone}`, verifier);
      setConfirmationResult(confirmation);
      setStep("otp");
      setCountdown(45);
      setCanResend(false);
      setOtpDigits(["", "", "", "", "", ""]);
      setSuccessMessage(`SMS sent with a 6-digit OTP to +91 ${cleanPhone}`);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (fbErr: any) {
      console.error("Firebase Phone Auth error:", fbErr);
      cleanupRecaptcha();

      let msg = fbErr.message || "Failed to send SMS.";
      const code = fbErr.code || "";

      if (code === "auth/billing-not-enabled" || fbErr.message?.includes("billing-not-enabled")) {
        msg = "SMS OTP is temporarily unavailable. Please try again later.";
      } else if (code === "auth/unauthorized-domain") {
        msg = "This store address is not enabled for SMS login yet. Please contact the store.";
      } else if (code === "auth/operation-not-allowed") {
        msg = "SMS login is not enabled. Please contact the store.";
      } else if (code === "auth/quota-exceeded") {
        msg = "SMS limit reached for today. Please try again later.";
      } else if (code === "auth/invalid-phone-number") {
        msg = "Invalid mobile number. Please check the 10-digit number.";
      } else if (code === "auth/captcha-check-failed" || fbErr.message?.includes("reCAPTCHA")) {
        msg = "Verification was reset. Please tap 'Send Verification OTP' again.";
      } else if (code === "auth/too-many-requests") {
        msg = "Too many SMS requests. Please wait a few minutes before trying again.";
      }

      setErrorMessage(msg);
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

    if (!confirmationResult) {
      setErrorMessage("Please request a new OTP.");
      setIsSubmitting(false);
      return;
    }

    let firebaseIdToken = "";
    try {
      const credential = await confirmationResult.confirm(code);
      firebaseIdToken = await credential.user.getIdToken();
    } catch (confirmErr: any) {
      setErrorMessage(confirmErr.message || "Incorrect OTP code. Please try again.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_otp",
          phone: cleanPhone,
          firebaseIdToken,
          shopId: getPublicShopId(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.customer) {
        const cust = data.customer;

        // If this is a NEW customer without a saved address / name, transition to onboarding!
        if (data.isNewCustomer) {
          setStep("onboarding");
          setIsSubmitting(false);
          return;
        }

        // Existing customer: login immediately!
        let resolvedAddress: CustomerAddress | null = cust.address || null;
        loginCustomer({
          id: cust.id,
          name: cust.name,
          phone: cleanPhone,
          isVerified: true,
          authProvider: "phone",
          address: resolvedAddress,
        });

        if (resolvedAddress) {
          setSavedAddress(resolvedAddress);
        }

        // Sync past orders for this now-verified customer (server route, session-gated).
        try {
          const ordRes = await fetch("/api/store/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "list" }),
          });
          const ordData = await ordRes.json();
          (ordData?.orders || []).forEach((ord: any) => addRecentOrder(ord));
        } catch {
          // Non-blocking
        }

        setSuccessMessage(`Welcome back, ${cust.name}!`);
        setStep("success");
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1200);
      } else {
        setErrorMessage(data.error || "Incorrect OTP code. Please enter the valid 6-digit code.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to verify OTP with server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 4: Handle New Customer Profile & Address Onboarding
  const handleSaveOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage("Please enter your Full Name.");
      return;
    }
    if (!villageOrColony.trim()) {
      setErrorMessage("Please enter your Village, Mohalla, or Colony.");
      return;
    }
    if (!tehsilOrTown.trim()) {
      setErrorMessage("Please enter your Tehsil or Town.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const cleanPhone = phone.replace(/[^0-9]/g, "").slice(-10);
    const newAddress: CustomerAddress = {
      fullName: fullName.trim(),
      mobileNumber: cleanPhone,
      villageOrColony: villageOrColony.trim(),
      tehsilOrTown: tehsilOrTown.trim(),
      landmark: landmark.trim(),
      pincode: pincode.trim() || "483501",
      latitude: coords.latitude,
      longitude: coords.longitude,
      mapAddress: coords.mapAddress,
    };

    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_customer_profile",
          phone: cleanPhone,
          name: fullName.trim(),
          address: newAddress,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.customer) {
        loginCustomer({
          id: data.customer.id,
          name: fullName.trim(),
          phone: cleanPhone,
          isVerified: true,
          authProvider: "phone",
          address: newAddress,
        });
        setSavedAddress(newAddress);
        setSuccessMessage(`Profile created successfully! Welcome, ${fullName.trim()}!`);
        setStep("success");
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1200);
      } else {
        setErrorMessage(data.error || "Failed to save profile.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error saving profile.");
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

          <h3 className="text-lg font-black tracking-tight">
            {step === "onboarding" ? "Complete Delivery Profile" : title}
          </h3>
          <p className="text-xs text-purple-100 mt-1 max-w-xs mx-auto leading-relaxed">
            {step === "onboarding"
              ? "Enter your name and delivery address with live GPS pin once for express checkout."
              : subtitle}
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

          {successMessage && step === "otp" && (
            <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* STEP 1: PHONE-ONLY INPUT (Zero Friction - No Name or Address required upfront) */}
          {step === "input" && (
            <div className="space-y-4">
              <form onSubmit={(e) => handleSendOtp(e)} className="space-y-3.5">
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
                      autoFocus
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="Enter 10-digit number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                      className="flex-1 min-w-0 px-3.5 py-3 bg-transparent text-sm font-bold text-gray-900 outline-none tracking-wider placeholder:text-gray-400 placeholder:font-normal"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    We will send a 6-digit verification code to confirm your mobile number.
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || phone.length !== 10}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-500/20 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <span>{isSubmitting ? "Sending SMS..." : "Send Verification OTP (SMS)"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
                <h4 className="text-sm font-bold text-gray-900">
                  Enter 6-Digit OTP
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Code sent to <span className="font-bold text-gray-800">+91 {phone}</span>
                </p>
              </div>

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
                    onClick={() => handleSendOtp()}
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
                <span>{isSubmitting ? "Verifying..." : "Verify & Continue"}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 3: NEW CUSTOMER ONBOARDING (NAME, ADDRESS & LIVE GOOGLE MAP GPS PICKER) */}
          {step === "onboarding" && (
            <div className="space-y-4">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-2.5 text-xs text-purple-900">
                <Sparkles className="w-5 h-5 text-purple-600 shrink-0" />
                <span>
                  <strong>Mobile Verified!</strong> Enter your delivery address once so our delivery rider can reach you.
                </span>
              </div>

              <form onSubmit={handleSaveOnboarding} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Your Full Name (आपका नाम) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Village / Mohalla / Colony (गाँव / मोहल्ला / कालोनी) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Village Pipariya / Shanti Nagar Colony"
                      value={villageOrColony}
                      onChange={(e) => setVillageOrColony(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Tehsil / Town <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Katni"
                      value={tehsilOrTown}
                      onChange={(e) => setTehsilOrTown(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="483501"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Nearby Landmark (पहचान / लैंडमार्क)
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g. Near Primary School / Water Tank"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Live Google Map & GPS Coordinates Picker */}
                <LocationPicker
                  latitude={coords.latitude}
                  longitude={coords.longitude}
                  onChange={(c) => setCoords(c)}
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/20 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer mt-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? "Saving Profile..." : "Save Profile & Start Shopping"}</span>
                </button>
              </form>
            </div>
          )}

          {/* STEP 4: SUCCESS CELEBRATION */}
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
