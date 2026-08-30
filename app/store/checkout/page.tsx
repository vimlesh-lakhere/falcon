"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Phone,
  MapPin,
  Sparkles,
  DollarSign,
  QrCode,
  Lock,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
} from "lucide-react";
import { useStoreCart, CustomerAddress } from "@/store/useStoreCart";
import { storeOrderService } from "@/lib/store/order-service";
import { CustomerAuthModal } from "@/components/store/CustomerAuthModal";

const SHOP_ID = process.env.DEFAULT_SHOP_ID || "a0000000-0000-0000-0000-000000000001";
const STORE_UPI_ID = "9340362381@ybl";
const STORE_PAYEE_NAME = "AGS Store";

export default function StoreCheckoutPage() {
  const router = useRouter();
  const { cart, savedAddress, setSavedAddress, addRecentOrder, clearCart, getCartTotal, customerUser, loginCustomer } = useStoreCart();

  const { subtotal, totalSavings, itemCount } = getCartTotal();

  const [address, setAddress] = useState<CustomerAddress>(
    savedAddress || {
      fullName: customerUser?.name || "",
      mobileNumber: customerUser?.phone || "",
      villageOrColony: customerUser?.address?.villageOrColony || "",
      tehsilOrTown: customerUser?.address?.tehsilOrTown || "",
      landmark: customerUser?.address?.landmark || "",
      pincode: customerUser?.address?.pincode || "483501",
      deliveryNotes: "",
    }
  );

  const [mounted, setMounted] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "upi">("upi");
  const [upiReference, setUpiReference] = useState("");
  const [hasCopiedUpi, setHasCopiedUpi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [foundExistingCustomer, setFoundExistingCustomer] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Dynamic UPI payment URL with auto-filled order total
  const upiUrl = `upi://pay?pa=${STORE_UPI_ID}&pn=${encodeURIComponent(STORE_PAYEE_NAME)}&am=${subtotal}&cu=INR&tn=${encodeURIComponent(`Order Payment AGS Store`)}`;
  const phonePeUrl = `phonepe://pay?pa=${STORE_UPI_ID}&pn=${encodeURIComponent(STORE_PAYEE_NAME)}&am=${subtotal}&cu=INR&tn=${encodeURIComponent(`Order Payment AGS Store`)}`;
  const gpayUrl = `gpay://upi/pay?pa=${STORE_UPI_ID}&pn=${encodeURIComponent(STORE_PAYEE_NAME)}&am=${subtotal}&cu=INR&tn=${encodeURIComponent(`Order Payment AGS Store`)}`;
  const paytmUrl = `paytmmp://pay?pa=${STORE_UPI_ID}&pn=${encodeURIComponent(STORE_PAYEE_NAME)}&am=${subtotal}&cu=INR&tn=${encodeURIComponent(`Order Payment AGS Store`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(upiUrl)}&margin=4`;

  const copyUpiId = () => {
    navigator.clipboard.writeText(STORE_UPI_ID);
    setHasCopiedUpi(true);
    setTimeout(() => setHasCopiedUpi(false), 2500);
  };

  // Auto-sync customerUser when changed
  React.useEffect(() => {
    if (customerUser) {
      setAddress((prev) => ({
        ...prev,
        fullName: prev.fullName || customerUser.name,
        mobileNumber: prev.mobileNumber || customerUser.phone,
        ...(customerUser.address || {}),
      }));
    }
  }, [customerUser]);

  // Handle phone blur auto lookup
  const handlePhoneBlur = async () => {
    const cleanPhone = address.mobileNumber.replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10 && !customerUser) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = await supabase
          .from("customers")
          .select("*")
          .eq("phone", cleanPhone)
          .maybeSingle();

        if (data) {
          setFoundExistingCustomer(true);
          setAddress((prev) => ({
            ...prev,
            fullName: prev.fullName || data.name || "",
            villageOrColony: prev.villageOrColony || data.address || "",
          }));
          loginCustomer({
            id: data.id,
            name: data.name || "Customer",
            phone: cleanPhone,
          });
        }
      } catch (err) {
        // Non-blocking
      }
    }
  };

  if (!mounted) {
    return (
      <div className="max-w-xl mx-auto px-4 pt-16 text-center text-xs text-gray-400">
        Loading Checkout...
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 pt-16 text-center space-y-4">
        <h2 className="text-xl font-black text-gray-900">Your Cart is Empty</h2>
        <p className="text-xs text-gray-500">Please add items to cart before proceeding to checkout.</p>
        <Link
          href="/store"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-md"
        >
          Go to Store
        </Link>
      </div>
    );
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!address.fullName.trim()) {
      setErrorMessage("Please enter your Full Name");
      return;
    }
    if (!address.mobileNumber.trim() || address.mobileNumber.replace(/[^0-9]/g, "").length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number for delivery coordination");
      return;
    }
    if (!address.villageOrColony.trim()) {
      setErrorMessage("Please enter your Village, Mohalla, or Colony");
      return;
    }
    if (!address.tehsilOrTown.trim()) {
      setErrorMessage("Please enter your Tehsil or Town");
      return;
    }

    try {
      setSubmitting(true);
      // Save address for next time
      setSavedAddress(address);

      const res = await storeOrderService.placeOrder({
        shopId: SHOP_ID,
        cart,
        address,
        paymentMethod,
        upiReference: upiReference.trim() || undefined,
      });

      if (res.success && res.order) {
        addRecentOrder(res.order);
        clearCart();
        router.push(`/store/orders/${res.order.orderId}`);
      } else {
        setErrorMessage(res.error || "Failed to place order. Please try again.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
      {/* Back Link */}
      <Link
        href="/store/cart"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-purple-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Cart</span>
      </Link>

      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
          ⚡ 1-Page Express Village & Town Checkout
        </h1>
        <p className="text-xs text-gray-500">
          Simple, fast ordering without complicated passwords. Pay safely when you receive your package.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Customer & Address Details */}
        <div className="lg:col-span-7 space-y-5">
          {/* Customer Account Prompt / Welcome Card */}
          {customerUser ? (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {customerUser.avatarUrl ? (
                  <img src={customerUser.avatarUrl} alt="" className="w-10 h-10 rounded-2xl shadow-xs" />
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    {customerUser.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    {customerUser.authProvider === "google" ? "Google Verified Customer" : "OTP Verified Customer"}
                  </span>
                  <h3 className="text-sm font-black text-gray-900 leading-tight">
                    Welcome back, {customerUser.name}!
                  </h3>
                  <p className="text-[11px] text-gray-500 font-mono">
                    {customerUser.phone ? `+91 ${customerUser.phone}` : customerUser.email}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
              </span>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 border border-purple-200/80 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div>
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  Express 1-Tap Checkout
                </span>
                <h4 className="text-xs sm:text-sm font-black text-gray-900">
                  Sign in & verify with Google or Mobile OTP to auto-fill saved address
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all shrink-0"
              >
                Verify & Sign In
              </button>
            </div>
          )}

          {/* Step 1: Customer Info */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-black text-xs">
                  1
                </div>
                <h2 className="text-sm font-black text-gray-900">Your Contact Details</h2>
              </div>
              {foundExistingCustomer && (
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Auto-filled from History
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Full Name (आपका नाम) *
                </label>
                <input
                  type="text"
                  required
                  value={address.fullName}
                  onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                  placeholder="e.g. Ramesh Kumar / Pooja Sharma"
                  className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-4 focus:ring-purple-500/10 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  WhatsApp / Mobile Number (मोबाइल नंबर) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={address.mobileNumber}
                    onBlur={handlePhoneBlur}
                    onChange={(e) =>
                      setAddress({
                        ...address,
                        mobileNumber: e.target.value.replace(/[^0-9]/g, ""),
                      })
                    }
                    placeholder="9876543210"
                    className="w-full pl-12 text-xs sm:text-sm bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-4 focus:ring-purple-500/10 font-medium font-mono"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Our delivery rider will call this number when arriving at your location.
                </p>
              </div>
            </div>
          </div>

          {/* Step 2: Village & Town Delivery Address */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-black text-xs">
                2
              </div>
              <h2 className="text-sm font-black text-gray-900">Village / Town Address</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Village, Mohalla, or Colony (गाँव / मोहल्ला / कालोनी) *
                </label>
                <input
                  type="text"
                  required
                  value={address.villageOrColony}
                  onChange={(e) => setAddress({ ...address, villageOrColony: e.target.value })}
                  placeholder="e.g. Village Pipariya / Shanti Nagar Colony"
                  className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tehsil / Town (तहसील / शहर) *
                </label>
                <input
                  type="text"
                  required
                  value={address.tehsilOrTown}
                  onChange={(e) => setAddress({ ...address, tehsilOrTown: e.target.value })}
                  placeholder="e.g. Katni / Sihora"
                  className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nearby Landmark (पहचान / लैंडमार्क)
                </label>
                <input
                  type="text"
                  value={address.landmark}
                  onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                  placeholder="e.g. Near Primary School / Water Tank"
                  className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  PIN Code (पिन कोड)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={address.pincode}
                  onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                  placeholder="483501"
                  className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Delivery Note (ऑर्डर निर्देश)
                </label>
                <input
                  type="text"
                  value={address.deliveryNotes}
                  onChange={(e) => setAddress({ ...address, deliveryNotes: e.target.value })}
                  placeholder="e.g. Deliver in afternoon / Call before coming"
                  className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 focus:outline-none font-medium"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Payment Method */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 space-y-5 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-black text-xs">
                3
              </div>
              <h2 className="text-sm font-black text-gray-900">Choose Payment Method</h2>
            </div>

            {/* Payment Method Selection Radio Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  paymentMethod === "upi"
                    ? "border-purple-600 bg-purple-50/60 shadow-xs"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "upi"}
                  onChange={() => setPaymentMethod("upi")}
                  className="mt-1 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-gray-900">⚡ Instant UPI / QR Payment</span>
                    <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                      AUTO-FILL
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                    Scan with PhonePe, GPay, Paytm or 1-tap pay on mobile. Amount is auto-filled.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  paymentMethod === "cod"
                    ? "border-purple-600 bg-purple-50/60 shadow-xs"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "cod"}
                  onChange={() => setPaymentMethod("cod")}
                  className="mt-1 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <div className="text-xs font-black text-gray-900">💵 Cash on Delivery (COD)</div>
                  <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                    Pay cash in hand when our rider delivers to your doorstep.
                  </p>
                </div>
              </label>
            </div>

            {/* UPI Dynamic QR Code & 1-Tap Mobile Actions */}
            {paymentMethod === "upi" && (
              <div className="mt-4 bg-gray-950 text-white rounded-3xl p-5 sm:p-6 space-y-5 border border-gray-800 shadow-xl animate-in fade-in slide-in-from-top-2">
                {/* PNB & PhonePe Header */}
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-amber-500 text-black flex items-center justify-center font-black text-xs">
                      PNB
                    </div>
                    <div>
                      <div className="text-xs font-black text-white">Punjab National Bank - 5316</div>
                      <div className="text-[10px] text-emerald-400 font-semibold">
                        Primary account for receiving money
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-black text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                    ₹{subtotal}
                  </span>
                </div>

                {/* QR Code + Scan Instruction */}
                <div className="flex flex-col sm:flex-row items-center gap-6 justify-center text-center sm:text-left">
                  {/* Dynamic Auto-Fill QR Code */}
                  <div className="bg-white p-3 rounded-2xl shadow-lg shrink-0 relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCodeUrl}
                      alt="UPI Payment QR Code"
                      width={240}
                      height={240}
                      className="w-56 h-56 sm:w-60 sm:h-60 rounded-xl object-contain mx-auto"
                    />
                    <div className="mt-1.5 text-center">
                      <span className="text-[9px] font-black text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        ₹{subtotal} AUTO-FILLED
                      </span>
                    </div>
                  </div>

                  {/* QR Details and Copy UPI */}
                  <div className="space-y-3 max-w-xs">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider text-purple-300">
                        Scan with Any UPI App
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                        QR scan karte hi aapke <strong>PhonePe, GPay, Paytm</strong> app me{" "}
                        <span className="text-amber-300 font-bold">₹{subtotal}</span> amount apne aap bhar jayega.
                      </p>
                    </div>

                    {/* Copy UPI ID */}
                    <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-xl space-y-1">
                      <div className="text-[10px] text-gray-400 font-semibold">Store UPI ID:</div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-white tracking-wide">
                          {STORE_UPI_ID}
                        </span>
                        <button
                          type="button"
                          onClick={copyUpiId}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                        >
                          {hasCopiedUpi ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-300" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile 1-Tap Direct UPI App Launch Buttons */}
                <div className="pt-2 border-t border-gray-800 space-y-2">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">
                    📱 Ordering on Mobile? Tap App to Pay Directly:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <a
                      href={phonePeUrl}
                      className="py-2.5 px-3 bg-[#5f259f] hover:bg-[#6c2bb4] text-white rounded-xl text-[11px] font-bold text-center flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all"
                    >
                      <span>PhonePe</span>
                      <ExternalLink className="w-3 h-3 text-purple-200" />
                    </a>
                    <a
                      href={gpayUrl}
                      className="py-2.5 px-3 bg-white text-gray-900 hover:bg-gray-100 rounded-xl text-[11px] font-bold text-center flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all"
                    >
                      <span>Google Pay</span>
                      <ExternalLink className="w-3 h-3 text-gray-500" />
                    </a>
                    <a
                      href={paytmUrl}
                      className="py-2.5 px-3 bg-[#002e6e] hover:bg-[#003d94] text-white rounded-xl text-[11px] font-bold text-center flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all"
                    >
                      <span>Paytm</span>
                      <ExternalLink className="w-3 h-3 text-blue-200" />
                    </a>
                    <a
                      href={upiUrl}
                      className="py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white rounded-xl text-[11px] font-bold text-center flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all"
                    >
                      <span>Any UPI App</span>
                      <Smartphone className="w-3 h-3 text-emerald-200" />
                    </a>
                  </div>
                </div>

                {/* Optional UPI UTR / Reference ID Field */}
                <div className="pt-2 border-t border-gray-800 space-y-1.5">
                  <label className="text-[11px] font-semibold text-gray-400 flex items-center justify-between">
                    <span>UPI Reference No. / UTR (Optional)</span>
                    <span className="text-[10px] text-gray-500">12 Digits after payment</span>
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    placeholder="e.g. 423871928392"
                    value={upiReference}
                    onChange={(e) => setUpiReference(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-600 font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Trust Footer */}
                <div className="flex items-center justify-center gap-4 text-[10px] text-gray-500 font-semibold pt-1">
                  <span>🔒 100% Direct UPI Transfer</span>
                  <span>•</span>
                  <span>⚡ Instant Order Verification</span>
                  <span>•</span>
                  <span>🇮🇳 Powered by NPCI UPI</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Order Summary Card */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 space-y-5 shadow-xs sticky top-24">
          <h2 className="text-sm font-black uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-3">
            Review Items ({itemCount})
          </h2>

          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.product.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-800 line-clamp-1 flex-1 pr-2">
                  {item.quantity}x {item.product.name}
                </span>
                <span className="font-bold text-gray-900">
                  ₹{(Number(item.product.selling_price) || 0) * item.quantity}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-gray-100 space-y-2 text-xs text-gray-600">
            <div className="flex items-center justify-between">
              <span>Subtotal:</span>
              <span className="font-bold text-gray-900">₹{subtotal}</span>
            </div>

            {totalSavings > 0 && (
              <div className="flex items-center justify-between text-emerald-700 font-bold">
                <span>Discount Savings:</span>
                <span>- ₹{totalSavings}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span>Local Delivery:</span>
              <span className="font-bold text-emerald-600">FREE</span>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-base font-black text-gray-900">
              <span>Amount to Pay on Delivery:</span>
              <span className="text-purple-700 text-xl font-black">₹{subtotal}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {submitting ? (
              <span>Placing Your Order...</span>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Confirm & Place Order (₹{subtotal})</span>
              </>
            )}
          </button>

          <p className="text-[10px] text-center text-gray-400">
            By placing this order, you confirm local doorstep dispatch to your village/town.
          </p>
        </div>
      </form>

      {/* Customer Login / Auth Modal */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
