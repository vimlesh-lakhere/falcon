import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SHOP_OWNER_WHATSAPP = process.env.NEXT_PUBLIC_SHOP_WHATSAPP || "919340362381";

interface CartItemPayload {
  product: {
    id: string;
    name?: string;
    selling_price?: number;
    image_url?: string | null;
  };
  quantity: number;
}

interface AddressPayload {
  fullName: string;
  mobileNumber: string;
  villageOrColony: string;
  tehsilOrTown: string;
  landmark?: string;
  pincode?: string;
  deliveryNotes?: string;
}

export async function POST(req: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { success: false, error: "Database service is not configured." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const body = await req.json();
    const { shopId, cart, address, paymentMethod, upiReference, notes } = body as {
      shopId: string;
      cart: CartItemPayload[];
      address: AddressPayload;
      paymentMethod: "cod" | "upi";
      upiReference?: string;
      notes?: string;
    };

    if (!shopId) {
      return NextResponse.json({ success: false, error: "Shop ID is required." }, { status: 400 });
    }

    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ success: false, error: "Cart cannot be empty." }, { status: 400 });
    }

    if (!address || !address.fullName?.trim() || !address.mobileNumber?.trim()) {
      return NextResponse.json({ success: false, error: "Valid customer name and mobile number are required." }, { status: 400 });
    }

    const cleanPhone = address.mobileNumber.replace(/[^0-9]/g, "").slice(-10);
    if (cleanPhone.length < 10) {
      return NextResponse.json({ success: false, error: "Please enter a valid 10-digit mobile number." }, { status: 400 });
    }

    // 1. Fetch live product prices from database to prevent client-side price tampering
    const productIds = cart.map((it) => it.product.id);
    const { data: dbProducts, error: prodErr } = await supabase
      .from("products")
      .select("id, name, selling_price, current_stock, image_url, is_active")
      .in("id", productIds)
      .eq("shop_id", shopId);

    if (prodErr || !dbProducts) {
      return NextResponse.json({ success: false, error: "Failed to verify catalog products." }, { status: 500 });
    }

    const productMap = new Map<string, (typeof dbProducts)[0]>();
    dbProducts.forEach((p) => productMap.set(p.id, p));

    // Calculate verified total
    let verifiedSubtotal = 0;
    const verifiedItems: {
      productId: string;
      productName: string;
      quantity: number;
      price: number;
      imageUrl?: string | null;
    }[] = [];

    for (const item of cart) {
      const dbProd = productMap.get(item.product.id);
      if (!dbProd) {
        return NextResponse.json(
          { success: false, error: `Product not found or unavailable in store catalog.` },
          { status: 400 }
        );
      }

      const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const price = Number(dbProd.selling_price) || 0;
      verifiedSubtotal += price * qty;

      verifiedItems.push({
        productId: dbProd.id,
        productName: dbProd.name,
        quantity: qty,
        price,
        imageUrl: dbProd.image_url,
      });
    }

    const invoiceNumber = `ORD-${Date.now().toString().slice(-6)}`;

    // 2. Find or create customer record
    let customerId: string | null = null;
    try {
      const { data: existingCust } = await supabase
        .from("customers")
        .select("id")
        .eq("shop_id", shopId)
        .eq("phone", cleanPhone)
        .maybeSingle();

      if (existingCust) {
        customerId = existingCust.id;
      } else {
        const fullAddressText = `${address.villageOrColony}, ${address.tehsilOrTown}${address.landmark ? ` (Near: ${address.landmark})` : ""} - PIN: ${address.pincode || "483501"}`;
        const { data: newCust } = await supabase
          .from("customers")
          .insert([
            {
              shop_id: shopId,
              name: address.fullName.trim(),
              phone: cleanPhone,
              address: fullAddressText,
              total_spend: 0,
              outstanding_balance: 0,
              notes: `Online Storefront Customer from ${address.villageOrColony}`,
            },
          ])
          .select("id")
          .single();

        if (newCust) {
          customerId = newCust.id;
        }
      }
    } catch (custErr) {
      console.warn("Customer linking skipped:", custErr);
    }

    // 3. Create Sale record
    const upiNoteStr = upiReference ? ` [UPI UTR/Ref: ${upiReference}]` : "";
    const deliveryAddressNotes = `[Online Order - ${(paymentMethod || "COD").toUpperCase()}${upiNoteStr}] Deliver to: ${address.fullName}, Phone: ${address.mobileNumber}, Village/Colony: ${address.villageOrColony}, Tehsil: ${address.tehsilOrTown}, Landmark: ${address.landmark || "N/A"}, PIN: ${address.pincode || "483501"}. Customer Note: ${address.deliveryNotes || "None"}`;

    const { data: newSale, error: saleError } = await supabase
      .from("sales")
      .insert([
        {
          shop_id: shopId,
          invoice_number: invoiceNumber,
          customer_id: customerId,
          subtotal: verifiedSubtotal,
          discount_amount: 0,
          tax_amount: 0,
          total_amount: verifiedSubtotal,
          status: "received",
          notes: deliveryAddressNotes,
        },
      ])
      .select("id, invoice_number, created_at, status")
      .single();

    if (saleError) {
      console.error("Sale insert error:", saleError);
      return NextResponse.json({ success: false, error: "Failed to create order record." }, { status: 500 });
    }

    const saleId = newSale.id;

    // 4. Batch insert sale items
    const saleItemsPayload = verifiedItems.map((it) => ({
      sale_id: saleId,
      product_id: it.productId,
      quantity: it.quantity,
      unit_price: it.price,
      cost_price: 0,
    }));

    await supabase.from("sale_items").insert(saleItemsPayload);

    // 5. If UPI, record payment
    if (paymentMethod === "upi") {
      await supabase.from("payments").insert([
        {
          sale_id: saleId,
          method: "upi",
          amount: verifiedSubtotal,
          reference_no: upiReference || `PhonePe QR Online`,
        },
      ]);
    }

    // 6. Record stock movements
    const stockMovements = verifiedItems.map((it) => ({
      shop_id: shopId,
      product_id: it.productId,
      movement_type: "sale",
      quantity_delta: -it.quantity,
      reference_table: "sales",
      reference_id: saleId,
      notes: `Online Storefront Order #${invoiceNumber}`,
    }));

    await supabase.from("stock_movements").insert(stockMovements);

    // 7. Compose WhatsApp notification string
    const itemsText = verifiedItems
      .map((it, idx) => `${idx + 1}. *${it.productName}* x ${it.quantity} = ₹${it.price * it.quantity}`)
      .join("\n");

    const payMode = paymentMethod === "upi" ? "📲 UPI Online" : "💵 Cash on Delivery (COD)";
    const whatsappMessage = `🛍️ *NEW ONLINE ORDER - AGS STORE*
━━━━━━━━━━━━━━━━━━━━
📋 *Invoice:* #${invoiceNumber}
👤 *Customer:* ${address.fullName}
📱 *Phone:* +91 ${cleanPhone}
📍 *Delivery Address:* ${address.villageOrColony}, ${address.tehsilOrTown} (PIN: ${address.pincode || "483501"})
💳 *Payment Mode:* ${payMode}
━━━━━━━━━━━━━━━━━━━━
🛒 *Items Ordered:*
${itemsText}
━━━━━━━━━━━━━━━━━━━━
💰 *Total Amount:* ₹${verifiedSubtotal}
━━━━━━━━━━━━━━━━━━━━
⚡ *Action:* Shopkeeper please open ERP to accept and pack this order.`;

    const whatsappUrl = `https://wa.me/${SHOP_OWNER_WHATSAPP}?text=${encodeURIComponent(whatsappMessage)}`;

    return NextResponse.json({
      success: true,
      order: {
        orderId: saleId,
        invoiceNumber,
        createdAt: newSale.created_at || new Date().toISOString(),
        totalAmount: verifiedSubtotal,
        itemCount: verifiedItems.reduce((acc, it) => acc + it.quantity, 0),
        status: "received",
        items: verifiedItems,
        address,
        paymentMethod,
      },
      whatsappUrl,
    });
  } catch (err: any) {
    console.error("Storefront checkout API error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to process order." }, { status: 500 });
  }
}
