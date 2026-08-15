"use client";

import React from "react";
import Link from "next/link";
import { ShoppingCart, Heart, MessageCircle, Sparkles, Plus, Check } from "lucide-react";
import { Product } from "@/types/database";
import { useStoreCart } from "@/store/useStoreCart";

interface ProductCardProps {
  product: Product;
  shopPhone?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  shopPhone = "919876543210",
}) => {
  const { addToCart, toggleWishlist, isInWishlist, cart } = useStoreCart();

  const isFavorite = isInWishlist(product.id);
  const cartItem = cart.find((it) => it.product.id === product.id);

  const price = Number(product.selling_price) || 0;
  const mrp = Number((product as any).mrp) || price;
  const discountPercent = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const isOutOfStock = product.current_stock <= 0;

  const imageSrc =
    product.image_url ||
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&auto=format&fit=crop&q=60";

  const handleWhatsAppOrder = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const text = `Hello! I would like to order this product from your online store:\n\n*${product.name}*\nBrand: ${product.brand || "Standard"}\nPrice: ₹${price}\nLink: ${window.location.origin}/store/product/${product.id}`;
    window.open(`https://wa.me/${shopPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="group relative flex flex-col justify-between bg-white rounded-2xl border border-gray-100/90 hover:border-purple-200 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-200 overflow-hidden">
      {/* Discount & Wishlist Badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
        {discountPercent > 0 ? (
          <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs tracking-wider">
            {discountPercent}% OFF
          </span>
        ) : (
          <span className="bg-purple-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
            ORIGINAL
          </span>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className="pointer-events-auto w-7 h-7 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-gray-400 hover:text-pink-600 shadow-xs transition-colors"
          title="Save to Wishlist"
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-pink-500 text-pink-500" : ""}`} />
        </button>
      </div>

      {/* Product Image Area */}
      <Link href={`/store/product/${product.id}`} className="block relative bg-gray-50 aspect-square overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={product.name}
          className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center text-white text-xs font-bold uppercase tracking-wider">
            Out of Stock
          </div>
        )}
      </Link>

      {/* Product Information */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          {/* Brand & Category */}
          <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold mb-0.5">
            <span className="text-purple-700 uppercase tracking-wider">{product.brand || "Authentic"}</span>
            <span>{product.category?.name || "General"}</span>
          </div>

          {/* Title */}
          <Link href={`/store/product/${product.id}`}>
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 hover:text-purple-700 transition-colors leading-snug">
              {product.name}
            </h3>
          </Link>
        </div>

        {/* Price & Cart Actions */}
        <div className="space-y-2 pt-1 border-t border-gray-50">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm sm:text-base font-black text-gray-900">₹{price}</span>
            {mrp > price && (
              <span className="text-[11px] text-gray-400 line-through font-medium">₹{mrp}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {/* 1-Tap Add to Cart */}
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={(e) => {
                e.preventDefault();
                addToCart(product, 1);
              }}
              className={`w-full flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 ${
                cartItem
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
                  : "bg-purple-600 hover:bg-purple-700 text-white"
              } disabled:opacity-50 disabled:pointer-events-none`}
            >
              {cartItem ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>({cartItem.quantity}) Added</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </>
              )}
            </button>

            {/* Quick WhatsApp Order */}
            <button
              type="button"
              onClick={handleWhatsAppOrder}
              className="w-full flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-all"
              title="Order on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
