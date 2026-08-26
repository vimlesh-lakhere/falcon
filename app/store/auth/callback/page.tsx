"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useStoreCart } from "@/store/useStoreCart";
import { CheckCircle2, Loader2 } from "lucide-react";


const SHOP_ID = process.env.DEFAULT_SHOP_ID || "a0000000-0000-0000-0000-000000000001";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { loginCustomer, addRecentOrder } = useStoreCart();
  const [status, setStatus] = useState<string>("Verifying your Google Account...");

  useEffect(() => {
    async function handleAuth() {
      try {
        const supabase = createClient();
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session?.user) {
          setStatus("Authentication failed. Redirecting to store...");
          setTimeout(() => router.push("/store"), 2000);
          return;
        }

        const user = session.user;
        const email = user.email || "";
        const fullName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          email.split("@")[0] ||
          "Customer";
        const avatarUrl = user.user_metadata?.avatar_url || "";
        const phone = user.phone || "";

        // Check or create customer in Supabase
        let customerId: string | undefined = undefined;
        try {
          const { data: existingCustomer } = await supabase
            .from("customers")
            .select("*")
            .eq("email", email)
            .maybeSingle();

          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            const { data: newCustomer } = await supabase
              .from("customers")
              .insert({
                shop_id: SHOP_ID,
                name: fullName,
                email: email,
                phone: phone || null,
                address: "Town Area",
              })
              .select("*")
              .maybeSingle();

            if (newCustomer) {
              customerId = newCustomer.id;
            }
          }
        } catch (dbErr) {
          console.warn("Google Customer DB sync notice:", dbErr);
        }

        // Login into Zustand Store
        loginCustomer({
          id: customerId,
          name: fullName,
          email: email,
          phone: phone,
          avatarUrl: avatarUrl,
          isVerified: true,
          authProvider: "google",
        });

        // Sync past customer orders
        if (customerId) {
          try {
            const { data: pastSales } = await supabase
              .from("sales")
              .select("*, customer:customers(*), items:sale_items(*, product:products(*))")
              .eq("customer_id", customerId)
              .order("created_at", { ascending: false })
              .limit(10);

            if (pastSales && pastSales.length > 0) {
              pastSales.forEach((sale) => {
                addRecentOrder({
                  orderId: sale.id,
                  invoiceNumber: sale.invoice_number,
                  createdAt: sale.created_at,
                  totalAmount: sale.total_amount,
                  itemCount: sale.items?.length || 1,
                  status: sale.status as any,
                  items:
                    sale.items?.map((it: any) => ({
                      productId: it.product_id,
                      productName: it.product?.name || "Product",
                      quantity: it.quantity,
                      price: it.unit_price,
                      imageUrl: it.product?.image_url,
                    })) || [],
                  address: {
                    fullName: sale.customer?.name || fullName,
                    mobileNumber: sale.customer?.phone || phone || "",
                    villageOrColony: sale.customer?.address || "Local Area",
                    tehsilOrTown: "Town Area",
                    landmark: "",
                    pincode: "483501",
                  },
                  paymentMethod: "cod",
                });
              });
            }
          } catch {
            // Non-blocking
          }
        }

        setStatus("Verified with Google! Redirecting...");
        setTimeout(() => {
          router.push("/store");
        }, 1000);
      } catch (e) {
        console.error("Auth callback error:", e);
        setStatus("Redirecting to store...");
        setTimeout(() => router.push("/store"), 1500);
      }
    }

    handleAuth();
  }, [router, loginCustomer, addRecentOrder]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full text-center space-y-4">
        <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Google Verification</h2>
        <p className="text-xs text-gray-500">{status}</p>
      </div>
    </div>
  );
}
