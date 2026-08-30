"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  autoSelectOnFocus?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      error,
      label,
      id,
      autoSelectOnFocus = true,
      onFocus,
      onClick,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const isNumeric =
      type === "number" || props.inputMode === "numeric" || props.inputMode === "decimal";

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (autoSelectOnFocus || isNumeric) {
        e.currentTarget.select();
      }
      onFocus?.(e);
    };

    const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
      if (autoSelectOnFocus && isNumeric) {
        e.currentTarget.select();
      }
      onClick?.(e);
    };

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-gray-700">
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          onFocus={handleFocus}
          onClick={handleClick}
          className={cn(
            "flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:border-brand-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
            error && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

