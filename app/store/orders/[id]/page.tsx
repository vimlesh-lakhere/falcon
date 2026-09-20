"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Phone,
  MessageCircle,
  Truck,
  MapPin,
  Clock,
  Sparkles,
  RotateCcw,
  Store,
  Receipt,
  Globe,
} from "lucide-react";
import { OrderStatusTracker, OrderStatus } from "@/components/store/OrderStatusTracker";
import { useStoreCart, StoredOrderSummary } from "@/store/useStoreCart";

const SHOP_OWNER_WHATSAPP = "919340362381";

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const { recentOrders } = useStoreCart();

  const [order, setOrder] = useState<StoredOrderSummary | null>(null);

  useEffect(() => {
    const fetchSale = async () => {
      const local = recentOrders.find((o) => o.orderId === orderId || o.invoiceNumber === orderId);
      try {
        // Server returns the order only if it belongs to the logged-in (verified) customer.
        const res = await fetch("/api/store/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "detail", orderId }),
        });
        const data = await res.json();
        if (data?.success && data.order) {
          setOrder({
            ...data.order,
            address: local?.address || data.order.address,
            paymentMethod: local?.paymentMethod || data.order.paymentMethod,
          });
          return;
        }
      } catch {
        // fall through to local cache
      }
      if (local) setOrder(local);
    };

    fetchSale();
  }, [orderId, recentOrders]);

  if (!order) {
    return (
      <div className="max-w-xl mx-auto px-4 pt-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Loading Order Details...</h2>
        <Link
          href="/store/orders"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:underline"
        >
          View All Orders &rarr;
        </Link>
      </div>
    );
  }

  const isOnline =
    order.orderType === "online" || order.invoiceNumber?.startsWith("ORD-");

  // Pre-composed WhatsApp notification message for shop owner (919340362381)
  const itemsText = order.items
    .map((it, idx) => `${idx + 1}. *${it.productName}* (${it.quantity}x) = ₹${it.price * it.quantity}`)
    .join("\n");

  const gpsLocationStr = (order.address.latitude && order.address.longitude)
    ? `\n🗺️ *Live Google Map Location:*\nhttps://www.google.com/maps/dir/?api=1&destination=${order.address.latitude},${order.address.longitude}`
    : "";

  const whatsappMessage = isOnline
    ? `🛍️ *ONLINE ORDER - AGS STORE*
━━━━━━━━━━━━━━━━━━━━
📋 *Invoice:* #${order.invoiceNumber}
👤 *Customer:* ${order.address.fullName}
📱 *Phone:* +91 ${order.address.mobileNumber}
📍 *Delivery Address:* ${order.address.villageOrColony}, ${order.address.tehsilOrTown} (PIN: ${order.address.pincode})${gpsLocationStr}
💳 *Payment Mode:* ${order.paymentMethod === "upi" ? "📲 UPI Online" : "💵 Cash on Delivery"}
━━━━━━━━━━━━━━━━━━━━
🛒 *Items Ordered:*
${itemsText}
━━━━━━━━━━━━━━━━━━━━
💰 *Total Amount:* ₹${order.totalAmount}`
    : `🏪 *IN-STORE SHOP BILL - AGS STORE*
━━━━━━━━━━━━━━━━━━━━
📋 *Invoice:* #${order.invoiceNumber}
👤 *Customer:* ${order.address.fullName}
📱 *Phone:* +91 ${order.address.mobileNumber}
🏬 *Counter Purchase:* AGS Store Main Counter
💳 *Payment:* ${order.paymentMethod.toUpperCase()} (Billed & Handed Over)
━━━━━━━━━━━━━━━━━━━━
🛒 *Items Purchased:*
${itemsText}
━━━━━━━━━━━━━━━━━━━━
💰 *Total Amount:* ₹${order.totalAmount}`;

  const whatsappUrl = `https://wa.me/${SHOP_OWNER_WHATSAPP}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
      {/* Back Link */}
      <Link
        href="/store/orders"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-purple-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to My Orders</span>
      </Link>

      {/* Success Celebration Banner */}
      {isOnline ? (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-200 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" /> Online Order Confirmed
              </span>
              <h1 className="text-xl sm:text-2xl font-black">
                Thank You, {order.address.fullName}!
              </h1>
              <p className="text-xs text-emerald-100 mt-0.5">
                Your online delivery order #{order.invoiceNumber} has been received by AGS Store.
              </p>
            </div>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 bg-white hover:bg-emerald-50 text-emerald-900 rounded-2xl text-xs font-black shadow-lg flex items-center gap-2 shrink-0 transition-transform active:scale-95 animate-pulse"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>Send Order on WhatsApp</span>
          </a>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
              <Store className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> In-Store Counter Purchase (दुकान से खरीदी)
              </span>
              <h1 className="text-xl sm:text-2xl font-black">
                Bill #{order.invoiceNumber}
              </h1>
              <p className="text-xs text-emerald-100 mt-0.5">
                Thank you for shopping in-person at AGS Store! Bill paid and handed over at shop counter.
              </p>
            </div>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 bg-white hover:bg-emerald-50 text-emerald-900 rounded-2xl text-xs font-black shadow-lg flex items-center gap-2 shrink-0 transition-transform active:scale-95"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>Share Bill on WhatsApp</span>
          </a>
        </div>
      )}

      {/* Immediate Action / Information Card */}
      {isOnline ? (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-emerald-950">
                Notify Shopkeeper on WhatsApp (+91 9340362381)
              </h3>
              <p className="text-[11px] text-emerald-800">
                1-click me dukaandar ko bill & address bhej kar fast dispatch karwayen.
              </p>
            </div>
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Open WhatsApp Now</span>
          </a>
        </div>
      ) : (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-emerald-950">
                Official In-Store Bill (दुकान का बिल)
              </h3>
              <p className="text-[11px] text-emerald-800">
                Yeh bill dukan counter se khareedaari ka hai. Saaman seedha grahak ko prapt ho chuka hai.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            <span>Print / Save Bill</span>
          </button>
        </div>
      )}

      {/* Visual Tracker (Online Delivery only) */}
      {isOnline ? (
        <OrderStatusTracker
          status={order.status}
          orderNumber={order.invoiceNumber}
          createdAt={order.createdAt}
        />
      ) : (
        <div className="bg-white rounded-3xl border border-emerald-200 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-gray-900">
                  AGS Store Counter Invoice
                </h3>
                <p className="text-[11px] text-gray-500">
                  Purchased in-person at shop • All items handed over directly
                </p>
              </div>
            </div>
            <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Handed Over (प्राप्त)
            </span>
          </div>
        </div>
      )}

      {/* Items Summary Table */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
            Items Purchased ({order.items.length})
          </h3>
          <span className="text-xs text-gray-500 font-mono">Invoice #{order.invoiceNumber}</span>
        </div>
        <div className="divide-y divide-gray-100">
          {order.items.map((item, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="w-10 h-10 rounded-xl object-contain bg-gray-50 border border-gray-100"
                  />
                ) : (
                  <span className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs">
                    {item.quantity}x
                  </span>
                )}
                <div>
                  <h4 className="font-bold text-gray-900">{item.productName}</h4>
                  <p className="text-[11px] text-gray-500 font-mono">Qty: {item.quantity} × ₹{item.price}</p>
                </div>
              </div>
              <span className="font-bold text-gray-900">₹{item.price * item.quantity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery / Store & Payment Details Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Left: Destination or Store Counter Info */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 space-y-2.5 shadow-xs">
          <div className="flex items-center gap-2 text-purple-700 text-xs font-black uppercase tracking-wider">
            {isOnline ? <MapPin className="w-4 h-4" /> : <Store className="w-4 h-4 text-emerald-600" />}
            <span>{isOnline ? "Delivery Destination" : "Store Counter Details"}</span>
          </div>
          <div className="text-xs text-gray-800 space-y-1">
            {isOnline ? (
              <>
                <div className="font-bold text-sm text-gray-900">{order.address.fullName}</div>
                <div>{order.address.villageOrColony}</div>
                <div>{order.address.tehsilOrTown} - {order.address.pincode}</div>
                {order.address.landmark && (
                  <div className="text-gray-500">Landmark: {order.address.landmark}</div>
                )}
                <div className="font-semibold text-purple-700 pt-1">Phone: +91 {order.address.mobileNumber}</div>
                {order.address.latitude && order.address.longitude && (
                  <div className="pt-2 border-t border-gray-100">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${order.address.latitude},${order.address.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>🗺️ Open in Google Maps</span>
                    </a>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="font-bold text-sm text-gray-900">AGS Store Counter</div>
                <div>Customer: <strong>{order.address.fullName}</strong></div>
                {order.address.mobileNumber && (
                  <div className="font-semibold text-emerald-800">Phone: +91 {order.address.mobileNumber}</div>
                )}
                <div className="text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                  Purchased in-person at shop counter. Handed over directly.
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Payment Summary */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 space-y-2.5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-black uppercase tracking-wider">
              <Truck className="w-4 h-4" />
              <span>Payment Details</span>
            </div>
            <div className="mt-2 space-y-1 text-xs text-gray-700">
              <div className="flex items-center justify-between">
                <span>Method:</span>
                <strong className="text-gray-900 uppercase">
                  {order.paymentMethod === "cod"
                    ? "Cash on Delivery"
                    : order.paymentMethod === "upi"
                    ? "UPI Payment"
                    : "Cash at Counter"}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Fulfillment:</span>
                <span className="font-bold text-emerald-600">
                  {isOnline ? "Home Delivery" : "In-Store Pickup"}
                </span>
              </div>
              <div className="flex items-center justify-between text-base font-black text-purple-800 pt-2 border-t border-gray-100">
                <span>Total Amount:</span>
                <span>₹{order.totalAmount}</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-gray-400">
            {isOnline
              ? "Pay safely to our delivery rider when receiving the package."
              : "Payment completed at shop counter."}
          </div>
        </div>
      </div>
    </div>
  );
}

