"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Store,
} from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { loginSchema, LoginInput } from "@/lib/validation/auth";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextDestination = searchParams.get("next") || "/dashboard";
  const urlError = searchParams.get("error");

  const fetchSession = useAuthStore((state) => state.fetchSession);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(urlError ? decodeURIComponent(urlError) : null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        setErrorMessage(error.message || "Invalid email or password credentials.");
        return;
      }

      if (authData.user) {
        setSuccessMessage("Authentication successful! Loading your store workspace...");
        await fetchSession();
        setTimeout(() => {
          window.location.href = nextDestination;
        }, 500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (authData: any) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage("Google authentication successful! Loading your store workspace...");
      await fetchSession();
      setTimeout(() => {
        window.location.href = nextDestination;
      }, 400);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to initialize store session.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const targetOrigin = window.location.origin.includes("localhost")
        ? window.location.origin
        : "https://www.falcon360.in";
      const callbackUrl = `${targetOrigin}/auth/callback?next=${encodeURIComponent(nextDestination)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) setErrorMessage(error.message);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to connect to Google.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in to your account"
      subtitle="Enter your verified work email and password to access the ERP portal"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Error Alert Message */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Success Alert Message */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* Email Field */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-gray-700">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="email"
              placeholder="owner@agsstore.com"
              {...register("email")}
              className={`w-full pl-9 pr-3 py-2 text-xs bg-white border rounded-lg shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-600 ${
                errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-300"
              }`}
            />
          </div>
          {errors.email && (
            <p className="text-[11px] text-red-600 font-medium">{errors.email.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-gray-700">Password</label>
            <Link
              href="/forgot-password"
              className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your account password"
              {...register("password")}
              className={`w-full pl-9 pr-10 py-2 text-xs bg-white border rounded-lg shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-600 ${
                errors.password ? "border-red-500 focus:ring-red-500" : "border-gray-300"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-[11px] text-red-600 font-medium">{errors.password.message}</p>
          )}
        </div>

        {/* Remember Me Checkbox */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register("rememberMe")}
              className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span>Remember this device for 30 days</span>
          </label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          isLoading={isLoading}
          className="w-full h-10 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md gap-1.5"
        >
          <span>Sign In to Falcon ERP</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>

        {/* Social / SSO Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-gray-400 font-medium">Or continue with</span>
          </div>
        </div>

        {/* Google SSO Button (Direct GIS on falcon360.in) */}
        <GoogleSignInButton
          onSuccess={handleGoogleSuccess}
          onError={(err) => setErrorMessage(err)}
          onLoadingChange={(loading) => setIsLoading(loading)}
          fallbackText="Google Workspace Account"
          textType="signin_with"
        />

        {/* Link to Business Registration */}
        <div className="pt-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            Setting up a new business or store?{" "}
            <Link
              href="/register"
              className="font-bold text-brand-600 hover:text-brand-700 hover:underline inline-flex items-center gap-1"
            >
              Register Store <Store className="w-3.5 h-3.5 inline" />
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-400">Loading workspace login...</div>}>
      <LoginForm />
    </Suspense>
  );
}
