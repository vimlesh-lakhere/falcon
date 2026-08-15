"use client";

import React from "react";
import { Check, X } from "lucide-react";

export function PasswordStrengthMeter({ password }: { password: string }) {
  const criteria = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "1 uppercase letter", met: /[A-Z]/.test(password) },
    { label: "1 lowercase letter", met: /[a-z]/.test(password) },
    { label: "1 numeric digit", met: /[0-9]/.test(password) },
    { label: "1 special symbol (@$!%*#?&)", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = criteria.filter((c) => c.met).length;

  const strengthLabels = ["Weak", "Fair", "Good", "Strong", "Enterprise Secure"];
  const strengthColors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-emerald-500",
    "bg-brand-600",
  ];

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2 pt-2 border-t border-gray-100 animate-in fade-in duration-200">
      {/* Progress Bars */}
      <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600">
        <span>Password Strength:</span>
        <span className="font-bold text-gray-900">{score > 0 ? strengthLabels[score - 1] : "Too Weak"}</span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 h-1.5">
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={`rounded-full transition-all duration-300 ${
              index < score ? strengthColors[score - 1] : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Criteria checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
        {criteria.map((c, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 text-[10px] font-medium transition-colors ${
              c.met ? "text-emerald-700 font-semibold" : "text-gray-400"
            }`}
          >
            {c.met ? (
              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
            ) : (
              <X className="w-3 h-3 text-gray-300 shrink-0" />
            )}
            <span>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
