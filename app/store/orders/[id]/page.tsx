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
} from "lucide-react";
import { OrderStatusTracker, OrderStatus } from "@/components/store/OrderStatusTracker";
import { useStoreCart, StoredOrderSummary } from "@/store/useStoreCart";
import { createClient } from "@/lib/supabase/client";

const SHOP_OWNER_WHATSAPP = "919340362381";

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const { recentOrders } = useStoreCart();

  const [order, setOrder] = useState<StoredOrderSummary | null>(null);

  useEffect(() => {
    const fetchSale = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("sales")
        .select("*, customer:customers(*), items:sale_items(*, product:products(*))")
        .or(`id.eq.${orderId},invoice_number.eq.${orderId}`)
        .maybeSingle();

      const local = recentOrders.find((o) => o.orderId === orderId || o.invoiceNumber === orderId);

      if (data) {
        setOrder({
          orderId: data.id,
          invoiceNumber: data.invoice_number,
          createdAt: data.created_at,
          totalAmount: data.total_amount,
          itemCount: data.items?.length || local?.itemCount || 1,
          status: (data.status as any) || local?.status || "received",
          items: data.items?.map((it: any) => ({
            productId: it.product_id,
            productName: it.product?.name || "Product",
            quantity: it.quantity,
            price: it.unit_price,
            imageUrl: it.product?.image_url,
          })) || local?.items || [],
          address: local?.address || {
            fullName: data.customer?.name || "Customer",
            mobileNumber: data.customer?.phone || "N/A",
            villageOrColony: data.customer?.address || "Local Address",
            tehsilOrTown: "Town Area",
            landmark: "",
            pincode: "483501",
          },
          paymentMethod: local?.paymentMethod || "cod",
        });
      } else if (local) {
        setOrder(local);
      }
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

  // Pre-composed WhatsApp notification message for shop owner (919340362381)
  const itemsText = order.items
    .map((it, idx) => `${idx + 1}. *${it.productName}* (${it.quantity}x) = ₹${it.price * it.quantity}`)
    .join("\n");

  const whatsappMessage = `🛍️ *NEW ONLINE ORDER - AGS STORE*
━━━━━━━━━━━━━━━━━━━━
📋 *Invoice:* #${order.invoiceNumber}
👤 *Customer:* ${order.address.fullName}
📱 *Phone:* +91 ${order.address.mobileNumber}
📍 *Delivery Address:* ${order.address.villageOrColony}, ${order.address.tehsilOrTown} (PIN: ${order.address.pincode})
💳 *Payment Mode:* ${order.paymentMethod === "upi" ? "📲 UPI Online (PhonePe)" : "💵 Cash on Delivery (COD)"}
━━━━━━━━━━━━━━━━━━━━
🛒 *Items Ordered:*
${itemsText}
━━━━━━━━━━━━━━━━━━━━
💰 *Total Amount:* ₹${order.totalAmount}
━━━━━━━━━━━━━━━━━━━━
⚡ Namaste shopkeeper ji! Please confirm and pack my order.`;

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
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-200">
              Order Confirmed
            </span>
            <h1 className="text-xl sm:text-2xl font-black">
              Thank You, {order.address.fullName}!
            </h1>
            <p className="text-xs text-emerald-100 mt-0.5">
              Your order #{order.invoiceNumber} has been received by AGS Store.
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

      {/* WhatsApp Immediate Action Card for Customer */}
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

      {/* 5-Step Visual Tracker */}
      <OrderStatusTracker
        status={order.status}
        orderNumber={order.invoiceNumber}
        createdAt={order.createdAt}
      />

      {/* Delivery & Payment Details Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Delivery Address */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 space-y-2.5 shadow-xs">
          <div className="flex items-center gap-2 text-purple-700 text-xs font-black uppercase tracking-wider">
            <MapPin className="w-4 h-4" />
            <span>Delivery Destination</span>
          </div>
          <div className="text-xs text-gray-800 space-y-1">
            <div className="font-bold text-sm text-gray-900">{order.address.fullName}</div>
            <div>{order.address.villageOrColony}</div>
            <div>{order.address.tehsilOrTown} - {order.address.pincode}</div>
            {order.address.landmark && (
              <div className="text-gray-500">Landmark: {order.address.landmark}</div>
            )}
            <div className="font-semibold text-purple-700 pt-1">Phone: +91 {order.address.mobileNumber}</div>
          </div>
        </div>

        {/* Payment Summary */}
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
                  {order.paymentMethod === "cod" ? "Cash on Delivery" : "UPI on Delivery"}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Delivery:</span>
                <span className="font-bold text-emerald-600">FREE</span>
              </div>
              <div className="flex items-center justify-between text-base font-black text-purple-800 pt-2 border-t border-gray-100">
                <span>Total Amount:</span>
                <span>₹{order.totalAmount}</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-gray-400">
            Pay safely to our delivery rider when receiving the package.
          </div>
        </div>
      </div>
    </div>
  );
}
