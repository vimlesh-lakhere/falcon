"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Plus, Check } from "lucide-react";
import { Product } from "@/types/database";
import { useStoreCart } from "@/store/useStoreCart";
import { extractProductVariants, CleanVariant } from "@/lib/product-variants";
import { getProductEffectiveOnlinePrice, getProductOnlineConfig } from "@/lib/product-online";

interface ProductCardProps {
  product: Product;
  shopPhone?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  shopPhone = "919876543210",
}) => {
  const { addToCart, toggleWishlist, isInWishlist, cart } = useStoreCart();

  const variants = React.useMemo(() => extractProductVariants(product), [product]);
  const [selectedVariant, setSelectedVariant] = React.useState<CleanVariant | null>(
    variants.length > 0 ? variants[0] : null
  );

  const isFavorite = isInWishlist(product.id);
  const cartItem = cart.find(
    (it) => it.product.id === product.id && it.selectedVariant === selectedVariant?.size
  );

  const onlineConfig = getProductOnlineConfig(product);
  const effectiveBasePrice = getProductEffectiveOnlinePrice(product);
  const price = selectedVariant ? selectedVariant.price : effectiveBasePrice;
  const mrp = selectedVariant ? selectedVariant.mrp : Number((product as any).mrp) || Number(product.selling_price) || price;
  const discountPercent = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const hasOnlineSpecialPrice = !selectedVariant && onlineConfig.online_price !== null && onlineConfig.online_price < (Number(product.selling_price) || 0);
  const isOutOfStock = (selectedVariant?.stock ?? product.current_stock) <= 0;

  const rawImages = (product.image_url || "").split("|||").filter(Boolean);
  const frontImage =
    rawImages[0] ||
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&auto=format&fit=crop&q=60";
  const backImage = rawImages.length > 1 ? rawImages[1] : null;

  const [activeSide, setActiveSide] = React.useState<"front" | "back">("front");
  const [isHovered, setIsHovered] = React.useState(false);

  const displayImage =
    activeSide === "back" && backImage
      ? backImage
      : isHovered && backImage
      ? backImage
      : frontImage;

  const handleWhatsAppOrder = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sizeText = selectedVariant ? ` (${selectedVariant.size})` : "";
    const text = `Hello! I would like to order this product from your online store:\n\n*${product.name}${sizeText}*\nBrand: ${product.brand || "Standard"}\nPrice: ₹${price}\nLink: ${window.location.origin}/store/product/${product.id}`;
    window.open(`https://wa.me/${shopPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const customized = {
      ...product,
      selling_price: price,
    };
    addToCart(customized, 1, selectedVariant?.size);
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setActiveSide("front");
      }}
      className="group relative flex flex-col justify-between bg-white rounded-2xl border border-gray-100/90 hover:border-purple-200 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-200 overflow-hidden"
    >
      {/* Discount & Wishlist Badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
        {hasOnlineSpecialPrice ? (
          <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs tracking-wider">
            ONLINE OFFER
          </span>
        ) : discountPercent > 0 ? (
          <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs tracking-wider">
            {discountPercent}% OFF
          </span>
        ) : (
          <span className="bg-purple-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
            ORIGINAL
          </span>
        )}

        <div className="flex items-center gap-1">
          {backImage && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveSide((prev) => (prev === "front" ? "back" : "front"));
              }}
              className="pointer-events-auto text-[9px] font-bold bg-white/90 backdrop-blur-xs text-purple-900 px-1.5 py-0.5 rounded-md shadow-xs border border-purple-200 hover:bg-purple-50"
              title="Click to toggle Front / Back Packaging"
            >
              {activeSide === "front" ? "Front" : "Back"}
            </button>
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
      </div>

      {/* Product Image Area */}
      <Link href={`/store/product/${product.id}`} className="block relative bg-gray-50 aspect-square overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displayImage}
          alt={product.name}
          className="w-full h-full object-contain p-3 group-hover:scale-105 transition-all duration-300"
          loading="lazy"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center text-white text-xs font-bold uppercase tracking-wider">
            Out of Stock
          </div>
        )}

        {/* Small indicator when back view is active */}
        {backImage && (displayImage === backImage) && (
          <div className="absolute bottom-2 left-2 bg-purple-950/80 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
            🔍 Back / MRP View
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

        {/* Mini Variant Chips (if multiple pack sizes exist) */}
        {variants.length > 1 && (
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
            {variants.slice(0, 4).map((v) => {
              const isSelected = selectedVariant?.id === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedVariant(v);
                  }}
                  className={`px-1.5 py-0.5 text-[10px] font-black rounded-md border transition-all shrink-0 ${
                    isSelected
                      ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:border-purple-300"
                  }`}
                >
                  {v.size}
                </button>
              );
            })}
            {variants.length > 4 && (
              <span className="text-[9px] text-purple-700 font-bold px-1">
                +{variants.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Price & Cart Actions */}
        <div className="space-y-2 pt-1 border-t border-gray-50">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className={`text-sm sm:text-base font-black ${hasOnlineSpecialPrice ? 'text-emerald-700' : 'text-gray-900'}`}>
                ₹{price}
              </span>
              {hasOnlineSpecialPrice ? (
                <span className="text-[11px] text-gray-400 line-through font-medium" title="Counter price">
                  ₹{Number(product.selling_price) || 0}
                </span>
              ) : mrp > price ? (
                <span className="text-[11px] text-gray-400 line-through font-medium">₹{mrp}</span>
              ) : null}
            </div>
            {selectedVariant && (
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded-md">
                {selectedVariant.size}
              </span>
            )}
          </div>

          {/* Wholesale Offer Tag */}
          {!selectedVariant && Number(product.wholesale_price) > 0 && (
            <div className="text-[10px] text-indigo-700 font-bold bg-indigo-50/80 border border-indigo-100 px-1.5 py-0.5 rounded-md flex items-center justify-between">
              <span>
                ⚡ Wholesale: ₹{Number(product.wholesale_price) < price * 3 ? Number(product.wholesale_price) : (Number(product.wholesale_price) / 12).toFixed(0)}/pc
              </span>
              <span className="text-[9px] text-indigo-500 font-semibold">
                ({product.wholesale_min_qty || 12}+ pcs)
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            {/* 1-Tap Add to Cart */}
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={handleAddToCart}
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
