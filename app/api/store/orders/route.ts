import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import { readCustomerSession } from "@/lib/customer-session";
import { isUuid } from "@/lib/tenant";

/**
 * Storefront order history / detail for the LOGGED-IN customer only.
 *
 * A shopper can only ever see orders for the phone number they verified via OTP (read from the
 * signed httpOnly session cookie) — never by typing an arbitrary phone or guessing an order id.
 * Runs server-side with the service role so it keeps working with `customers`/`sales` under RLS.
 */

const DEFAULT_SHOP_ID = process.env.DEFAULT_SHOP_ID || "a0000000-0000-0000-0000-000000000001";

function resolveShopId(req: NextRequest, bodyShopId: unknown): string {
  const candidates = [
    req.headers.get("x-store-shop-id"),
    typeof bodyShopId === "string" ? bodyShopId : null,
    req.cookies.get("falcon_store_shop_id")?.value,
  ];
  return candidates.find((c): c is string => !!c && isUuid(c)) || DEFAULT_SHOP_ID;
}

function mapSale(sale: any, sessionPhone: string) {
  const isOnline =
    sale.invoice_number?.startsWith("ORD-") || (sale.notes && sale.notes.includes("[Online Order"));
  const orderType: "online" | "in_store" = isOnline ? "online" : "in_store";

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
    status: !isOnline ? "delivered" : ((sale.status || "received") as string),
    orderType,
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
      mobileNumber: sessionPhone,
      villageOrColony: sale.customer?.address || "Local Address",
      tehsilOrTown: "Town Area",
      landmark: "",
      pincode: "483501",
    },
    paymentMethod: (sale.payments?.[0]?.method || (sale.notes?.includes("UPI") ? "upi" : "cash")) as string,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = body.action;

    const sessionPhone = readCustomerSession(req.cookies.get("falcon_customer_session")?.value);
    if (!sessionPhone) {
      // Not logged in: no server-side history (the client still shows its own local cache).
      return NextResponse.json({ success: false, orders: [], count: 0 });
    }

    const shopId = resolveShopId(req, body.shopId);
    const supabase = getAdminSupabaseClient();

    // The customer id(s) for this verified phone within this shop.
    const { data: custList } = await supabase
      .from("customers")
      .select("id")
      .eq("shop_id", shopId)
      .eq("phone", sessionPhone);

    const customerIds = (custList || []).map((c) => c.id);

    if (action === "count") {
      if (customerIds.length === 0) return NextResponse.json({ success: true, count: 0 });
      const { count } = await supabase
        .from("sales")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopId)
        .in("customer_id", customerIds);
      return NextResponse.json({ success: true, count: count || 0 });
    }

    if (action === "detail") {
      const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
      if (!orderId) return NextResponse.json({ success: false });

      // Match by order id (uuid) or by invoice number, always within this shop.
      let q = supabase
        .from("sales")
        .select("*, customer:customers(*), items:sale_items(*, product:products(name, image_url)), payments:payments(*)")
        .eq("shop_id", shopId);
      q = isUuid(orderId) ? q.or(`id.eq.${orderId},invoice_number.eq.${orderId}`) : q.eq("invoice_number", orderId);

      const { data: sale } = await q.maybeSingle();
      if (!sale) return NextResponse.json({ success: false });

      // Only the owner of the order (its verified phone) may view it.
      const owns = sale.customer?.phone === sessionPhone || (sale.customer_id && customerIds.includes(sale.customer_id));
      if (!owns) return NextResponse.json({ success: false }, { status: 403 });

      return NextResponse.json({ success: true, order: mapSale(sale, sessionPhone) });
    }

    // action === "list": full order history for this verified customer.
    if (customerIds.length === 0) return NextResponse.json({ success: true, orders: [] });

    const { data: sales } = await supabase
      .from("sales")
      .select("*, customer:customers(*), items:sale_items(*, product:products(name, image_url)), payments:payments(*)")
      .eq("shop_id", shopId)
      .in("customer_id", customerIds)
      .order("created_at", { ascending: false })
      .limit(50);

    const orders = (sales || []).map((sale: any) => mapSale(sale, sessionPhone));
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("Store orders route error:", error);
    return NextResponse.json({ success: false, orders: [], count: 0 }, { status: 500 });
  }
}
