"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Store,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Building,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { businessRegistrationSchema, BusinessRegistrationInput } from "@/lib/validation/auth";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";

export default function RegisterBusinessPage() {
  const router = useRouter();
  const fetchSession = useAuthStore((state) => state.fetchSession);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<BusinessRegistrationInput>({
    resolver: zodResolver(businessRegistrationSchema),
    defaultValues: {
      businessName: "",
      ownerName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      acceptTerms: true,
      storeName: "",
      gstNumber: "",
      businessType: "Retail & Wholesale Cosmetics",
      address: "",
      state: "Maharashtra",
      city: "Mumbai",
      pincode: "",
      currency: "INR",
      timezone: "Asia/Kolkata",
    },
    mode: "onBlur",
  });

  const passwordVal = watch("password");
  const businessNameVal = watch("businessName");
  const emailVal = watch("email");

  // Step 1 Validation before advancing
  const handleProceedToStoreDetails = async () => {
    const valid = await trigger([
      "businessName",
      "ownerName",
      "email",
      "phone",
      "password",
      "confirmPassword",
      "acceptTerms",
    ]);

    if (valid) {
      setCurrentStep(3); // Advance to Store Setup
    }
  };

  // Final Registration Submission
  const onFinalSubmit = async (data: BusinessRegistrationInput) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      // 1. Sign up owner account via Supabase Auth
      let authUser: any = null;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.ownerName,
            phone: data.phone,
            role: "Owner",
          },
        },
      });

      if (authError) {
        // If email rate limit exceeded or user already created, attempt direct sign-in fallback
        if (
          authError.message.toLowerCase().includes("rate limit") ||
          authError.message.toLowerCase().includes("already registered")
        ) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
          });

          if (!signInError && signInData?.user) {
            authUser = signInData.user;
          } else {
            setErrorMessage(
              authError.message.toLowerCase().includes("rate limit")
                ? "Supabase email rate limit reached. Please sign in directly from the login page or wait 60 seconds."
                : "This email is already registered. Please sign in with your password."
            );
            return;
          }
        } else {
          setErrorMessage(authError.message || "Failed to create account.");
          return;
        }
      } else {
        authUser = authData?.user;
      }

      const userId = authUser?.id;

      // 2. Create Shop in database (Multi-Tenant SaaS entity)
      const storeName = data.storeName || data.businessName;
      const slugBase = storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "store";
      const uniqueSlug = `${slugBase}-${Math.random().toString(36).substring(2, 6)}`;
      const fullAddress = [data.address, data.city, data.state, data.pincode].filter(Boolean).join(", ");

      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const retentionUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: storeData, error: storeError } = await supabase
        .from("shops")
        .insert([
          {
            name: storeName,
            slug: uniqueSlug,
            business_type: data.businessType || "general",
            phone: data.phone || null,
            address: fullAddress || null,
            gst_number: data.gstNumber || null,
            currency: data.currency || "INR",
            plan: "trial",
            trial_ends_at: trialEndsAt,
            data_retention_until: retentionUntil,
            is_active: true,
            status: "trial_active",
            owner_name: data.ownerName,
            owner_email: data.email,
          },
        ])
        .select()
        .single();

      if (storeError) {
        console.warn("Shop creation warning", storeError);
      }

      const storeId = storeData?.id;

      // 3. Update Profile with store & Owner role
      if (userId && storeId) {
        await supabase
          .from("profiles")
          .upsert({
            id: userId,
            store_id: storeId,
            shop_id: storeId,
            full_name: data.ownerName,
            email: data.email,
            phone: data.phone,
            role: "Owner",
            is_active: true,
          });

        if (typeof window !== "undefined") {
          localStorage.setItem("falcon_active_store_id", storeId);
        }

        // Notify Master Admin of new trial registration
        await supabase.from("notifications").insert([
          {
            shop_id: "a0000000-0000-0000-0000-000000000001",
            type: "new_trial_signup",
            entity_table: "shops",
            entity_id: storeId,
            message: `🎉 New 14-Day Trial Started: "${storeName}" by ${data.ownerName} (${data.phone || data.email}). Follow up to close deal!`,
          },
        ]);

        // Record in CRM leads table
        await supabase.from("leads").insert([
          {
            name: data.ownerName,
            business_name: storeName,
            phone: data.phone || "",
            email: data.email,
            service: "erp",
            status: "trial_active",
            store_id: storeId,
            trial_started_at: new Date().toISOString(),
            trial_ends_at: trialEndsAt,
            data_retention_until: retentionUntil,
          },
        ]);
      }

      setCurrentStep(4); // Move to Finished Screen
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during store setup.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your store account"
      subtitle="Register your business entity and provision your dedicated ERP database"
    >
      {/* Wizard Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-2">
          <span>STEP {currentStep} OF 4</span>
          <span className="text-brand-600">
            {currentStep === 1
              ? "Account Credentials"
              : currentStep === 2
              ? "Verify Email"
              : currentStep === 3
              ? "Store Configuration"
              : "Ready to Launch"}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 h-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`rounded-full transition-all duration-300 ${
                s <= currentStep ? "bg-brand-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit(onFinalSubmit)} className="space-y-4">
        {/* Step 1: Owner Credentials */}
        {currentStep === 1 && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Business / Entity Legal Name *
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. AGS Cosmetics Private Limited"
                  {...register("businessName")}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-600"
                />
              </div>
              {errors.businessName && (
                <p className="text-[10px] text-red-600 mt-0.5">{errors.businessName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Owner Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    {...register("ownerName")}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-600"
                  />
                </div>
                {errors.ownerName && (
                  <p className="text-[10px] text-red-600 mt-0.5">{errors.ownerName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mobile Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    placeholder="10-digit mobile"
                    {...register("phone")}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-600"
                  />
                </div>
                {errors.phone && (
                  <p className="text-[10px] text-red-600 mt-0.5">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Work Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  placeholder="owner@yourcompany.com"
                  {...register("email")}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-600"
                />
              </div>
              {errors.email && (
                <p className="text-[10px] text-red-600 mt-0.5">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Master Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="8+ characters"
                    {...register("password")}
                    className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Repeat password"
                    {...register("confirmPassword")}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-600"
                  />
                </div>
              </div>
            </div>

            {/* Password Entropy Meter */}
            <PasswordStrengthMeter password={passwordVal || ""} />

            {/* Terms checkbox */}
            <label className="flex items-start gap-2 text-[11px] text-gray-600 cursor-pointer pt-1">
              <input
                type="checkbox"
                {...register("acceptTerms")}
                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 mt-0.5"
              />
              <span>
                I agree to the AGS Store ERP Terms of Service, Privacy Policy, and Master Service
                Agreement.
              </span>
            </label>

            <Button
              type="button"
              onClick={handleProceedToStoreDetails}
              className="w-full h-10 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs gap-1.5 mt-2"
            >
              <span>Continue to Store Setup</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Step 3: Store Configuration */}
        {currentStep === 3 && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Store / Outlet Display Name *
              </label>
              <div className="relative">
                <Store className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. AGS Store - Main Showroom"
                  {...register("storeName")}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  {...register("gstNumber")}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg shadow-sm uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Business Category
                </label>
                <select
                  {...register("businessType")}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg shadow-sm font-medium"
                >
                  <option value="Retail & Wholesale Cosmetics">Retail & Wholesale Cosmetics</option>
                  <option value="General Retail Store">General Retail Store</option>
                  <option value="Supermarket / Grocery">Supermarket / Grocery</option>
                  <option value="Apparel & Fashion">Apparel & Fashion</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Store Physical Address *
              </label>
              <input
                type="text"
                placeholder="Shop No., Complex, Street"
                {...register("address")}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg shadow-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">City *</label>
                <input
                  type="text"
                  placeholder="Mumbai"
                  {...register("city")}
                  className="w-full px-2.5 py-2 text-xs bg-white border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">State *</label>
                <input
                  type="text"
                  placeholder="Maharashtra"
                  {...register("state")}
                  className="w-full px-2.5 py-2 text-xs bg-white border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">PIN Code *</label>
                <input
                  type="text"
                  placeholder="400001"
                  {...register("pincode")}
                  className="w-full px-2.5 py-2 text-xs bg-white border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="flex-1 text-xs gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Button>
              <Button
                type="submit"
                isLoading={isLoading}
                className="flex-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" /> Complete Registration
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Finished Onboarding Screen */}
        {currentStep === 4 && (
          <div className="text-center space-y-4 py-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-900">Welcome to Falcon ERP!</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Your store <strong>{businessNameVal}</strong> has been successfully provisioned. We
                have sent a confirmation email to <strong>{emailVal}</strong>.
              </p>
            </div>

            <Button
              type="button"
              onClick={async () => {
                await fetchSession();
                router.push("/dashboard");
              }}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs h-10 shadow-md gap-1"
            >
              <span>Enter Store Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Link back to Login */}
        {currentStep === 1 && (
          <div className="pt-3 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-brand-600 hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        )}
      </form>
    </AuthLayout>
  );
}
