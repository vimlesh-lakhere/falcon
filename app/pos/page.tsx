"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  Banknote,
  QrCode,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  Printer,
  Sparkles,
  Flame,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  ShoppingCart,
  Wifi,
  WifiOff,
  Camera,
  CloudUpload,
  Layers,
  Mic,
  MicOff,
  Zap,
  Package,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase/client";
import { productsRepository } from "@/repositories/products.repo";
import { customersRepository } from "@/repositories/customers.repo";
import { posRepository, CheckoutPayload } from "@/repositories/pos.repo";
import { Product, Category, Customer, Sale } from "@/types/database";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { offlinePosEngine } from "@/lib/offline-pos";
import { ThermalReceipt } from "@/components/pos/ThermalReceipt";
import { PosCustomerSelector } from "@/components/pos/PosCustomerSelector";
import { WhatsAppInvoiceModal } from "@/components/pos/WhatsAppInvoiceModal";
import { CameraBarcodeScanner, ScanFeedback } from "@/components/pos/CameraBarcodeScanner";
import { PosQuickAddModal } from "@/components/pos/PosQuickAddModal";
import { PosCategoryRightRail } from "@/components/pos/PosCategoryRightRail";
import { PosCategorySidebar } from "@/components/pos/PosCategorySidebar";
import { PrinterSettingsTab } from "@/components/settings/PrinterSettingsTab";
import {
  UnitKey,
  STANDARD_UNITS,
  calculateDefaultUnitPrice,
  formatItemQuantityAndUnit,
  getBaseQuantity,
  getProductPricingSummary,
} from "@/lib/units-pricing";

const SHOP_ID = process.env.DEFAULT_SHOP_ID || "a0000000-0000-0000-0000-000000000001";

// Persistent LocalStorage keys for POS state resilience across page navigation/refresh
const POS_CART_STORAGE_KEY = "falcon_pos_active_cart";
const POS_CUSTOMER_STORAGE_KEY = "falcon_pos_active_customer";
const POS_DISCOUNT_STORAGE_KEY = "falcon_pos_active_discount";
const POS_HELD_BILLS_STORAGE_KEY = "falcon_pos_held_bills";

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  isPriceOverridden: boolean;
  unit: UnitKey;
  unitName: string;
  unitMultiplier: number;
}

interface HeldBill {
  id: string;
  label: string;
  customer: Customer | null;
  items: CartItem[];
  discountAmount: number;
  subtotal: number;
  totalAmount: number;
  timestamp: number;
}

