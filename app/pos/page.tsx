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
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  ShoppingCart,
  Wifi,
  WifiOff,
  Camera,
  CloudUpload,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { productsRepository } from "@/repositories/products.repo";
import { customersRepository } from "@/repositories/customers.repo";
import { posRepository, CheckoutPayload } from "@/repositories/pos.repo";
import { Product, Category, Customer, Sale } from "@/types/database";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { offlinePosEngine } from "@/lib/offline-pos";
import { ThermalReceipt } from "@/components/pos/ThermalReceipt";
import { CameraBarcodeScanner } from "@/components/pos/CameraBarcodeScanner";


const SHOP_ID = process.env.DEFAULT_SHOP_ID || "a0000000-0000-0000-0000-000000000001";

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  isPriceOverridden: boolean;
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

  // Load catalog data (with offline cache fallback)
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
      offlinePosEngine.cacheCustomers(custs);
    } catch (err) {
      console.warn("Online catalog load failed, loading from offline cache:", err);
      const cachedProds = offlinePosEngine.getCachedCatalog();
      const cachedCusts = offlinePosEngine.getCachedCustomers();
      if (cachedProds.length > 0) setProducts(cachedProds);
      if (cachedCusts.length > 0) setCustomers(cachedCusts);
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

    // Check exact barcode match first
    const matched = products.find(
      (p) =>
        p.barcode?.toLowerCase() === searchQuery.trim().toLowerCase() ||
        p.sku?.toLowerCase() === searchQuery.trim().toLowerCase()
    );

    if (matched) {
      addToCart(matched);
      setSearchQuery("");
    }
  };

  // Add product to cart
  const addToCart = (product: Product) => {
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    const customPrice = customerPrices[product.id];
    const unitPrice = customPrice !== undefined ? customPrice : Number(product.selling_price);

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          unitPrice,
          originalPrice: Number(product.selling_price),
          isPriceOverridden: customPrice !== undefined,
        },
      ]);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    const updated = [...cart];
    const newQty = updated[index].quantity + delta;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = newQty;
    }
    setCart(updated);
  };

  const updatePriceOverride = (index: number, newPrice: number) => {
    const updated = [...cart];
    updated[index].unitPrice = Math.max(0, newPrice);
    updated[index].isPriceOverridden = true;
    setCart(updated);
  };

  const removeItem = (index: number) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
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

      setCompletedSale(sale);
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

  // Filter products by category and search
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === "all" || p.category_id === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
            "flex-1 flex-col bg-surface-canvas border-r border-gray-200 overflow-hidden",
            mobileTab === "catalog" ? "flex" : "hidden lg:flex"
          )}
        >
          {/* Search & Category Header */}
          <div className="p-4 bg-white border-b border-gray-200 space-y-3">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Scan barcode (camera/scanner) or search product name / SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-12 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white transition-all shadow-inner"
                  autoFocus
                />
                <Barcode className="w-5 h-5 text-gray-400 absolute right-3 top-2.5" />
              </div>

              {/* Camera Scanner Trigger Button */}
              <button
                type="button"
                onClick={() => setIsCameraScannerOpen(true)}
                className="px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
                title="Scan Barcode with Device Camera"
              >
                <Camera className="w-4 h-4 text-amber-300" />
                <span className="hidden sm:inline">Camera Scan</span>
              </button>
            </form>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                  selectedCategory === "all"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All Products ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? "bg-brand-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="flex-1 p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
            {filteredProducts.map((p) => {
              const inStock = Number(p.current_stock) > 0;
              const customPrice = customerPrices[p.id];
              const effectivePrice = customPrice !== undefined ? customPrice : Number(p.selling_price);

              return (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`bg-white rounded-xl border border-gray-200 p-3 flex flex-col justify-between hover:border-brand-500 hover:shadow-md cursor-pointer transition-all active:scale-[0.98] ${
                    !inStock ? "opacity-60 bg-gray-50" : ""
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-xs font-bold text-gray-900 line-clamp-2 leading-tight">
                        {p.name}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span className="font-mono">{p.sku || p.barcode || "No SKU"}</span>
                      <span
                        className={`font-semibold ${
                          inStock ? "text-emerald-700" : "text-red-600"
                        }`}
                      >
                        {inStock ? `${p.current_stock} in stock` : "Out of Stock"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-brand-700 tabular-nums">
                        {formatCurrency(effectivePrice)}
                      </div>
                      {customPrice !== undefined && (
                        <span className="text-[10px] text-brand-600 font-semibold flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> Special Price
                        </span>
                      )}
                    </div>
                    <button className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center hover:bg-brand-600 hover:text-white transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile Floating Cart Summary Bar (appears when catalog is active and cart has items) */}
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
              cart.map((item, index) => (
                <div key={item.product.id} className="p-2.5 flex items-center justify-between gap-2 group hover:bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-900 truncate">
                      {item.product.name}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center border border-gray-300 rounded bg-white">
                        <button
                          onClick={() => updateQuantity(index, -1)}
                          className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-gray-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(index, 1)}
                          className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-xs text-gray-500">×</span>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updatePriceOverride(index, parseFloat(e.target.value) || 0)}
                        className="w-16 px-1.5 py-0.5 text-xs border border-gray-200 rounded font-semibold text-gray-800 text-right focus:outline-none focus:ring-1 focus:ring-brand-600"
                        title="Edit price override"
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-gray-900 tabular-nums">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </div>
                    <button
                      onClick={() => removeItem(index)}
                      className="text-gray-300 hover:text-red-600 p-1 transition-colors mt-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
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
            onDone={() => setIsReceiptModalOpen(false)}
          />
        )}
      </Modal>

      {/* Live Camera Barcode Scanner Modal */}
      <CameraBarcodeScanner
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScan={(scannedCode) => {
          const matched = products.find(
            (p) =>
              p.barcode?.toLowerCase() === scannedCode.toLowerCase() ||
              p.sku?.toLowerCase() === scannedCode.toLowerCase()
          );
          if (matched) {
            addToCart(matched);
          } else {
            alert(`No product found matching barcode: ${scannedCode}`);
          }
        }}
      />
    </div>
  );
}
