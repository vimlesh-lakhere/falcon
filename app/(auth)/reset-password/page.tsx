"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { resetPasswordSchema, ResetPasswordInput } from "@/lib/validation/auth";
import { supabase } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
      subtitle="Choose a secure password with at least 8 characters and symbols"
    >
      {isSuccess ? (
        <div className="text-center space-y-4 py-3 animate-in fade-in duration-200">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-gray-900">Password updated!</h3>
            <p className="text-xs text-gray-500">
              Your password has been changed successfully. You can now sign in to your store portal.
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
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

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
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-600"
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
            className="w-full h-10 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs gap-1.5 shadow-sm"
          >
            Update Password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
