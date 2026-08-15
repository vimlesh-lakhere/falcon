"use client";

import React from "react";
import Link from "next/link";
import { MailCheck, ArrowRight, RefreshCw } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";

export default function VerifyEmailPage() {
  return (
    <AuthLayout
      title="Verify your email address"
      subtitle="Complete email confirmation to activate your store workspace"
    >
      <div className="text-center space-y-4 py-2">
        <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto border border-brand-100 shadow-sm">
          <MailCheck className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-gray-900">Check your email</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
            We sent a verification link to your registered email address. Click the link to complete
            your store verification and activate full multi-role permissions.
          </p>
        </div>

        <div className="pt-3 space-y-2">
          <Link href="/login" className="block">
            <Button className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs h-10 gap-1 shadow-sm">
              <span>Back to Login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
