"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Plus,
  Package,
  Barcode as BarcodeIcon,
  DollarSign,
  TrendingUp,
  Layers,
  Sparkles,
  Check,
  AlertCircle,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Product, Category } from "@/types/database";
import { productsRepository } from "@/repositories/products.repo";
import { UnitKey } from "@/lib/units-pricing";
import { CameraBarcodeScanner } from "@/components/pos/CameraBarcodeScanner";

interface PosQuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: Product, selectedUnit: UnitKey, quantity: number) => void;
  shopId: string;
  categories: Category[];
  initialSearchQuery?: string;
}

export const PosQuickAddModal: React.FC<PosQuickAddModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  shopId,
  categories,
  initialSearchQuery = "",
}) => {
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [purchasePrice, setPurchasePrice] = useState<number | "">("");
  const [sellingPrice, setSellingPrice] = useState<number | "">("");
  const [wholesalePrice, setWholesalePrice] = useState<number | "">("");
  const [currentStock, setCurrentStock] = useState<number>(12);
  const [selectedUnit, setSelectedUnit] = useState<UnitKey>("piece");
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Initialize and pre-fill when opened
  useEffect(() => {
    if (isOpen) {
      const query = initialSearchQuery.trim();
      const isNumericBarcode = /^\d{4,16}$/.test(query);

      if (isNumericBarcode) {
        setBarcode(query);
        setName("");
      } else {
        setName(query);
        setBarcode("");
      }

      setSku(`SKU-${Date.now().toString().slice(-6)}`);
      setPurchasePrice("");
      setSellingPrice("");
      setWholesalePrice("");
      setCurrentStock(12);
      setSelectedUnit("piece");
      setAddQuantity(1);
      setErrorMsg("");

      if (categories.length > 0 && !categoryId) {
        setCategoryId(categories[0].id);
      }

      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialSearchQuery]);

  if (!isOpen) return null;

  // Auto-suggest wholesale price when selling price is entered
  const handleSellingPriceChange = (val: string) => {
    const num = val === "" ? "" : Number(val);
    setSellingPrice(num);
    if (typeof num === "number" && num > 0 && (wholesalePrice === "" || wholesalePrice === 0)) {
      // Suggest ~10% discount on a full dozen
      setWholesalePrice(Math.round(num * 12 * 0.9));
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const newCat = await productsRepository.createCategory({
        shop_id: shopId,
        name: newCategoryName.trim(),
        is_active: true,
      });
      setCategoryId(newCat.id);
      setIsCreatingCategory(false);
      setNewCategoryName("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create category");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Please enter a product name");
      nameInputRef.current?.focus();
      return;
    }
    if (!sellingPrice || Number(sellingPrice) <= 0) {
      setErrorMsg("Please enter a valid selling price");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg("");

      const productData: Partial<Product> = {
        shop_id: shopId,
        name: name.trim(),
        barcode: barcode.trim() || null,
        sku: sku.trim() || null,
        category_id: categoryId || null,
        purchase_price: purchasePrice ? Number(purchasePrice) : 0,
        selling_price: Number(sellingPrice),
        wholesale_price: wholesalePrice ? Number(wholesalePrice) : null,
        current_stock: Number(currentStock) || 0,
        minimum_stock: 5,
        is_active: true,
        description: "Added via POS Quick Add",
      };

      const createdProduct = await productsRepository.create(productData);
      onSuccess(createdProduct, selectedUnit, addQuantity);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to add product. Please check database permissions.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">⚡ Quick Add Product to POS</h2>
              <p className="text-xs text-purple-100">Create new product & immediately add to active bill</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs font-semibold text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Product Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <Input
              ref={nameInputRef}
              type="text"
              required
              placeholder="e.g. Maybelline Matte Lipstick Red 01"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl text-sm font-semibold focus:ring-purple-500"
            />
          </div>

          {/* Category & Barcode Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
              {!isCreatingCategory ? (
                <div className="flex gap-1.5">
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  >
                    <option value="">General / No Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory(true)}
                    className="px-2.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-all"
                    title="Add Category"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <Input
                    type="text"
                    placeholder="New category..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="rounded-xl text-xs font-semibold"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateCategory}
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs px-3"
                  >
                    Add
                  </Button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory(false)}
                    className="px-2 text-gray-400 hover:text-gray-600 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700">Barcode / SKU</label>
                <button
                  type="button"
                  onClick={() => setIsCameraScannerOpen(true)}
                  className="text-[10px] text-purple-700 hover:text-purple-900 font-black flex items-center gap-1 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-lg border border-purple-200 transition-colors cursor-pointer"
                  title="Scan Barcode using Device Camera"
                >
                  <Camera className="w-3 h-3 text-purple-600" />
                  <span>📷 Scan with Camera</span>
                </button>
              </div>
              <div className="relative flex gap-1.5">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    placeholder="Scan or enter barcode"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="rounded-xl text-xs font-mono pl-8"
                  />
                  <BarcodeIcon className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  type="button"
                  onClick={() => setIsCameraScannerOpen(true)}
                  className="p-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
                  title="Open Camera Scanner"
                >
                  <Camera className="w-4 h-4 text-purple-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-3">
            <h4 className="text-xs font-black text-purple-900 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-purple-600" />
              <span>Pricing & Unit Rates (₹)</span>
            </h4>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Cost Price */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Purchase / Cost</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">₹</span>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="rounded-xl text-xs font-bold pl-6"
                  />
                </div>
              </div>

              {/* Retail Selling Price (Per Piece) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-900 mb-1">
                  Retail Price (Per Pc) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-purple-600 font-black">₹</span>
                  <Input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    placeholder="0.00"
                    value={sellingPrice}
                    onChange={(e) => handleSellingPriceChange(e.target.value)}
                    className="rounded-xl text-xs font-black text-purple-900 pl-6 border-purple-300 focus:ring-purple-500 bg-white"
                  />
                </div>
              </div>

              {/* Wholesale / Dozen Rate */}
              <div>
                <label className="block text-[11px] font-bold text-indigo-900 mb-1">Dozen / Wholes. Rate</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-indigo-600 font-black">₹</span>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Rate / 12 pcs"
                    value={wholesalePrice}
                    onChange={(e) => setWholesalePrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="rounded-xl text-xs font-bold text-indigo-900 pl-6 border-indigo-200 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Initial Stock & Cart Add Option */}
          <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Initial Stock Count (Pcs)</label>
              <Input
                type="number"
                min="0"
                placeholder="12"
                value={currentStock === 0 ? "" : currentStock}
                onChange={(e) => setCurrentStock(e.target.value === "" ? 0 : Number(e.target.value))}
                className="rounded-xl text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Add to Bill In Unit:</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedUnit("piece")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    selectedUnit === "piece"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  Piece (1 pc)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUnit("dozen")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    selectedUnit === "dozen"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  Dozen (12 pcs)
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs font-bold px-4"
            >
              Cancel (Esc)
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white rounded-xl text-xs font-black px-6 shadow-md shadow-purple-500/20 active:scale-95 transition-all"
            >
              {isSaving ? "Saving..." : "⚡ Save & Add to Active Bill"}
            </Button>
          </div>
        </form>
      </div>

      {/* Live Camera Barcode Scanner Sub-Modal */}
      <CameraBarcodeScanner
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScan={(scannedCode) => {
          const clean = scannedCode.trim();
          if (clean) {
            setBarcode(clean);
          }
          setIsCameraScannerOpen(false);
        }}
      />
    </div>
  );
};
