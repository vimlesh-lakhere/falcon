"use client";

import React from "react";
import dynamic from "next/dynamic";
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

function OrdersLoadingSkeleton() {
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
      <div className="bg-white rounded-3xl border border-purple-100 p-5 space-y-3 animate-pulse">
        <div className="h-5 w-48 bg-gray-200 rounded-lg" />
        <div className="h-10 w-full bg-gray-100 rounded-xl" />
      </div>
      <div className="space-y-4 animate-pulse">
        <div className="h-44 w-full bg-white rounded-3xl border border-gray-100" />
        <div className="h-44 w-full bg-white rounded-3xl border border-gray-100" />
      </div>
    </div>
  );
}

function MyOrdersContent() {
  const router = useRouter();
  const {
    recentOrders,
    addToCart,
    setIsCartOpen,
    customerUser,
    addRecentOrder,
    savedAddress,
    setSavedAddress,
  } = useStoreCart();

  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [dbOrders, setDbOrders] = React.useState<typeof recentOrders>([]);
  const [phoneSearchInput, setPhoneSearchInput] = React.useState("");
  const [searchFeedback, setSearchFeedback] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Active phone number from user session, saved address, or recent order
  const activeCustomerPhone = React.useMemo(() => {
    const raw =
      customerUser?.phone ||
      savedAddress?.mobileNumber ||
      recentOrders[0]?.address?.mobileNumber ||
      "";
    return raw.replace(/[^0-9]/g, "").slice(-10);
  }, [customerUser, savedAddress, recentOrders]);

  const fetchOrdersForPhone = React.useCallback(
    async (phoneToSearch: string) => {
      const cleanPhone = phoneToSearch.replace(/[^0-9]/g, "").slice(-10);
      if (cleanPhone.length < 10) return;

      try {
        setIsLoading(true);
        setSearchFeedback(null);
        const supabase = createClient();

        // 1. Find all customer IDs matching this phone number
        const { data: custList } = await supabase
          .from("customers")
          .select("id, name, address")
          .eq("phone", cleanPhone);

        const customerIds = (custList || []).map((c) => c.id);

        let salesQuery = supabase
          .from("sales")
          .select("*, customer:customers(*), items:sale_items(*, product:products(*))")
          .order("created_at", { ascending: false });

        // Query by customer IDs or order IDs from local cache
        const localOrderIds = recentOrders.map((o) => o.orderId).filter(Boolean);

        if (customerIds.length > 0 && localOrderIds.length > 0) {
          salesQuery = salesQuery.or(
            `customer_id.in.(${customerIds.join(",")}),id.in.(${localOrderIds.join(",")})`
          );
        } else if (customerIds.length > 0) {
          salesQuery = salesQuery.in("customer_id", customerIds);
        } else if (localOrderIds.length > 0) {
          salesQuery = salesQuery.in("id", localOrderIds);
        } else {
          setSearchFeedback(`No orders found in database for +91 ${cleanPhone}`);
          setIsLoading(false);
          return;
        }

        const { data: sales, error: salesErr } = await salesQuery;

        if (salesErr) {
          console.warn("Error fetching sales from database:", salesErr);
        }

        if (sales && sales.length > 0) {
          const mapped = sales.map((sale) => {
            // Parse delivery note if available
            let village = sale.customer?.address || "Local Address";
            let town = "Town Area";
            let landmark = "";
            let pincode = "483501";
            let customerName = sale.customer?.name || "Customer";

            if (sale.notes && sale.notes.includes("Deliver to:")) {
              try {
                const parts = sale.notes.split("Deliver to:")[1]?.split(",") || [];
                if (parts[0]) customerName = parts[0].trim();
              } catch {}
            }

            return {
              orderId: sale.id,
              invoiceNumber: sale.invoice_number,
              createdAt: sale.created_at,
              totalAmount: Number(sale.total_amount) || 0,
              itemCount: sale.items?.length || 1,
              status: (sale.status || "received") as any,
              items:
                sale.items?.map((it: any) => ({
                  productId: it.product_id,
                  productName: it.product?.name || "Product Item",
                  quantity: it.quantity,
                  price: Number(it.unit_price) || 0,
                  imageUrl: it.product?.image_url,
                })) || [],
              address: {
                fullName: customerName,
                mobileNumber: cleanPhone,
                villageOrColony: village,
                tehsilOrTown: town,
                landmark,
                pincode,
              },
              paymentMethod: (sale.payments?.[0]?.method || "cod") as any,
            };
          });

          setDbOrders(mapped);
          setSearchFeedback(`Found ${mapped.length} orders for +91 ${cleanPhone}`);

          // Also persist in local cache so user never loses them
          mapped.forEach((ord) => {
            addRecentOrder(ord);
          });

          // Save address phone
          if (!savedAddress?.mobileNumber) {
            setSavedAddress({
              fullName: mapped[0].address.fullName,
              mobileNumber: cleanPhone,
              villageOrColony: mapped[0].address.villageOrColony,
              tehsilOrTown: mapped[0].address.tehsilOrTown,
              landmark: "",
              pincode: "483501",
            });
          }
        } else {
          setSearchFeedback(`No orders found in database for +91 ${cleanPhone}`);
        }
      } catch (err) {
        console.warn("Failed to load customer orders:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [recentOrders, addRecentOrder, savedAddress, setSavedAddress]
  );

  // Auto-fetch on mount if customer phone or active orders exist
  React.useEffect(() => {
    if (activeCustomerPhone && activeCustomerPhone.length === 10) {
      fetchOrdersForPhone(activeCustomerPhone);
    } else if (recentOrders.length > 0) {
      // Sync status for existing orders
      const checkLocalOrders = async () => {
        try {
          const supabase = createClient();
          const orderIds = recentOrders.map((o) => o.orderId).filter(Boolean);
          if (orderIds.length === 0) return;

          const { data: sales } = await supabase
            .from("sales")
            .select("id, status, created_at, total_amount, invoice_number")
            .in("id", orderIds);

          if (sales && sales.length > 0) {
            const statusMap = new Map<string, string>();
            sales.forEach((s) => statusMap.set(s.id, s.status));

            const updated = recentOrders.map((o) => {
              if (statusMap.has(o.orderId)) {
                return { ...o, status: statusMap.get(o.orderId) as any };
              }
              return o;
            });
            setDbOrders(updated);
          }
        } catch (err) {
          console.warn("Status sync skipped:", err);
        }
      };
      checkLocalOrders();
    }
  }, [activeCustomerPhone]);

  // Combine DB orders and local recent orders, deduplicated by orderId
  const displayOrders = React.useMemo(() => {
    const map = new Map<string, (typeof recentOrders)[0]>();
    // Add local orders first
    recentOrders.forEach((o) => map.set(o.orderId, o));
    // Overwrite / add DB orders with latest live status
    dbOrders.forEach((o) => map.set(o.orderId, o));

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [recentOrders, dbOrders]);

  const handlePhoneSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = phoneSearchInput.replace(/[^0-9]/g, "").slice(-10);
    if (clean.length === 10) {
      fetchOrdersForPhone(clean);
    } else {
      setSearchFeedback("Please enter a valid 10-digit mobile number");
    }
  };

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

      {/* Customer Session Banner or Mobile Order Lookup */}
      <div className="bg-white rounded-3xl border border-purple-200/80 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Permanent Order History</span>
            </span>
            <h3 className="text-xs sm:text-sm font-black text-gray-900 leading-tight">
              {customerUser
                ? `Welcome back, ${customerUser.name} (+91 ${activeCustomerPhone})`
                : activeCustomerPhone
                ? `Showing Orders for +91 ${activeCustomerPhone}`
                : "Retrieve All Your Previous Orders"}
            </h3>
            <p className="text-[11px] text-gray-500">
              Orders placed on this store are permanently saved in our system.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!customerUser && (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full sm:w-auto px-3.5 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-xl text-xs font-bold transition-colors shrink-0"
              >
                Sign In with OTP
              </button>
            )}
          </div>
        </div>

        {/* Quick Phone Lookup Box */}
        <form onSubmit={handlePhoneSearchSubmit} className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Phone className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="tel"
              placeholder="Enter 10-digit mobile number to load all your orders..."
              value={phoneSearchInput}
              onChange={(e) => setPhoneSearchInput(e.target.value)}
              maxLength={10}
              className="w-full pl-10 pr-3 py-2 text-xs bg-gray-50 focus:bg-white border border-gray-200 focus:border-purple-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-xl text-xs font-bold transition-all shrink-0 shadow-xs"
          >
            {isLoading ? "Searching..." : "Find My Orders"}
          </button>
        </form>

        {searchFeedback && (
          <p className="text-[11px] font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg">
            ℹ️ {searchFeedback}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-gray-400 space-y-2">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Syncing orders from store database...</p>
        </div>
      ) : displayOrders.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-gray-200 text-center space-y-3 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-900">No Orders Found Yet</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Enter your mobile number above to load your past orders, or start a new order now.
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
          {displayOrders.map((ord) => {
            const isDelivered = ord.status === "delivered";
            const isOut = ord.status === "out_for_delivery";
            const isConfirmed = ord.status === "confirmed" || ord.status === "packing";

            return (
              <div
                key={ord.orderId}
                className="bg-white rounded-3xl border border-gray-200/80 p-4 sm:p-6 space-y-4 shadow-xs hover:border-purple-200 transition-colors"
              >
                {/* Order Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-gray-900">
                        Order #{ord.invoiceNumber}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                          isDelivered
                            ? "bg-emerald-100 text-emerald-800"
                            : isOut
                            ? "bg-blue-100 text-blue-800"
                            : isConfirmed
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {isDelivered
                          ? "Delivered"
                          : isOut
                          ? "Out for Delivery"
                          : isConfirmed
                          ? "Confirmed"
                          : "Received"}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span>
                        {new Date(ord.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/store/orders/${ord.orderId}`}
                      className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl text-xs font-bold transition-colors"
                    >
                      Track Delivery &rarr;
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

                {/* Visual Delivery Status Progress Bar */}
                <div className="p-3 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
                    <span className={ord.status ? "text-purple-700 font-black" : ""}>
                      1. Placed
                    </span>
                    <span className={isConfirmed || isOut || isDelivered ? "text-purple-700 font-black" : ""}>
                      2. Confirmed
                    </span>
                    <span className={isOut || isDelivered ? "text-purple-700 font-black" : ""}>
                      3. On Way
                    </span>
                    <span className={isDelivered ? "text-emerald-600 font-black" : ""}>
                      4. Delivered
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isDelivered
                          ? "w-full bg-emerald-500"
                          : isOut
                          ? "w-3/4 bg-purple-600"
                          : isConfirmed
                          ? "w-1/2 bg-purple-600"
                          : "w-1/4 bg-amber-500"
                      }`}
                    />
                  </div>
                </div>

                {/* Items in this order */}
                <div className="space-y-2">
                  {ord.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-gray-800 py-1">
                      <div className="flex items-center gap-2.5">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="w-8 h-8 rounded-lg object-contain bg-gray-50 border border-gray-100"
                          />
                        ) : (
                          <span className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-[10px]">
                            {item.quantity}x
                          </span>
                        )}
                        <div>
                          <p className="font-bold text-gray-900 line-clamp-1">{item.productName}</p>
                          <p className="text-[10px] text-gray-500 font-medium">Qty: {item.quantity} • ₹{item.price} each</p>
                        </div>
                      </div>
                      <span className="font-bold text-gray-900">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Order Footer Details */}
                <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="text-gray-500 text-[11px]">
                    Deliver to: <strong className="text-gray-800">{ord.address.fullName}</strong> (+91 {ord.address.mobileNumber})
                    <span className="block text-gray-400">
                      {ord.address.villageOrColony}, {ord.address.tehsilOrTown}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">
                        Payment: {ord.paymentMethod.toUpperCase()}
                      </span>
                      <span className="text-base font-black text-purple-700">
                        Total: ₹{ord.totalAmount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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

const MyOrdersPage = dynamic(() => Promise.resolve(MyOrdersContent), {
  ssr: false,
  loading: () => <OrdersLoadingSkeleton />,
});

export default MyOrdersPage;
