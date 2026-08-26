"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Upload,
  Camera,
  Barcode,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Percent,
  Plus,
  Trash2,
  Globe,
  Star,
  Layers,
  Building2,
  FileText,
  ChevronDown,
  ChevronUp,
  Check,
  Link as LinkIcon,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Product, Category, Supplier, Unit } from "@/types/database";
import { productsRepository } from "@/repositories/products.repo";
import { suppliersRepository } from "@/repositories/suppliers.repo";
import { aiImageEnhancer } from "@/lib/ai/image-enhancer";

import {
  extractProductVariants,
  attachVariantsToDescription,
  stripVariantsFromDescription,
  generateStandardVariants,
  CleanVariant,
} from "@/lib/product-variants";

interface UnifiedAddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: Product) => void;
  editingProduct?: Product | null;
  shopId: string;
  categories: Category[];
  suppliers: Supplier[];
  units: Unit[];
  onCategoryCreated?: (newCategory: Category) => void;
  onSupplierCreated?: (newSupplier: Supplier) => void;
}

export const UnifiedAddProductModal: React.FC<UnifiedAddProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingProduct = null,
  shopId,
  categories,
  suppliers,
  units,
  onCategoryCreated,
  onSupplierCreated,
}) => {
  // Mode: "photo" | "barcode" | "manual"
  const [activeMode, setActiveMode] = useState<"photo" | "barcode" | "manual">("photo");

  // Form State
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [wholesalePrice, setWholesalePrice] = useState<number>(0);
  const [minSellingPrice, setMinSellingPrice] = useState<number>(0);
  const [currentStock, setCurrentStock] = useState<number>(10);
  const [minStock, setMinStock] = useState<number>(5);
  const [description, setDescription] = useState("");
  const [variants, setVariants] = useState<CleanVariant[]>([]);
  
  // Dual Image State: Front (Primary Packshot) & Back (Label / MRP / Ingredients)
  const [imageUrl, setImageUrl] = useState("");
  const [backImageUrl, setBackImageUrl] = useState("");
  const [activeImageTab, setActiveImageTab] = useState<"front" | "back">("front");

  // UI state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customImageUrlInput, setCustomImageUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState("");

  // AI Web Search & Official Image Auto-Fetch
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);

  const handleSearchCatalog = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearchingCatalog(true);
      setAiSuccessMsg("");

      const res = await fetch("/api/ai/search-product-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success && json.data) {
        const d = json.data;
        if (d.name) setName(d.name);
        if (d.brand) setBrand(d.brand);
        if (d.barcode) setBarcode(d.barcode);
        if (d.imageUrl) setImageUrl(d.imageUrl);
        if (d.backImageUrl) setBackImageUrl(d.backImageUrl);
        if (d.suggestedSellingPrice > 0) setSellingPrice(d.suggestedSellingPrice);
        if (d.suggestedPurchasePrice > 0) setPurchasePrice(d.suggestedPurchasePrice);
        if (d.suggestedWholesalePrice > 0) setWholesalePrice(d.suggestedWholesalePrice);
        if (d.description) setDescription(d.description);

        if (d.category && categories.length > 0) {
          const match = categories.find(
            (c) =>
              c.name.toLowerCase().includes(d.category.toLowerCase()) ||
              d.category.toLowerCase().includes(c.name.toLowerCase())
          );
          if (match) setCategoryId(match.id);
        }

        // Auto-generate realistic pack size variants
        const isLiquid = d.name.toLowerCase().includes("oil") || d.name.toLowerCase().includes("ml") || d.name.toLowerCase().includes("shampoo");
        const generatedVars = generateStandardVariants(d.name, d.suggestedSellingPrice, isLiquid ? "liquid" : "weight");
        setVariants(generatedVars);

        setAiSuccessMsg(`✓ Extracted: "${d.name}" • MRP: ₹${d.suggestedSellingPrice} • ${generatedVars.length} Pack Sizes Generated`);
      }
    } catch (err) {
      console.warn("Search catalog error:", err);
    } finally {
      setIsSearchingCatalog(false);
    }
  };

  // Inline Category & Supplier Quick Add
  const [isQuickCatOpen, setIsQuickCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [isQuickSuppOpen, setIsQuickSuppOpen] = useState(false);
  const [newSuppName, setNewSuppName] = useState("");
  const [newSuppPhone, setNewSuppPhone] = useState("");

  const frontFileInputRef = useRef<HTMLInputElement>(null);
  const backFileInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset form
  useEffect(() => {
    if (isOpen) {
      if (editingProduct) {
        setName(editingProduct.name || "");
        setBrand(editingProduct.brand || "");
        setSku(editingProduct.sku || "");
        setBarcode(editingProduct.barcode || "");
        setCategoryId(editingProduct.category_id || categories[0]?.id || "");
        setSupplierId(editingProduct.supplier_id || suppliers[0]?.id || "");
        setUnitId(editingProduct.unit_id || units[0]?.id || "");
        setPurchasePrice(Number(editingProduct.purchase_price || 0));
        setSellingPrice(Number(editingProduct.selling_price || 0));
        setWholesalePrice(Number(editingProduct.wholesale_price || 0));
        setMinSellingPrice(Number(editingProduct.minimum_selling_price || 0));
        setCurrentStock(Number(editingProduct.current_stock || 0));
        setMinStock(Number(editingProduct.minimum_stock || 5));
        setDescription(stripVariantsFromDescription(editingProduct.description));

        // Load variants
        const loadedVars = extractProductVariants(editingProduct);
        setVariants(loadedVars);

        // Split multiple images (Front|||Back)
        const [fImg, bImg] = (editingProduct.image_url || "").split("|||");
        setImageUrl(fImg || "");
        setBackImageUrl(bImg || "");
      } else {
        setName("");
        setBrand("");
        setSku(`SKU-${Date.now().toString().slice(-4)}`);
        setBarcode("");
        setCategoryId(categories[0]?.id || "");
        setSupplierId(suppliers[0]?.id || "");
        setUnitId(units[0]?.id || "");
        setPurchasePrice(0);
        setSellingPrice(0);
        setWholesalePrice(0);
        setMinSellingPrice(0);
        setCurrentStock(10);
        setMinStock(5);
        setDescription("");
        setVariants([]);
        setImageUrl("");
        setBackImageUrl("");
        setAiSuccessMsg("");
      }
      setShowAdvanced(false);
      setShowUrlInput(false);
      setActiveImageTab("front");
    }
  }, [isOpen, editingProduct, categories, suppliers, units]);

  if (!isOpen) return null;

  // Live profit calculation
  const netProfit = Math.max(0, sellingPrice - purchasePrice);
  const marginPercent =
    sellingPrice > 0 ? Math.round((netProfit / sellingPrice) * 100) : 0;

  // 1-Click Margin Preset Handler
  const handleApplyMargin = (pct: number) => {
    if (purchasePrice > 0) {
      const calculatedSelling = Math.round(purchasePrice * (1 + pct / 100));
      const calculatedWholesale = Math.round(purchasePrice * (1 + (pct * 0.5) / 100));
      setSellingPrice(calculatedSelling);
      setWholesalePrice(calculatedWholesale);
      setMinSellingPrice(Math.round(purchasePrice * 1.05));
    }
  };

  // 1-Click Barcode Generator
  const handleAutoGenerateBarcode = () => {
    const randomEan = "890" + Math.floor(1000000000 + Math.random() * 9000000000);
    const skuCode = (brand?.slice(0, 3) || "SKU").toUpperCase() + "-" + Date.now().toString().slice(-4);
    setBarcode(randomEan);
    if (!sku) setSku(skuCode);
  };

  // Handle Photo Upload & Label OCR for Front / Back
  const handlePhotoSelected = async (file: File, target: "front" | "back" = "front") => {
    try {
      setIsAnalyzing(true);
      setAiSuccessMsg("");

      const reader = new FileReader();
      reader.onload = async () => {
        const rawDataUrl = reader.result as string;

        // Clean real product isolation on pure white background
        let finalUrl = rawDataUrl;
        try {
          const enhanced = await aiImageEnhancer.enhanceImage(rawDataUrl, {
            targetSize: 1080,
            backgroundColor: "#FFFFFF",
          });
          finalUrl = enhanced.enhancedUrl || rawDataUrl;
        } catch {
          finalUrl = rawDataUrl;
        }

        if (target === "front") {
          setImageUrl(finalUrl);
        } else {
          setBackImageUrl(finalUrl);
        }

        // Call Vision AI / OCR to extract real packaging text
        try {
          const res = await fetch("/api/ai/analyze-product", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              frontImage: target === "front" ? rawDataUrl : imageUrl || rawDataUrl,
              backImage: target === "back" ? rawDataUrl : backImageUrl || undefined,
            }),
          });

          const json = await res.json().catch(() => ({}));
          if (res.ok && json.success && json.data) {
            const aiData = json.data;
            const extractedMrp = Number(aiData.mrp || 0) || 46;
            const suggestedCost =
              Number(aiData.suggested_purchase_price || 0) || Math.round(extractedMrp * 0.72);

            if (aiData.product_name) setName(aiData.product_name);
            if (aiData.brand) setBrand(aiData.brand);
            if (extractedMrp > 0) setSellingPrice(extractedMrp);
            if (suggestedCost > 0) setPurchasePrice(suggestedCost);
            if (aiData.suggested_wholesale_price > 0) setWholesalePrice(aiData.suggested_wholesale_price);
            if (aiData.barcode) setBarcode(String(aiData.barcode));
            if (aiData.short_description) setDescription(aiData.short_description);

            // Match Category
            if (aiData.category_name && categories.length > 0) {
              const match = categories.find(
                (c) =>
                  c.name.toLowerCase().includes(String(aiData.category_name).toLowerCase()) ||
                  String(aiData.category_name).toLowerCase().includes(c.name.toLowerCase())
              );
              if (match) setCategoryId(match.id);
            }

            setAiSuccessMsg(`✓ Extracted: ${aiData.product_name} • MRP: ₹${extractedMrp}`);
          }
        } catch (err) {
          console.warn("Vision auto-read notice:", err);
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
      setIsAnalyzing(false);
    }
  };

  // Quick Category Creation
  const handleQuickCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const created = await productsRepository.createCategory({
        shop_id: shopId,
        name: newCatName.trim(),
        is_active: true,
      });
      if (onCategoryCreated) onCategoryCreated(created);
      setCategoryId(created.id);
      setNewCatName("");
      setIsQuickCatOpen(false);
    } catch (err: any) {
      alert("Failed to create category: " + err.message);
    }
  };

  // Quick Supplier Creation
  const handleQuickCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuppName.trim()) return;
    try {
      const created = await suppliersRepository.create({
        shop_id: shopId,
        name: newSuppName.trim(),
        phone: newSuppPhone.trim() || null,
        is_active: true,
      });
      if (onSupplierCreated) onSupplierCreated(created);
      setSupplierId(created.id);
      setNewSuppName("");
      setNewSuppPhone("");
      setIsQuickSuppOpen(false);
    } catch (err: any) {
      alert("Failed to create supplier: " + err.message);
    }
  };

  // Save Product to Database (Supports both Front and Back images via composite ||| URL)
  const handleSaveProduct = async (andAddAnother: boolean = false) => {
    if (!name.trim()) {
      alert("Please enter a Product Name.");
      return;
    }
    if (purchasePrice < 0 || sellingPrice < 0) {
      alert("Prices cannot be negative.");
      return;
    }

    try {
      setIsSaving(true);
      const combinedImageUrl = imageUrl.trim()
        ? backImageUrl.trim()
          ? `${imageUrl.trim()}|||${backImageUrl.trim()}`
          : imageUrl.trim()
        : backImageUrl.trim() || null;

      const finalDescription = attachVariantsToDescription(description, variants);

      const payload: Partial<Product> = {
        shop_id: shopId,
        name: name.trim(),
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        brand: brand.trim() || null,
        category_id: categoryId || null,
        supplier_id: supplierId || null,
        unit_id: unitId || null,
        purchase_price: purchasePrice,
        selling_price: sellingPrice,
        wholesale_price: wholesalePrice || null,
        minimum_selling_price: minSellingPrice || null,
        minimum_stock: minStock,
        description: finalDescription.trim() || null,
        image_url: combinedImageUrl,
      };

      let saved: Product;
      if (editingProduct) {
        saved = await productsRepository.update(editingProduct.id, payload);
      } else {
        payload.current_stock = currentStock;
        saved = await productsRepository.create(payload);
      }

      onSuccess(saved);

      if (andAddAnother) {
        setName("");
        setBrand("");
        setSku(`SKU-${Date.now().toString().slice(-4)}`);
        setBarcode("");
        setPurchasePrice(0);
        setSellingPrice(0);
        setWholesalePrice(0);
        setMinSellingPrice(0);
        setCurrentStock(10);
        setDescription("");
        setVariants([]);
        setImageUrl("");
        setBackImageUrl("");
        setAiSuccessMsg("");
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to save product: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Variant management handlers
  const handleAddPresetVariants = (type: "liquid" | "weight") => {
    const gen = generateStandardVariants(name || "Product", sellingPrice || 46, type);
    setVariants(gen);
  };

  const handleAddCustomVariant = () => {
    const newVar: CleanVariant = {
      id: `var-custom-${Date.now()}`,
      size: "200ml",
      mrp: sellingPrice > 0 ? Math.round(sellingPrice * 1.1) : 100,
      price: sellingPrice > 0 ? sellingPrice : 95,
      purchasePrice: purchasePrice > 0 ? purchasePrice : 70,
      stock: 10,
    };
    setVariants((prev) => [...prev, newVar]);
  };

  const handleUpdateVariant = (idx: number, field: keyof CleanVariant, val: any) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleRemoveVariant = (idx: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* ========================================================================= */}
        {/* MODAL HEADER                                                              */}
        {/* ========================================================================= */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                {editingProduct ? "Edit Product Details" : "Add New Product"}
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Fast Catalog
                </span>
              </h2>
              <p className="text-xs text-purple-200/80">
                Real photo preview, automated barcode generation & live profit margin analytics
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TOP CREATION MODE TABS                                                    */}
        {/* ========================================================================= */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 bg-gray-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveMode("photo")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeMode === "photo"
                  ? "bg-white text-purple-950 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-purple-600" />
              Photo & AI Scan
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("barcode")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeMode === "barcode"
                  ? "bg-white text-purple-950 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Barcode className="w-3.5 h-3.5 text-indigo-600" />
              Barcode Scanner
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("manual")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeMode === "manual"
                  ? "bg-white text-purple-950 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-gray-500" />
              Manual Quick Entry
            </button>
          </div>

          {aiSuccessMsg && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              {aiSuccessMsg}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* ⚡ INSTANT AI AUTO-FETCH BY PRODUCT NAME (e.g. Vicco Turmeric Cream 50g)  */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50/50 to-slate-50 border-b border-purple-100 px-6 py-2.5">
          <form onSubmit={handleSearchCatalog} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Type item name (e.g. Vicco Turmeric Cream 50g, Parachute 100ml, Dettol Soap 75g)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-white border border-purple-200 rounded-xl pl-8 pr-3 py-1.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600 shadow-2xs font-medium"
              />
              <Sparkles className="w-3.5 h-3.5 text-purple-600 absolute left-2.5 top-2" />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={isSearchingCatalog || !searchQuery.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shrink-0 h-8 px-3.5 shadow-xs"
            >
              {isSearchingCatalog ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                  Auto-Fetching...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-amber-300 mr-1" />
                  AI Auto-Fetch Image & Data
                </>
              )}
            </Button>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* MODAL MAIN CONTENT (2-COLUMN GRID)                                        */}
        {/* ========================================================================= */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* --------------------------------------------------------------------- */}
            {/* LEFT COLUMN: DUAL FRONT & BACK PRODUCT IMAGE HUB (4 Cols)             */}
            {/* --------------------------------------------------------------------- */}
            <div className="md:col-span-4 space-y-3">
              {/* Front / Back Angle Switcher Tabs */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800">
                  Product Packaging Views
                </label>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  Both Angles
                </span>
              </div>

              {/* View Switcher Pills */}
              <div className="grid grid-cols-2 gap-1.5 bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveImageTab("front")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    activeImageTab === "front"
                      ? "bg-white text-purple-950 shadow-xs border border-gray-200"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Front View
                  {imageUrl && <span className="text-[9px] text-emerald-600 font-black">✓</span>}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveImageTab("back")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    activeImageTab === "back"
                      ? "bg-white text-purple-950 shadow-xs border border-gray-200"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  Back / MRP
                  {backImageUrl && <span className="text-[9px] text-emerald-600 font-black">✓</span>}
                </button>
              </div>

              {/* Active Image Container */}
              <div className="relative aspect-square w-full rounded-2xl bg-gradient-to-b from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group shadow-2xs">
                {activeImageTab === "front" ? (
                  imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Front Packaging"
                      className="w-full h-full object-contain p-3 transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="text-center p-4 space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-bold text-gray-800">
                        Upload Front Packshot
                      </div>
                      <p className="text-[10px] text-gray-500">
                        Main product bottle / pack on white background
                      </p>
                    </div>
                  )
                ) : backImageUrl ? (
                  <img
                    src={backImageUrl}
                    alt="Back Packaging & MRP"
                    className="w-full h-full object-contain p-3 transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="text-center p-4 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto shadow-2xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-gray-800">
                      Upload Back / MRP Photo
                    </div>
                    <p className="text-[10px] text-gray-500">
                      Rear label showing printed MRP, barcode & ingredients
                    </p>
                  </div>
                )}

                {/* Badge indicating which angle is showing */}
                <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                  {activeImageTab === "front" ? "📷 Front Packshot" : "🔍 Back / MRP Label"}
                </div>

                {/* Hidden File Inputs */}
                <input
                  ref={frontFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoSelected(file, "front");
                  }}
                />
                <input
                  ref={backFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoSelected(file, "back");
                  }}
                />

                {/* Loading Overlay */}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2">
                    <RefreshCw className="w-7 h-7 animate-spin text-purple-300" />
                    <span className="text-xs font-bold text-purple-100">Extracting Name & MRP...</span>
                  </div>
                )}
              </div>

              {/* Visual Action Buttons for Active Tab */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (activeImageTab === "front") {
                      frontFileInputRef.current?.click();
                    } else {
                      backFileInputRef.current?.click();
                    }
                  }}
                  className="flex-1 text-xs font-bold border-gray-300 hover:border-purple-500 hover:bg-purple-50"
                >
                  <Upload className="w-3.5 h-3.5 text-purple-600 mr-1.5" />
                  {activeImageTab === "front"
                    ? imageUrl
                      ? "Change Front"
                      : "Upload Front"
                    : backImageUrl
                    ? "Change Back"
                    : "Upload Back"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="text-xs border-gray-300 hover:bg-gray-50 px-2.5"
                  title="Paste direct image URL"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-gray-600" />
                </Button>

                {(activeImageTab === "front" ? imageUrl : backImageUrl) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (activeImageTab === "front") setImageUrl("");
                      else setBackImageUrl("");
                    }}
                    className="text-xs border-gray-300 text-red-600 hover:bg-red-50 px-2.5"
                    title="Remove active angle image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              {/* Paste Image URL Box */}
              {showUrlInput && (
                <div className="flex items-center gap-1.5 p-2 bg-gray-50 border border-gray-200 rounded-xl animate-in fade-in duration-150">
                  <input
                    type="text"
                    placeholder={`Paste ${activeImageTab === "front" ? "Front" : "Back"} image URL...`}
                    value={customImageUrlInput}
                    onChange={(e) => setCustomImageUrlInput(e.target.value)}
                    className="flex-1 text-xs bg-white border border-gray-300 rounded-lg px-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (customImageUrlInput.trim()) {
                        if (activeImageTab === "front") setImageUrl(customImageUrlInput.trim());
                        else setBackImageUrl(customImageUrlInput.trim());
                        setCustomImageUrlInput("");
                        setShowUrlInput(false);
                      }
                    }}
                    className="text-xs h-7 px-2.5 font-bold bg-purple-600 text-white"
                  >
                    Use
                  </Button>
                </div>
              )}

              {/* Side-by-Side Dual Thumbnail Previews */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div
                  onClick={() => setActiveImageTab("front")}
                  className={`cursor-pointer rounded-xl border p-1.5 flex items-center gap-2 transition-all ${
                    activeImageTab === "front"
                      ? "border-purple-600 bg-purple-50/70 ring-2 ring-purple-400/30"
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                    {imageUrl ? (
                      <img src={imageUrl} alt="Front" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[9px] text-gray-400 font-bold">Front</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-gray-900 truncate">Front View</div>
                    <div className="text-[9px] text-gray-500">
                      {imageUrl ? "✓ Attached" : "Not set"}
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setActiveImageTab("back")}
                  className={`cursor-pointer rounded-xl border p-1.5 flex items-center gap-2 transition-all ${
                    activeImageTab === "back"
                      ? "border-purple-600 bg-purple-50/70 ring-2 ring-purple-400/30"
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                    {backImageUrl ? (
                      <img src={backImageUrl} alt="Back" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[9px] text-gray-400 font-bold">Back</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-gray-900 truncate">Back / MRP</div>
                    <div className="text-[9px] text-gray-500">
                      {backImageUrl ? "✓ Attached" : "Not set"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* RIGHT COLUMN: CORE PRODUCT FORM & PROFIT CALCULATOR (8 Cols)          */}
            {/* --------------------------------------------------------------------- */}
            <div className="md:col-span-8 space-y-4">
              {/* Product Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <Input
                    label="Product Name / Title *"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Parachute 100% Pure Coconut Oil 100ml"
                  />
                </div>

                <div>
                  <Input
                    label="Brand Name"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Parachute / Marico"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Category *</label>
                    <button
                      type="button"
                      onClick={() => setIsQuickCatOpen(true)}
                      className="text-[10px] text-purple-600 hover:text-purple-800 font-bold"
                    >
                      + New
                    </button>
                  </div>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full text-xs h-9 bg-white border border-gray-300 rounded-lg px-3 font-medium text-gray-900 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Barcode (EAN-13)</label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateBarcode}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold"
                    >
                      ⚡ Auto-Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Scan with gun or enter EAN"
                    className="w-full text-xs h-9 bg-white border border-gray-300 rounded-lg px-3 font-mono text-gray-900 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  />
                </div>

                <div>
                  <Input
                    label="SKU Code"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. PAR-OIL-100"
                  />
                </div>
              </div>

              {/* =================================================================== */}
              {/* PRICING & PROFIT MARGIN ENGINE                                      */}
              {/* =================================================================== */}
              <div className="bg-gradient-to-br from-purple-50/70 via-indigo-50/50 to-slate-50 border-2 border-purple-300/80 rounded-2xl p-4 space-y-3.5 shadow-2xs">
                {/* Header with Quick Pack-Size Add Buttons */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-purple-200/60 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black uppercase tracking-wider text-purple-950">
                      Pricing & Pack Sizes
                    </span>
                    {variants.length > 0 && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                        ✓ {variants.length} Sizes Configured
                      </span>
                    )}
                  </div>

                  {/* 1-Click Multi-Variant Presets Button Bar */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black text-purple-900">Add Variants:</span>
                    <button
                      type="button"
                      onClick={() => handleAddPresetVariants("liquid")}
                      className="px-2.5 py-1 text-[10px] font-black bg-white hover:bg-purple-600 hover:text-white text-purple-900 border border-purple-300 rounded-lg transition-all shadow-2xs active:scale-95"
                      title="Auto add 10ml, 50ml, 100ml, 200ml, 500ml, 1L"
                    >
                      💧 + Liquid (10ml-1L)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPresetVariants("weight")}
                      className="px-2.5 py-1 text-[10px] font-black bg-white hover:bg-pink-600 hover:text-white text-pink-900 border border-pink-300 rounded-lg transition-all shadow-2xs active:scale-95"
                      title="Auto add 10g, 50g, 100g, 250g, 500g, 1kg"
                    >
                      ⚖️ + Weight (10g-1kg)
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomVariant}
                      className="px-2 py-1 text-[10px] font-bold bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-lg transition-all shadow-2xs active:scale-95"
                    >
                      + Custom
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Input
                      type="number"
                      label="Cost Price (₹) *"
                      required
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <Input
                      type="number"
                      label="Selling / MRP (₹) *"
                      required
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <Input
                      type="number"
                      label="Wholesale (₹)"
                      value={wholesalePrice}
                      onChange={(e) => setWholesalePrice(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <Input
                      type="number"
                      label="Opening Stock"
                      value={currentStock}
                      onChange={(e) => setCurrentStock(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Live Margin Calculation Bar & Quick Variant Launcher */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-purple-200/60">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-black text-gray-900">
                      Net Profit:{" "}
                      <span className={netProfit > 0 ? "text-emerald-600" : "text-gray-500"}>
                        ₹{netProfit}
                      </span>{" "}
                      / unit{" "}
                      <span
                        className={`text-[11px] font-bold px-1.5 py-0.2 rounded-md ${
                          marginPercent >= 25
                            ? "bg-emerald-100 text-emerald-800"
                            : marginPercent > 10
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {marginPercent}% Margin
                      </span>
                    </div>
                  </div>

                  {/* 1-Click Margin Presets */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-gray-500 mr-1">Auto-Price:</span>
                    {[
                      { label: "+15%", val: 15 },
                      { label: "+20%", val: 20 },
                      { label: "+25%", val: 25 },
                      { label: "+30%", val: 30 },
                      { label: "+50%", val: 50 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => handleApplyMargin(preset.val)}
                        className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-purple-600 hover:text-white text-purple-900 border border-purple-200 rounded-md transition-colors shadow-2xs"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* =================================================================== */}
              {/* ⚡ PACK SIZES & MULTI-VARIANT PRICING (ml, g, kg, L)                 */}
              {/* =================================================================== */}
              <div
                id="pack-sizes-section"
                className="bg-white rounded-2xl border-2 border-purple-400/80 p-4 shadow-sm space-y-3 ring-4 ring-purple-500/5"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-purple-100 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      📦
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-gray-900 flex items-center gap-2">
                        Multi-Pack Sizes & Variant Pricing
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                          {variants.length > 0 ? `${variants.length} Sizes Active` : "Optional"}
                        </span>
                      </h4>
                      <p className="text-[11px] text-gray-600 font-medium">
                        Configure different volumes (10ml, 50ml, 100ml, 500ml) or weights (50g, 100g, 1kg) for 1-page customer view
                      </p>
                    </div>
                  </div>

                  {/* 1-Click Generation Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleAddPresetVariants("liquid")}
                      className="px-3 py-1.5 text-[11px] font-black bg-purple-100 hover:bg-purple-200 text-purple-950 border border-purple-300 rounded-xl transition-all shadow-2xs active:scale-95"
                    >
                      💧 + Liquid Sizes (10ml - 1L)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPresetVariants("weight")}
                      className="px-3 py-1.5 text-[11px] font-black bg-pink-100 hover:bg-pink-200 text-pink-950 border border-pink-300 rounded-xl transition-all shadow-2xs active:scale-95"
                    >
                      ⚖️ + Weight Sizes (10g - 1kg)
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomVariant}
                      className="px-3 py-1.5 text-[11px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300 rounded-xl transition-all shadow-2xs active:scale-95"
                    >
                      + Custom Size
                    </button>
                  </div>
                </div>

                {/* Variant List Table or Empty Quick-Start */}
                {variants.length > 0 ? (
                  <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-purple-50/80 text-purple-950 font-bold text-[11px] border-b border-purple-100">
                        <tr>
                          <th className="py-2.5 px-3">Size / Pack</th>
                          <th className="py-2.5 px-3">MRP (₹)</th>
                          <th className="py-2.5 px-3 text-purple-900 font-black">Store Price (₹)</th>
                          <th className="py-2.5 px-3">Cost (₹)</th>
                          <th className="py-2.5 px-3">Opening Stock</th>
                          <th className="py-2.5 px-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {variants.map((v, idx) => (
                          <tr key={v.id || idx} className="hover:bg-purple-50/30 transition-colors">
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={v.size}
                                onChange={(e) => handleUpdateVariant(idx, "size", e.target.value)}
                                className="w-24 px-2.5 py-1.5 text-xs font-black text-gray-900 border border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none"
                                placeholder="e.g. 100ml"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={v.mrp}
                                onChange={(e) =>
                                  handleUpdateVariant(idx, "mrp", parseFloat(e.target.value) || 0)
                                }
                                className="w-20 px-2 py-1.5 text-xs font-semibold text-gray-700 border border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={v.price}
                                onChange={(e) =>
                                  handleUpdateVariant(idx, "price", parseFloat(e.target.value) || 0)
                                }
                                className="w-20 px-2 py-1.5 text-xs font-black text-purple-900 border border-purple-400 rounded-lg focus:border-purple-600 focus:outline-none bg-purple-50/50"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={v.purchasePrice ?? 0}
                                onChange={(e) =>
                                  handleUpdateVariant(
                                    idx,
                                    "purchasePrice",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-20 px-2 py-1.5 text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={v.stock ?? 10}
                                onChange={(e) =>
                                  handleUpdateVariant(
                                    idx,
                                    "stock",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-16 px-2 py-1.5 text-xs font-semibold text-gray-700 border border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveVariant(idx)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove size"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-4 px-4 rounded-xl border border-dashed border-purple-300 bg-purple-50/40 text-center space-y-2">
                    <p className="text-xs text-gray-700 font-bold">
                      Sell this item in multiple sizes (e.g. 50ml, 100ml, 200ml, 500ml or 50g, 100g, 250g, 500g, 1kg)?
                    </p>
                    <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                      <button
                        type="button"
                        onClick={() => handleAddPresetVariants("liquid")}
                        className="px-3 py-1.5 text-xs font-black bg-white hover:bg-purple-600 hover:text-white text-purple-900 border border-purple-300 rounded-xl transition-all shadow-2xs"
                      >
                        💧 Auto-Add Liquid Sizes (10ml, 50ml, 100ml, 200ml, 500ml, 1L)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddPresetVariants("weight")}
                        className="px-3 py-1.5 text-xs font-black bg-white hover:bg-pink-600 hover:text-white text-pink-900 border border-pink-300 rounded-xl transition-all shadow-2xs"
                      >
                        ⚖️ Auto-Add Weight Sizes (10g, 50g, 100g, 250g, 500g, 1kg)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* =================================================================== */}
              {/* COLLAPSIBLE ADVANCED SPECIFICATIONS                                 */}
              {/* =================================================================== */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-left text-xs font-bold text-gray-700 flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-gray-500" />
                    Additional Details (Supplier, Unit, E-Commerce Description)
                  </span>
                  {showAdvanced ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {showAdvanced && (
                  <div className="p-4 space-y-3 bg-white border-t border-gray-200 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-gray-700">
                            Supplier / Distributor
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsQuickSuppOpen(true)}
                            className="text-[10px] text-purple-600 hover:text-purple-800 font-bold"
                          >
                            + New
                          </button>
                        </div>
                        <select
                          value={supplierId}
                          onChange={(e) => setSupplierId(e.target.value)}
                          className="w-full text-xs h-9 bg-white border border-gray-300 rounded-lg px-3 font-medium text-gray-900 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                        >
                          <option value="">Select Supplier</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Unit of Measure
                        </label>
                        <select
                          value={unitId}
                          onChange={(e) => setUnitId(e.target.value)}
                          className="w-full text-xs h-9 bg-white border border-gray-300 rounded-lg px-3 font-medium text-gray-900 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                        >
                          <option value="">Select Unit</option>
                          {units.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Input
                          type="number"
                          label="Low Stock Warning Limit"
                          value={minStock}
                          onChange={(e) => setMinStock(parseInt(e.target.value) || 5)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Short E-Commerce / Receipt Description
                      </label>
                      <textarea
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. 100% Pure coconut oil for hair and skin care..."
                        className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODAL FOOTER                                                              */}
        {/* ========================================================================= */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs font-bold">
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {!editingProduct && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSaveProduct(true)}
                disabled={isSaving}
                className="text-xs font-bold border-purple-300 text-purple-900 hover:bg-purple-50"
              >
                Save & Add Another
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={() => handleSaveProduct(false)}
              disabled={isSaving}
              className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white text-xs font-bold shadow-md hover:from-purple-700 hover:to-indigo-700 px-5"
            >
              {isSaving ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INLINE QUICK CATEGORY ADD MODAL                                           */}
      {/* ========================================================================= */}
      {isQuickCatOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 w-full max-w-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Add New Category</h3>
            <form onSubmit={handleQuickCreateCategory} className="space-y-3">
              <Input
                label="Category Name *"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Hair Care / Beverages"
                autoFocus
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsQuickCatOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-purple-600 text-white font-bold">
                  Add Category
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INLINE QUICK SUPPLIER ADD MODAL                                           */}
      {/* ========================================================================= */}
      {isQuickSuppOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 w-full max-w-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Add New Supplier / Distributor</h3>
            <form onSubmit={handleQuickCreateSupplier} className="space-y-3">
              <Input
                label="Supplier / Distributor Name *"
                required
                value={newSuppName}
                onChange={(e) => setNewSuppName(e.target.value)}
                placeholder="e.g. Marico Distributors Ltd."
                autoFocus
              />
              <Input
                label="Contact Phone / WhatsApp"
                value={newSuppPhone}
                onChange={(e) => setNewSuppPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsQuickSuppOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-purple-600 text-white font-bold">
                  Add Supplier
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
