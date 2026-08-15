"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  ArrowRight,
  Clock,
  RotateCcw,
  ShoppingBag,
  Truck,
  CheckCircle2,
  Phone,
  MessageCircle,
} from "lucide-react";
import { useStoreCart } from "@/store/useStoreCart";
import { createClient } from "@/lib/supabase/client";
import { CustomerAuthModal } from "@/components/store/CustomerAuthModal";

export default function MyOrdersPage() {
  const router = useRouter();
  const { recentOrders, addToCart, setIsCartOpen, customerUser, addRecentOrder } = useStoreCart();
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [dbOrders, setDbOrders] = React.useState<typeof recentOrders>([]);

  React.useEffect(() => {
    const fetchCustomerOrders = async () => {
      if (!customerUser?.phone) return;
      try {
        setIsLoading(true);
        const supabase = createClient();
        const cleanPhone = customerUser.phone.replace(/[^0-9]/g, "");

        // Find customer
        const { data: cust } = await supabase
          .from("customers")
          .select("id")
          .eq("phone", cleanPhone)
          .maybeSingle();

        if (cust) {
          const { data: sales } = await supabase
            .from("sales")
            .select("*, customer:customers(*), items:sale_items(*, product:products(*))")
            .eq("customer_id", cust.id)
            .order("created_at", { ascending: false });

          if (sales && sales.length > 0) {
            const mapped = sales.map((sale) => ({
              orderId: sale.id,
              invoiceNumber: sale.invoice_number,
              createdAt: sale.created_at,
              totalAmount: sale.total_amount,
              itemCount: sale.items?.length || 1,
              status: sale.status as any,
              items: sale.items?.map((it: any) => ({
                productId: it.product_id,
                productName: it.product?.name || "Product",
                quantity: it.quantity,
                price: it.unit_price,
                imageUrl: it.product?.image_url,
              })) || [],
              address: {
                fullName: sale.customer?.name || customerUser.name,
                mobileNumber: cleanPhone,
                villageOrColony: sale.customer?.address || "Local Address",
                tehsilOrTown: "Town Area",
                landmark: "",
                pincode: "483501",
              },
              paymentMethod: (sale.payments?.[0]?.method || "cod") as any,
            }));
            setDbOrders(mapped);
          }
        }
      } catch (err) {
        console.warn("Failed to load customer orders:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomerOrders();
  }, [customerUser]);

  const displayOrders = dbOrders.length > 0 ? dbOrders : recentOrders;

  const handleRepeatOrder = (order: (typeof recentOrders)[0]) => {
    order.items.forEach((item) => {
      addToCart(
        {
          id: item.productId,
          shop_id: "",
          category_id: null,
          supplier_id: null,
          name: item.productName,
          sku: null,
          barcode: null,
          brand: null,
          unit_id: null,
          purchase_price: item.price,
          selling_price: item.price,
          wholesale_price: null,
          minimum_selling_price: null,
          current_stock: 50,
          minimum_stock: 0,
          image_url: item.imageUrl || null,
          description: null,
          is_active: true,
          created_at: new Date().toISOString(),
        },
        item.quantity
      );
    });

    setIsCartOpen(true);
    router.push("/store/cart");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
          📦 My Orders & 1-Click Repeat Order
        </h1>
        <p className="text-xs text-gray-500">
          Track active deliveries and instantly reorder your regular grocery and beauty supplies.
        </p>
      </div>

      {/* Customer Session Banner */}
      {customerUser ? (
        <div className="bg-purple-50 border border-purple-200 rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {customerUser.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                Logged in Account
              </span>
              <h3 className="text-sm font-black text-gray-900 leading-tight">
                {customerUser.name}
              </h3>
              <p className="text-[11px] text-gray-500 font-mono">+91 {customerUser.phone}</p>
            </div>
          </div>
          <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
            {displayOrders.length} {displayOrders.length === 1 ? "Order" : "Orders"}
          </span>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div>
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
              Track All Your Past Orders
            </span>
            <h4 className="text-xs sm:text-sm font-black text-gray-900">
              Sign in with your mobile number to load all orders from your account
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
          >
            Sign In with Mobile
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-xs text-gray-400">Loading your orders...</div>
      ) : displayOrders.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-gray-200 text-center space-y-3 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-900">No Past Orders Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            When you place an order, it will appear here with live tracking and 1-click repeat reordering.
          </p>
          <Link
            href="/store"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-purple-700"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {displayOrders.map((ord) => (
            <div
              key={ord.orderId}
              className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 space-y-4 shadow-xs"
            >
              {/* Order Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-gray-900">
                      Order #{ord.invoiceNumber}
                    </span>
                    <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full uppercase">
                      {ord.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {new Date(ord.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/store/orders/${ord.orderId}`}
                    className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors"
                  >
                    Track Live
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleRepeatOrder(ord)}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Repeat Order</span>
                  </button>
                </div>
              </div>

              {/* Items in this order */}
              <div className="space-y-2">
                {ord.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs text-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-[10px]">
                        {item.quantity}x
                      </span>
                      <span className="font-semibold">{item.productName}</span>
                    </div>
                    <span className="font-bold text-gray-900">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Order Footer Details */}
              <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="text-gray-500">
                  Deliver to: <strong className="text-gray-800">{ord.address.fullName}</strong> (
                  {ord.address.villageOrColony}, {ord.address.tehsilOrTown})
                </div>
                <div className="text-base font-black text-purple-700">
                  Total: ₹{ord.totalAmount} ({ord.paymentMethod.toUpperCase()})
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer Login / Auth Modal */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