export default function PosBillingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerPrices, setCustomerPrices] = useState<Record<string, number>>({});

  // Online / Offline & Sync state
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOfflineBills, setPendingOfflineBills] = useState(0);
  const [isSyncingBills, setIsSyncingBills] = useState(false);

  // Camera Barcode Scanner
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);

  // Printer Settings Modal
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);

  // POS Quick Add Product Modal
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Held Bills Modal
  const [isHeldBillsModalOpen, setIsHeldBillsModalOpen] = useState(false);
  const [heldBillToast, setHeldBillToast] = useState<string>("");

  // Mobile Category Sidebar Drawer
  const [isMobileCategoryDrawerOpen, setIsMobileCategoryDrawerOpen] = useState(false);

  // Product Sort Mode & Sales Velocity
  const [sortMode, setSortMode] = useState<"top_selling" | "name_asc" | "price_asc" | "newest">("top_selling");
  const [productSalesCount, setProductSalesCount] = useState<Record<string, number>>({});

  // Cart state & Persistence
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0); // e.g. 0% or 18%
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [isRestoredToast, setIsRestoredToast] = useState<boolean>(false);
  const isHydratedRef = useRef(false);

  // Checkout modal
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card" | "split">("cash");
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [upiAmount, setUpiAmount] = useState<number>(0);
  const [cardAmount, setCardAmount] = useState<number>(0);
  const [paymentRef, setPaymentRef] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Success Receipt modal
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Mobile Active Tab (Catalog vs Cart)
  const [mobileTab, setMobileTab] = useState<"catalog" | "cart">("catalog");

  // Voice Search State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const toggleVoiceSearch = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser. Please use Chrome browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "hi-IN"; // Supports Hindi and Indian English product names
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const spokenText = event.results?.[0]?.[0]?.transcript;
        if (spokenText) {
          const clean = spokenText.trim();
          setSearchQuery(clean);

          // If single exact match is found, add directly
          const matched = products.find(
            (p) =>
              p.name.toLowerCase() === clean.toLowerCase() ||
              p.barcode?.toLowerCase() === clean.toLowerCase()
          );
          if (matched) {
            addToCart(matched, "piece", 1);
          }
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Could not start speech recognition", err);
      setIsListening(false);
    }
  };

  // 1. Restore Cart & POS State from LocalStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(POS_CART_STORAGE_KEY);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
          setIsRestoredToast(true);
          setTimeout(() => setIsRestoredToast(false), 4500);
        }
      }
      const savedCust = localStorage.getItem(POS_CUSTOMER_STORAGE_KEY);
      if (savedCust) {
        setSelectedCustomer(JSON.parse(savedCust));
      }
      const savedDisc = localStorage.getItem(POS_DISCOUNT_STORAGE_KEY);
      if (savedDisc) {
        setDiscountAmount(Number(savedDisc) || 0);
      }
      const savedHeld = localStorage.getItem(POS_HELD_BILLS_STORAGE_KEY);
      if (savedHeld) {
        const parsedHeld = JSON.parse(savedHeld);
        if (Array.isArray(parsedHeld)) {
          setHeldBills(parsedHeld);
        }
      }
    } catch (e) {
      console.warn("Could not load POS session from localStorage:", e);
    } finally {
      isHydratedRef.current = true;
    }
  }, []);

  // 2. Auto-save Cart to LocalStorage on changes
  useEffect(() => {
    if (!isHydratedRef.current) return;
    try {
      if (cart.length > 0) {
        localStorage.setItem(POS_CART_STORAGE_KEY, JSON.stringify(cart));
      } else {
        localStorage.removeItem(POS_CART_STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Failed to auto-save POS cart:", e);
    }
  }, [cart]);

  // 3. Auto-save Customer to LocalStorage on changes
  useEffect(() => {
    if (!isHydratedRef.current) return;
    try {
      if (selectedCustomer) {
        localStorage.setItem(POS_CUSTOMER_STORAGE_KEY, JSON.stringify(selectedCustomer));
      } else {
        localStorage.removeItem(POS_CUSTOMER_STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Failed to auto-save POS customer:", e);
    }
  }, [selectedCustomer]);

  // 4. Auto-save Discount to LocalStorage
  useEffect(() => {
    if (!isHydratedRef.current) return;
    try {
      if (discountAmount > 0) {
        localStorage.setItem(POS_DISCOUNT_STORAGE_KEY, discountAmount.toString());
      } else {
        localStorage.removeItem(POS_DISCOUNT_STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Failed to auto-save POS discount:", e);
    }
  }, [discountAmount]);

  // 5. Auto-save Held Bills to LocalStorage
  useEffect(() => {
    if (!isHydratedRef.current) return;
    try {
      if (heldBills.length > 0) {
        localStorage.setItem(POS_HELD_BILLS_STORAGE_KEY, JSON.stringify(heldBills));
      } else {
        localStorage.removeItem(POS_HELD_BILLS_STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Failed to auto-save POS held bills:", e);
    }
  }, [heldBills]);

  // 6. Warn if user attempts to close browser tab with items in cart
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (cart.length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [cart.length]);

  // 7. Mobile Tab Switching with History State Management (Prevents app exit on Android/Browser Back)
  const changeMobileTab = (tab: "catalog" | "cart") => {
    if (tab === mobileTab) return;
    if (tab === "cart") {
      try {
        window.history.pushState({ posView: "cart" }, "");
      } catch (e) {
        console.warn("Could not push history state:", e);
      }
    } else {
      if (window.history.state?.posView === "cart") {
        window.history.back();
        return;
      }
    }
    setMobileTab(tab);
  };

  // 8. Handle Android/Browser Back Button (popstate) to return to Products rather than exiting app
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // If any modal is open, close modal first
      if (isCheckoutModalOpen) {
        setIsCheckoutModalOpen(false);
        return;
      }
      if (isCameraScannerOpen) {
        setIsCameraScannerOpen(false);
        return;
      }
      if (isMobileCategoryDrawerOpen) {
        setIsMobileCategoryDrawerOpen(false);
        return;
      }
      if (isQuickAddOpen) {
        setIsQuickAddOpen(false);
        return;
      }
      if (isPrinterModalOpen) {
        setIsPrinterModalOpen(false);
        return;
      }
      if (isReceiptModalOpen) {
        setIsReceiptModalOpen(false);
        return;
      }

      // If user was on Cart view on mobile, safely return to product catalog matrix
      setMobileTab("catalog");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [
    isCheckoutModalOpen,
    isCameraScannerOpen,
    isMobileCategoryDrawerOpen,
    isQuickAddOpen,
    isPrinterModalOpen,
    isReceiptModalOpen,
  ]);

  // Network listener & offline sync count
  useEffect(() => {
    setIsOnline(navigator.onLine);
    setPendingOfflineBills(offlinePosEngine.getPendingCount());

    const handleOnline = () => {
      setIsOnline(true);
      handleSyncOfflineBills();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleSyncOfflineBills = async () => {
    if (!navigator.onLine || isSyncingBills) return;
    setIsSyncingBills(true);
    try {
      await offlinePosEngine.syncPendingBills();
      setPendingOfflineBills(offlinePosEngine.getPendingCount());
    } catch (e) {
      console.warn("Offline sync error:", e);
    } finally {
      setIsSyncingBills(false);
    }
  };

  // Load catalog data (with offline cache fallback & sales count)
  const loadCatalog = async () => {
    try {
      const [prods, cats, custs] = await Promise.all([
        productsRepository.getAll(SHOP_ID, { isActive: true }),
        productsRepository.getCategories(SHOP_ID),
        customersRepository.getAll(SHOP_ID),
      ]);
      setProducts(prods);
      setCategories(cats);
      setCustomers(custs);

      // Cache locally for offline use
      offlinePosEngine.cacheCatalog(prods);
      offlinePosEngine.cacheCategories(cats);
      offlinePosEngine.cacheCustomers(custs);

      // Fetch sales stats to compute top selling items
      try {
        const { data: salesStats } = await supabase
          .from("sale_items")
          .select("product_id, quantity");
        if (salesStats && salesStats.length > 0) {
          const counts: Record<string, number> = {};
          salesStats.forEach((s: any) => {
            if (s.product_id) {
              counts[s.product_id] = (counts[s.product_id] || 0) + Number(s.quantity || 1);
            }
          });
          setProductSalesCount(counts);
          offlinePosEngine.cacheSalesStats(counts);
        }
      } catch (e) {
        console.warn("Could not load sales count stats:", e);
        setProductSalesCount(offlinePosEngine.getCachedSalesStats());
      }
    } catch (err) {
      console.warn("Online catalog load failed, loading from offline cache:", err);
      const cachedProds = offlinePosEngine.getCachedCatalog();
      const cachedCats = offlinePosEngine.getCachedCategories();
      const cachedCusts = offlinePosEngine.getCachedCustomers();
      const cachedStats = offlinePosEngine.getCachedSalesStats();

      if (cachedProds.length > 0) setProducts(cachedProds);
      if (cachedCats.length > 0) setCategories(cachedCats);
      if (cachedCusts.length > 0) setCustomers(cachedCusts);
      if (Object.keys(cachedStats).length > 0) setProductSalesCount(cachedStats);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  // Load custom customer pricing when customer is selected
  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerPrices({});
      return;
    }
    const loadPrices = async () => {
      try {
        const prices = await customersRepository.getCustomerPrices(selectedCustomer.id);
        const map: Record<string, number> = {};
        prices.forEach((p: any) => {
          map[p.product_id] = Number(p.price);
        });
        setCustomerPrices(map);

        // Update existing cart prices if applicable
        setCart((prevCart) =>
          prevCart.map((item) => {
            const custom = map[item.product.id];
            if (custom !== undefined) {
              return { ...item, unitPrice: custom, isPriceOverridden: true };
            }
            return item;
          })
        );
      } catch (err) {
        console.error(err);
      }
    };
    loadPrices();
  }, [selectedCustomer]);

  // Hardware Barcode Scanner global listener (USB/Bluetooth)
  const barcodeBufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is currently inside a modal
      if (isCheckoutModalOpen || isReceiptModalOpen) return;

      const target = e.target as HTMLElement | null;
      const isInputFocused = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // If time between keystrokes is more than 60ms, reset buffer (it's manual human typing)
      if (timeDiff > 60) {
        barcodeBufferRef.current = "";
      }

      if (e.key === "Enter") {
        const scannedCode = barcodeBufferRef.current.trim();
        if (scannedCode.length >= 3) {
          const matched = products.find(
            (p) =>
              p.barcode?.toLowerCase() === scannedCode.toLowerCase() ||
              p.sku?.toLowerCase() === scannedCode.toLowerCase()
          );

          if (matched) {
            e.preventDefault();
            addToCart(matched);
            barcodeBufferRef.current = "";
            if (isInputFocused && target instanceof HTMLInputElement) {
              target.value = "";
              setSearchQuery("");
            }
            return;
          }
        }
        barcodeBufferRef.current = "";
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [products, isCheckoutModalOpen, isReceiptModalOpen]);

  // Barcode / Search auto-matching
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check exact barcode or SKU match first
    const matched = products.find(
      (p) =>
        p.barcode?.toLowerCase() === searchQuery.trim().toLowerCase() ||
        p.sku?.toLowerCase() === searchQuery.trim().toLowerCase() ||
        p.name.toLowerCase() === searchQuery.trim().toLowerCase()
    );

    if (matched) {
      addToCart(matched, "piece", 1);
      setSearchQuery("");
    } else {
      // If not found, open Quick Add with pre-filled search term
      setIsQuickAddOpen(true);
    }
  };

  // Add product to cart with Unit support (Atomic functional state update)
  const addToCart = (product: Product, unitKey: UnitKey = "piece", initialQty: number = 1) => {
    // Subtle mobile haptic feedback on add
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(20);
      } catch {}
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) => item.product.id === product.id && item.unit === unitKey
      );
      const customPrice = customerPrices[product.id];
      const unitPrice =
        customPrice !== undefined && unitKey === "piece"
          ? customPrice
          : calculateDefaultUnitPrice(product, unitKey);

      const unitDef = STANDARD_UNITS[unitKey] || STANDARD_UNITS.piece;

      if (existingIndex > -1) {
        const updated = [...prevCart];
        const existingItem = updated[existingIndex];
        updated[existingIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + initialQty,
        };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            product,
            quantity: initialQty,
            unitPrice,
            originalPrice: unitPrice,
            isPriceOverridden: customPrice !== undefined && unitKey === "piece",
            unit: unitKey,
            unitName: unitDef.shortName,
            unitMultiplier: unitDef.multiplier,
          },
        ];
      }
    });
  };

  // Switch unit on an existing cart item (e.g. from Piece to Dozen)
  const updateCartItemUnit = (index: number, newUnit: UnitKey) => {
    setCart((prevCart) => {
      if (index < 0 || index >= prevCart.length) return prevCart;
      const updated = [...prevCart];
      const item = updated[index];
      const unitDef = STANDARD_UNITS[newUnit] || STANDARD_UNITS.piece;
      const newPrice = calculateDefaultUnitPrice(item.product, newUnit);

      updated[index] = {
        ...item,
        unit: newUnit,
        unitName: unitDef.shortName,
        unitMultiplier: unitDef.multiplier,
        unitPrice: newPrice,
        originalPrice: newPrice,
        isPriceOverridden: false,
      };
      return updated;
    });
  };

  // Handle successful POS Quick Add
  const handleQuickAddSuccess = (newProduct: Product, selectedUnit: UnitKey, qty: number) => {
    setProducts((prev) => [newProduct, ...prev]);
    offlinePosEngine.cacheCatalog([newProduct, ...products]);
    addToCart(newProduct, selectedUnit, qty);
    setSearchQuery("");
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart((prevCart) => {
      if (index < 0 || index >= prevCart.length) return prevCart;
      const updated = [...prevCart];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        updated.splice(index, 1);
      } else {
        updated[index] = {
          ...updated[index],
          quantity: newQty,
        };
      }
      return updated;
    });
  };

  const updatePriceOverride = (index: number, newPrice: number) => {
    setCart((prevCart) => {
      if (index < 0 || index >= prevCart.length) return prevCart;
      const updated = [...prevCart];
      updated[index] = {
        ...updated[index],
        unitPrice: Math.max(0, newPrice),
        isPriceOverridden: true,
      };
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setCart((prevCart) => {
      if (index < 0 || index >= prevCart.length) return prevCart;
      const updated = [...prevCart];
      updated.splice(index, 1);
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setSelectedCustomer(null);
    try {
      localStorage.removeItem(POS_CART_STORAGE_KEY);
      localStorage.removeItem(POS_CUSTOMER_STORAGE_KEY);
      localStorage.removeItem(POS_DISCOUNT_STORAGE_KEY);
    } catch (e) {
      console.warn("Could not clear POS cart from storage:", e);
    }
  };

  // Hold & Park Current Bill
  const handleHoldBill = (customLabel?: string) => {
    if (cart.length === 0) return;

    const billSubtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const billTax = (billSubtotal - discountAmount) * (taxRate / 100);
    const billTotal = Math.max(0, billSubtotal - discountAmount + billTax);
    const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
    const label =
      customLabel ||
      (selectedCustomer?.name
        ? `${selectedCustomer.name}`
        : `Bill #${heldBills.length + 1} (${totalItems} items)`);

    const newHeld: HeldBill = {
      id: Date.now().toString(),
      label,
      customer: selectedCustomer,
      items: cart,
      discountAmount,
      subtotal: billSubtotal,
      totalAmount: billTotal,
      timestamp: Date.now(),
    };

    setHeldBills((prev) => [newHeld, ...prev]);
    clearCart();
    setHeldBillToast(`⏸️ "${label}" parked (₹${billTotal.toFixed(2)})`);
    setTimeout(() => setHeldBillToast(""), 4500);
    if (mobileTab === "cart") {
      setMobileTab("catalog");
    }
  };

  // Resume or Switch to a Held Bill (Auto-parks current active cart if it has items!)
  const handleResumeBill = (held: HeldBill) => {
    // If current cart has items, park it first so user doesn't lose anything
    if (cart.length > 0) {
      const currentSubtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const currentTax = (currentSubtotal - discountAmount) * (taxRate / 100);
      const currentTotal = Math.max(0, currentSubtotal - discountAmount + currentTax);
      const currentItems = cart.reduce((s, i) => s + i.quantity, 0);
      const currentLabel = selectedCustomer?.name
        ? `${selectedCustomer.name}`
        : `Parked Bill (${currentItems} items)`;

      const currentHeld: HeldBill = {
        id: (Date.now() + 1).toString(),
        label: currentLabel,
        customer: selectedCustomer,
        items: cart,
        discountAmount,
        subtotal: currentSubtotal,
        totalAmount: currentTotal,
        timestamp: Date.now(),
      };

      setHeldBills((prev) => [currentHeld, ...prev.filter((b) => b.id !== held.id)]);
    } else {
      setHeldBills((prev) => prev.filter((b) => b.id !== held.id));
    }

    setCart(held.items);
    setSelectedCustomer(held.customer);
    setDiscountAmount(held.discountAmount || 0);
    setIsHeldBillsModalOpen(false);

    setHeldBillToast(`▶️ Resumed: "${held.label}" (₹${(held.totalAmount || 0).toFixed(2)})`);
    setTimeout(() => setHeldBillToast(""), 4500);
  };

  // Discard a Held Bill
  const handleDeleteHeldBill = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setHeldBills((prev) => prev.filter((b) => b.id !== id));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
  const totalAmount = Math.max(0, subtotal - discountAmount + taxAmount);

  // Open checkout modal
  const handleOpenCheckout = (methodOrEvent?: "cash" | "upi" | "card" | "split" | React.MouseEvent) => {
    if (cart.length === 0) return;
    const method: "cash" | "upi" | "card" | "split" =
      typeof methodOrEvent === "string" && ["cash", "upi", "card", "split"].includes(methodOrEvent)
        ? (methodOrEvent as "cash" | "upi" | "card" | "split")
        : "cash";

    setPaymentMethod(method);
    if (method === "cash") {
      setCashAmount(totalAmount);
      setUpiAmount(0);
      setCardAmount(0);
    } else if (method === "upi") {
      setUpiAmount(totalAmount);
      setCashAmount(0);
      setCardAmount(0);
    } else {
      setCashAmount(totalAmount);
      setUpiAmount(0);
      setCardAmount(0);
    }
    setIsCheckoutModalOpen(true);
  };

  // Submit checkout
  const handleCompleteCheckout = async () => {
    try {
      setIsProcessing(true);

      const payments: CheckoutPayload["payments"] = [];
      if (paymentMethod === "cash") {
        payments.push({ method: "cash", amount: totalAmount });
      } else if (paymentMethod === "upi") {
        payments.push({ method: "upi", amount: totalAmount, reference_no: paymentRef });
      } else if (paymentMethod === "card") {
        payments.push({ method: "card", amount: totalAmount, reference_no: paymentRef });
      } else if (paymentMethod === "split") {
        if (cashAmount > 0) payments.push({ method: "cash", amount: cashAmount });
        if (upiAmount > 0) payments.push({ method: "upi", amount: upiAmount, reference_no: paymentRef });
        if (cardAmount > 0) payments.push({ method: "card", amount: cardAmount });
      }

      // Snapshot customer before state reset
      const customerSnapshot = selectedCustomer;

      const payload: CheckoutPayload = {
        shop_id: SHOP_ID,
        customer_id: customerSnapshot?.id || null,
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        items: cart.map((it) => ({
          product_id: it.product.id,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          cost_price: Number(it.product.purchase_price || 0),
          unit_name: it.unitName,
          unit_multiplier: it.unitMultiplier,
          base_quantity: getBaseQuantity(it.quantity, it.unit),
          is_price_overridden: it.isPriceOverridden,
        })),
        payments,
      };

      let sale: Sale;
      if (!navigator.onLine) {
        sale = offlinePosEngine.saveOfflineBill(payload);
        setPendingOfflineBills(offlinePosEngine.getPendingCount());
      } else {
        try {
          sale = await posRepository.checkout(payload);
        } catch (serverErr) {
          console.warn("Server checkout failed, saving offline fallback:", serverErr);
          sale = offlinePosEngine.saveOfflineBill(payload);
          setPendingOfflineBills(offlinePosEngine.getPendingCount());
        }
      }

      // Ensure customer & items have complete product objects attached for Thermal receipt & WhatsApp
      const resolvedCustomer = customerSnapshot || sale.customer || (payload.customer_id ? customers.find((c) => c.id === payload.customer_id) : null) || null;

      const rawItems = sale.items && sale.items.length > 0 ? sale.items : payload.items.map((it, idx) => {
        const cartMatch = cart[idx] || cart.find((c) => c.product.id === it.product_id);
        return {
          id: `item-${Date.now()}-${idx}`,
          sale_id: sale.id,
          product_id: it.product_id,
          variant_id: it.variant_id || null,
          quantity: it.quantity,
          unit_price: it.unit_price,
          cost_price: it.cost_price,
          is_price_overridden: it.is_price_overridden || false,
          overridden_by: null,
          product: cartMatch?.product,
          unit_name: it.unit_name || cartMatch?.unitName,
          unit_multiplier: it.unit_multiplier || cartMatch?.unitMultiplier,
        };
      });

      const enrichedSale: Sale = {
        ...sale,
        customer: resolvedCustomer || undefined,
        items: rawItems.map((saleItem, idx) => {
          const cartMatch = cart[idx] || cart.find((c) => c.product.id === saleItem.product_id);
          return {
            ...saleItem,
            product: saleItem.product || cartMatch?.product,
            unit_name: (saleItem as any).unit_name || cartMatch?.unitName,
            unit_multiplier: (saleItem as any).unit_multiplier || cartMatch?.unitMultiplier,
          } as any;
        }),
      };

      setCompletedSale(enrichedSale);
      setIsCheckoutModalOpen(false);
      setIsReceiptModalOpen(true);
      clearCart();
      if (navigator.onLine) {
        loadCatalog(); // Refresh current_stock
      }
    } catch (err: any) {
      console.error("Checkout failed", err);
      alert("Failed to complete sale: " + (err.message || "Unknown error"));
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter and rank products by category, search, and sales velocity (Top Selling)
  const filteredProducts = React.useMemo(() => {
    const list = products.filter((p) => {
      const matchesCategory = selectedCategory === "all" || p.category_id === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    return list.sort((a, b) => {
      if (sortMode === "top_selling") {
        const salesA = productSalesCount[a.id] || 0;
        const salesB = productSalesCount[b.id] || 0;
        if (salesB !== salesA) return salesB - salesA;
        return a.name.localeCompare(b.name);
      }
      if (sortMode === "name_asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortMode === "price_asc") {
        return Number(a.selling_price) - Number(b.selling_price);
      }
      if (sortMode === "newest") {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      return 0;
    });
  }, [products, selectedCategory, searchQuery, sortMode, productSalesCount]);

  return (
    <div className="h-screen w-screen max-h-screen overflow-hidden bg-gray-100 flex flex-col font-sans">
      {/* POS Top Bar */}
      <header className="h-14 bg-brand-700 text-white px-3 sm:px-4 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {mobileTab === "cart" ? (
            <button
              type="button"
              onClick={() => changeMobileTab("catalog")}
              className="p-1.5 rounded-lg bg-brand-800 hover:bg-brand-900 transition-colors text-white shrink-0 flex items-center gap-1 cursor-pointer"
              title="Back to Product Catalog"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <Link
              href="/"
              className="p-1.5 rounded-lg bg-brand-800 hover:bg-brand-900 transition-colors text-white shrink-0"
              title="Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="font-bold text-sm sm:text-base tracking-wide truncate">POS Terminal</span>
            <Badge variant="neutral" className="hidden sm:inline-flex bg-white/20 text-white border-white/30 text-[10px]">
              #1
            </Badge>

            {/* Online / Offline Status Badge */}
            {isOnline ? (
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                <Wifi className="w-3 h-3" /> <span className="hidden sm:inline">Live</span> Online
              </span>
            ) : (
              <span className="text-[10px] font-bold bg-amber-500/30 text-amber-200 border border-amber-400/40 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse shrink-0">
                <WifiOff className="w-3 h-3" /> Offline
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Printer Setup & Test Quick Button */}
          <button
            type="button"
            onClick={() => setIsPrinterModalOpen(true)}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-brand-800 hover:bg-brand-900 transition-all text-white flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer shadow-xs active:scale-95 border border-white/10"
            title="Thermal Printer & ATPOS Setup"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">Printer</span>
          </button>

          {/* Mobile Cart View Toggle Button */}
          <button
            type="button"
            onClick={() => changeMobileTab(mobileTab === "catalog" ? "cart" : "catalog")}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-bold shrink-0 relative transition-all active:scale-95 cursor-pointer shadow-inner"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{mobileTab === "catalog" ? `Cart (${cart.length})` : "← Products"}</span>
            {cart.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute -top-0.5 -right-0.5" />
            )}
          </button>

          {/* Pending Offline Bills Sync Button */}
          {pendingOfflineBills > 0 && (
            <Button
              size="sm"
              onClick={handleSyncOfflineBills}
              isLoading={isSyncingBills}
              className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs gap-1.5 shadow-md animate-bounce"
            >
              <CloudUpload className="w-4 h-4" />
              <span className="hidden sm:inline">Sync {pendingOfflineBills} Offline</span>
            </Button>
          )}

          {/* Held Bills Badge & Trigger Button (Mobile & Desktop) */}
          {heldBills.length > 0 && (
            <button
              type="button"
              onClick={() => setIsHeldBillsModalOpen(true)}
              className="px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer ring-2 ring-amber-300/40 animate-pulse shrink-0"
              title="View all held customer bills"
            >
              <PauseCircle className="w-4 h-4 text-amber-900" />
              <span>{heldBills.length} Held</span>
            </button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={loadCatalog}
            className="hidden sm:inline-flex text-white hover:bg-brand-800 text-xs gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Sync
          </Button>
        </div>
      </header>

      {/* Held Bill Toast Alert Banner */}
      {heldBillToast && (
        <div className="bg-amber-500 text-amber-950 text-xs font-black px-4 py-2 flex items-center justify-between shadow-md shrink-0 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <PauseCircle className="w-4 h-4 text-amber-950" />
            <span>{heldBillToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setHeldBillToast("")}
            className="text-amber-950/70 hover:text-amber-950 font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Multi-Customer Bill Quick Tabs Bar (Shown whenever any bill is held) */}
      {heldBills.length > 0 && (
        <div className="bg-slate-900 text-white px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto shrink-0 border-b border-slate-800 text-xs no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto">
            {/* Active Current Bill Tab */}
            <div className="px-3 py-1 bg-brand-600 text-white rounded-lg font-black flex items-center gap-1.5 shadow-xs shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Active Bill ({cart.reduce((s, i) => s + i.quantity, 0)} items • {formatCurrency(totalAmount)})</span>
            </div>

            {/* Held Bills Quick Switch Chips */}
            {heldBills.map((hb, idx) => (
              <button
                key={hb.id}
                type="button"
                onClick={() => handleResumeBill(hb)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-400 rounded-lg font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer active:scale-95"
                title={`Switch to "${hb.label}" (${formatCurrency(hb.totalAmount)})`}
              >
                <PlayCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="max-w-[130px] truncate">#{idx + 1} {hb.label}</span>
                <span className="text-[10px] text-amber-200 font-mono font-black">{formatCurrency(hb.totalAmount)}</span>
              </button>
            ))}

            {/* Park Current & Start Fresh Bill */}
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => handleHoldBill()}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                title="Park current bill and open a blank bill for the next customer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Hold & Start New</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsHeldBillsModalOpen(true)}
            className="text-[11px] text-amber-300 hover:text-amber-200 underline font-bold shrink-0 ml-auto"
          >
            Manage All ({heldBills.length})
          </button>
        </div>
      )}

      {/* Main Split Interface */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Product catalog & Search (Full width on mobile when catalog active, 60% on desktop) */}
        <div
          className={cn(
            "flex-1 bg-surface-canvas border-r border-gray-200 overflow-hidden flex flex-col h-full",
            mobileTab === "catalog" ? "flex" : "hidden lg:flex"
          )}
        >
          {/* Content Row: Catalog Area on Left + Slim Category Icon Rail on Right */}
          <div className="flex-1 flex min-h-0 h-full overflow-hidden">
            {/* Product Matrix & Search Area */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden">
              {/* Search Header */}
              <div className="p-3 bg-white border-b border-gray-200 space-y-2 shrink-0">
                <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder={isListening ? "Listening... बोलकर खोजें..." : "Scan barcode or search product / SKU..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-9 pr-10 py-2 text-xs sm:text-sm bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all shadow-inner ${
                        isListening
                          ? "border-rose-500 ring-2 ring-rose-500/30 bg-rose-50/20"
                          : "border-gray-300 focus:ring-purple-600"
                      }`}
                      autoFocus
                    />
                    <Barcode className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                  </div>

                  {/* Voice Search Mic Button */}
                  <button
                    type="button"
                    onClick={toggleVoiceSearch}
                    className={`p-2 sm:px-2.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-md active:scale-95 transition-all shrink-0 cursor-pointer ${
                      isListening
                        ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse ring-2 ring-rose-400"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                    }`}
                    title={isListening ? "Listening... Tap to stop" : "Voice Search (बोलकर खोजें)"}
                  >
                    {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-purple-700" />}
                    <span className="hidden sm:inline">{isListening ? "Listening..." : "Voice"}</span>
                  </button>

                  {/* Quick Add Product Button */}
                  <button
                    type="button"
                    onClick={() => setIsQuickAddOpen(true)}
                    className="px-2.5 sm:px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
                    title="Quick Add New Product to Inventory & Bill"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-200" />
                    <span>+ Add</span>
                  </button>

                  {/* Camera Scanner Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setIsCameraScannerOpen(true)}
                    className="p-2 sm:px-3 sm:py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
                    title="Scan Barcode with Device Camera"
                  >
                    <Camera className="w-4 h-4 text-amber-300" />
                    <span className="hidden sm:inline">Camera</span>
                  </button>
                </form>

                {/* Controls Bar: Mobile Categories Trigger + Sort Pills */}
                <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 no-scrollbar">
                  {/* Mobile Categories Sidebar Drawer Button */}
                  <button
                    type="button"
                    onClick={() => setIsMobileCategoryDrawerOpen(true)}
                    className="md:hidden px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    <span className="truncate max-w-[120px]">
                      {selectedCategory === "all"
                        ? "All Categories"
                        : categories.find((c) => c.id === selectedCategory)?.name || "Categories"}
                    </span>
                  </button>

                  {/* Sort Mode Pills */}
                  <div className="flex items-center gap-1.5 ml-auto shrink-0">
                    <span className="text-[11px] font-bold text-gray-400 hidden sm:inline">Sort:</span>
                    <button
                      type="button"
                      onClick={() => setSortMode("top_selling")}
                      className={`px-2.5 py-1 text-[11px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                        sortMode === "top_selling"
                          ? "bg-amber-500 text-white shadow-xs"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      title="Sort by highest sold items"
                    >
                      <Flame className={`w-3 h-3 ${sortMode === "top_selling" ? "text-white" : "text-amber-500"}`} />
                      <span>Top</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortMode("name_asc")}
                      className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        sortMode === "name_asc"
                          ? "bg-purple-600 text-white shadow-xs"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      A-Z
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortMode("price_asc")}
                      className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        sortMode === "price_asc"
                          ? "bg-purple-600 text-white shadow-xs"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Price
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortMode("newest")}
                      className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        sortMode === "newest"
                          ? "bg-purple-600 text-white shadow-xs"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      New
                    </button>
                  </div>
                </div>
              </div>

              {/* Product Cards Grid with independent smooth scrolling */}
              <div className="flex-1 p-2.5 sm:p-4 overflow-y-auto min-h-0 grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5 sm:gap-3 content-start scrollbar-thin overscroll-contain">
                {filteredProducts.length === 0 ? (
                  <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-dashed border-gray-300 p-8 space-y-3">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-bold text-gray-800">
                      {searchQuery ? `No product matching "${searchQuery}"` : "No products in this category"}
                    </h3>
                    <p className="text-xs text-gray-500 max-w-sm">
                      Add this new item instantly to your catalog and continue billing without delay.
                    </p>
                    <Button
                      onClick={() => setIsQuickAddOpen(true)}
                      className="bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white text-xs font-bold gap-1.5 shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Quick Add {searchQuery ? `"${searchQuery}"` : "New Product"} to Bill</span>
                    </Button>
                  </div>
                ) : (
                  filteredProducts.map((p) => {
                    const stockQty = Number(p.current_stock) || 0;
                    const inStock = stockQty > 0;
                    const pricing = getProductPricingSummary(p);
                    const customPrice = customerPrices[p.id];
                    const effectivePiecePrice = customPrice !== undefined ? customPrice : pricing.piecePrice;
                    const salesCount = productSalesCount[p.id] || 0;
                    const isTopSeller = salesCount > 0;
                    const rawImages = (p.image_url || "").split("|||").map((s) => s.trim()).filter(Boolean);
                    const primaryImage = rawImages.length > 0 ? rawImages[0] : null;

                    // In-Cart quantities for this specific product
                    const cartPieceIndex = cart.findIndex((i) => i.product.id === p.id && i.unit === "piece");
                    const inCartPieceQty = cartPieceIndex > -1 ? cart[cartPieceIndex].quantity : 0;

                    const cartDozenIndex = cart.findIndex((i) => i.product.id === p.id && i.unit === "dozen");
                    const inCartDozenQty = cartDozenIndex > -1 ? cart[cartDozenIndex].quantity : 0;

                    const totalInCart = inCartPieceQty + inCartDozenQty;

                    return (
                      <div
                        key={p.id}
                        onClick={() => addToCart(p, "piece", 1)}
                        className={`rounded-2xl border-2 p-2 sm:p-2.5 flex flex-col justify-between transition-all relative select-none cursor-pointer active:scale-[0.97] touch-manipulation group ${
                          totalInCart > 0
                            ? "bg-purple-50/50 border-purple-600 shadow-md ring-2 ring-purple-600/10"
                            : "bg-white border-gray-200 hover:border-purple-400 hover:shadow-md"
                        } ${!inStock ? "opacity-60 bg-gray-50" : ""}`}
                        title="Tap anywhere to add 1 piece to bill"
                      >
                        <div className="space-y-1.5">
                          {/* Product Image & Overlays */}
                          <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 border border-gray-100 flex items-center justify-center group-hover:border-purple-200 transition-colors">
                            {primaryImage ? (
                              <img
                                src={primaryImage}
                                alt={p.name}
                                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = "none";
                                  const fallback = (e.currentTarget.parentElement?.querySelector(".img-fallback") as HTMLElement);
                                  if (fallback) fallback.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div
                              className="img-fallback w-full h-full flex flex-col items-center justify-center text-gray-400 p-2"
                              style={{ display: primaryImage ? "none" : "flex" }}
                            >
                              <Package className="w-8 h-8 stroke-[1.2] text-gray-300 group-hover:text-purple-400 transition-colors" />
                              <span className="text-[9px] font-bold text-gray-400 tracking-wider uppercase mt-0.5">
                                {p.category?.name || "Falcon"}
                              </span>
                            </div>

                            {/* Top Badges & Stock Overlays */}
                            <div className="absolute top-1 left-1 right-1 flex items-center justify-between gap-1 pointer-events-none">
                              {totalInCart > 0 ? (
                                <span className="text-[9px] sm:text-[10px] font-black bg-purple-600/95 text-white px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-xs backdrop-blur-xs">
                                  <span>⚡ {inCartPieceQty ? `${inCartPieceQty}p` : ""}{inCartPieceQty && inCartDozenQty ? "+" : ""}{inCartDozenQty ? `${inCartDozenQty}d` : ""}</span>
                                </span>
                              ) : isTopSeller ? (
                                <span className="text-[9px] sm:text-[10px] font-black bg-amber-500/95 text-white px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-xs backdrop-blur-xs">
                                  <Flame className="w-2.5 h-2.5 text-white" /> Top
                                </span>
                              ) : (
                                <span className="text-[8px] text-gray-700 bg-white/90 px-1 py-0.5 rounded font-mono truncate max-w-[65px] backdrop-blur-xs font-bold">
                                  {p.sku || p.barcode || ""}
                                </span>
                              )}

                              <span
                                className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs shadow-xs ${
                                  inStock ? "bg-emerald-600/90 text-white" : "bg-rose-600/90 text-white"
                                }`}
                              >
                                {inStock
                                  ? `${stockQty} ${stockQty >= 12 ? `(${Math.floor(stockQty / 12)}d)` : "pcs"}`
                                  : "Out"}
                              </span>
                            </div>
                          </div>

                          {/* Product Name */}
                          <h4 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 leading-tight min-h-[2rem]" title={p.name}>
                            {p.name}
                          </h4>
                        </div>

                        <div className="mt-1.5 pt-1.5 border-t border-gray-100 space-y-1.5">
                          {/* Pricing Line */}
                          <div className="flex flex-col">
                            <div className="flex items-baseline justify-between">
                              <div className="text-sm font-black text-purple-900 tabular-nums">
                                {formatCurrency(effectivePiecePrice)}
                                <span className="text-[10px] font-normal text-gray-500"> /pc</span>
                              </div>
                              {pricing.wholesalePerPiece > 0 && (
                                <span className="text-[9px] text-indigo-700 font-bold bg-indigo-50 px-1 py-0.5 rounded" title="Wholesale rate per piece">
                                  ₹{pricing.wholesalePerPiece}/pc wh.
                                </span>
                              )}
                            </div>

                            {/* Full Dozen Rate info */}
                            {pricing.dozenPrice > 0 && (
                              <div className="text-[10px] text-gray-500 font-semibold truncate">
                                1 Doz: <span className="font-bold text-indigo-900">{formatCurrency(pricing.dozenPrice)}</span>
                              </div>
                            )}
                          </div>

                          {/* Quick Add Actions: 1-Tap Piece + Inline Counter or Add Pill */}
                          <div className="flex items-center gap-1.5 pt-0.5">
                            {inCartPieceQty > 0 ? (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 flex items-center justify-between bg-purple-600 text-white rounded-xl p-1 shadow-xs"
                              >
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(cartPieceIndex, -1)}
                                  className="w-6 h-6 flex items-center justify-center bg-purple-700 hover:bg-purple-800 active:scale-90 rounded-lg text-white font-bold cursor-pointer transition-transform"
                                  title="Decrease quantity"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-xs font-black px-1.5 tabular-nums">
                                  {inCartPieceQty} pc
                                </span>
                                <button
                                  type="button"
                                  onClick={() => addToCart(p, "piece", 1)}
                                  className="w-6 h-6 flex items-center justify-center bg-purple-700 hover:bg-purple-800 active:scale-90 rounded-lg text-white font-bold cursor-pointer transition-transform"
                                  title="Add one more piece"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex-1 py-1.5 bg-purple-50 group-hover:bg-purple-600 group-hover:text-white text-purple-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors">
                                <Plus className="w-3.5 h-3.5" />
                                <span>1-Tap Add</span>
                              </div>
                            )}

                            {/* Secondary Dozen Quick Chip if available */}
                            {pricing.dozenPrice > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(p, "dozen", 1);
                                }}
                                className="py-1.5 px-2 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 text-[10px] sm:text-[11px] font-bold rounded-xl transition-colors shrink-0 cursor-pointer active:scale-95 border border-indigo-100"
                                title={`Add 1 Dozen (${formatCurrency(pricing.dozenPrice)})`}
                              >
                                +1 Doz
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Slim Vertical Category Rail with Icons */}
            <PosCategoryRightRail
              categories={categories}
              products={products}
              selectedCategoryId={selectedCategory}
              onSelectCategory={setSelectedCategory}
              shopId={SHOP_ID}
            />
          </div>

          {/* Mobile Floating Cart Summary Bar (appears docked at bottom of catalog view when cart has items) */}
          {cart.length > 0 && (
            <div className="lg:hidden p-2.5 bg-white border-t border-gray-200 shadow-xl flex items-center justify-between gap-2 shrink-0">
              <div className="flex flex-col min-w-0 pr-1">
                <span className="text-[10px] text-gray-500 font-bold truncate">
                  {cart.reduce((s, i) => s + i.quantity, 0)} items in bill
                </span>
                <span className="text-base font-black text-purple-900 leading-tight tabular-nums">
                  {formatCurrency(totalAmount)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* 1-Tap Fast Cash */}
                <button
                  type="button"
                  onClick={() => handleOpenCheckout("cash")}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-md cursor-pointer transition-all"
                  title="Instant Cash Payment & Print"
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Cash</span>
                </button>

                {/* 1-Tap UPI QR */}
                <button
                  type="button"
                  onClick={() => handleOpenCheckout("upi")}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-md cursor-pointer transition-all"
                  title="Instant UPI Payment QR"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>UPI</span>
                </button>

                {/* View Full Cart Drawer */}
                <button
                  type="button"
                  onClick={() => changeMobileTab("cart")}
                  className="p-2 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 rounded-xl text-xs font-bold flex items-center shadow-xs cursor-pointer border border-gray-300"
                  title="View and edit cart items"
                >
                  <ShoppingCart className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Active Cart & Bill Operations (Full width on mobile when cart active, 40% on desktop) */}
        <div
          className={cn(
            "w-full lg:w-96 xl:w-[440px] bg-white flex flex-col justify-between border-l border-gray-200 shadow-lg h-full min-h-0 overflow-hidden shrink-0",
            mobileTab === "cart" ? "flex" : "hidden lg:flex"
          )}
        >
          {/* Restored Cart Banner Notification */}
          {isRestoredToast && (
            <div className="bg-emerald-600 text-white text-xs font-bold px-3 py-2 flex items-center justify-between shadow-md shrink-0 animate-in slide-in-from-top duration-200">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Active cart restored from previous session!</span>
              </div>
              <button
                type="button"
                onClick={() => setIsRestoredToast(false)}
                className="text-white/80 hover:text-white text-xs px-1"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {/* Mobile Back to Products Bar */}
          <div className="lg:hidden p-2.5 bg-brand-50 border-b border-brand-100 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={() => changeMobileTab("catalog")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← Back to Products Catalog</span>
            </button>
            <span className="text-xs font-bold text-gray-700">
              Total: {formatCurrency(subtotal)}
            </span>
          </div>

          {/* Enhanced Customer Contact Selector with Native Mobile Contact Picker */}
          <PosCustomerSelector
            customers={customers}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={(cust) => setSelectedCustomer(cust)}
            onCustomerCreated={(newCust) => {
              setCustomers((prev) => [newCust, ...prev.filter((c) => c.id !== newCust.id)]);
            }}
            shopId={SHOP_ID}
          />

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-gray-400 space-y-2">
                <Barcode className="w-12 h-12 stroke-[1.2] text-gray-300" />
                <p className="text-sm font-medium">Cart is empty</p>
                <p className="text-xs text-gray-400 max-w-xs">
                  Scan items with your barcode reader or tap products from the catalog to start billing.
                </p>
              </div>
            ) : (
              cart.map((item, index) => {
                const stock = Number(item.product.current_stock) || 0;
                const baseQtyNeeded = getBaseQuantity(item.quantity, item.unit);
                const isOverStock = baseQtyNeeded > stock;

                return (
                  <div
                    key={`${item.product.id}-${item.unit}-${index}`}
                    className={`p-3 space-y-2 group hover:bg-gray-50/80 rounded-xl transition-all border border-transparent hover:border-gray-200 ${
                      isOverStock ? "bg-amber-50/40 border-amber-200" : ""
                    }`}
                  >
                    {/* Top Row: Thumbnail + Name & Remove */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Product Thumbnail */}
                        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {item.product.image_url ? (
                            <img
                              src={item.product.image_url.split("|||")[0].trim()}
                              alt={item.product.name}
                              className="w-full h-full object-cover object-center"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                                const fallback = (e.currentTarget.parentElement?.querySelector(".cart-img-fallback") as HTMLElement);
                                if (fallback) fallback.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className="cart-img-fallback w-full h-full flex items-center justify-center text-gray-400"
                            style={{ display: item.product.image_url ? "none" : "flex" }}
                          >
                            <Package className="w-5 h-5 text-gray-400 stroke-[1.5]" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-gray-900 truncate" title={item.product.name}>
                            {item.product.name}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {item.product.barcode || item.product.sku || "No Barcode"}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-gray-300 hover:text-rose-600 p-1 transition-colors rounded-lg hover:bg-rose-50 shrink-0"
                        title="Remove item from bill"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Unit Selector Pills */}
                    <div className="flex items-center gap-1 bg-gray-100/80 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => updateCartItemUnit(index, "piece")}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${
                          item.unit === "piece"
                            ? "bg-white text-purple-700 shadow-xs"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                        title="Sell in single pieces"
                      >
                        Pc (1)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCartItemUnit(index, "half_dozen")}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${
                          item.unit === "half_dozen"
                            ? "bg-white text-purple-700 shadow-xs"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                        title="Sell in half-dozen pack (6 pcs)"
                      >
                        1/2 Doz (6)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCartItemUnit(index, "dozen")}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${
                          item.unit === "dozen"
                            ? "bg-white text-indigo-700 shadow-xs"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                        title="Sell in dozen wholesale pack (12 pcs)"
                      >
                        Dozen (12)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCartItemUnit(index, "bundle_10_doz")}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${
                          item.unit === "bundle_10_doz"
                            ? "bg-white text-emerald-700 shadow-xs"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                        title="Sell in 10 Dozen Master Pack (120 pcs)"
                      >
                        10 Doz (120)
                      </button>
                    </div>

                    {/* Bottom Row: Quantity Stepper, Unit Price Input, and Line Total */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-gray-300 rounded-lg bg-white shadow-2xs">
                        <button
                          type="button"
                          onClick={() => updateQuantity(index, -1)}
                          className="px-2 py-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-l-lg transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-black text-gray-900 tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(index, 1)}
                          className="px-2 py-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-r-lg transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Unit Price input with unit badge */}
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold text-gray-400">₹</span>
                        <input
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={item.unitPrice === 0 ? "" : item.unitPrice}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) => updatePriceOverride(index, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                          className="w-16 px-1.5 py-0.5 text-xs border border-gray-300 rounded-lg font-black text-gray-900 text-right focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white shadow-2xs"
                          title="Click to override rate per unit"
                        />
                        <span className="text-[10px] text-gray-500 font-semibold">/{item.unitName}</span>
                      </div>

                      {/* Line Total */}
                      <div className="text-right min-w-[65px]">
                        <div className="text-xs font-black text-gray-900 tabular-nums">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </div>
                      </div>
                    </div>

                    {isOverStock && (
                      <div className="text-[10px] text-amber-700 font-bold flex items-center gap-1 bg-amber-100/60 px-2 py-0.5 rounded">
                        <span>⚠️ Stock low: Need {baseQtyNeeded} pcs, only {stock} pcs available</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Summary & Checkout Actions */}
          <div className="p-4 border-t border-gray-200 bg-gray-50/50 space-y-3">
            {/* Subtotal, Discount & Tax */}
            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900 tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Bill Discount</span>
                <div className="flex items-center gap-1">
                  <span>- ₹</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={discountAmount === 0 ? "" : discountAmount}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setDiscountAmount(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                    className="w-16 px-1.5 py-0.5 text-xs border border-gray-200 rounded font-semibold text-gray-800 text-right focus:outline-none focus:ring-1 focus:ring-brand-600 bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 text-base font-bold text-gray-900">
                <span>Total Payable</span>
                <span className="text-brand-700 text-xl tabular-nums">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Bill Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleHoldBill()}
                disabled={cart.length === 0}
                className="text-xs font-bold gap-1 text-amber-800 border-amber-300 bg-amber-50 hover:bg-amber-100 cursor-pointer"
                title="Park current bill and start a fresh bill for the next customer"
              >
                <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Hold Bill {heldBills.length > 0 ? `(${heldBills.length})` : ""}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                disabled={cart.length === 0}
                className="text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                <span>Clear Cart</span>
              </Button>
            </div>

            {/* Primary Checkout Button */}
            <Button
              size="lg"
              onClick={() => handleOpenCheckout("cash")}
              disabled={cart.length === 0}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-base shadow-md h-12"
            >
              Proceed to Pay ({formatCurrency(totalAmount)})
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Selection Modal */}
      <Modal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        title="Complete Payment & Checkout"
        description={`Total Amount Payable: ${formatCurrency(totalAmount)}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setPaymentMethod("cash")}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all ${
                paymentMethod === "cash"
                  ? "border-brand-600 bg-brand-50 text-brand-700 shadow-sm"
                  : "border-gray-200 hover:bg-gray-50 text-gray-700"
              }`}
            >
              <Banknote className="w-5 h-5" />
              Cash
            </button>
            <button
              onClick={() => setPaymentMethod("upi")}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all ${
                paymentMethod === "upi"
                  ? "border-brand-600 bg-brand-50 text-brand-700 shadow-sm"
                  : "border-gray-200 hover:bg-gray-50 text-gray-700"
              }`}
            >
              <QrCode className="w-5 h-5" />
              UPI / QR
            </button>
            <button
              onClick={() => setPaymentMethod("card")}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all ${
                paymentMethod === "card"
                  ? "border-brand-600 bg-brand-50 text-brand-700 shadow-sm"
                  : "border-gray-200 hover:bg-gray-50 text-gray-700"
              }`}
            >
              <CreditCard className="w-5 h-5" />
              Card
            </button>
            <button
              onClick={() => setPaymentMethod("split")}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all ${
                paymentMethod === "split"
                  ? "border-brand-600 bg-brand-50 text-brand-700 shadow-sm"
                  : "border-gray-200 hover:bg-gray-50 text-gray-700"
              }`}
            >
              <Plus className="w-5 h-5" />
              Split
            </button>
          </div>

          {paymentMethod === "split" ? (
            <div className="space-y-2 p-3 bg-gray-50 rounded-lg text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">Cash Portion:</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={cashAmount === 0 ? "" : cashAmount}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => setCashAmount(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                  className="w-28 p-1.5 border border-gray-300 rounded font-semibold text-right"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">UPI Portion:</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={upiAmount === 0 ? "" : upiAmount}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => setUpiAmount(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                  className="w-28 p-1.5 border border-gray-300 rounded font-semibold text-right"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">Card Portion:</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={cardAmount === 0 ? "" : cardAmount}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => setCardAmount(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                  className="w-28 p-1.5 border border-gray-300 rounded font-semibold text-right"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Transaction / Reference No. (Optional)
              </label>
              <input
                type="text"
                placeholder="UPI ref / Auth code"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="w-full text-xs p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
            </div>
          )}

          <div className="pt-3 border-t border-gray-200">
            <Button
              size="lg"
              onClick={handleCompleteCheckout}
              isLoading={isProcessing}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Complete & Print Receipt
            </Button>
          </div>
        </div>
      </Modal>

      {/* Quick Printer Setup & Hardware Modal */}
      <Modal
        isOpen={isPrinterModalOpen}
        onClose={() => setIsPrinterModalOpen(false)}
        title="🖨️ Thermal Printer & Hardware Setup"
        description="ATPOS 80mm/58mm, Bluetooth direct ESC/POS, and test print"
        maxWidth="xl"
      >
        <div className="p-1">
          <PrinterSettingsTab shopId={SHOP_ID} />
        </div>
      </Modal>

      {/* Continuous Live Camera Barcode Scanner Modal */}
      <CameraBarcodeScanner
        isOpen={isCameraScannerOpen}
        onClose={() => {
          setIsCameraScannerOpen(false);
          setScanFeedback(null);
        }}
        isContinuous={true}
        cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
        cartTotal={totalAmount}
        lastScannedFeedback={scanFeedback}
        onQuickAddUnknown={(code) => {
          setSearchQuery(code);
          setIsQuickAddOpen(true);
        }}
        onScan={(scannedCode) => {
          const cleanCode = scannedCode.trim();
          if (!cleanCode) return;

          const matched = products.find(
            (p) =>
              p.barcode?.toLowerCase() === cleanCode.toLowerCase() ||
              p.sku?.toLowerCase() === cleanCode.toLowerCase() ||
              p.id === cleanCode
          );

          if (matched) {
            addToCart(matched, "piece", 1);

            // Access latest cart state to accurately calculate new quantity and line total in HUD
            setCart((latestCart) => {
              const inCart = latestCart.find((i) => i.product.id === matched.id && i.unit === "piece");
              const currentQty = inCart ? inCart.quantity : 1;
              const unitP = inCart ? inCart.unitPrice : Number(matched.selling_price);
              const lineTotal = unitP * currentQty;

              setScanFeedback({
                type: "success",
                title: currentQty > 1 ? `⚡ ${matched.name} (Qty: ${currentQty})` : `✓ Added: ${matched.name}`,
                subtitle:
                  currentQty > 1
                    ? `+1 Added • Total: ${formatCurrency(lineTotal)} (${currentQty} pcs)`
                    : `${formatCurrency(unitP)} /pc • Added to bill!`,
                barcode: cleanCode,
                timestamp: Date.now(),
              });
              return latestCart;
            });
          } else {
            setScanFeedback({
              type: "error",
              title: `⚠️ Unknown Barcode: ${cleanCode}`,
              subtitle: "Product not in inventory • Tap Quick Add",
              barcode: cleanCode,
              timestamp: Date.now(),
            });
          }
        }}
      />

      {/* Mobile Category Sidebar Drawer Modal */}
      <Modal
        isOpen={isMobileCategoryDrawerOpen}
        onClose={() => setIsMobileCategoryDrawerOpen(false)}
        title="Select Category"
        description="Browse categories or reorder priority"
        maxWidth="sm"
      >
        <div className="h-[480px] flex flex-col -m-4">
          <PosCategorySidebar
            categories={categories}
            products={products}
            selectedCategoryId={selectedCategory}
            onSelectCategory={(catId) => {
              setSelectedCategory(catId);
              setIsMobileCategoryDrawerOpen(false);
            }}
            shopId={SHOP_ID}
          />
        </div>
      </Modal>

      {/* POS Quick Add Product Modal */}
      <PosQuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={handleQuickAddSuccess}
        shopId={SHOP_ID}
        categories={categories}
        existingProducts={products}
        initialSearchQuery={searchQuery}
      />

      {/* POS Bill Success & Thermal / WhatsApp Receipt Modal */}
      {completedSale && (
        <Modal
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setCompletedSale(null);
          }}
          title={`🧾 Cash Bill & Invoice #${completedSale.invoice_number}`}
          description="Thermal printing, WhatsApp invoice sharing, and billing receipt"
          maxWidth="lg"
        >
          <ThermalReceipt
            sale={completedSale}
            customer={completedSale.customer}
            shopId={SHOP_ID}
            onDone={() => {
              setIsReceiptModalOpen(false);
              setCompletedSale(null);
            }}
            onOpenPrinterSettings={() => setIsPrinterModalOpen(true)}
          />
        </Modal>
      )}

      {/* Pending / Held Customer Bills Modal */}
      <Modal
        isOpen={isHeldBillsModalOpen}
        onClose={() => setIsHeldBillsModalOpen(false)}
        title="⏸️ Pending / Held Customer Bills (पेंडिंग बिल्स)"
        description="Switch between active customer carts or restore parked orders"
        maxWidth="lg"
      >
        <div className="space-y-4">
          {heldBills.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center p-6 space-y-2 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <PauseCircle className="w-10 h-10 text-gray-300 stroke-[1.5]" />
              <h4 className="text-sm font-bold text-gray-700">No Held Bills</h4>
              <p className="text-xs text-gray-400 max-w-xs">
                When a customer needs time to pick more items, click &quot;Hold Bill&quot; in the cart to park their order and bill the next person.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {heldBills.map((hb, idx) => {
                const itemCount = hb.items.reduce((s, i) => s + i.quantity, 0);
                const timeAgo = Math.max(1, Math.round((Date.now() - hb.timestamp) / 60000));

                return (
                  <div
                    key={hb.id}
                    className="p-3.5 bg-white border border-gray-200 hover:border-purple-400 rounded-2xl shadow-xs space-y-2.5 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-black text-xs rounded-lg">
                          #{idx + 1}
                        </span>
                        <div>
                          <h4 className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-purple-600" />
                            <span>{hb.customer?.name || hb.label}</span>
                          </h4>
                          {hb.customer?.phone && (
                            <p className="text-[10px] text-gray-500 font-mono">
                              Phone: {hb.customer.phone}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-purple-900 tabular-nums">
                          {formatCurrency(hb.totalAmount)}
                        </span>
                        <span className="text-[10px] text-gray-400 block font-medium">
                          {timeAgo}m ago • {itemCount} items
                        </span>
                      </div>
                    </div>

                    {/* Items preview */}
                    <div className="bg-gray-50 p-2 rounded-xl text-[11px] text-gray-700 space-y-0.5">
                      <div className="font-semibold text-gray-500 text-[10px] uppercase">
                        Items in bill:
                      </div>
                      <div className="line-clamp-2 leading-relaxed">
                        {hb.items.map((it, i) => (
                          <span key={i} className="inline-block mr-2">
                            • {it.product.name} ({it.quantity} {it.unitName})
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteHeldBill(hb.id, e)}
                        className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        title="Delete this parked bill"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Discard Bill</span>
                      </button>

                      <Button
                        size="sm"
                        onClick={() => handleResumeBill(hb)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1 shadow-xs cursor-pointer active:scale-95"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Resume & Open Bill (बिल खोलें)</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <span className="text-xs text-gray-500 font-semibold">
              Total {heldBills.length} parked {heldBills.length === 1 ? "bill" : "bills"}
            </span>

            {cart.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleHoldBill();
                  setIsHeldBillsModalOpen(false);
                }}
                className="text-xs font-bold gap-1 text-purple-700 border-purple-200 hover:bg-purple-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Park Current Bill ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
