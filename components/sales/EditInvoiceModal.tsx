"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Minus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Truck,
  User,
  Calculator,
  Save,
  Package,
  Receipt,
  Sparkles,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Sale, SaleItem, Product, Customer } from "@/types/database";
import { productsRepository } from "@/repositories/products.repo";
import { customersRepository } from "@/repositories/customers.repo";
import { posRepository, UpdateSalePayload } from "@/repositories/pos.repo";
import { formatCurrency } from "@/lib/utils";
import { parseFreightCharge } from "@/lib/thermal-printer";

interface EditInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  onSuccess: (updatedSale: Sale) => void;
  shopId?: string;
}

interface EditableItem {
  id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  unit_name?: string;
  unit_multiplier?: number;
  is_price_overridden?: boolean;
}

export const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({
  isOpen,
  onClose,
  sale,
  onSuccess,
  shopId = "",
}) => {
  const [items, setItems] = useState<EditableItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [freightAmount, setFreightAmount] = useState<number>(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerNotes, setCustomerNotes] = useState<string>("");

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [productSearch, setProductSearch] = useState<string>("");

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Initialize data on modal open
  useEffect(() => {
    if (isOpen && sale) {
      const initialItems: EditableItem[] = (sale.items || []).map((it) => {
        const pName = it.product?.name || (it as any).product_name || "Product Item";
        return {
          id: it.id,
          product_id: it.product_id,
          product_name: pName,
          quantity: it.quantity,
          unit_price: Number(it.unit_price) || 0,
          cost_price: Number(it.cost_price) || 0,
          unit_name: (it as any).unit_name || "pc",
          unit_multiplier: (it as any).unit_multiplier || 1,
          is_price_overridden: it.is_price_overridden || false,
        };
      });

      setItems(initialItems);
      setDiscountAmount(Number(sale.discount_amount) || 0);
      setFreightAmount(parseFreightCharge(sale));
      setSelectedCustomerId(sale.customer_id || null);
      setCustomerNotes(
        sale.notes ? sale.notes.replace(/\[Freight:.*\]/gi, "").trim() : ""
      );
      setErrorMessage("");

      // Load products and customers
      loadCatalogAndCustomers();
    }
  }, [isOpen, sale]);

  const loadCatalogAndCustomers = async () => {
    try {
      const [prods, custs] = await Promise.all([
        productsRepository.getAll(shopId),
        customersRepository.getAll(shopId),
      ]);
      setAllProducts(prods || []);
      setAllCustomers(custs || []);
    } catch (err) {
      console.warn("Failed to load catalog/customers in EditInvoiceModal:", err);
    }
  };

  if (!isOpen || !sale) return null;

  // Quantity updates
  const handleUpdateQty = (index: number, delta: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        updated.splice(index, 1);
      } else {
        updated[index] = { ...updated[index], quantity: newQty };
      }
      return updated;
    });
  };

  const handleUpdatePrice = (index: number, newPrice: number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        unit_price: Math.max(0, newPrice),
        is_price_overridden: true,
      };
      return updated;
    });
  };

  const handleDeleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Add Product into invoice
  const handleAddProduct = (prod: Product) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.product_id === prod.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [
        ...prev,
        {
          product_id: prod.id,
          product_name: prod.name,
          quantity: 1,
          unit_price: Number(prod.selling_price) || 0,
          cost_price: Number(prod.purchase_price) || 0,
          unit_name: "pc",
          unit_multiplier: 1,
          is_price_overridden: false,
        },
      ];
    });
    setProductSearch("");
  };

  // Totals calculations
  const subtotal = items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
  const taxAmount = Number(sale.tax_amount) || 0;
  const totalAmount = Math.max(0, subtotal - discountAmount + taxAmount + freightAmount);

  // Filtered products for add search
  const filteredProducts = productSearch.trim()
    ? allProducts
        .filter(
          (p) =>
            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            p.barcode?.toLowerCase().includes(productSearch.toLowerCase()) ||
            p.sku?.toLowerCase().includes(productSearch.toLowerCase())
        )
        .slice(0, 6)
    : [];

  // Save changes
  const handleSaveChanges = async () => {
    if (items.length === 0) {
      setErrorMessage("Invoice must have at least 1 item. (बिल में कम से कम 1 सामान होना चाहिए)");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");

      const notesParts: string[] = [];
      if (customerNotes.trim()) {
        notesParts.push(customerNotes.trim());
      }
      if (freightAmount > 0) {
        notesParts.push(`[Freight: ₹${freightAmount}]`);
      }

      const payload: UpdateSalePayload = {
        sale_id: sale.id,
        shop_id: shopId,
        customer_id: selectedCustomerId || null,
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        notes: notesParts.length > 0 ? notesParts.join(" | ") : undefined,
        items: items.map((it) => ({
          id: it.id,
          product_id: it.product_id,
          quantity: it.quantity,
          unit_price: it.unit_price,
          cost_price: it.cost_price,
          unit_name: it.unit_name,
          unit_multiplier: it.unit_multiplier,
          is_price_overridden: it.is_price_overridden,
        })),
        payments: (sale.payments || []).map((p) => ({
          method: p.method as any,
          amount: totalAmount,
          reference_no: p.reference_no || undefined,
        })),
      };

      const updated = await posRepository.updateSale(payload);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      console.error("Failed to update invoice:", err);
      setErrorMessage(err.message || "Failed to update invoice. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-purple-700 via-indigo-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>✏️ Edit Invoice #{sale.invoice_number}</span>
                <span className="text-[10px] font-bold bg-amber-400 text-slate-950 px-2 py-0.2 rounded-full">
                  Modify Items & Rate
                </span>
              </h3>
              <p className="text-[10px] text-purple-200">
                Update quantities, add items, adjust rate, discount, or freight charges
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-gray-50/50">
          {/* Top Bar: Customer Selector + Add Product Search */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Customer Dropdown (5 cols) */}
            <div className="md:col-span-5 bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
              <label className="block text-[11px] font-bold text-gray-700 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-purple-600" />
                <span>Customer (ग्राहक)</span>
              </label>
              <select
                value={selectedCustomerId || ""}
                onChange={(e) => setSelectedCustomerId(e.target.value || null)}
                className="w-full text-xs font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-600"
              >
                <option value="">Walk-in Customer (सामान्य ग्राहक)</option>
                {allCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(+91 ${c.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Quick Search & Add (7 cols) */}
            <div className="md:col-span-7 bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs relative space-y-1">
              <label className="block text-[11px] font-bold text-gray-700 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Add Product to Bill (सामान जोड़ें)</span>
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by product name, barcode or SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {filteredProducts.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 overflow-hidden divide-y divide-gray-100 max-h-56 overflow-y-auto">
                  {filteredProducts.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleAddProduct(prod)}
                      className="w-full px-3 py-2 text-left hover:bg-purple-50 flex items-center justify-between text-xs transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-gray-900">{prod.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          Stock: {prod.current_stock} • Price: {formatCurrency(prod.selling_price)}
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-purple-600 text-white font-black text-[10px] rounded-lg">
                        + Add
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-100 border-b border-gray-200 grid grid-cols-12 text-[10px] font-black uppercase text-gray-600 tracking-wider">
              <div className="col-span-5 sm:col-span-6">Product Item</div>
              <div className="col-span-3 sm:col-span-2 text-center">Rate (₹)</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Total (₹)</div>
            </div>

            <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto p-1">
              {items.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs font-bold">
                  No items in invoice. Use the search bar above to add products.
                </div>
              ) : (
                items.map((item, idx) => {
                  const lineTotal = item.unit_price * item.quantity;
                  return (
                    <div
                      key={idx}
                      className="p-2.5 grid grid-cols-12 items-center gap-2 hover:bg-gray-50/80 transition-colors"
                    >
                      {/* Product Name & Delete */}
                      <div className="col-span-5 sm:col-span-6 flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(idx)}
                          className="w-6 h-6 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                          title="Remove item from invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-black text-gray-900 truncate">
                            {item.product_name}
                          </h4>
                          <span className="text-[10px] text-gray-500 font-mono">
                            Item #{idx + 1}
                          </span>
                        </div>
                      </div>

                      {/* Unit Price Input */}
                      <div className="col-span-3 sm:col-span-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-[11px] font-bold text-gray-400">₹</span>
                          <input
                            type="number"
                            step="any"
                            value={item.unit_price === 0 ? "" : item.unit_price}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) =>
                              handleUpdatePrice(idx, parseFloat(e.target.value) || 0)
                            }
                            className="w-16 px-1.5 py-1 text-xs border border-gray-300 rounded-lg font-black text-gray-900 text-right focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                          />
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="col-span-2 flex items-center justify-center">
                        <div className="flex items-center border border-gray-300 rounded-lg bg-white shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, -1)}
                            className="px-1.5 py-0.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-l-lg transition-colors cursor-pointer"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="px-2 text-xs font-black text-gray-900 tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, 1)}
                            className="px-1.5 py-0.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-r-lg transition-colors cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>

                      {/* Line Total */}
                      <div className="col-span-2 text-right">
                        <span className="text-xs font-black text-gray-900 tabular-nums">
                          {formatCurrency(lineTotal)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Totals, Discount & Freight Summary Card */}
          <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Left: Notes & Delivery details */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-gray-700">
                Invoice Notes / Remarks (टिप्पणी)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Bus transport delivery, customer special discount..."
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
              />
            </div>

            {/* Right: Calculations Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Items Subtotal:</span>
                <span className="font-bold text-gray-900 tabular-nums">{formatCurrency(subtotal)}</span>
              </div>

              {/* Discount Input */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">🎁 Bill Discount:</span>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">- ₹</span>
                  <input
                    type="number"
                    value={discountAmount === 0 ? "" : discountAmount}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-20 px-2 py-1 text-xs border border-gray-300 rounded-lg font-bold text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-gray-50"
                  />
                </div>
              </div>

              {/* 🚚 Freight / Delivery Charges Input */}
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-amber-600" />
                  <span>🚚 भाड़ा / Freight:</span>
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">+ ₹</span>
                  <input
                    type="number"
                    value={freightAmount === 0 ? "" : freightAmount}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setFreightAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-20 px-2 py-1 text-xs border border-amber-300 rounded-lg font-black text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-amber-50"
                  />
                </div>
              </div>

              {taxAmount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>GST / Tax:</span>
                  <span className="font-bold text-gray-900 tabular-nums">+{formatCurrency(taxAmount)}</span>
                </div>
              )}

              {/* Grand Total */}
              <div className="flex justify-between items-center pt-2 border-t-2 border-gray-900 text-sm font-black text-gray-900">
                <span>Revised Net Total:</span>
                <span className="text-purple-700 text-base font-black tabular-nums">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between gap-2 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSaveChanges}
            disabled={isSaving || items.length === 0}
            isLoading={isSaving}
            className="bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white font-black text-xs gap-1.5 shadow-md active:scale-95 cursor-pointer px-5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>✓ Save & Update Invoice (बिल अपडेट करें)</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
