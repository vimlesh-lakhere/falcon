import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product } from "@/types/database";
import { getStorefrontItemPrice } from "@/lib/units-pricing";

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: string;
  itemKey?: string;
}

export function getCartItemKey(productId: string, variant?: string): string {
  return `${productId}___${(variant || "default").trim()}`;
}

export interface CustomerAddress {
  fullName: string;
  mobileNumber: string;
  villageOrColony: string;
  tehsilOrTown: string;
  landmark: string;
  pincode: string;
  deliveryNotes?: string;
  latitude?: number;
  longitude?: number;
  mapAddress?: string;
}

export interface CustomerUser {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  isVerified?: boolean;
  authProvider?: "google" | "otp" | "phone";
  address?: CustomerAddress | null;
}

export interface StoredOrderSummary {
  orderId: string;
  invoiceNumber: string;
  createdAt: string;
  totalAmount: number;
  itemCount: number;
  status: "received" | "confirmed" | "packing" | "out_for_delivery" | "delivered" | "completed";
  orderType?: "online" | "in_store";
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    imageUrl?: string | null;
    variant?: string;
  }[];
  address: CustomerAddress;
  paymentMethod: "cod" | "upi" | "cash";
}

interface StoreCartState {
  cart: CartItem[];
  wishlist: string[]; // Product IDs
  isCartOpen: boolean;
  savedAddress: CustomerAddress | null;
  recentOrders: StoredOrderSummary[];
  customerUser: CustomerUser | null;

  // Actions
  addToCart: (product: Product, quantity?: number, variant?: string) => void;
  removeFromCart: (keyOrProductId: string, variant?: string) => void;
  updateQuantity: (keyOrProductId: string, quantity: number, variant?: string) => void;
  clearCart: () => void;
  setIsCartOpen: (open: boolean) => void;

  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;

  setSavedAddress: (address: CustomerAddress) => void;
  addRecentOrder: (order: StoredOrderSummary) => void;
  loginCustomer: (user: CustomerUser) => void;
  logoutCustomer: () => void;
  getCartTotal: () => { subtotal: number; totalSavings: number; finalTotal: number; itemCount: number };
}

export const useStoreCart = create<StoreCartState>()(
  persist(
    (set, get) => ({
      cart: [],
      wishlist: [],
      isCartOpen: false,
      savedAddress: null,
      recentOrders: [],
      customerUser: null,

      addToCart: (product, quantity = 1, variant) => {
        set((state) => {
          const itemKey = getCartItemKey(product.id, variant);
          const existingIndex = state.cart.findIndex(
            (item) => (item.itemKey ? item.itemKey === itemKey : item.product.id === product.id && item.selectedVariant === variant)
          );

          if (existingIndex > -1) {
            const updatedCart = [...state.cart];
            updatedCart[existingIndex].quantity += quantity;
            updatedCart[existingIndex].itemKey = itemKey;
            return { cart: updatedCart };
          }

          return {
            cart: [...state.cart, { product, quantity, selectedVariant: variant, itemKey }],
          };
        });
      },

      removeFromCart: (keyOrProductId: string, variant?: string) => {
        set((state) => ({
          cart: state.cart.filter((item) => {
            if (item.itemKey && item.itemKey === keyOrProductId) return false;
            if (variant !== undefined) {
              return !(item.product.id === keyOrProductId && item.selectedVariant === variant);
            }
            if (item.itemKey && item.itemKey === getCartItemKey(keyOrProductId, item.selectedVariant)) {
              return false;
            }
            return item.product.id !== keyOrProductId;
          }),
        }));
      },

      updateQuantity: (keyOrProductId: string, quantity: number, variant?: string) => {
        set((state) => {
          if (quantity <= 0) {
            return {
              cart: state.cart.filter((item) => {
                if (item.itemKey && item.itemKey === keyOrProductId) return false;
                if (variant !== undefined) {
                  return !(item.product.id === keyOrProductId && item.selectedVariant === variant);
                }
                return item.product.id !== keyOrProductId;
              }),
            };
          }

          return {
            cart: state.cart.map((item) => {
              const matches =
                (item.itemKey && item.itemKey === keyOrProductId) ||
                (variant !== undefined
                  ? item.product.id === keyOrProductId && item.selectedVariant === variant
                  : item.product.id === keyOrProductId);

              return matches
                ? { ...item, quantity, itemKey: item.itemKey || getCartItemKey(item.product.id, item.selectedVariant) }
                : item;
            }),
          };
        });
      },

      clearCart: () => set({ cart: [] }),
      setIsCartOpen: (open) => set({ isCartOpen: open }),

      toggleWishlist: (productId) => {
        set((state) => {
          const exists = state.wishlist.includes(productId);
          return {
            wishlist: exists
              ? state.wishlist.filter((id) => id !== productId)
              : [...state.wishlist, productId],
          };
        });
      },

      isInWishlist: (productId) => get().wishlist.includes(productId),

      setSavedAddress: (address) => set({ savedAddress: address }),

      addRecentOrder: (order) => {
        set((state) => ({
          recentOrders: [order, ...state.recentOrders].slice(0, 30),
        }));
      },

      loginCustomer: (user) => {
        set({
          customerUser: user,
          savedAddress: user.address || get().savedAddress,
        });
      },

      logoutCustomer: () => {
        set({ customerUser: null });
      },

      getCartTotal: () => {
        const { cart } = get();
        let subtotal = 0;
        let mrpTotal = 0;
        let itemCount = 0;

        cart.forEach((item) => {
          const qty = item.quantity;
          const effective = getStorefrontItemPrice(item.product, qty);

          subtotal += effective.unitPrice * qty;
          // Use the same "was" price the line shows, so savings match what the customer sees.
          mrpTotal += effective.originalPrice * qty;
          itemCount += qty;
        });

        const totalSavings = Math.max(0, mrpTotal - subtotal);
        return {
          subtotal: Number(subtotal.toFixed(2)),
          totalSavings: Number(totalSavings.toFixed(2)),
          finalTotal: Number(subtotal.toFixed(2)),
          itemCount,
        };
      },
    }),
    {
      name: "ags_customer_cart_storage",
    }
  )
);
