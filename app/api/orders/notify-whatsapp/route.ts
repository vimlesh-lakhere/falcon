import { NextResponse } from "next/server";

const SHOP_OWNER_WHATSAPP = process.env.NEXT_PUBLIC_SHOP_WHATSAPP || "919340362381";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { order, customer, items, totalAmount, paymentMethod, address } = body;

    if (!order && !items) {
      return NextResponse.json({ error: "Missing order data" }, { status: 400 });
    }

    const invNum = order?.invoiceNumber || order?.invoice_number || `ORD-${Date.now().toString().slice(-6)}`;
    const custName = address?.fullName || customer?.name || "Customer";
    const custPhone = address?.mobileNumber || customer?.phone || "N/A";
    const village = address?.villageOrColony || customer?.address || "Local Area";
    const town = address?.tehsilOrTown || "";
    const pin = address?.pincode || "483501";
    const payMode = paymentMethod === "upi" ? "📲 UPI Online (PhonePe)" : "💵 Cash on Delivery (COD)";

    const itemsText = (items || [])
      .map(
        (it: any, idx: number) =>
          `${idx + 1}. *${it.productName || it.name || "Item"}* x ${it.quantity} = ₹${(Number(it.price || it.selling_price) || 0) * it.quantity}`
      )
      .join("\n");

    const message = `🛍️ *NEW ONLINE ORDER RECEIVED - AGS STORE*
━━━━━━━━━━━━━━━━━━━━
📋 *Invoice:* #${invNum}
👤 *Customer:* ${custName}
📱 *Phone:* +91 ${custPhone}
📍 *Delivery Address:* ${village}, ${town} (PIN: ${pin})
💳 *Payment Mode:* ${payMode}
━━━━━━━━━━━━━━━━━━━━
🛒 *Items Ordered:*
${itemsText}
━━━━━━━━━━━━━━━━━━━━
💰 *Total Amount:* ₹${totalAmount || order?.totalAmount || 0}
━━━━━━━━━━━━━━━━━━━━
⚡ *Action:* Shopkeeper please open ERP to accept and pack this order.`;

    const whatsappUrl = `https://wa.me/${SHOP_OWNER_WHATSAPP}?text=${encodeURIComponent(message)}`;

    // If third-party WhatsApp Gateway API is configured in environment
    if (process.env.WHATSAPP_GATEWAY_URL && process.env.WHATSAPP_API_TOKEN) {
      try {
        await fetch(process.env.WHATSAPP_GATEWAY_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
          },
          body: JSON.stringify({
            receiver: SHOP_OWNER_WHATSAPP,
            message: message,
          }),
        });
      } catch (gatewayErr) {
        console.warn("WhatsApp Gateway dispatch error:", gatewayErr);
      }
    }

    return NextResponse.json({
      success: true,
      whatsappUrl,
      shopPhone: SHOP_OWNER_WHATSAPP,
      message,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate WhatsApp notification" }, { status: 500 });
  }
}
