"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Truck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useStoreCart } from "@/store/useStoreCart";
import { getStorefrontItemPrice } from "@/lib/units-pricing";

export const CartDrawer: React.FC = () => {
  const router = useRouter();
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    getCartTotal,
  } = useStoreCart();

  const { subtotal, totalSavings, itemCount } = getCartTotal();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-purple-900 text-white">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-purple-300" />
              <h2 className="text-sm font-black tracking-tight">
                My Shopping Cart ({itemCount} {itemCount === 1 ? "Item" : "Items"})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-purple-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Delivery Note */}
          <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 flex items-center gap-2 text-[11px] font-semibold text-emerald-800">
            <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Eligible for Fast Local Town & Village Delivery</span>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                  <ShoppingCart className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-gray-800">Your Cart is Empty</h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Add cosmetics, hair oil, creams, or daily essentials to start your order.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="px-5 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-purple-700"
                >
                  Explore Products
                </button>
              </div>
            ) : (
              cart.map((item) => {
                const effective = getStorefrontItemPrice(item.product, item.quantity);
                const price = effective.unitPrice;
                const originalRetail = effective.originalPrice;
                const mrp = Number(item.product.mrp) || originalRetail;
                const isWholesaleActive = effective.isWholesaleTriggered;
                const wholesaleMinQty = Number(item.product.wholesale_min_qty) || 12;
                const wholesaleRaw = Number(item.product.wholesale_price) || 0;
                // Pieces still needed to unlock the wholesale rate (order is counted in pieces).
                const piecesToWholesale = Math.max(0, wholesaleMinQty - effective.totalPieces);
                const unitsToWholesale = Math.ceil(piecesToWholesale / effective.unitPieces);

                const imageSrc =
                  item.product.image_url ||
                  "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&auto=format&fit=crop&q=60";

                const itemKey = item.itemKey || `${item.product.id}___${item.selectedVariant || "default"}`;

                return (
                  <div
                    key={itemKey}
                    className="flex gap-3 p-3 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-purple-200 transition-all"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageSrc}
                      alt={item.product.name}
                      loading="lazy"
                      decoding="async"
                      className="w-16 h-16 object-contain rounded-xl bg-white border border-gray-100 p-1 shrink-0"
                    />

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-purple-700 font-bold uppercase">
                            {item.product.brand || "Authentic"}
                          </span>
                          {item.selectedVariant && (
                            <span className="text-[9px] font-black text-purple-800 bg-purple-100 px-1.5 py-0.2 rounded-md">
                              {item.selectedVariant}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-gray-900 line-clamp-1">
                          {item.product.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-black text-gray-900">₹{price}</span>
                          {isWholesaleActive && originalRetail > price ? (
                            <span className="text-[10px] text-gray-400 line-through">₹{originalRetail}</span>
                          ) : mrp > price ? (
                            <span className="text-[10px] text-gray-400 line-through">₹{mrp}</span>
                          ) : null}
                          {isWholesaleActive && (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded flex items-center gap-0.5">
                              <Zap className="w-2.5 h-2.5 fill-emerald-600 text-emerald-600" /> Wholesale
                            </span>
                          )}
                        </div>

                        {!isWholesaleActive && wholesaleRaw > 0 && piecesToWholesale > 0 && (
                          <p className="text-[9px] text-indigo-600 font-semibold mt-0.5">
                            💡 Add {unitsToWholesale} more for Wholesale rate
                          </p>
                        )}
                      </div>

                      {/* Quantity Modifier with Touch-Friendly Steppers */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(itemKey, item.quantity - 1, item.selectedVariant)}
                            className="w-7 h-7 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:bg-purple-100 rounded-md transition-colors"
                            title="Reduce quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-black px-2 text-gray-900 min-w-[20px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(itemKey, item.quantity + 1, item.selectedVariant)}
                            className="w-7 h-7 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:bg-purple-100 rounded-md transition-colors"
                            title="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-right flex items-center gap-2">
                          <span className="text-xs font-black text-gray-900 tabular-nums">
                            ₹{(price * item.quantity).toFixed(0)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromCart(itemKey, item.selectedVariant)}
                            className="text-gray-400 hover:text-red-600 p-1.5 rounded-md transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Checkout CTA with iOS Safe Area Padding */}
          {cart.length > 0 && (
            <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-gray-100 bg-gray-50 space-y-3">
              {totalSavings > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-700 font-bold bg-emerald-100/70 px-3 py-1.5 rounded-xl">
                  <span>🎉 Your Total Savings:</span>
                  <span>₹{totalSavings}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-gray-700">Subtotal:</span>
                <span className="font-black text-lg text-gray-900">₹{subtotal}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/store/cart"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-2.5 px-3 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-800 text-xs font-bold text-center transition-colors"
                >
                  View Full Cart
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(false);
                    router.push("/store/checkout");
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-lg shadow-purple-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <span>Checkout</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[10px] text-center text-gray-500">
                🔒 Safe & Simple • Pay Cash on Delivery or UPI
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
