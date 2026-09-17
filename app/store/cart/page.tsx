"use client";

import React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Truck,
  ShieldCheck,
  Tag,
  Sparkles,
  Zap,
} from "lucide-react";
import { useStoreCart } from "@/store/useStoreCart";
import { getEffectiveItemPrice } from "@/lib/units-pricing";

function CartLoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded-xl mx-auto" />
      <div className="h-28 w-full bg-white rounded-3xl border border-gray-100" />
      <div className="h-28 w-full bg-white rounded-3xl border border-gray-100" />
    </div>
  );
}

function StoreCartContent() {
  const router = useRouter();
  const { cart, updateQuantity, removeFromCart, clearCart, getCartTotal } = useStoreCart();

  const { subtotal, totalSavings, itemCount } = getCartTotal();

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto shadow-inner">
          <ShoppingCart className="w-10 h-10" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-gray-900">Your Cart is Empty</h1>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          Explore authentic cosmetics, hair oils, soaps, dental care, and daily essentials from our shop.
        </p>
        <Link
          href="/store"
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-purple-600/20"
        >
          <span>Start Shopping</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
      {/* Back Link */}
      <Link
        href="/store"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-purple-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Continue Shopping</span>
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Shopping Cart ({itemCount} {itemCount === 1 ? "Item" : "Items"})
          </h1>
          <p className="text-xs text-gray-500">Fast doorstep delivery to towns & villages.</p>
        </div>

        <button
          type="button"
          onClick={clearCart}
          className="text-xs font-semibold text-red-600 hover:text-red-700"
        >
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Cart Items List */}
        <div className="lg:col-span-8 space-y-3">
          {cart.map((item) => {
            const effective = getEffectiveItemPrice(item.product, item.quantity, "piece");
            const price = effective.unitPrice;
            const originalRetail = effective.originalPrice;
            const mrp = Number(item.product.mrp) || originalRetail;
            const isWholesaleActive = effective.isWholesaleTriggered;
            const wholesaleMinQty = Number(item.product.wholesale_min_qty) || 12;
            const wholesaleRaw = Number(item.product.wholesale_price) || 0;

            const imageSrc =
              item.product.image_url ||
              "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&auto=format&fit=crop&q=60";

            return (
              <div
                key={item.product.id}
                className="flex gap-4 p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt={item.product.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-xl bg-gray-50 border border-gray-100 p-2 shrink-0"
                />

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-purple-700 uppercase">
                      {item.product.brand || "Authentic"}
                    </div>
                    <Link href={`/store/product/${item.product.id}`}>
                      <h3 className="text-xs sm:text-sm font-bold text-gray-900 hover:text-purple-700 line-clamp-2">
                        {item.product.name}
                      </h3>
                    </Link>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-black text-gray-900">₹{price}</span>
                      {isWholesaleActive && originalRetail > price ? (
                        <span className="text-xs text-gray-400 line-through">₹{originalRetail}</span>
                      ) : mrp > price ? (
                        <span className="text-xs text-gray-400 line-through">₹{mrp}</span>
                      ) : null}
                      {isWholesaleActive && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Zap className="w-3 h-3 fill-emerald-600 text-emerald-600" /> Wholesale Rate Applied
                        </span>
                      )}
                    </div>

                    {!isWholesaleActive && wholesaleRaw > 0 && item.quantity < wholesaleMinQty && (
                      <p className="text-[10px] text-indigo-600 font-semibold mt-1 bg-indigo-50/80 border border-indigo-100 px-2 py-0.5 rounded-md inline-block">
                        💡 Buy {wholesaleMinQty - item.quantity} more pcs to get Wholesale price (₹{Number(wholesaleRaw < originalRetail * 3 ? wholesaleRaw : wholesaleRaw / 12).toFixed(0)}/pc)
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    {/* Quantity Selector */}
                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-white rounded-lg"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-black px-2 text-gray-900">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-white rounded-lg"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-gray-900 tabular-nums">
                        ₹{(price * item.quantity).toFixed(0)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg flex items-center gap-1 text-xs font-semibold"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 space-y-5 shadow-xs">
          <h2 className="text-sm font-black uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-3">
            Order Summary
          </h2>

          <div className="space-y-2.5 text-xs text-gray-600">
            <div className="flex items-center justify-between">
              <span>Items Total ({itemCount}):</span>
              <span className="font-bold text-gray-900">₹{subtotal}</span>
            </div>

            {totalSavings > 0 && (
              <div className="flex items-center justify-between text-emerald-700 font-bold">
                <span>Discount Savings:</span>
                <span>- ₹{totalSavings}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span>Delivery Charge:</span>
              <span className="font-bold text-emerald-600">FREE</span>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-base font-black text-gray-900">
              <span>Final Total:</span>
              <span className="text-purple-700 text-xl font-black">₹{subtotal}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/store/checkout")}
            className="w-full py-3.5 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <span>Proceed to 1-Page Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="space-y-1.5 pt-2 text-[11px] text-gray-500">
            <div className="flex items-center gap-2">
              <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Village & Town Doorstep Dispatch</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>Pay with Cash or UPI on Arrival</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Checkout Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.12)] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] text-gray-500 font-semibold leading-none">Total Amount</div>
          <div className="text-lg font-black text-purple-700 leading-tight">₹{subtotal}</div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/store/checkout")}
          className="flex-1 max-w-xs py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
        >
          <span>Checkout &rarr;</span>
        </button>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(StoreCartContent), {
  ssr: false,
  loading: () => <CartLoadingSkeleton />,
});
