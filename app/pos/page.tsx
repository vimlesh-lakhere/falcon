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
  customer: Customer | null;
  items: CartItem[];
  timestamp: Date;
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

  // Mobile Category Sidebar Drawer
  const [isMobileCategoryDrawerOpen, setIsMobileCategoryDrawerOpen] = useState(false);

  // Product Sort Mode & Sales Velocity
  const [sortMode, setSortMode] = useState<"top_selling" | "name_asc" | "price_asc" | "newest">("top_selling");
  const [productSalesCount, setProductSalesCount] = useState<Record<string, number>>({});

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0); // e.g. 0% or 18%
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);

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

  const searchInputRef = useRef<HTMLInputElement>(null);

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
  };

  // Hold & Resume bill
  const handleHoldBill = () => {
    if (cart.length === 0) return;
    const newHeld: HeldBill = {
      id: Date.now().toString(),
      customer: selectedCustomer,
      items: cart,
      timestamp: new Date(),
    };
    setHeldBills([...heldBills, newHeld]);
    clearCart();
  };

  const handleResumeBill = (held: HeldBill) => {
    setCart(held.items);
    setSelectedCustomer(held.customer);
    setHeldBills(heldBills.filter((b) => b.id !== held.id));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
  const totalAmount = Math.max(0, subtotal - discountAmount + taxAmount);

  // Open checkout modal
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setCashAmount(totalAmount);
    setUpiAmount(0);
    setCardAmount(0);
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

      const payload: CheckoutPayload = {
        shop_id: SHOP_ID,
        customer_id: selectedCustomer?.id || null,
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

      // Ensure items have full product object & unit_name attached for receipt printing & WhatsApp
      const enrichedSale: Sale = {
        ...sale,
        customer: selectedCustomer || sale.customer,
        items: (sale.items || []).map((saleItem, idx) => {
          const cartMatch = cart[idx] || cart.find((c) => c.product.id === saleItem.product_id);
          return {
            ...saleItem,
            product: saleItem.product || cartMatch?.product,
            unit_name: cartMatch?.unitName,
            unit_multiplier: cartMatch?.unitMultiplier,
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
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans select-none">
      {/* POS Top Bar */}
      <header className="h-14 bg-brand-700 text-white px-3 sm:px-4 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href="/" className="p-1.5 rounded-lg bg-brand-800 hover:bg-brand-900 transition-colors text-white shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
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
            onClick={() => setMobileTab(mobileTab === "catalog" ? "cart" : "catalog")}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-bold shrink-0 relative transition-all active:scale-95 cursor-pointer shadow-inner"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{mobileTab === "catalog" ? `Cart (${cart.length})` : "Products"}</span>
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

          {/* Held Bills dropdown/button */}
          {heldBills.length > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-amber-200 font-semibold">{heldBills.length} Held</span>
              {heldBills.map((b, idx) => (
                <Button
                  key={b.id}
                  size="sm"
                  variant="outline"
                  onClick={() => handleResumeBill(b)}
                  className="bg-amber-500 hover:bg-amber-600 text-white border-none text-xs gap-1"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  #{idx + 1}
                </Button>
              ))}
            </div>
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

      {/* Main Split Interface */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Product catalog & Search (Full width on mobile when catalog active, 60% on desktop) */}
        <div
          className={cn(
            "flex-1 bg-surface-canvas border-r border-gray-200 overflow-hidden flex flex-col",
            mobileTab === "catalog" ? "flex" : "hidden lg:flex"
          )}
        >
          {/* Content Row: Catalog Area on Left + Slim Category Icon Rail on Right */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Product Matrix & Search Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Search Header */}
              <div className="p-3 bg-white border-b border-gray-200 space-y-2">
                <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Scan barcode or search product / SKU..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all shadow-inner"
                      autoFocus
                    />
                    <Barcode className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                  </div>

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

              {/* Product Cards Grid */}
              <div className="flex-1 p-2.5 sm:p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5 sm:gap-3 content-start">
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

                    return (
                      <div
                        key={p.id}
                        className={`bg-white rounded-2xl border border-gray-200 p-2.5 sm:p-3 flex flex-col justify-between hover:border-purple-400 hover:shadow-md transition-all relative ${
                          !inStock ? "opacity-60 bg-gray-50" : ""
                        }`}
                      >
                        <div className="space-y-1">
                          {/* Top Badge Row */}
                          <div className="flex items-center justify-between gap-1">
                            {isTopSeller ? (
                              <span className="text-[9px] sm:text-[10px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                <Flame className="w-3 h-3 text-amber-600" /> Top ({salesCount})
                              </span>
                            ) : (
                              <span className="text-[9px] text-gray-400 font-mono truncate max-w-[80px]">
                                {p.sku || p.barcode || ""}
                              </span>
                            )}
                            <span
                              className={`text-[9px] sm:text-[10px] font-bold ${
                                inStock ? "text-emerald-700" : "text-rose-600"
                              }`}
                            >
                              {inStock
                                ? `${stockQty} pcs ${stockQty >= 12 ? `(${Math.floor(stockQty / 12)}d)` : ""}`
                                : "Out"}
                            </span>
                          </div>

                          <span className="text-xs font-bold text-gray-900 line-clamp-2 leading-tight block">
                            {p.name}
                          </span>
                        </div>

                        <div className="mt-2.5 pt-1.5 border-t border-gray-100 space-y-1.5">
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
                            <div className="text-[10px] text-gray-500 font-semibold">
                              1 Doz (12 pcs): <span className="font-bold text-indigo-900">{formatCurrency(pricing.dozenPrice)}</span>
                            </div>
                          </div>

                          {/* Quick Add Buttons: 1 Pc vs 1 Dozen */}
                          <div className="flex gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={() => addToCart(p, "piece", 1)}
                              className="flex-1 py-1.5 bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-700 text-[10px] sm:text-[11px] font-bold rounded-xl transition-colors flex items-center justify-center gap-0.5 cursor-pointer active:scale-95"
                              title={`Add 1 Piece (${formatCurrency(effectivePiecePrice)})`}
                            >
                              <Plus className="w-3 h-3" /> 1 Pc
                            </button>
                            <button
                              type="button"
                              onClick={() => addToCart(p, "dozen", 1)}
                              className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 text-[10px] sm:text-[11px] font-bold rounded-xl transition-colors flex items-center justify-center gap-0.5 cursor-pointer active:scale-95"
                              title={`Add 1 Dozen (${formatCurrency(pricing.dozenPrice)})`}
                            >
                              <Plus className="w-3 h-3" /> 1 Doz
                            </button>
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
            <div className="lg:hidden p-3 bg-white border-t border-gray-200 shadow-xl flex items-center justify-between gap-3 shrink-0">
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-500 font-medium">
                  {cart.reduce((s, i) => s + i.quantity, 0)} items in bill
                </span>
                <span className="text-base font-extrabold text-brand-700">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileTab("cart")}
                className="px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>View Cart & Pay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Active Cart & Bill Operations (Full width on mobile when cart active, 40% on desktop) */}
        <div
          className={cn(
            "w-full lg:w-96 xl:w-[440px] bg-white flex-col justify-between border-l border-gray-200 shadow-lg overflow-y-auto lg:overflow-visible",
            mobileTab === "cart" ? "flex" : "hidden lg:flex"
          )}
        >
          {/* Mobile Back to Products Bar */}
          <div className="lg:hidden p-2.5 bg-brand-50 border-b border-brand-100 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={() => setMobileTab("catalog")}
              className="flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-800 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← Back to Products</span>
            </button>
            <span className="text-xs font-bold text-gray-700">
              Total: {formatCurrency(subtotal)}
            </span>
          </div>

          {/* Customer Selection bar */}
          <div className="p-4 border-b border-gray-200 bg-gray-50/70 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <User className="w-4 h-4 text-gray-400 shrink-0" />
              <select
                value={selectedCustomer?.id || ""}
                onChange={(e) => {
                  const cust = customers.find((c) => c.id === e.target.value) || null;
                  setSelectedCustomer(cust);
                }}
                className="w-full text-xs bg-white border border-gray-300 rounded-md py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-brand-600 text-gray-900 font-medium"
              >
                <option value="">Walk-in Customer (Standard Retail)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>
            {selectedCustomer && (
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-[11px] text-gray-400 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>

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
                    {/* Top Row: Name & Remove */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-900 truncate">
                          {item.product.name}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          {item.product.barcode || item.product.sku || "No Barcode"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-gray-300 hover:text-rose-600 p-1 transition-colors rounded-lg hover:bg-rose-50"
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
                          value={item.unitPrice}
                          onChange={(e) => updatePriceOverride(index, parseFloat(e.target.value) || 0)}
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
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
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
                onClick={handleHoldBill}
                disabled={cart.length === 0}
                className="text-xs font-medium gap-1 text-gray-700"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                Hold Bill
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                disabled={cart.length === 0}
                className="text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                Clear Cart
              </Button>
            </div>

            {/* Primary Checkout Button */}
            <Button
              size="lg"
              onClick={handleOpenCheckout}
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
                  value={cashAmount}
                  onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                  className="w-28 p-1.5 border border-gray-300 rounded font-semibold text-right"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">UPI Portion:</span>
                <input
                  type="number"
                  value={upiAmount}
                  onChange={(e) => setUpiAmount(parseFloat(e.target.value) || 0)}
                  className="w-28 p-1.5 border border-gray-300 rounded font-semibold text-right"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">Card Portion:</span>
                <input
                  type="number"
                  value={cardAmount}
                  onChange={(e) => setCardAmount(parseFloat(e.target.value) || 0)}
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

      {/* Receipt & Thermal Invoice Modal with WhatsApp Sharing */}
      <Modal
        isOpen={isReceiptModalOpen && !!completedSale}
        onClose={() => setIsReceiptModalOpen(false)}
        title="🧾 Billing Invoice & Thermal Receipt"
        maxWidth="md"
      >
        {completedSale && (
          <ThermalReceipt
            sale={completedSale}
            customer={selectedCustomer}
            shopId={SHOP_ID}
            onDone={() => setIsReceiptModalOpen(false)}
            onOpenPrinterSettings={() => setIsPrinterModalOpen(true)}
          />
        )}
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
        initialSearchQuery={searchQuery}
      />
    </div>
  );
}
