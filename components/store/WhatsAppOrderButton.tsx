"use client";

import React from "react";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { Product } from "@/types/database";

interface WhatsAppOrderButtonProps {
  product: Product;
  shopPhone?: string;
  className?: string;
  variant?: "primary" | "secondary" | "floating";
}

export const WhatsAppOrderButton: React.FC<WhatsAppOrderButtonProps> = ({
  product,
  shopPhone = "919340362381",
  className = "",
  variant = "secondary",
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const price = Number(product.selling_price) || 0;
    const url = typeof window !== "undefined" ? window.location.href : "";
    const message = `Hello AGS Store! I want to order this product:\n\n*${product.name}*\nBrand: ${product.brand || "Authentic"}\nPrice: ₹${price}\nLink: ${url}`;
    window.open(`https://wa.me/${shopPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  if (variant === "floating") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-2xl shadow-emerald-600/40 hover:scale-105 transition-all ${className}`}
      >
        <MessageCircle className="w-5 h-5" />
        <span>Quick WhatsApp Order</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-xs transition-all shadow-xs ${
        variant === "primary"
          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
          : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
      } ${className}`}
    >
      <MessageCircle className="w-4 h-4 text-emerald-600" />
      <span>Order on WhatsApp</span>
    </button>
  );
};
