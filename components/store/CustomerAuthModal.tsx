"use client";

import React, { useState } from "react";
import { X, Phone, User, CheckCircle2, ArrowRight, ShieldCheck, Sparkles, MapPin } from "lucide-react";
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
  subtitle = "Sign in with your mobile number to view saved addresses, track orders, and checkout faster.",
}) => {
  const { loginCustomer, addRecentOrder } = useStoreCart();

  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState<boolean | null>(null);

  if (!isOpen) return null;

  const handlePhoneBlur = async () => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("customers")
          .select("*")
          .eq("phone", cleanPhone)
          .maybeSingle();

        if (data) {
          setIsExistingUser(true);
          if (data.name && !fullName) {
            setFullName(data.name);
          }
        } else {
          setIsExistingUser(false);
        }
      } catch (e) {
        // Continue
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/[^0-9]/g, "");

    if (cleanPhone.length !== 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!fullName.trim()) {
      alert("Please enter your name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      // Check or create customer in Supabase
      const { data: existing } = await supabase
        .from("customers")
        .select("*")
        .eq("phone", cleanPhone)
        .maybeSingle();

      let savedCustId = existing?.id;
      let customerAddress: CustomerAddress | null = null;

      if (existing) {
        // Parse address if present
        if (existing.address) {
          customerAddress = {
            fullName: existing.name || fullName,
            mobileNumber: cleanPhone,
            villageOrColony: existing.address,
            tehsilOrTown: "Town Area",
            landmark: "",
            pincode: "483501",
          };
        }
      }

      // Login in Zustand state
      loginCustomer({
        id: savedCustId,
        name: fullName.trim(),
        phone: cleanPhone,
        address: customerAddress,
      });

      // Sync customer past orders from Supabase sales
      try {
        const { data: pastSales } = await supabase
          .from("sales")
          .select("*, customer:customers(*), items:sale_items(*, product:products(*))")
          .eq("customer_id", savedCustId)
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
              items: sale.items?.map((it: any) => ({
                productId: it.product_id,
                productName: it.product?.name || "Product",
                quantity: it.quantity,
                price: it.unit_price,
                imageUrl: it.product?.image_url,
              })) || [],
              address: {
                fullName: sale.customer?.name || fullName,
                mobileNumber: cleanPhone,
                villageOrColony: sale.customer?.address || "Local Address",
                tehsilOrTown: "Town Area",
                landmark: "",
                pincode: "483501",
              },
              paymentMethod: "cod",
            });
          });
        }
      } catch (err) {
        // Non-blocking
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error("Login failed:", err);
      alert("Could not complete sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl relative border border-gray-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 pr-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-purple-600" />
            <span>AGS Customer Account</span>
          </div>
          <h3 className="text-xl font-black text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Phone Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
              <span>Mobile Number (10 Digits) *</span>
              {isExistingUser && (
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Existing Customer Found
                </span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-xs font-black text-gray-500">
                +91
              </span>
              <input
                type="tel"
                required
                maxLength={10}
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                onBlur={handlePhoneBlur}
                className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all font-mono"
              />
            </div>
          </div>

          {/* Full Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">
              Your Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                placeholder="e.g. Priya Sharma / Ramesh Kumar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Trust Badge */}
          <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-100 flex items-center gap-2 text-[11px] text-purple-900">
            <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Fast 1-tap sign in. No password required for local town delivery.</span>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={isSubmitting || phone.length !== 10 || !fullName.trim()}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
          >
            <span>{isSubmitting ? "Signing In..." : "Continue to Store & Checkout"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
