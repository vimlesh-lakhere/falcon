import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product } from "@/types/database";

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: string;
}

export interface CustomerAddress {
  fullName: string;
  mobileNumber: string;
  villageOrColony: string;
  tehsilOrTown: string;
  landmark: string;
  pincode: string;
  deliveryNotes?: string;
}

export interface CustomerUser {
  id?: string;
  name: string;
  phone: string;
  address?: CustomerAddress | null;
}

export interface StoredOrderSummary {
  orderId: string;
  invoiceNumber: string;
  createdAt: string;
  totalAmount: number;
  itemCount: number;
  status: "received" | "confirmed" | "packing" | "out_for_delivery" | "delivered";
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    imageUrl?: string | null;
  }[];
  address: CustomerAddress;
  paymentMethod: "cod" | "upi";
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
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
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
          const existingIndex = state.cart.findIndex(
            (item) => item.product.id === product.id && item.selectedVariant === variant
          );

          if (existingIndex > -1) {
            const updatedCart = [...state.cart];
            updatedCart[existingIndex].quantity += quantity;
            return { cart: updatedCart, isCartOpen: true };
          }

          return {
            cart: [...state.cart, { product, quantity, selectedVariant: variant }],
            isCartOpen: true,
          };
        });
      },

      removeFromCart: (productId) => {
        set((state) => ({
          cart: state.cart.filter((item) => item.product.id !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            return {
              cart: state.cart.filter((item) => item.product.id !== productId),
            };
          }

          return {
            cart: state.cart.map((item) =>
              item.product.id === productId ? { ...item, quantity } : item
            ),
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
          const price = Number(item.product.selling_price) || 0;
          const mrp = Number((item.product as any).mrp) || price;
          const qty = item.quantity;

          subtotal += price * qty;
          mrpTotal += mrp * qty;
          itemCount += qty;
        });

        const totalSavings = Math.max(0, mrpTotal - subtotal);
        return {
          subtotal,
          totalSavings,
          finalTotal: subtotal,
          itemCount,
        };
      },
    }),
    {
      name: "ags_customer_cart_storage",
    }
  )
);
