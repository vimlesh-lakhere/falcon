import { createClient } from "@/lib/supabase/client";
import { CartItem, CustomerAddress, StoredOrderSummary } from "@/store/useStoreCart";

export interface PlaceOrderPayload {
  shopId: string;
  cart: CartItem[];
  address: CustomerAddress;
  paymentMethod: "cod" | "upi";
  upiReference?: string;
  notes?: string;
}

export const storeOrderService = {
  async placeOrder(payload: PlaceOrderPayload): Promise<{ success: boolean; order?: StoredOrderSummary; error?: string }> {
    const supabase = createClient();
    const { shopId, cart, address, paymentMethod, upiReference, notes } = payload;

    if (!cart || cart.length === 0) {
      return { success: false, error: "Cart is empty" };
    }

    try {
      // 1. Calculate totals
      let subtotal = 0;
      cart.forEach((item) => {
        subtotal += (Number(item.product.selling_price) || 0) * item.quantity;
      });

      const invoiceNumber = `ORD-${Date.now().toString().slice(-6)}`;

      // 2. Find or Create Customer record in Supabase
      let customerId: string | null = null;
      try {
        const cleanPhone = address.mobileNumber.replace(/[^0-9]/g, "");
        const { data: existingCust } = await supabase
          .from("customers")
          .select("id")
          .eq("shop_id", shopId)
          .eq("phone", cleanPhone)
          .maybeSingle();

        if (existingCust) {
          customerId = existingCust.id;
        } else {
          const fullAddressText = `${address.villageOrColony}, ${address.tehsilOrTown} (Landmark: ${address.landmark || "N/A"}) - PIN: ${address.pincode}`;
          const { data: newCust } = await supabase
            .from("customers")
            .insert([
              {
                shop_id: shopId,
                name: address.fullName,
                phone: cleanPhone,
                address: fullAddressText,
                total_spend: 0,
                outstanding_balance: 0,
                notes: `Online Store Customer from ${address.villageOrColony}`,
              },
            ])
            .select()
            .single();

          if (newCust) {
            customerId = newCust.id;
          }
        }
      } catch (custErr) {
        console.warn("Customer linking skipped:", custErr);
      }

      // 3. Create Sale / Order record in Supabase
      const upiNoteStr = upiReference ? ` [UPI UTR/Ref: ${upiReference}]` : "";
      const deliveryAddressNotes = `[Online Order - ${paymentMethod.toUpperCase()}${upiNoteStr}] Deliver to: ${address.fullName}, Phone: ${address.mobileNumber}, Village/Colony: ${address.villageOrColony}, Tehsil: ${address.tehsilOrTown}, Landmark: ${address.landmark || "N/A"}, PIN: ${address.pincode}. Customer Note: ${address.deliveryNotes || "None"}`;

      const { data: newSale, error: saleError } = await supabase
        .from("sales")
        .insert([
          {
            shop_id: shopId,
            invoice_number: invoiceNumber,
            customer_id: customerId,
            subtotal,
            discount_amount: 0,
            tax_amount: 0,
            total_amount: subtotal,
            status: "received", // Customer online order pending shop owner review
            notes: deliveryAddressNotes,
          },
        ])
        .select()
        .single();

      if (saleError) {
        console.error("Sale insert error:", saleError);
      }

      const saleId = newSale?.id || `local-${Date.now()}`;

      // If paid via UPI, record the payment transaction
      if (paymentMethod === "upi" && newSale?.id) {
        try {
          await supabase.from("payments").insert([
            {
              sale_id: newSale.id,
              method: "upi",
              amount: subtotal,
              reference_no: upiReference || `PhonePe QR: 9340362381@ybl`,
            },
          ]);
        } catch (payErr) {
          console.warn("Payment insert non-blocking warning:", payErr);
        }
      }
      for (const item of cart) {
        const itemPrice = Number(item.product.selling_price) || 0;

        // Log Sale Item
        try {
          await supabase.from("sale_items").insert([
            {
              sale_id: saleId,
              product_id: item.product.id,
              quantity: item.quantity,
              unit_price: itemPrice,
              subtotal: itemPrice * item.quantity,
              total: itemPrice * item.quantity,
            },
          ]);
        } catch (e) {
          // Continue even if table differs
        }

        // Deduct inventory movement
        try {
          await supabase.from("stock_movements").insert([
            {
              shop_id: shopId,
              product_id: item.product.id,
              movement_type: "sale",
              quantity_delta: -item.quantity,
              reference_table: "sales",
              reference_id: saleId,
              notes: `Online Storefront Order #${invoiceNumber}`,
            },
          ]);
        } catch (e) {
          // Non-blocking
        }
      }

      const orderSummary: StoredOrderSummary = {
        orderId: saleId,
        invoiceNumber,
        createdAt: new Date().toISOString(),
        totalAmount: subtotal,
        itemCount: cart.reduce((acc, it) => acc + it.quantity, 0),
        status: "received",
        items: cart.map((it) => ({
          productId: it.product.id,
          productName: it.product.name,
          quantity: it.quantity,
          price: Number(it.product.selling_price) || 0,
          imageUrl: it.product.image_url,
        })),
        address,
        paymentMethod,
      };

      return { success: true, order: orderSummary };
    } catch (err: any) {
      console.error("Failed to place online order:", err);
      return { success: false, error: err.message || "Failed to place order" };
    }
  },
};
