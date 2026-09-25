"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShoppingCart,
  Heart,
  MessageCircle,
  Truck,
  ShieldCheck,
  Sparkles,
  Plus,
  Minus,
  Check,
  Share2,
  Tag,
  Clock,
  RotateCcw,
  Zap,
} from "lucide-react";
import { ProductGalleryViewer } from "@/components/store/ProductGalleryViewer";
import { ProductCard } from "@/components/store/ProductCard";
import { WhatsAppOrderButton } from "@/components/store/WhatsAppOrderButton";
import { useStoreCart } from "@/store/useStoreCart";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/types/database";

import {
  extractProductVariants,
  stripVariantsFromDescription,
  CleanVariant,
} from "@/lib/product-variants";
import { resolveActiveShopId } from "@/lib/tenant";
import {
  isProductOnline,
  getProductOnlineConfig,
  getProductEffectiveOnlinePrice, STORE_PRODUCT_SELECT} from "@/lib/product-online";
import { getStorefrontWholesaleInfo } from "@/lib/units-pricing";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<CleanVariant | null>(null);

  const { addToCart, toggleWishlist, isInWishlist, setIsCartOpen } = useStoreCart();

  useEffect(() => {
    async function loadProduct() {
      if (!productId) return;
      try {
        setLoading(true);
        const supabase = createClient();

        // 1. Fetch Product
        const { data: prod } = await supabase
          .from("products")
          .select(STORE_PRODUCT_SELECT)
          .eq("id", productId)
          .maybeSingle();

        setProduct(prod as unknown as Product);

        if (prod) {
          const vars = extractProductVariants(prod as unknown as Product);
          if (vars.length > 1) {
            setSelectedVariant(vars[0]);
          } else {
            setSelectedVariant(null);
          }
        }

        // 2. Fetch Similar Products
        if (prod?.category_id) {
          const targetShop = prod.shop_id || resolveActiveShopId();
          const { data: simList } = await supabase
            .from("products")
            .select(STORE_PRODUCT_SELECT)
            .eq("shop_id", targetShop)
            .eq("category_id", prod.category_id)
            .neq("id", productId)
            .eq("is_active", true)
            .limit(4);

          setSimilarProducts((simList || []).filter(isProductOnline) as unknown as Product[]);
        }
      } catch (err) {
        console.error("Failed to load product detail:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [productId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-square bg-gray-200 animate-pulse rounded-3xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 animate-pulse rounded-lg w-3/4" />
            <div className="h-6 bg-gray-200 animate-pulse rounded-lg w-1/4" />
            <div className="h-24 bg-gray-200 animate-pulse rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Product Not Found</h2>
        <p className="text-xs text-gray-500">The product may have been moved or removed.</p>
        <Link
          href="/store"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold"
        >
          Return to Store
        </Link>
      </div>
    );
  }

  const variants = extractProductVariants(product);
  const isFavorite = isInWishlist(product.id);

  // Use selected variant pricing or base product pricing
  const isOnline = isProductOnline(product);
  const onlineConfig = getProductOnlineConfig(product);
  const effectiveBasePrice = getProductEffectiveOnlinePrice(product);
  const price = selectedVariant ? selectedVariant.price : effectiveBasePrice;
  const mrp = selectedVariant ? selectedVariant.mrp : Number((product as any).mrp) || Number(product.selling_price) || price;
  const savings = mrp > price ? Math.round((mrp - price) * 100) / 100 : 0;
  const discountPercent = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const hasOnlineOffer = !selectedVariant && onlineConfig.online_price !== null && onlineConfig.online_price < (Number(product.selling_price) || 0);
  const stockCount = selectedVariant?.stock ?? product.current_stock;
  const isOutOfStock = stockCount <= 0;
  const ws = getStorefrontWholesaleInfo(product);
  const wsActive = !!ws && !selectedVariant && quantity >= ws.minUnits;
  const wsUnitPlural = ws ? (ws.unitLabel === "pc" ? "pcs" : ws.unitLabel) : "";

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddToCartWithVariant = (customQty: number = quantity) => {
    const customizedProduct = {
      ...product,
      selling_price: price,
    };
    addToCart(customizedProduct, customQty, selectedVariant?.size);
  };

  const handleBuyNow = () => {
    handleAddToCartWithVariant(quantity);
    setIsCartOpen(false);
    router.push("/store/checkout");
  };

  const cleanDescriptionText = stripVariantsFromDescription(product.description);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-10">
      {/* Back Link */}
      <Link
        href="/store"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-purple-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Store</span>
      </Link>

      {/* Main Product Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left: Falcon AI Interactive Showroom Gallery */}
        <div className="lg:col-span-6">
          <ProductGalleryViewer
            heroUrl={product.image_url}
            backImageUrl={(product as any).back_image_url}
            galleryUrls={(product as any).gallery_urls || []}
            productName={product.name}
          />
        </div>

        {/* Right: Product Details & Purchase Form */}
        <div className="lg:col-span-6 space-y-5">
          {/* Brand & Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black tracking-wider uppercase text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                {product.brand || "Authentic Brand"}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShare}
                  className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold flex items-center gap-1"
                  title="Share product"
                >
                  <Share2 className="w-4 h-4" />
                  {copied && <span className="text-[10px] text-emerald-600 font-bold">Copied!</span>}
                </button>

                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-600"
                  title="Add to Wishlist"
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? "fill-pink-500 text-pink-500" : ""}`} />
                </button>
              </div>
            </div>

            <h1 className="text-xl sm:text-3xl font-black text-gray-900 leading-tight">
              {product.name}
            </h1>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Category: <strong className="text-gray-800">{product.category?.name || "General"}</strong></span>
              {product.barcode && <span>• Barcode: <strong className="text-gray-800">{product.barcode}</strong></span>}
            </div>
          </div>

          {/* ================================================================= */}
          {/* ⚡ PACK SIZE / VOLUME / WEIGHT VARIANT SELECTOR                   */}
          {/* ================================================================= */}
          {variants.length > 1 && (
            <div className="space-y-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-purple-600" />
                  Select Pack Size / Variant:
                </label>
                <span className="text-[11px] font-bold text-purple-700">
                  {selectedVariant ? `Selected: ${selectedVariant.size}` : "Choose size"}
                </span>
              </div>

              {/* Variant Selector Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  const vDiscount = v.mrp > v.price ? Math.round(((v.mrp - v.price) / v.mrp) * 100) : 0;

                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-white border-purple-600 ring-2 ring-purple-500/20 shadow-xs"
                          : "bg-white/80 border-gray-200 hover:border-purple-300 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-black text-gray-900">{v.size}</span>
                        {vDiscount > 0 && (
                          <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-md">
                            {vDiscount}% OFF
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-sm font-black text-purple-900">₹{v.price}</span>
                        {v.mrp > v.price && (
                          <span className="text-[10px] text-gray-400 line-through">₹{v.mrp}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pricing Card */}
          <div className="bg-gradient-to-r from-purple-50/80 to-pink-50/80 rounded-2xl p-4 sm:p-5 border border-purple-100/80 space-y-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-2xl sm:text-3xl font-black text-gray-900">
                ₹{wsActive && ws ? ws.unitPrice : price}
              </span>
              {hasOnlineOffer && (
                <span className="text-xs font-black text-white bg-emerald-600 px-2.5 py-0.5 rounded-full shadow-xs">
                  ONLINE DEAL
                </span>
              )}
              {hasOnlineOffer && Number(product.selling_price) > price && (
                <span className="text-xs sm:text-sm text-gray-400 line-through font-medium" title="Counter Price">
                  ₹{Math.round((Number(product.selling_price) || 0) * 100) / 100}
                </span>
              )}
              {mrp > price && !hasOnlineOffer && (
                <>
                  <span className="text-sm sm:text-base text-gray-400 line-through font-semibold">
                    MRP ₹{mrp}
                  </span>
                  <span className="text-xs font-black text-white bg-amber-500 px-2.5 py-0.5 rounded-full shadow-xs">
                    {discountPercent}% OFF
                  </span>
                </>
              )}
              {selectedVariant && (
                <span className="text-xs font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded-md ml-auto">
                  For {selectedVariant.size}
                </span>
              )}
            </div>

            {/* Wholesale Tier Notice Box — genuine wholesale only, counted in the unit this page sells */}
            {!selectedVariant && ws && (
              <div
                className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                  wsActive
                    ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                    : "bg-indigo-50/80 border-indigo-200 text-indigo-950"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Zap
                    className={`w-4 h-4 shrink-0 ${
                      wsActive ? "text-emerald-600 fill-emerald-500" : "text-indigo-600"
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-black">
                      Wholesale Rate: ₹{ws.unitPrice}/{ws.unitLabel} (from {ws.minUnits}+ {wsUnitPlural})
                    </div>
                    <div className="text-[11px] text-gray-600">
                      {wsActive ? (
                        <span className="text-emerald-700 font-bold">
                          ⚡ Wholesale Applied! You save ₹{Math.round((price - ws.unitPrice) * quantity)} extra
                        </span>
                      ) : (
                        <span>
                          Buy {ws.minUnits - quantity} more {wsUnitPlural} to unlock wholesale price
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!wsActive && (
                  <button
                    type="button"
                    onClick={() => setQuantity(ws.minUnits)}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shrink-0 shadow-2xs transition-transform active:scale-95"
                  >
                    Select {ws.minUnits}
                  </button>
                )}
              </div>
            )}

            {savings > 0 && (
              <p className="text-xs font-bold text-emerald-700">
                🎉 You save ₹{savings} on this item! (Inclusive of all taxes)
              </p>
            )}

            <div className="pt-1 flex items-center gap-2 text-xs font-semibold">
              {isOutOfStock ? (
                <span className="text-red-600 bg-red-100 px-2.5 py-0.5 rounded-full font-bold">
                  ⚠️ Out of Stock
                </span>
              ) : (
                <span className="text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  In Stock ({stockCount} units available) - Ready for Fast Village/Town Dispatch
                </span>
              )}
            </div>
          </div>

          {/* Store Only Exclusivity Notice */}
          {!isOnline && (
            <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs">
              <span className="text-xl">🏢</span>
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-950">
                  Store Counter Exclusive Item
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  This product is currently available exclusively at our physical shop counter. Online courier dispatch is paused for this item. You can message us on WhatsApp to verify current in-store stock or place a pickup hold.
                </p>
              </div>
            </div>
          )}

          {/* Quantity Selector & Action Buttons */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-700">Quantity:</span>
              <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-xl p-1 shadow-2xs">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-30"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-xs font-black text-gray-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {!isOnline ? (
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center space-y-2.5">
                <div className="text-xs font-bold text-gray-700">Available In-Store Only</div>
                <p className="text-[11px] text-gray-500">Contact our store team on WhatsApp for queries or in-person shop visits.</p>
                <WhatsAppOrderButton product={product} variant="secondary" className="w-full py-3" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {/* Add to Cart */}
                  <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => handleAddToCartWithVariant(quantity)}
                    className="w-full py-3.5 px-4 rounded-2xl bg-purple-100 hover:bg-purple-200 text-purple-950 font-black text-xs sm:text-sm border border-purple-300 shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4 text-purple-700" />
                    <span>Add to Cart</span>
                  </button>

                  {/* Fast 1-Click Buy Now */}
                  <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={handleBuyNow}
                    className="w-full py-3.5 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Buy Now (Express)</span>
                  </button>
                </div>

                {/* Direct WhatsApp Order */}
                <WhatsAppOrderButton product={product} variant="secondary" className="w-full py-3" />
              </>
            )}
          </div>

          {/* Value Highlights */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Town & Village Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>100% Genuine Brand</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Cash / UPI on Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Easy Replacement at Shop</span>
            </div>
          </div>

          {/* Description & Specifications */}
          {cleanDescriptionText && (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 space-y-2.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-800">
                Product Details & Benefits
              </h3>
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                {cleanDescriptionText}
              </p>
            </div>
          )}

          {/* ================================================================= */}
          {/* 📊 ALL PACK SIZES & PRICE COMPARISON TABLE (Transparent 1-Page View) */}
          {/* ================================================================= */}
          {variants.length > 1 && (
            <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
              <div className="bg-gradient-to-r from-purple-900 to-indigo-900 px-4 py-3 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-pink-400" />
                  <h3 className="text-xs font-black tracking-wide">
                    All Pack Sizes & Price Comparison
                  </h3>
                </div>
                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full text-purple-100">
                  {variants.length} Sizes Available
                </span>
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4">Pack Size</th>
                      <th className="py-2.5 px-3">MRP</th>
                      <th className="py-2.5 px-3 text-purple-950 font-black">Our Price</th>
                      <th className="py-2.5 px-3">You Save</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-4 text-right">Select</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {variants.map((v) => {
                      const isSelected = selectedVariant?.id === v.id;
                      const vSavings = v.mrp > v.price ? v.mrp - v.price : 0;
                      const vDiscount = v.mrp > v.price ? Math.round(((v.mrp - v.price) / v.mrp) * 100) : 0;
                      const isVarOut = (v.stock ?? 10) <= 0;

                      return (
                        <tr
                          key={v.id}
                          onClick={() => setSelectedVariant(v)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? "bg-purple-50/70 font-semibold" : "hover:bg-gray-50/80"
                          }`}
                        >
                          <td className="py-3 px-4 font-black text-gray-900 flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isSelected ? "bg-purple-600 ring-2 ring-purple-300" : "bg-gray-300"
                              }`}
                            />
                            {v.size}
                          </td>
                          <td className="py-3 px-3 text-gray-400 line-through">
                            ₹{v.mrp}
                          </td>
                          <td className="py-3 px-3 font-black text-purple-700 text-sm">
                            ₹{v.price}
                          </td>
                          <td className="py-3 px-3">
                            {vSavings > 0 ? (
                              <span className="text-emerald-700 font-bold text-[11px]">
                                Save ₹{vSavings} ({vDiscount}%)
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {isVarOut ? (
                              <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-bold">
                                Out of Stock
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                                In Stock
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVariant(v);
                                handleAddToCartWithVariant(1);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                                isSelected
                                  ? "bg-purple-600 text-white hover:bg-purple-700"
                                  : "bg-gray-100 text-gray-700 hover:bg-purple-100 hover:text-purple-900"
                              }`}
                            >
                              {isSelected ? "✓ Active" : "Choose"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Thumb-Friendly Cards View */}
              <div className="sm:hidden p-3 space-y-2 bg-gray-50/50">
                {variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  const vSavings = v.mrp > v.price ? v.mrp - v.price : 0;
                  const vDiscount = v.mrp > v.price ? Math.round(((v.mrp - v.price) / v.mrp) * 100) : 0;
                  const isVarOut = (v.stock ?? 10) <= 0;

                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                        isSelected
                          ? "border-purple-600 bg-purple-50/90 shadow-2xs"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isSelected ? "bg-purple-600 ring-2 ring-purple-300" : "bg-gray-300"
                          }`}
                        />
                        <div>
                          <div className="text-xs font-black text-gray-900 leading-tight">
                            {v.size}
                          </div>
                          <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-sm font-black text-purple-700">₹{v.price}</span>
                            {v.mrp > v.price && (
                              <span className="text-[11px] text-gray-400 line-through">₹{v.mrp}</span>
                            )}
                            {vSavings > 0 && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-1 py-0.2 rounded">
                                Save ₹{vSavings}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isVarOut}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVariant(v);
                          handleAddToCartWithVariant(1);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                          isSelected
                            ? "bg-purple-600 text-white shadow-2xs"
                            : "bg-gray-100 text-gray-800 hover:bg-purple-100"
                        }`}
                      >
                        {isVarOut ? "Sold Out" : isSelected ? "✓ Selected" : "Select"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Similar Products Carousel */}
      {similarProducts.length > 0 && (
        <section className="space-y-4 pt-8 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-xl font-black text-gray-900 tracking-tight">
              Customers Also Viewed
            </h2>
            <Link
              href={`/store/category/${product.category_id}`}
              className="text-xs font-bold text-purple-700 hover:text-purple-900"
            >
              See More &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
            {similarProducts.map((sim) => (
              <ProductCard key={sim.id} product={sim} />
            ))}
          </div>
        </section>
      )}

      {/* Mobile Sticky Bottom Buy Action Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.12)] px-4 py-2.5 pb-[calc(0.6rem+env(safe-area-inset-bottom))] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-black text-gray-900 leading-tight">₹{price}</span>
            {mrp > price && <span className="text-xs text-gray-400 line-through">₹{mrp}</span>}
          </div>
          <div className="text-[10px] text-emerald-700 font-bold leading-tight truncate">
            {savings > 0 ? `Save ₹${savings} (${discountPercent}% OFF)` : "Free Local Dispatch"}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={() => handleAddToCartWithVariant(quantity)}
            className="px-3.5 py-2.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-950 font-bold text-xs active:scale-95 transition-transform disabled:opacity-50"
          >
            Add
          </button>
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleBuyNow}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-md shadow-purple-600/30 flex items-center gap-1 active:scale-95 transition-transform disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Buy Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}
