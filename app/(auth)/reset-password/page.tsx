"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  UserCheck,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { resetPasswordSchema, ResetPasswordInput } from "@/lib/validation/auth";
import { supabase } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const passwordVal = watch("password");

  useEffect(() => {
    let isMounted = true;

    async function initRecoverySession() {
      try {
        setIsVerifyingSession(true);

        // 1. Check for PKCE exchange code (?code=...)
        const code = searchParams.get("code");
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            if (isMounted) {
              setErrorMessage("Password reset link is invalid or has expired. Please request a new one.");
            }
          } else if (data.user?.email && isMounted) {
            setUserEmail(data.user.email);
          }
          if (isMounted) setIsVerifyingSession(false);
          return;
        }

        // 2. Check for active session in browser
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user?.email && isMounted) {
          setUserEmail(session.user.email);
        }
      } catch (err: any) {
        console.error("Error setting up recovery session:", err);
      } finally {
        if (isMounted) setIsVerifyingSession(false);
      }
    }

    initRecoverySession();

    // 3. Listen for PASSWORD_RECOVERY event (from URL hash fragments #access_token=...)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session?.user?.email && isMounted) {
        setUserEmail(session.user.email);
        setErrorMessage(null);
        setIsVerifyingSession(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [searchParams]);

  const onSubmit = async (data: ResetPasswordInput) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        setErrorMessage(error.message || "Failed to reset password.");
        return;
      }

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Set new master password"
      subtitle="Choose a secure password with at least 8 characters, uppercase, lowercase, and symbols"
    >
      {isSuccess ? (
        <div className="text-center space-y-4 py-3 animate-in fade-in duration-200">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-gray-900">Password updated!</h3>
            <p className="text-xs text-gray-500">
              Your password has been changed successfully. You can now sign in using your email and your new password.
            </p>
          </div>

          <Button
            onClick={() => router.push("/login")}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs gap-1"
          >
            <span>Proceed to Login</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Active Email Pill */}
          {userEmail && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Resetting password for: <strong className="text-emerald-950 font-mono">{userEmail}</strong>
              </span>
            </div>
          )}

          {/* Loading verification indicator */}
          {isVerifyingSession && (
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
              <span>Verifying secure reset token from email...</span>
            </div>
          )}

          {/* Error Alert Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {!isVerifyingSession && !userEmail && !errorMessage && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div className="flex-1">
                <p className="font-semibold">No active reset session detected.</p>
                <p className="text-[11px] text-amber-700 mt-1">
                  Please make sure you clicked the link directly from your password reset email, or request a new link below.
                </p>
                <Link
                  href="/forgot-password"
                  className="inline-flex items-center gap-1 font-bold text-amber-900 underline mt-1.5"
                >
                  <ArrowLeft className="w-3 h-3" /> Request new password reset link
                </Link>
              </div>
            </div>
          )}

          {/* Password Field */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">New Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                {...register("password")}
                className="w-full pl-9 pr-10 py-2 text-xs bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-600 font-medium">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new password"
                {...register("confirmPassword")}
                className="w-full pl-9 pr-10 py-2 text-xs bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-600"
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-[11px] text-red-600 font-medium">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Real-time Entropy Meter */}
          <PasswordStrengthMeter password={passwordVal || ""} />

          <Button
            type="submit"
            isLoading={isLoading}
            disabled={isVerifyingSession}
            className="w-full h-10 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs gap-1.5 shadow-sm"
          >
            Update Password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-gray-500">
          Loading secure password reset session...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
