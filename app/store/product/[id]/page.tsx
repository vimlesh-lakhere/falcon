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

const SHOP_ID = process.env.DEFAULT_SHOP_ID || "a0000000-0000-0000-0000-000000000001";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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
          .select("*, category:categories(*)")
          .eq("id", productId)
          .maybeSingle();

        setProduct(prod);

        // 2. Fetch Similar Products
        if (prod?.category_id) {
          const { data: simList } = await supabase
            .from("products")
            .select("*, category:categories(*)")
            .eq("shop_id", SHOP_ID)
            .eq("category_id", prod.category_id)
            .neq("id", productId)
            .eq("is_active", true)
            .limit(4);

          setSimilarProducts(simList || []);
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

  const isFavorite = isInWishlist(product.id);
  const price = Number(product.selling_price) || 0;
  const mrp = Number((product as any).mrp) || price;
  const savings = mrp > price ? mrp - price : 0;
  const discountPercent = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const isOutOfStock = product.current_stock <= 0;

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    setIsCartOpen(false);
    router.push("/store/checkout");
  };

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
            galleryUrls={(product as any).gallery_urls || []}
            productName={product.name}
          />
        </div>

        {/* Right: Product Details & Purchase Form */}
        <div className="lg:col-span-6 space-y-6">
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

          {/* Pricing Card */}
          <div className="bg-gradient-to-r from-purple-50/80 to-pink-50/80 rounded-2xl p-4 sm:p-5 border border-purple-100/80 space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-black text-gray-900">
                ₹{price}
              </span>
              {mrp > price && (
                <>
                  <span className="text-sm sm:text-base text-gray-400 line-through font-semibold">
                    MRP ₹{mrp}
                  </span>
                  <span className="text-xs font-black text-white bg-amber-500 px-2.5 py-0.5 rounded-full shadow-xs">
                    {discountPercent}% OFF
                  </span>
                </>
              )}
            </div>

            {savings > 0 && (
              <p className="text-xs font-bold text-emerald-700">
                🎉 You save ₹{savings} on this product! (Inclusive of all taxes)
              </p>
            )}

            <div className="pt-2 flex items-center gap-2 text-xs font-semibold">
              {isOutOfStock ? (
                <span className="text-red-600 bg-red-100 px-2.5 py-0.5 rounded-full font-bold">
                  ⚠️ Out of Stock
                </span>
              ) : (
                <span className="text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  In Stock - Ready for Fast Village/Town Dispatch
                </span>
              )}
            </div>
          </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Add to Cart */}
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={() => addToCart(product, quantity)}
                className="w-full py-3.5 px-4 rounded-2xl bg-purple-100 hover:bg-purple-200 text-purple-950 font-black text-xs sm:text-sm border border-purple-300 shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <ShoppingCart className="w-4 h-4 text-purple-700" />
                <span>Add to Cart</span>
              </button>

              {/* Fast 1-Click Buy Now */}
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={handleBuyNow}
                className="w-full py-3.5 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Buy Now (Express)</span>
              </button>
            </div>

            {/* Direct WhatsApp Order */}
            <WhatsAppOrderButton product={product} variant="secondary" className="w-full py-3" />
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
          {product.description && (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 space-y-2.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-800">
                Product Details & Benefits
              </h3>
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
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
    </div>
  );
}
