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
  async placeOrder(payload: PlaceOrderPayload): Promise<{ 
    success: boolean; 
    order?: StoredOrderSummary; 
    whatsappUrl?: string;
    error?: string;
  }> {
    const { shopId, cart, address, paymentMethod, upiReference, notes } = payload;

    if (!cart || cart.length === 0) {
      return { success: false, error: "Cart is empty" };
    }

    try {
      const response = await fetch("/api/store/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shopId,
          cart: cart.map((it) => ({
            product: {
              id: it.product.id,
              name: it.product.name,
              selling_price: Number(it.product.selling_price) || 0,
              image_url: it.product.image_url,
            },
            quantity: it.quantity,
          })),
          address,
          paymentMethod,
          upiReference,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Failed to process order on server.",
        };
      }

      return {
        success: true,
        order: data.order,
        whatsappUrl: data.whatsappUrl,
      };
    } catch (err: any) {
      console.error("Failed to place online order:", err);
      return { success: false, error: err.message || "Network error. Please try again." };
    }
  },
};
