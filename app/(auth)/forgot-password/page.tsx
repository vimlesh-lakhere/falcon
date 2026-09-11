"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { forgotPasswordSchema, ForgotPasswordInput } from "@/lib/validation/auth";
import { supabase } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const emailVal = watch("email");

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const targetOrigin = window.location.origin.includes("localhost")
        ? window.location.origin
        : "https://www.falcon360.in";
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${targetOrigin}/reset-password`,
      });

      if (error) {
        setErrorMessage(error.message || "Failed to send reset email.");
        return;
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the verified email address linked to your store account"
    >
      {isSubmitted ? (
        <div className="text-center space-y-4 py-3 animate-in fade-in duration-200">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-gray-900">Check your inbox</h3>
            <p className="text-xs text-gray-500">
              We have dispatched a secure password reset link to <strong>{emailVal}</strong>.
            </p>
          </div>

          <div className="pt-3">
            <Link href="/login">
              <Button variant="outline" className="w-full text-xs font-semibold gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Login
              </Button>
            </Link>
          </div>
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
            <label className="block text-xs font-semibold text-gray-700">Account Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="email"
                placeholder="name@agsstore.com"
                {...register("email")}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-600"
              />
            </div>
            {errors.email && (
              <p className="text-[11px] text-red-600 font-medium">{errors.email.message}</p>
            )}
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full h-10 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs gap-1.5 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Reset Instructions</span>
          </Button>

          <div className="pt-3 border-t border-gray-100 text-center">
            <Link
              href="/login"
              className="text-xs font-semibold text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
