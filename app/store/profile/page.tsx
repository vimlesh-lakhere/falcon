"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Phone,
  MapPin,
  Package,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  LogOut,
  Lock,
  Edit3,
  Save,
  KeyRound,
  Truck,
  Home,
  Building2,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { useStoreCart, CustomerAddress } from "@/store/useStoreCart";
import { LocationPicker } from "@/components/store/LocationPicker";
import { CustomerAuthModal } from "@/components/store/CustomerAuthModal";
import { createClient } from "@/lib/supabase/client";

export default function CustomerProfilePage() {
  const router = useRouter();
  const {
    customerUser,
    savedAddress,
    recentOrders,
    setSavedAddress,
    loginCustomer,
    logoutCustomer,
  } = useStoreCart();

  const [mounted, setMounted] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Profile / Address Form State
  const [fullName, setFullName] = useState("");
  const [villageOrColony, setVillageOrColony] = useState("");
  const [tehsilOrTown, setTehsilOrTown] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("483501");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [coords, setCoords] = useState<{ latitude?: number; longitude?: number; mapAddress?: string }>({});

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Secure Phone Change State
  const [isChangingPhone, setIsChangingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [phoneChangeStep, setPhoneChangeStep] = useState<"input" | "otp">("input");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
  const [isVerifyingPhoneOtp, setIsVerifyingPhoneOtp] = useState(false);
  const [phoneChangeError, setPhoneChangeError] = useState<string | null>(null);
  const [phoneChangeSuccess, setPhoneChangeSuccess] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  // Active Customer Orders (Database count)
  const [dbOrdersCount, setDbOrdersCount] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync initial address and name from session
  useEffect(() => {
    if (customerUser) {
      if (customerUser.name) setFullName(customerUser.name);
      if (customerUser.address) {
        const addr = customerUser.address;
        setVillageOrColony(addr.villageOrColony || "");
        setTehsilOrTown(addr.tehsilOrTown || "");
        setLandmark(addr.landmark || "");
        setPincode(addr.pincode || "483501");
        setDeliveryNotes(addr.deliveryNotes || "");
        setCoords({
          latitude: addr.latitude,
          longitude: addr.longitude,
          mapAddress: addr.mapAddress,
        });
      } else if (savedAddress) {
        setVillageOrColony(savedAddress.villageOrColony || "");
        setTehsilOrTown(savedAddress.tehsilOrTown || "");
        setLandmark(savedAddress.landmark || "");
        setPincode(savedAddress.pincode || "483501");
        setDeliveryNotes(savedAddress.deliveryNotes || "");
        setCoords({
          latitude: savedAddress.latitude,
          longitude: savedAddress.longitude,
          mapAddress: savedAddress.mapAddress,
        });
      }
    }
  }, [customerUser, savedAddress]);

  // Fetch count of orders from Supabase for this customer's phone
  useEffect(() => {
    const currentPhone = customerUser?.phone?.replace(/[^0-9]/g, "").slice(-10);
    if (!currentPhone || currentPhone.length < 10) return;

    const fetchOrderStats = async () => {
      try {
        const supabase = createClient();
        const { data: custList } = await supabase
          .from("customers")
          .select("id")
          .eq("phone", currentPhone);

        const customerIds = (custList || []).map((c) => c.id);
        if (customerIds.length > 0) {
          const { count } = await supabase
            .from("sales")
            .select("id", { count: "exact", head: true })
            .in("customer_id", customerIds);

          setDbOrdersCount(count || 0);
        }
      } catch {
        // Non-blocking
      }
    };

    fetchOrderStats();
  }, [customerUser?.phone]);

  // Timer countdown for OTP resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Save Profile & Address Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    if (!fullName.trim()) {
      setProfileErrorMsg("Please enter your full name.");
      return;
    }

    const currentPhone = customerUser?.phone?.replace(/[^0-9]/g, "").slice(-10);
    if (!currentPhone) {
      setProfileErrorMsg("No registered phone number found. Please sign in again.");
      return;
    }

    setIsSavingProfile(true);

    const updatedAddress: CustomerAddress = {
      fullName: fullName.trim(),
      mobileNumber: currentPhone,
      villageOrColony: villageOrColony.trim(),
      tehsilOrTown: tehsilOrTown.trim() || "Town Area",
      landmark: landmark.trim(),
      pincode: pincode.trim() || "483501",
      deliveryNotes: deliveryNotes.trim(),
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
          phone: currentPhone,
          name: fullName.trim(),
          address: updatedAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save profile. Please try again.");
      }

      // Update Zustand local storage & session
      setSavedAddress(updatedAddress);
      loginCustomer({
        id: data.customer?.id || customerUser?.id,
        name: fullName.trim(),
        phone: currentPhone,
        address: updatedAddress,
        isVerified: true,
        authProvider: "phone",
      });

      setProfileSuccessMsg("Profile and delivery address updated successfully!");
      setTimeout(() => setProfileSuccessMsg(null), 5000);
    } catch (err: any) {
      setProfileErrorMsg(err.message || "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Step 1: Send OTP to NEW mobile number
  const handleSendOtpToNewPhone = async () => {
    setPhoneChangeError(null);
    setPhoneChangeSuccess(null);

    const cleanNew = newPhone.replace(/[^0-9]/g, "").slice(-10);
    const cleanOld = customerUser?.phone?.replace(/[^0-9]/g, "").slice(-10) || "";

    if (cleanNew.length < 10) {
      setPhoneChangeError("Please enter a valid 10-digit new mobile number.");
      return;
    }

    if (cleanNew === cleanOld) {
      setPhoneChangeError("New mobile number cannot be the same as your current registered number.");
      return;
    }

    setIsSendingPhoneOtp(true);

    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_otp",
          phone: cleanNew,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not send verification code. Please check number.");
      }

      setPhoneChangeStep("otp");
      setResendTimer(60);
      setPhoneChangeSuccess(`6-Digit OTP sent to +91 ${cleanNew}. Please verify to change your number.`);
    } catch (err: any) {
      setPhoneChangeError(err.message || "Failed to send verification code.");
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  // Step 2: Verify OTP and update mobile number
  const handleVerifyAndUpdatePhone = async () => {
    setPhoneChangeError(null);
    setPhoneChangeSuccess(null);

    const cleanNew = newPhone.replace(/[^0-9]/g, "").slice(-10);
    const cleanOld = customerUser?.phone?.replace(/[^0-9]/g, "").slice(-10) || "";
    const cleanOtp = phoneOtp.trim();

    if (cleanOtp.length !== 6) {
      setPhoneChangeError("Please enter the 6-digit verification code.");
      return;
    }

    setIsVerifyingPhoneOtp(true);

    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_customer_phone",
          oldPhone: cleanOld,
          newPhone: cleanNew,
          otp: cleanOtp,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Verification failed. Invalid or expired OTP.");
      }

      // Successfully verified and changed on backend!
      // Update Zustand customer session
      const updatedAddress = savedAddress
        ? { ...savedAddress, mobileNumber: cleanNew }
        : null;

      if (updatedAddress) {
        setSavedAddress(updatedAddress);
      }

      loginCustomer({
        id: data.customer?.id || customerUser?.id,
        name: customerUser?.name || "Customer",
        phone: cleanNew,
        address: updatedAddress,
        isVerified: true,
        authProvider: "phone",
      });

      setPhoneChangeSuccess(`Mobile number successfully changed to +91 ${cleanNew}!`);
      setIsChangingPhone(false);
      setPhoneChangeStep("input");
      setNewPhone("");
      setPhoneOtp("");
      setTimeout(() => setPhoneChangeSuccess(null), 6000);
    } catch (err: any) {
      setPhoneChangeError(err.message || "Failed to verify new mobile number.");
    } finally {
      setIsVerifyingPhoneOtp(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to sign out from your customer account?")) {
      logoutCustomer();
      fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      })
        .catch(() => {})
        .finally(() => router.push("/store"));
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  // If customer is not logged in:
  if (!customerUser) {
    return (
      <div className="min-h-screen bg-gray-50/50 py-12 px-4 sm:px-6">
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-purple-100 shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-purple-600/30">
            <User className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Customer Profile</h1>
            <p className="text-xs text-gray-500 leading-relaxed">
              Sign in with your mobile number to view past orders, manage your saved delivery address, and change your registered number.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white text-sm font-bold shadow-lg shadow-purple-700/25 hover:shadow-purple-700/40 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Phone className="w-4 h-4" />
            <span>Sign In with Mobile OTP</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <Link
            href="/store"
            className="inline-block text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors"
          >
            ← Return to Store
          </Link>

          <CustomerAuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onSuccess={() => setIsAuthModalOpen(false)}
          />
        </div>
      </div>
    );
  }

  const currentCleanPhone = customerUser.phone?.replace(/[^0-9]/g, "").slice(-10);

  return (
    <div className="min-h-screen bg-gray-50/60 pb-20">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white pt-8 pb-16 px-4 sm:px-6 shadow-md">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <Link
              href="/store"
              className="text-xs text-purple-200 hover:text-white flex items-center gap-1 font-medium transition-colors"
            >
              ← Back to Store
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs text-rose-300 hover:text-rose-100 flex items-center gap-1 bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-amber-500 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-purple-900/50 shrink-0">
                {customerUser.name ? customerUser.name[0]?.toUpperCase() : "U"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    {customerUser.name || "Customer"}
                  </h1>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </span>
                </div>
                <p className="text-xs text-purple-200 font-medium mt-0.5">
                  +91 {currentCleanPhone} • Falcon Customer Account
                </p>
              </div>
            </div>

            {/* Quick Stats Badges */}
            <div className="flex items-center gap-2">
              <Link
                href="/store/orders"
                className="bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl px-3.5 py-2 text-center transition-all flex items-center gap-2"
              >
                <Package className="w-4 h-4 text-amber-400" />
                <div className="text-left">
                  <div className="text-[10px] text-purple-200 uppercase font-bold tracking-wider">Orders</div>
                  <div className="text-xs font-black text-white">
                    {dbOrdersCount !== null ? dbOrdersCount : recentOrders.length} Total
                  </div>
                </div>
              </Link>

              <div className="bg-white/10 border border-white/10 rounded-2xl px-3.5 py-2 text-left flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-300" />
                <div>
                  <div className="text-[10px] text-purple-200 uppercase font-bold tracking-wider">Address</div>
                  <div className="text-xs font-black text-white">
                    {villageOrColony ? "Saved 📍" : "Not Set"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 space-y-6">
        {/* Global Success / Notice Banners */}
        {phoneChangeSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-3 shadow-md animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="flex-1">{phoneChangeSuccess}</div>
          </div>
        )}

        {profileSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-3 shadow-md animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="flex-1">{profileSuccessMsg}</div>
          </div>
        )}

        {profileErrorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-3 shadow-md">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="flex-1">{profileErrorMsg}</div>
          </div>
        )}

        {/* SECTION 1: REGISTERED MOBILE NUMBER & VERIFIED CHANGE */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-gray-900">Registered Mobile Number</h2>
                <p className="text-xs text-gray-500">
                  Used for order updates, OTP authentication, and delivery coordination.
                </p>
              </div>
            </div>

            {!isChangingPhone && (
              <button
                type="button"
                onClick={() => {
                  setIsChangingPhone(true);
                  setPhoneChangeStep("input");
                  setPhoneChangeError(null);
                  setPhoneChangeSuccess(null);
                  setNewPhone("");
                  setPhoneOtp("");
                }}
                className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Change Mobile Number</span>
              </button>
            )}
          </div>

          {/* Current Mobile Display */}
          <div className="flex items-center justify-between bg-gray-50/80 border border-gray-200/70 p-3.5 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Current Primary Number</div>
                <div className="text-sm font-black text-gray-900">+91 {currentCleanPhone}</div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Active & Verified
            </span>
          </div>

          {/* Collapsible Verified Mobile Change Workflow */}
          {isChangingPhone && (
            <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-purple-700 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider">
                    Strict Verification Required (सुरक्षा सत्यापन)
                  </h3>
                  <p className="text-xs text-purple-800 mt-0.5 leading-relaxed">
                    मोबाइल नंबर बदलने के लिए नए नंबर पर 6-अंकों का OTP भेजा जाएगा। बिना सही OTP सत्यापन के पुराना नंबर नहीं बदलेगा।
                  </p>
                </div>
              </div>

              {phoneChangeError && (
                <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{phoneChangeError}</span>
                </div>
              )}

              {phoneChangeStep === "input" ? (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-gray-800">
                    Enter New 10-Digit Mobile Number (नया मोबाइल नंबर)
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="relative w-full">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="98XXXXXXXX"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                        className="w-full pl-12 pr-4 py-2.5 bg-white border border-purple-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleSendOtpToNewPhone}
                        disabled={isSendingPhoneOtp || newPhone.length < 10}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        {isSendingPhoneOtp ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Sending OTP...</span>
                          </>
                        ) : (
                          <>
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Send OTP to New Number</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsChangingPhone(false)}
                        className="px-3 py-2.5 text-xs text-gray-600 hover:bg-gray-200/60 rounded-xl font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Step 2: Enter OTP sent to new number */
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">
                      Enter 6-digit OTP sent to: <strong className="text-purple-900">+91 {newPhone}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPhoneChangeStep("input")}
                      className="text-[11px] text-purple-700 hover:underline font-bold"
                    >
                      Change Number
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP"
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                      className="w-full sm:w-48 text-center tracking-widest font-mono text-base font-black py-2 bg-white border border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleVerifyAndUpdatePhone}
                        disabled={isVerifyingPhoneOtp || phoneOtp.length !== 6}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        {isVerifyingPhoneOtp ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verify & Change Number</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleSendOtpToNewPhone}
                        disabled={resendTimer > 0 || isSendingPhoneOtp}
                        className="px-3 py-2.5 text-xs text-purple-700 hover:bg-purple-100 disabled:text-gray-400 rounded-xl font-bold transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsChangingPhone(false)}
                        className="px-3 py-2.5 text-xs text-gray-600 hover:bg-gray-200/60 rounded-xl font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 2: EDIT PROFILE & DELIVERY ADDRESS */}
        <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-5 sm:p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-gray-900">Personal Details & Delivery Address</h2>
                <p className="text-xs text-gray-500">
                  Update your name, village/town, landmark, and exact GPS delivery location.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-700/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Full Name (आपका पूरा नाम) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ramesh Kumar Patel"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Village / Colony / Mohalla */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Village / Colony / Mohalla (गाँव / मोहल्ला / वार्ड)
              </label>
              <input
                type="text"
                value={villageOrColony}
                onChange={(e) => setVillageOrColony(e.target.value)}
                placeholder="e.g. Ward No. 4, Shanti Nagar"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Tehsil / Town / City */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Tehsil / Town / City (तहसील / शहर)
              </label>
              <input
                type="text"
                value={tehsilOrTown}
                onChange={(e) => setTehsilOrTown(e.target.value)}
                placeholder="e.g. Sihora / Katni"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Landmark */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Famous Landmark (प्रसिद्ध पहचान / लैंडमार्क)
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near Shiv Mandir, Govt School"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Pincode */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Pincode (पिनकोड)
              </label>
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder="483501"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Delivery Notes */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Special Delivery Notes (डिलीवरी निर्देश)
              </label>
              <input
                type="text"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="e.g. Call before coming, deliver in evening"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Location Picker (Live GPS + Area Autocomplete) */}
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-purple-600" />
                Live Google Maps GPS Pin (सटीक लोकेशन)
              </span>
              {coords.latitude && coords.longitude && (
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  GPS Coordinates Saved
                </span>
              )}
            </div>
            <LocationPicker
              value={coords}
              onChange={(newCoords) => setCoords(newCoords)}
            />
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-6 py-3 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-700/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Profile & Address...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile & Delivery Address</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* SECTION 3: RECENT ORDERS & HISTORY SUMMARY */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-gray-900">Your Orders & Purchases</h2>
                <p className="text-xs text-gray-500">
                  Track deliveries, view counter bills, and reorder your favorite items.
                </p>
              </div>
            </div>

            <Link
              href="/store/orders"
              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <span>View All Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentOrders && recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.slice(0, 2).map((ord) => (
                <div
                  key={ord.orderId}
                  className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-900">
                        {ord.orderType === "online" ? "🛵 Delivery Order" : "🏬 Store Purchase"}
                      </span>
                      <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">
                        #{ord.invoiceNumber}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {ord.itemCount} items • ₹{ord.totalAmount} • {new Date(ord.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>

                  <Link
                    href={`/store/orders/${ord.orderId}`}
                    className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-purple-700 hover:bg-purple-50 text-xs font-bold flex items-center gap-1 transition-colors self-end sm:self-auto"
                  >
                    <span>Track Status</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-gray-500 space-y-2">
              <p>No recent orders found in this session.</p>
              <Link
                href="/store/orders"
                className="inline-flex items-center gap-1 text-purple-700 font-bold hover:underline"
              >
                <span>Search all orders by mobile number</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
