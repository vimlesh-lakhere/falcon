"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { findInIndianRetailCatalog, searchIndianRetailCatalog } from "@/lib/catalog/indian-retail-catalog";
import { transliterateToHindi, transliterateSync } from "@/lib/transliterate";
import { capitalizeFirstLetter } from "@/lib/utils";
import { getProductOnlineConfig } from "@/lib/product-online";

import {
  extractProductVariants,
  attachVariantsToDescription,
  stripVariantsFromDescription,
  generateStandardVariants,
  CleanVariant,
} from "@/lib/product-variants";
import { CameraBarcodeScanner } from "@/components/pos/CameraBarcodeScanner";
import { ProductPhotoCameraModal } from "@/components/products/ProductPhotoCameraModal";

interface UnifiedAddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: Product) => void;
  editingProduct?: Product | null;
  shopId: string;
  categories: Category[];
  suppliers: Supplier[];
  units: Unit[];
  existingProducts?: Product[];
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
  existingProducts = [],
  onCategoryCreated,
  onSupplierCreated,
}) => {
  // Mode: "photo" | "barcode" | "manual"
  const [activeMode, setActiveMode] = useState<"photo" | "barcode" | "manual">("photo");

  // Form State
  const [name, setName] = useState("");
  const [nameHindi, setNameHindi] = useState("");
  const [isTransliterating, setIsTransliterating] = useState(false);
  const [brand, setBrand] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [mrp, setMrp] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [wholesalePrice, setWholesalePrice] = useState<number>(0);
  const [wholesaleMinQty, setWholesaleMinQty] = useState<number>(12);
  const [minSellingPrice, setMinSellingPrice] = useState<number>(0);
  const [currentStock, setCurrentStock] = useState<number>(10);
  const [minStock, setMinStock] = useState<number>(5);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [onlinePrice, setOnlinePrice] = useState<string>("");
  const [description, setDescription] = useState("");
  const [variants, setVariants] = useState<CleanVariant[]>([]);
  const [hasVariants, setHasVariants] = useState<boolean>(false);
  
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
  const [isCameraCaptureOpen, setIsCameraCaptureOpen] = useState(false);
  const [isPhotoActionSheetOpen, setIsPhotoActionSheetOpen] = useState(false);
  const [autoScanWithAi, setAutoScanWithAi] = useState(false);
  const [autoStudioPolish, setAutoStudioPolish] = useState(true);
  const [isPolishing, setIsPolishing] = useState(false);

  const handleOpenGalleryPicker = () => {
    setIsPhotoActionSheetOpen(false);
    if (activeImageTab === "front") {
      frontFileInputRef.current?.click();
    } else {
      backFileInputRef.current?.click();
    }
  };

  const handleOpenCameraCapture = () => {
    setIsPhotoActionSheetOpen(false);
    setIsCameraCaptureOpen(true);
  };

  // Existing Product Duplicate Detection & 1-Click Variant Autofill State
  const [isNameSuggestionsOpen, setIsNameSuggestionsOpen] = useState(true);
  const [linkedExistingProduct, setLinkedExistingProduct] = useState<Product | null>(null);

  // Filter matching existing products to prevent duplicates & enable 1-click variant auto-fill
  const matchingExistingProducts = useMemo(() => {
    if (editingProduct || !existingProducts || existingProducts.length === 0 || !name.trim() || name.trim().length < 2) {
      return [];
    }
    const q = name.trim().toLowerCase();
    return existingProducts
      .filter((p) => {
        const pName = (p.name || "").toLowerCase();
        const pBrand = (p.brand || "").toLowerCase();
        return pName.includes(q) || pBrand.includes(q) || (p.barcode && p.barcode.includes(q));
      })
      .slice(0, 5);
  }, [existingProducts, name, editingProduct]);

  // Handler to auto-fill details from an existing product to create a new variant easily
  const handleSelectExistingProduct = (p: Product) => {
    setName(p.name);
    setNameHindi(p.name_hindi || "");
    setBrand(p.brand || "");
    if (p.category_id) setCategoryId(p.category_id);
    if (p.supplier_id) setSupplierId(p.supplier_id);
    if (p.unit_id) setUnitId(p.unit_id);
    if (p.description) {
      const cleanDesc = stripVariantsFromDescription(p.description);
      setDescription(cleanDesc || p.description);
    }
    if (p.image_url) setImageUrl(p.image_url);
    if ((p as any).back_image_url) setBackImageUrl((p as any).back_image_url);

    // Turn ON variants and load existing product sizes + new size row
    setHasVariants(true);
    const existingVars = extractProductVariants(p);
    if (existingVars && existingVars.length > 1) {
      setVariants([
        ...existingVars,
        {
          id: `var-new-${Date.now()}`,
          size: "",
          mrp: 0,
          price: 0,
          purchasePrice: 0,
          stock: 10,
        },
      ]);
    } else {
      const baseUnitName = units.find((u) => u.id === p.unit_id)?.name || "Standard Pack";
      setVariants([
        {
          id: `var-base-${Date.now()}`,
          size: baseUnitName,
          mrp: Number((p as any).mrp) || Number(p.selling_price) || 0,
          price: Number(p.selling_price) || 0,
          purchasePrice: Number(p.purchase_price) || 0,
          stock: Number(p.current_stock) || 0,
          barcode: p.barcode || undefined,
          sku: p.sku || undefined,
        },
        {
          id: `var-new-${Date.now() + 1}`,
          size: "",
          mrp: 0,
          price: 0,
          purchasePrice: 0,
          stock: 10,
        },
      ]);
    }

    setPurchasePrice(Number(p.purchase_price) || 0);
    setSellingPrice(Number(p.selling_price) || 0);
    setWholesalePrice(Number(p.wholesale_price) || 0);
    setMinSellingPrice(Number((p as any).min_selling_price) || 0);

    // Auto-generate a new unique barcode and SKU suggestion for the new variant
    const randomEan = "890" + Math.floor(1000000000 + Math.random() * 9000000000);
    setBarcode(randomEan);
    setSku((p.brand?.slice(0, 3) || "SKU").toUpperCase() + "-" + Date.now().toString().slice(-4));

    setLinkedExistingProduct(p);
    setIsNameSuggestionsOpen(false);
  };

  // AI Web Search & Master Indian Retail Catalog
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
  const [isCatalogDropdownOpen, setIsCatalogDropdownOpen] = useState(false);
  const [rawFrontPhoto, setRawFrontPhoto] = useState<string>("");
  const [rawBackPhoto, setRawBackPhoto] = useState<string>("");

  const liveCatalogMatches = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return [];
    return searchIndianRetailCatalog(searchQuery.trim(), 10);
  }, [searchQuery]);

  const handleSelectCatalogItem = async (item: any) => {
    if (item.name) {
      setName(capitalizeFirstLetter(item.name));
      try {
        const hi = await transliterateToHindi(item.name);
        if (hi) setNameHindi(hi);
      } catch {}
    }
    if (item.brand) setBrand(capitalizeFirstLetter(item.brand));
    if (item.barcode) setBarcode(item.barcode);
    if (item.mrp > 0) setSellingPrice(item.mrp);
    if (item.purchasePrice > 0) setPurchasePrice(item.purchasePrice);
    if (item.wholesalePrice > 0) setWholesalePrice(item.wholesalePrice);
    if (item.description) setDescription(item.description);

    if (item.category && categories.length > 0) {
      const match = categories.find(
        (c) =>
          c.name.toLowerCase().includes(item.category.toLowerCase()) ||
          item.category.toLowerCase().includes(c.name.toLowerCase())
      );
      if (match) setCategoryId(match.id);
    }

    const isLiquid =
      item.name.toLowerCase().includes("oil") ||
      item.name.toLowerCase().includes("ml") ||
      item.name.toLowerCase().includes("shampoo");
    const generatedVars = generateStandardVariants(
      item.name,
      item.mrp,
      isLiquid ? "liquid" : "weight"
    );
    setVariants(generatedVars);

    setAiSuccessMsg(
      `⚡ Loaded from Master Catalog: "${capitalizeFirstLetter(item.name)}" • MRP: ₹${item.mrp}`
    );
    setIsCatalogDropdownOpen(false);
  };

  const handleOnlineWebSearch = async (term: string) => {
    if (!term || !term.trim()) return;
    try {
      setIsSearchingCatalog(true);
      setAiSuccessMsg("");
      setIsCatalogDropdownOpen(false);

      const res = await fetch("/api/ai/search-product-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: term.trim() }),
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success && json.data) {
        const d = json.data;
        if (d.name) {
          setName(capitalizeFirstLetter(d.name));
          try {
            const hi = await transliterateToHindi(d.name);
            if (hi) setNameHindi(hi);
          } catch {}
        }
        if (d.brand) setBrand(capitalizeFirstLetter(d.brand));
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

        const isLiquid =
          d.name.toLowerCase().includes("oil") ||
          d.name.toLowerCase().includes("ml") ||
          d.name.toLowerCase().includes("shampoo");
        const generatedVars = generateStandardVariants(
          d.name,
          d.suggestedSellingPrice,
          isLiquid ? "liquid" : "weight"
        );
        setVariants(generatedVars);

        setAiSuccessMsg(
          `🌐 Online Web Match: "${d.name}" • MRP: ₹${d.suggestedSellingPrice}`
        );
      } else {
        setAiSuccessMsg("⚠️ No exact online product found. Please fill in details above.");
      }
    } catch (e: any) {
      console.warn("Online search error:", e);
      setAiSuccessMsg("⚠️ Online search failed. Please check internet connection.");
    } finally {
      setIsSearchingCatalog(false);
    }
  };

  const handleSearchCatalog = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearchingCatalog(true);
      setAiSuccessMsg("");

      // 1. Check 100% Offline Master Indian Retail Catalog (0.01s instant match)
      const localMatch = findInIndianRetailCatalog(searchQuery.trim());
      if (localMatch) {
        handleSelectCatalogItem(localMatch);
        setIsSearchingCatalog(false);
        return;
      }

      // 2. Search Online Database
      await handleOnlineWebSearch(searchQuery.trim());
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
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

  const frontFileInputRef = useRef<HTMLInputElement>(null);
  const backFileInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset form
  useEffect(() => {
    if (isOpen) {
      if (editingProduct) {
        setName(editingProduct.name || "");
        setNameHindi(editingProduct.name_hindi || "");
        setBrand(editingProduct.brand || "");
        setSku(editingProduct.sku || "");
        setBarcode(editingProduct.barcode || "");
        setCategoryId(editingProduct.category_id || categories[0]?.id || "");
        setSupplierId(editingProduct.supplier_id || suppliers[0]?.id || "");
        setUnitId(editingProduct.unit_id || units[0]?.id || "");
        setPurchasePrice(Number(editingProduct.purchase_price || 0));
        setMrp(Number((editingProduct as any).mrp || editingProduct.selling_price || 0));
        setSellingPrice(Number(editingProduct.selling_price || 0));
        setWholesalePrice(Number(editingProduct.wholesale_price || 0));
        setWholesaleMinQty(Number((editingProduct as any).wholesale_min_qty || 12));
        setMinSellingPrice(Number(editingProduct.minimum_selling_price || 0));
        setCurrentStock(Number(editingProduct.current_stock || 0));
        setMinStock(Number(editingProduct.minimum_stock || 5));
        const onlineCfg = getProductOnlineConfig(editingProduct);
        setIsOnline(onlineCfg.isOnline);
        setOnlinePrice(onlineCfg.onlinePrice ? String(onlineCfg.onlinePrice) : "");
        setDescription(stripVariantsFromDescription(editingProduct.description));

        // Load variants
        const loadedVars = extractProductVariants(editingProduct);
        if (loadedVars && loadedVars.length > 1) {
          setHasVariants(true);
          setVariants(loadedVars);
        } else {
          setHasVariants(false);
          setVariants([]);
        }

        // Split multiple images (Front|||Back)
        const [fImg, bImg] = (editingProduct.image_url || "").split("|||");
        setImageUrl(fImg || "");
        setBackImageUrl(bImg || "");
      } else {
        setName("");
        setNameHindi("");
        setBrand("");
        setSku(`SKU-${Date.now().toString().slice(-4)}`);
        setBarcode("");
        setCategoryId(categories[0]?.id || "");
        setSupplierId(suppliers[0]?.id || "");
        setUnitId(units[0]?.id || "");
        setPurchasePrice(0);
        setMrp(0);
        setSellingPrice(0);
        setWholesalePrice(0);
        setWholesaleMinQty(12);
        setMinSellingPrice(0);
        setCurrentStock(10);
        setMinStock(5);
        setIsOnline(true);
        setOnlinePrice("");
        setDescription("");
        setHasVariants(false);
        setVariants([]);
        setImageUrl("");
        setBackImageUrl("");
        setAiSuccessMsg("");
        setLinkedExistingProduct(null);
        setIsNameSuggestionsOpen(true);
      }
      setShowAdvanced(false);
      setShowUrlInput(false);
      setActiveImageTab("front");
    }
  }, [isOpen, editingProduct, categories, suppliers, units]);

  // Auto-transliterate English name to Hindi with 300ms debounce
  useEffect(() => {
    if (!name || !name.trim()) return;

    // Avoid overwriting existing custom Hindi name on initial edit load
    if (editingProduct && editingProduct.name_hindi && name === editingProduct.name) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsTransliterating(true);
      try {
        const hi = await transliterateToHindi(name.trim());
        if (hi) setNameHindi(hi);
      } catch (err) {
        console.warn("Auto transliterate notice:", err);
      } finally {
        setIsTransliterating(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [name, editingProduct]);

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

  // 100% Offline Barcode Auto-Fill from Master Indian Retail Catalog
  const handleBarcodeAutoFill = async (barcodeVal: string) => {
    setBarcode(barcodeVal);
    if (!editingProduct && barcodeVal && barcodeVal.length >= 6) {
      const localMatch = findInIndianRetailCatalog(barcodeVal);
      if (localMatch) {
        if (!name || name.trim() === "") {
          setName(localMatch.name);
          try {
            const hi = await transliterateToHindi(localMatch.name);
            if (hi) setNameHindi(hi);
          } catch {}
        }
        if (!brand || brand.trim() === "") setBrand(localMatch.brand);
        if (localMatch.mrp > 0 && sellingPrice === 0) setSellingPrice(localMatch.mrp);
        if (localMatch.purchasePrice > 0 && purchasePrice === 0) setPurchasePrice(localMatch.purchasePrice);
        if (localMatch.wholesalePrice > 0 && wholesalePrice === 0) setWholesalePrice(localMatch.wholesalePrice);
        if (localMatch.description && !description) setDescription(localMatch.description);

        if (localMatch.category && categories.length > 0 && (!categoryId || categoryId === categories[0]?.id)) {
          const match = categories.find(
            (c) =>
              c.name.toLowerCase().includes(localMatch.category.toLowerCase()) ||
              localMatch.category.toLowerCase().includes(c.name.toLowerCase())
          );
          if (match) setCategoryId(match.id);
        }
        setAiSuccessMsg(`⚡ Instant Offline Barcode Match: ${localMatch.name} • MRP: ₹${localMatch.mrp}`);
      }
    }
  };

  // Trigger Vision AI / OCR Extraction on demand or when auto-scan is enabled
  const handleTriggerAiOcr = async (customFront?: string, customBack?: string) => {
    const frontToScan = customFront || imageUrl;
    const backToScan = customBack || backImageUrl;

    if (!frontToScan && !backToScan) {
      alert("Please upload or click a product photo first.");
      return;
    }

    try {
      setIsAnalyzing(true);
      setAiSuccessMsg("");

      const savedApiKey =
        typeof window !== "undefined"
          ? localStorage.getItem("falcon_gemini_api_key") || undefined
          : undefined;

      const savedRemoveBgKey =
        typeof window !== "undefined"
          ? localStorage.getItem("falcon_remove_bg_api_key") || undefined
          : undefined;

      const res = await fetch("/api/ai/analyze-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frontImage: frontToScan || backToScan,
          backImage: backToScan && backToScan !== frontToScan ? backToScan : undefined,
          apiKey: savedApiKey,
          removeBgApiKey: savedRemoveBgKey,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success && json.data) {
        const aiData = json.data;
        const extractedMrp = Number(aiData.mrp || 0) || 0;
        const suggestedCost =
          Number(aiData.suggested_purchase_price || 0) || (extractedMrp > 0 ? Math.round(extractedMrp * 0.72) : 0);

        if (aiData.product_name) setName(capitalizeFirstLetter(aiData.product_name));
        if (aiData.brand) setBrand(capitalizeFirstLetter(aiData.brand));
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

        setAiSuccessMsg(`✓ Extracted: ${aiData.product_name || "Product"} ${extractedMrp > 0 ? `• MRP: ₹${extractedMrp}` : ""}`);
      } else {
        setAiSuccessMsg(
          json.error
            ? `⚠️ ${json.error}`
            : "✓ Photo attached! (Enter product details above)"
        );
      }
    } catch (err: any) {
      console.warn("Vision auto-read notice:", err);
      setAiSuccessMsg("⚠️ AI Scan Notice: Could not read text automatically. Please enter details.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── 1-Click Pure White Studio Polish ──────────────────────────────────────
  const handleStudioPolishPhoto = async (
    customSource?: string,
    customTarget?: "front" | "back"
  ) => {
    const target = customTarget || activeImageTab;
    const rawSource =
      customSource ||
      (target === "front"
        ? rawFrontPhoto || imageUrl
        : rawBackPhoto || backImageUrl);

    if (!rawSource) {
      return;
    }

    try {
      setIsPolishing(true);
      setAiSuccessMsg("✨ Processing 1-click pure white studio photo...");

      let imageToPolish = rawSource;
      let isCutoutSuccess = false;

      // 0. Direct Local Rembg Check (Fastest when user is on localhost / local PC)
      try {
        const base64Clean = rawSource.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
        const binaryString = atob(base64Clean);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const imgBlob = new Blob([bytes], { type: "image/png" });

        const localForm = new FormData();
        localForm.append("file", imgBlob, "product.png");
        localForm.append("model", "u2net");

        const localRes = await fetch("http://127.0.0.1:7000/api/remove", {
          method: "POST",
          body: localForm,
          signal: AbortSignal.timeout(6000),
        });

        if (localRes.ok) {
          const cutBlob = await localRes.blob();
          if (cutBlob.size > 100) {
            imageToPolish = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(cutBlob);
            });
            isCutoutSuccess = true;
          }
        }
      } catch {
        // Direct local endpoint not reachable, proceed to server API
      }

      // 1. Try server-side AI cutout API
      if (!isCutoutSuccess) {
        try {
          const savedHfToken =
            typeof window !== "undefined"
              ? localStorage.getItem("falcon_hf_token") || localStorage.getItem("falcon_clipdrop_key") || undefined
              : undefined;
          const savedRbg =
            typeof window !== "undefined"
              ? localStorage.getItem("falcon_remove_bg_api_key") || undefined
              : undefined;

          const bgRes = await fetch("/api/ai/remove-background", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: rawSource,
              hfToken: savedHfToken,
              removeBgApiKey: savedRbg,
            }),
          });

          const bgJson = await bgRes.json().catch(() => ({}));
          if (bgRes.ok && bgJson.success && bgJson.transparentImageUrl) {
            imageToPolish = bgJson.transparentImageUrl;
            isCutoutSuccess = true;
          }
        } catch (bgErr) {
          console.warn("Server AI background remover notice:", bgErr);
        }
      }

      // If background removal was NOT successful, NEVER bleach or mutilate the product!
      if (!isCutoutSuccess) {
        if (target === "front") {
          setImageUrl(rawSource);
        } else {
          setBackImageUrl(rawSource);
        }
        setAiSuccessMsg("📷 Clean original photo preserved. (Run 'npm run rembg' on PC for instant AI cutout)");
        return;
      }

      // 2. Final Studio Polish: 100% Solid Pure White Canvas (#FFFFFF) ONLY for clean transparent cutouts
      const polished = await aiImageEnhancer.studioPolish(imageToPolish, {
        targetSize: 1080,
        theme: "pure_white",
        addGloss: false,        // Clean packaging without artificial glare
        addGroundShadow: false, // Strict pure white without grey ground shadows
        addReflection: false,   // No floor reflections
        sharpnessBoost: true,   // Crisp barcode and product label
      });

      if (target === "front") {
        setImageUrl(polished);
      } else {
        setBackImageUrl(polished);
      }
      setAiSuccessMsg("✨ 1-Click Pure White Studio: Background isolated & centered!");
    } catch (e) {
      console.error("Studio polish error:", e);
      if (target === "front") setImageUrl(rawSource);
      else setBackImageUrl(rawSource);
      setAiSuccessMsg("📷 Original photo preserved.");
    } finally {
      setIsPolishing(false);
    }
  };

  // Process Image Data URL (From Live Camera Snapshot or File Upload)
  const handleProcessImageDataUrl = async (rawDataUrl: string, target: "front" | "back" = "front") => {
    try {
      // Store un-padded raw source so studio polish can be reverted cleanly anytime
      if (target === "front") {
        setRawFrontPhoto(rawDataUrl);
      } else {
        setRawBackPhoto(rawDataUrl);
      }

      // 1. Fast client-side canvas compression (~30ms) - reduces 10MB to ~120KB
      const fastCompressedUrl = await aiImageEnhancer.fastCompress(rawDataUrl, 1080, 0.85);

      if (target === "front") {
        setImageUrl(fastCompressedUrl);
      } else {
        setBackImageUrl(fastCompressedUrl);
      }

      // 2. Automated Pure White Studio Polish (1-Click automatically applied)
      if (autoStudioPolish) {
        await handleStudioPolishPhoto(fastCompressedUrl, target);
      }

      // 3. IF EDITING EXISTING PRODUCT: Do NOT run OCR, do NOT overwrite details
      if (editingProduct) {
        setAiSuccessMsg("✓ Photo updated & pure white staged! Click 'Update Product' below to save.");
        return;
      }

      // 4. IF NEW PRODUCT & AUTO-SCAN ENABLED: Run fast AI analysis
      if (autoScanWithAi) {
        const frontToScan = target === "front" ? fastCompressedUrl : imageUrl || fastCompressedUrl;
        const backToScan = target === "back" ? fastCompressedUrl : backImageUrl;
        await handleTriggerAiOcr(frontToScan, backToScan);
      } else {
        setAiSuccessMsg("✨ Pure White Studio applied! Tap 'Show Original' to revert.");
      }
    } catch (e) {
      console.error(e);
      if (target === "front") setImageUrl(rawDataUrl);
      else setBackImageUrl(rawDataUrl);
    }
  };

  // Handle Photo Upload from Gallery / File picker
  const handlePhotoSelected = async (file: File, target: "front" | "back" = "front") => {
    try {
      const fastCompressedUrl = await aiImageEnhancer.fastCompress(file, 1080, 0.85);
      handleProcessImageDataUrl(fastCompressedUrl, target);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        const rawDataUrl = reader.result as string;
        handleProcessImageDataUrl(rawDataUrl, target);
      };
      reader.readAsDataURL(file);
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

      const finalDescription =
        hasVariants && variants.length > 1
          ? attachVariantsToDescription(description, variants)
          : stripVariantsFromDescription(description);

      let finalNameHindi = nameHindi.trim();
      if (!finalNameHindi && name.trim()) {
        try {
          finalNameHindi = transliterateSync(name.trim()) || await transliterateToHindi(name.trim());
        } catch {}
      }

      const payload: Partial<Product> = {
        shop_id: shopId,
        name: capitalizeFirstLetter(name.trim()),
        name_hindi: finalNameHindi || null,
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        brand: brand.trim() ? capitalizeFirstLetter(brand.trim()) : null,
        category_id: categoryId || null,
        supplier_id: supplierId || null,
        unit_id: unitId || null,
        purchase_price: purchasePrice,
        mrp: mrp > 0 ? mrp : null,
        selling_price: sellingPrice,
        wholesale_price: wholesalePrice || null,
        wholesale_min_qty: wholesaleMinQty > 0 ? wholesaleMinQty : 12,
        minimum_selling_price: minSellingPrice || null,
        minimum_stock: minStock,
        is_online: isOnline,
        online_price: Number(onlinePrice) > 0 ? Number(onlinePrice) : null,
        description: finalDescription.trim() || null,
        image_url: combinedImageUrl,
      };

      let saved: Product;
      if (editingProduct) {
        const prevStock = Number(editingProduct.current_stock) || 0;
        const delta = currentStock - prevStock;

        // Do not update current_stock directly here if there is a delta,
        // so the database trigger on stock_movements can update it cleanly without double-counting!
        const { current_stock: _ignored, ...productDetails } = payload;
        saved = await productsRepository.update(editingProduct.id, productDetails);

        if (delta !== 0) {
          try {
            const { supabase } = await import("@/lib/supabase/client");
            const { error: moveErr } = await supabase.from("stock_movements").insert([
              {
                shop_id: shopId,
                product_id: editingProduct.id,
                movement_type: "adjustment",
                quantity_delta: delta,
                notes: `Stock updated in Product Edit (${prevStock} -> ${currentStock})`,
              },
            ]);
            if (moveErr) {
              console.warn("Could not insert stock movement, applying direct fallback:", moveErr);
              await supabase.from("products").update({ current_stock: currentStock }).eq("id", editingProduct.id);
            }
          } catch (e) {
            console.warn("Could not log stock movement on edit:", e);
            const { supabase } = await import("@/lib/supabase/client");
            await supabase.from("products").update({ current_stock: currentStock }).eq("id", editingProduct.id);
          }
        }
        saved.current_stock = currentStock;
      } else {
        payload.current_stock = currentStock;
        saved = await productsRepository.create(payload);
      }

      onSuccess(saved);

      if (andAddAnother) {
        setName("");
        setNameHindi("");
        setBrand("");
        setSku(`SKU-${Date.now().toString().slice(-4)}`);
        setBarcode("");
        setPurchasePrice(0);
        setMrp(0);
        setSellingPrice(0);
        setWholesalePrice(0);
        setWholesaleMinQty(12);
        setMinSellingPrice(0);
        setCurrentStock(10);
        setDescription("");
        setHasVariants(false);
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
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden">
        {/* ========================================================================= */}
        {/* MODAL HEADER                                                              */}
        {/* ========================================================================= */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center shadow-md shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-1.5 sm:gap-2">
                {editingProduct ? "Edit Product Details" : "Add New Product"}
                <span className="text-[9px] sm:text-[10px] font-bold uppercase px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Fast Catalog
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-purple-200/80 line-clamp-1">
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
        <div className="bg-gray-50 border-b border-gray-200 px-3 sm:px-6 py-2 flex items-center justify-between overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5 bg-gray-200/70 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setActiveMode("photo")}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeMode === "photo"
                  ? "bg-white text-purple-950 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-purple-600" />
              <span>Photo & AI</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("barcode")}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeMode === "barcode"
                  ? "bg-white text-purple-950 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Barcode className="w-3.5 h-3.5 text-indigo-600" />
              <span>Barcode</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("manual")}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeMode === "manual"
                  ? "bg-white text-purple-950 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-gray-500" />
              <span>Manual</span>
            </button>
          </div>

          {aiSuccessMsg && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg ml-2">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              {aiSuccessMsg}
            </div>
          )}
        </div>

        {/* ⚡ INSTANT MASTER CATALOG SUGGESTIONS BAR (150+ Top Indian FMCG Items) */}
        <div className="bg-purple-50/70 border-b border-purple-100 px-3 sm:px-6 py-2 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
            <span className="font-bold text-purple-900 shrink-0 text-[11px]">
              ⚡ Fast Fill:
            </span>
            {["Maggi", "Surf Excel", "Tata Salt", "Dettol", "Amul Butter", "Colgate"].map((brandTag) => (
              <button
                key={brandTag}
                type="button"
                onClick={() => {
                  setSearchQuery(brandTag);
                  setIsCatalogDropdownOpen(true);
                }}
                className="px-2 py-0.5 rounded-md bg-white hover:bg-purple-100 border border-purple-200 text-purple-900 font-semibold shrink-0 transition-colors shadow-2xs cursor-pointer text-[11px]"
              >
                {brandTag}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODAL MAIN CONTENT (2-COLUMN GRID)                                        */}
        {/* ========================================================================= */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-5 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
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

              {/* Active Image Container (Click opens direct Camera or Gallery options) */}
              <div
                onClick={() => {
                  if (activeImageTab === "front" ? !imageUrl : !backImageUrl) {
                    setIsPhotoActionSheetOpen(true);
                  }
                }}
                className="relative aspect-[4/3] sm:aspect-square w-full rounded-2xl bg-gradient-to-b from-purple-50/30 via-gray-50 to-indigo-50/20 border-2 border-dashed border-purple-300 hover:border-purple-500 flex items-center justify-center overflow-hidden group shadow-2xs transition-all cursor-pointer"
              >
                {activeImageTab === "front" ? (
                  imageUrl ? (
                    <div className="relative w-full h-full">
                      <img
                        src={imageUrl}
                        alt="Front Packaging"
                        className="w-full h-full object-contain p-2 transition-transform group-hover:scale-105"
                      />
                      {/* 1-Tap Overlay Actions */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                        {rawFrontPhoto && rawFrontPhoto !== imageUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setImageUrl(rawFrontPhoto);
                              setAiSuccessMsg("↺ Reverted to original raw photo.");
                            }}
                            className="px-2 py-1 rounded-xl bg-black/75 hover:bg-black text-amber-300 text-[11px] font-bold shadow-md flex items-center gap-1 backdrop-blur-xs active:scale-95 transition-all"
                            title="Revert to original camera photo"
                          >
                            <span>↺ Original</span>
                          </button>
                        )}
                        {rawFrontPhoto && rawFrontPhoto === imageUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStudioPolishPhoto(rawFrontPhoto, "front");
                            }}
                            className="px-2 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-md flex items-center gap-1 backdrop-blur-xs active:scale-95 transition-all"
                            title="Clean background & stage in 3D studio"
                          >
                            <Sparkles className="w-3 h-3 text-yellow-300" />
                            <span>✨ Polish</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsPhotoActionSheetOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-black/75 hover:bg-black text-white text-[11px] font-bold shadow-md flex items-center gap-1 backdrop-blur-xs active:scale-95 transition-all"
                        >
                          <Camera className="w-3.5 h-3.5 text-amber-300" />
                          <span>Change</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setImageUrl("");
                            setRawFrontPhoto("");
                          }}
                          className="p-1.5 rounded-xl bg-black/75 hover:bg-rose-600 text-white shadow-md backdrop-blur-xs active:scale-95 transition-all"
                          title="Remove photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-4 space-y-3 w-full">
                      {/* Direct 1-Tap Big Buttons inside box */}
                      <div className="flex items-center justify-center gap-2.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCameraCapture();
                          }}
                          className="flex-1 py-3 px-2 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md active:scale-95 transition-all flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <Camera className="w-6 h-6" />
                          <span className="text-[11px] font-black">📷 Click Camera</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenGalleryPicker();
                          }}
                          className="flex-1 py-3 px-2 rounded-2xl bg-white hover:bg-purple-50 border border-purple-200 text-purple-700 shadow-xs active:scale-95 transition-all flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-6 h-6 text-purple-600" />
                          <span className="text-[11px] font-black">🖼️ Choose Gallery</span>
                        </button>
                      </div>

                      <div className="text-[10px] text-gray-500 font-medium">
                        Tap anywhere on box to upload Front photo
                      </div>
                    </div>
                  )
                ) : backImageUrl ? (
                  <div className="relative w-full h-full">
                    <img
                      src={backImageUrl}
                      alt="Back Packaging & MRP"
                      className="w-full h-full object-contain p-2 transition-transform group-hover:scale-105"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                      {rawBackPhoto && rawBackPhoto !== backImageUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBackImageUrl(rawBackPhoto);
                            setAiSuccessMsg("↺ Reverted to original raw photo.");
                          }}
                          className="px-2 py-1 rounded-xl bg-black/75 hover:bg-black text-amber-300 text-[11px] font-bold shadow-md flex items-center gap-1 backdrop-blur-xs active:scale-95 transition-all"
                          title="Revert to original camera photo"
                        >
                          <span>↺ Original</span>
                        </button>
                      )}
                      {rawBackPhoto && rawBackPhoto === backImageUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStudioPolishPhoto(rawBackPhoto, "back");
                          }}
                          className="px-2 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-md flex items-center gap-1 backdrop-blur-xs active:scale-95 transition-all"
                          title="Clean background & stage in 3D studio"
                        >
                          <Sparkles className="w-3 h-3 text-yellow-300" />
                          <span>✨ Polish</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsPhotoActionSheetOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-black/75 hover:bg-black text-white text-[11px] font-bold shadow-md flex items-center gap-1 backdrop-blur-xs active:scale-95 transition-all"
                      >
                        <Camera className="w-3.5 h-3.5 text-amber-300" />
                        <span>Change</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBackImageUrl("");
                          setRawBackPhoto("");
                        }}
                        className="p-1.5 rounded-xl bg-black/75 hover:bg-rose-600 text-white shadow-md backdrop-blur-xs active:scale-95 transition-all"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4 space-y-3 w-full">
                    <div className="flex items-center justify-center gap-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCameraCapture();
                        }}
                        className="flex-1 py-3 px-2 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md active:scale-95 transition-all flex flex-col items-center gap-1 cursor-pointer"
                      >
                        <Camera className="w-6 h-6" />
                        <span className="text-[11px] font-black">📷 Click Camera</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenGalleryPicker();
                        }}
                        className="flex-1 py-3 px-2 rounded-2xl bg-white hover:bg-purple-50 border border-purple-200 text-purple-700 shadow-xs active:scale-95 transition-all flex flex-col items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-6 h-6 text-purple-600" />
                        <span className="text-[11px] font-black">🖼️ Choose Gallery</span>
                      </button>
                    </div>

                    <div className="text-[10px] text-gray-500 font-medium">
                      Tap anywhere on box to upload Back/MRP label
                    </div>
                  </div>
                )}

                {/* Badge indicating which angle is showing */}
                <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs pointer-events-none">
                  {activeImageTab === "front" ? "📷 Front View" : "🔍 Back / MRP"}
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
                {(isAnalyzing || isPolishing) && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 z-20">
                    <RefreshCw className="w-7 h-7 animate-spin text-purple-300" />
                    <span className="text-xs font-bold text-purple-100">
                      {isPolishing
                        ? "✨ Removing Background & Polishing Lighting..."
                        : "Extracting Name & MRP..."}
                    </span>
                  </div>
                )}
              </div>

              {/* Paste Image URL Toggle */}
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


              {/* Clean Status & Action Controls when Photo is Present */}
              {(imageUrl || backImageUrl) && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[11px]">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Pure White Studio Auto-Applied</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleStudioPolishPhoto()}
                        disabled={isPolishing}
                        className="text-purple-600 hover:text-purple-800 font-bold hover:underline disabled:opacity-50 text-[11px]"
                      >
                        {isPolishing ? "Polishing..." : "✨ Re-polish"}
                      </button>
                      {((activeImageTab === "front" && rawFrontPhoto) || (activeImageTab === "back" && rawBackPhoto)) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (activeImageTab === "front" && rawFrontPhoto) {
                              setImageUrl(rawFrontPhoto);
                              setAiSuccessMsg("Restored original front photo.");
                            } else if (activeImageTab === "back" && rawBackPhoto) {
                              setBackImageUrl(rawBackPhoto);
                              setAiSuccessMsg("Restored original back photo.");
                            }
                          }}
                          className="text-gray-500 hover:text-gray-800 font-medium hover:underline text-[11px]"
                        >
                          ↩ Show Original
                        </button>
                      )}
                    </div>
                  </div>

                  {/* AI Scan Packaging & MRP (Only for new products) */}
                  {!editingProduct && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleTriggerAiOcr()}
                      isLoading={isAnalyzing}
                      className="w-full border-purple-300 text-purple-700 hover:bg-purple-50 font-bold text-xs shadow-xs transition-all"
                      title="Read printed product packaging, MRP, barcode and title"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-600" />
                      <span>🤖 Scan Packaging & MRP with AI</span>
                    </Button>
                  )}
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
              {/* Linked Existing Product Notice Banner */}
              {linkedExistingProduct && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-3 flex items-center justify-between shadow-2xs animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                      🔗
                    </span>
                    <div className="text-xs">
                      <div className="font-bold text-purple-950 flex items-center gap-1.5">
                        <span>Details Loaded from: {linkedExistingProduct.name}</span>
                        <span className="text-[10px] bg-purple-200/80 text-purple-800 px-1.5 py-0.2 rounded font-bold">
                          {categories.find((c) => c.id === linkedExistingProduct.category_id)?.name || "Category"}
                        </span>
                      </div>
                      <p className="text-[11px] text-purple-700">
                        Category, brand, and description auto-filled! Add a new size/pack variant, custom price, or barcode below.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLinkedExistingProduct(null)}
                    className="text-purple-400 hover:text-purple-700 text-xs px-2 py-1"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Product Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2 relative">
                  <Input
                    label="Product Name / Title (English) *"
                    required
                    value={name}
                    onChange={(e) => {
                      const val = capitalizeFirstLetter(e.target.value);
                      setName(val);
                      setIsNameSuggestionsOpen(true);
                      if (val.trim()) {
                        const syncHi = transliterateSync(val.trim());
                        if (syncHi) {
                          setNameHindi(syncHi);
                        }
                      } else {
                        setNameHindi("");
                      }
                    }}
                    onBlur={async () => {
                      if (name.trim()) {
                        try {
                          const hi = await transliterateToHindi(name.trim());
                          if (hi) setNameHindi(hi);
                        } catch {}
                      }
                    }}
                    placeholder="e.g. Parachute 100% Pure Coconut Oil 100ml"
                  />

                  {/* Smart Duplicate Detection & Variant Auto-Fill Dropdown */}
                  {isNameSuggestionsOpen && matchingExistingProducts.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-xl shadow-2xl border-2 border-purple-300 overflow-hidden divide-y divide-gray-100 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white px-3 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <span>💡 यह प्रोडक्ट इन्वेंट्री में पहले से मौजूद है:</span>
                          <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            {matchingExistingProducts.length} Match
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsNameSuggestionsOpen(false)}
                          className="text-white/80 hover:text-white text-xs px-1.5 py-0.5 cursor-pointer"
                          title="Close suggestions"
                        >
                          ✕ Dismiss (अलग बनाएं)
                        </button>
                      </div>

                      <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
                        {matchingExistingProducts.map((p) => {
                          const catName = categories.find((c) => c.id === p.category_id)?.name;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSelectExistingProduct(p)}
                              className="w-full text-left p-2 rounded-lg hover:bg-purple-50 transition-colors flex items-center justify-between gap-3 group border border-transparent hover:border-purple-200 cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {p.image_url ? (
                                  <img
                                    src={p.image_url}
                                    alt={p.name}
                                    className="w-9 h-9 object-contain rounded-lg bg-gray-50 border border-gray-200 shrink-0"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                                    📦
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-gray-900 group-hover:text-purple-900 truncate">
                                    {p.name}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5">
                                    {p.brand && (
                                      <span className="font-semibold text-gray-700">
                                        Brand: {p.brand}
                                      </span>
                                    )}
                                    {catName && (
                                      <span className="bg-gray-100 px-1.5 py-0.2 rounded text-gray-600 font-medium">
                                        {catName}
                                      </span>
                                    )}
                                    <span>• Stock: {p.current_stock ?? 0}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col items-end shrink-0">
                                <span className="text-xs font-black text-purple-700">
                                  ₹{p.selling_price}
                                </span>
                                <span className="text-[10px] text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md font-bold group-hover:bg-emerald-200 flex items-center gap-0.5 border border-emerald-300">
                                  ➕ नया साइज़ / Variant जोड़ें →
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Hindi Transliterated Product Title */}
                <div className="sm:col-span-2">
                  <div className="relative">
                    <Input
                      label="🇮🇳 Hindi Name / हिंदी नाम (Auto Transliterated)"
                      value={nameHindi}
                      onChange={(e) => setNameHindi(e.target.value)}
                      placeholder="उदा. पैराशूट 100% प्योर कोकोनट ऑयल 100ml"
                    />
                    {isTransliterating && (
                      <span className="absolute right-3 top-8 text-[11px] text-purple-600 font-bold flex items-center gap-1 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" /> ट्रांसलेट हो रहा है...
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1 px-1">
                    <span>💡 थर्मल बिल और WhatsApp रसीद पर हिंदी में प्रिंट करने के लिए</span>
                    {name.trim() && (
                      <button
                        type="button"
                        onClick={async () => {
                          setIsTransliterating(true);
                          try {
                            const hi = await transliterateToHindi(name);
                            if (hi) setNameHindi(hi);
                          } finally {
                            setIsTransliterating(false);
                          }
                        }}
                        className="text-purple-600 hover:text-purple-800 font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <RefreshCw className="w-2.5 h-2.5" /> 🔄 Re-Generate Hindi
                      </button>
                    )}
                  </div>
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
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsBarcodeScannerOpen(true)}
                        className="text-[10px] text-purple-700 hover:text-purple-900 font-bold flex items-center gap-0.5 bg-purple-50 hover:bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200 transition-colors cursor-pointer"
                        title="Scan Barcode using Device Camera"
                      >
                        <Camera className="w-3 h-3 text-purple-600" />
                        <span>📷 Scan</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAutoGenerateBarcode}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                      >
                        ⚡ Auto-Gen
                      </button>
                    </div>
                  </div>
                  <div className="relative flex gap-1">
                    <input
                      type="text"
                      value={barcode}
                      onChange={(e) => handleBarcodeAutoFill(e.target.value)}
                      placeholder="Scan with camera, gun or enter EAN"
                      className="w-full text-xs h-9 bg-white border border-gray-300 rounded-lg px-3 font-mono text-gray-900 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setIsBarcodeScannerOpen(true)}
                      className="px-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                      title="Scan Barcode with Camera"
                    >
                      <Camera className="w-4 h-4 text-purple-600" />
                    </button>
                  </div>
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

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div>
                    <Input
                      type="number"
                      label="Cost Price (₹)"
                      placeholder="0.00"
                      value={purchasePrice === 0 ? "" : purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <Input
                      type="number"
                      label="Printed MRP (₹)"
                      placeholder="0.00"
                      value={mrp === 0 ? "" : mrp}
                      onChange={(e) => setMrp(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <Input
                      type="number"
                      label="Retail / 1 Pc (₹) *"
                      required
                      placeholder="0.00"
                      value={sellingPrice === 0 ? "" : sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <Input
                      type="number"
                      label="Wholesale (₹)"
                      placeholder="0.00"
                      value={wholesalePrice === 0 ? "" : wholesalePrice}
                      onChange={(e) => setWholesalePrice(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <Input
                      type="number"
                      label="Wholesale Min Qty *"
                      placeholder="12"
                      value={wholesaleMinQty === 0 ? "" : wholesaleMinQty}
                      onChange={(e) => setWholesaleMinQty(e.target.value === "" ? 12 : parseInt(e.target.value) || 12)}
                    />
                  </div>

                  <div>
                    <Input
                      type="number"
                      label={editingProduct ? "Current Stock *" : "Opening Stock *"}
                      required
                      placeholder="0"
                      value={currentStock === 0 ? "" : currentStock}
                      onChange={(e) => setCurrentStock(e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
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
              {/* 🌐 ONLINE STOREFRONT VISIBILITY & SPECIAL PRICE                     */}
              {/* =================================================================== */}
              <div className="bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-cyan-50/50 border-2 border-emerald-300/80 rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      🌐
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        Online Store Visibility / ऑनलाइन स्टोर पर दिखाएं
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          isOnline ? "bg-emerald-200 text-emerald-900" : "bg-gray-200 text-gray-700"
                        }`}>
                          {isOnline ? "Live on /store" : "In-Store POS Only"}
                        </span>
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Controls whether customers can view and order this product on your public website and WhatsApp catalog
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isOnline}
                      onChange={(e) => setIsOnline(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {isOnline && (
                  <div className="pt-2 border-t border-emerald-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-150">
                    <div className="text-[11px] text-emerald-900 flex-1">
                      <span className="font-bold">🏷️ Online Special Offer Price (₹):</span> Set a special discounted rate exclusively for website and WhatsApp customers. Leave blank to automatically use standard in-store selling price (₹{sellingPrice || 0}).
                    </div>
                    <div className="w-full sm:w-44 shrink-0">
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-bold text-emerald-700">₹</span>
                        <input
                          type="number"
                          value={onlinePrice}
                          onChange={(e) => setOnlinePrice(e.target.value)}
                          placeholder={`POS: ₹${sellingPrice || 0}`}
                          className="w-full pl-7 pr-3 py-1.5 text-xs font-bold bg-white border border-emerald-400 rounded-xl text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* =================================================================== */}
              {/* ⚡ PACK SIZES & MULTI-VARIANT PRICING (ml, g, kg, L)                 */}
              {/* =================================================================== */}
              <div
                id="pack-sizes-section"
                className={`rounded-2xl border-2 transition-all p-4 space-y-3 ${
                  hasVariants
                    ? "bg-white border-purple-400/80 shadow-sm ring-4 ring-purple-500/5"
                    : "bg-gray-50/70 border-gray-200"
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs transition-colors ${
                        hasVariants ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      📦
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-gray-900 flex items-center gap-2">
                        Pack Sizes & Variants (अलग-अलग साइज़ / वज़न)
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            hasVariants
                              ? "bg-purple-100 text-purple-800 border-purple-200"
                              : "bg-gray-200 text-gray-600 border-gray-300"
                          }`}
                        >
                          {hasVariants ? `${variants.length} Sizes Active` : "OFF / बंद"}
                        </span>
                      </h4>
                      <p className="text-[11px] text-gray-600 font-medium">
                        {hasVariants
                          ? "Enter specific pack sizes (100g, 200g, etc.) and prices you actually stock"
                          : "This product is saved as a single item. Turn ON only if it has multiple pack sizes"}
                      </p>
                    </div>
                  </div>

                  {/* Explicit Opt-In Toggle Switch */}
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasVariants}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setHasVariants(val);
                          if (val && variants.length === 0) {
                            setVariants([
                              {
                                id: `var-base-${Date.now()}`,
                                size: units.find((u) => u.id === unitId)?.name || "Standard Pack",
                                mrp: mrp > 0 ? mrp : sellingPrice || 0,
                                price: sellingPrice || 0,
                                purchasePrice: purchasePrice || 0,
                                stock: currentStock || 10,
                                barcode: barcode || undefined,
                                sku: sku || undefined,
                              },
                            ]);
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                    <span className="text-xs font-bold text-gray-800">
                      {hasVariants ? "वैरिएंट चालू (ON)" : "सिंगल आइटम (OFF)"}
                    </span>
                  </div>
                </div>

                {hasVariants ? (
                  <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                    {/* 1-Click Generation Presets & Custom Size Add */}
                    <div className="flex items-center justify-between gap-2 flex-wrap bg-purple-50/50 p-2 rounded-xl border border-purple-100">
                      <span className="text-[11px] font-bold text-purple-900">
                        ⚡ Quick Fill Presets:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleAddPresetVariants("liquid")}
                          className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-purple-600 hover:text-white text-purple-900 border border-purple-300 rounded-lg transition-all shadow-2xs cursor-pointer"
                        >
                          💧 Liquid (10ml - 1L)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddPresetVariants("weight")}
                          className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-pink-600 hover:text-white text-pink-900 border border-pink-300 rounded-lg transition-all shadow-2xs cursor-pointer"
                        >
                          ⚖️ Weight (10g - 1kg)
                        </button>
                        <button
                          type="button"
                          onClick={handleAddCustomVariant}
                          className="px-3 py-1 text-[11px] font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          + Custom Size / साइज़ जोड़ें
                        </button>
                      </div>
                    </div>

                    {/* Variant List Table */}
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
                                    placeholder="e.g. 100g"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="number"
                                    placeholder="0.00"
                                    value={v.mrp === 0 ? "" : v.mrp}
                                    onFocus={(e) => e.currentTarget.select()}
                                    onChange={(e) =>
                                      handleUpdateVariant(idx, "mrp", e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)
                                    }
                                    className="w-20 px-2 py-1.5 text-xs font-semibold text-gray-700 border border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="number"
                                    placeholder="0.00"
                                    value={v.price === 0 ? "" : v.price}
                                    onFocus={(e) => e.currentTarget.select()}
                                    onChange={(e) =>
                                      handleUpdateVariant(idx, "price", e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)
                                    }
                                    className="w-20 px-2 py-1.5 text-xs font-black text-purple-900 border border-purple-400 rounded-lg focus:border-purple-600 focus:outline-none bg-purple-50/50"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="number"
                                    placeholder="0.00"
                                    value={!v.purchasePrice ? "" : v.purchasePrice}
                                    onFocus={(e) => e.currentTarget.select()}
                                    onChange={(e) =>
                                      handleUpdateVariant(
                                        idx,
                                        "purchasePrice",
                                        e.target.value === "" ? 0 : parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="w-20 px-2 py-1.5 text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={v.stock === 0 ? "" : (v.stock ?? 10)}
                                    onFocus={(e) => e.currentTarget.select()}
                                    onChange={(e) =>
                                      handleUpdateVariant(
                                        idx,
                                        "stock",
                                        e.target.value === "" ? 0 : parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="w-16 px-2 py-1.5 text-xs font-semibold text-gray-700 border border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none"
                                  />
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveVariant(idx)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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
                          No pack sizes added yet. Click &quot;+ Custom Size&quot; to add weights/volumes you sell.
                        </p>
                        <button
                          type="button"
                          onClick={handleAddCustomVariant}
                          className="px-4 py-1.5 text-xs font-bold bg-purple-600 text-white rounded-xl shadow-xs"
                        >
                          + Add First Size
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-3 px-3.5 rounded-xl bg-gray-100/70 border border-gray-200/80 flex items-center justify-between text-xs text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <span>ℹ️</span>
                      <span>यह प्रोडक्ट एक <strong>सिंगल आइटम</strong> के रूप में सेव होगा। अगर अलग-अलग वज़न/साइज़ हैं तो ऊपर वाला स्विच ऑन करें।</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setHasVariants(true);
                        setVariants([
                          {
                            id: `var-base-${Date.now()}`,
                            size: units.find((u) => u.id === unitId)?.name || "Standard Pack",
                            mrp: mrp > 0 ? mrp : sellingPrice || 0,
                            price: sellingPrice || 0,
                            purchasePrice: purchasePrice || 0,
                            stock: currentStock || 10,
                            barcode: barcode || undefined,
                            sku: sku || undefined,
                          },
                        ]);
                      }}
                      className="text-xs font-bold text-purple-700 hover:text-purple-900 hover:underline shrink-0"
                    >
                      + अलग-अलग साइज़ चालू करें
                    </button>
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

      {/* Live Camera Barcode Scanner Sub-Modal */}
      <CameraBarcodeScanner
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScan={(scannedCode) => {
          const clean = scannedCode.trim();
          if (clean) {
            handleBarcodeAutoFill(clean);
          }
          setIsBarcodeScannerOpen(false);
        }}
      />

      {/* Live Camera Product Photo Snapshot Sub-Modal */}
      <ProductPhotoCameraModal
        isOpen={isCameraCaptureOpen}
        onClose={() => setIsCameraCaptureOpen(false)}
        onCapture={(photoDataUrl) => handleProcessImageDataUrl(photoDataUrl, activeImageTab)}
        targetAngle={activeImageTab}
      />

      {/* 📸 1-Tap Photo Action Sheet (Camera vs Gallery vs Polish vs URL) */}
      {isPhotoActionSheetOpen && (
        <div
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150"
          onClick={() => setIsPhotoActionSheetOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-4 shadow-2xl space-y-2.5 animate-in slide-in-from-bottom-5 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-gray-900">
                  {activeImageTab === "front" ? "Front Packshot Photo" : "Back / MRP Photo"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPhotoActionSheetOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* 1. Live Camera Snapshot */}
            <button
              type="button"
              onClick={handleOpenCameraCapture}
              className="w-full p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-between shadow-md active:scale-98 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/20 rounded-xl">
                  <Camera className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-black text-white text-xs">📷 Open Live Camera</div>
                  <div className="text-[10px] text-purple-200">Snapshot product pack with phone camera</div>
                </div>
              </div>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">Fast</span>
            </button>

            {/* 2. Choose from Gallery */}
            <button
              type="button"
              onClick={handleOpenGalleryPicker}
              className="w-full p-3 rounded-2xl bg-purple-50/70 hover:bg-purple-100 border border-purple-200 text-purple-900 font-bold text-xs flex items-center justify-between shadow-2xs active:scale-98 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-purple-200 text-purple-800 rounded-xl">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="font-black text-purple-950 text-xs">🖼️ Choose from Gallery</div>
                  <div className="text-[10px] text-purple-700/80">Select existing image file from phone</div>
                </div>
              </div>
            </button>

            {/* 3. Studio Polish (if photo present) */}
            {(activeImageTab === "front" ? imageUrl : backImageUrl) && (
              <button
                type="button"
                onClick={() => {
                  setIsPhotoActionSheetOpen(false);
                  handleStudioPolishPhoto();
                }}
                disabled={isPolishing}
                className="w-full p-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs flex items-center justify-between shadow-2xs active:scale-98 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-white/20 rounded-xl">
                    <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                  </div>
                  <div className="text-left">
                    <div className="font-black text-white text-xs">✨ Studio Polish & White BG</div>
                    <div className="text-[10px] text-emerald-100">Clean background & set on pure white</div>
                  </div>
                </div>
              </button>
            )}

            {/* 4. Paste URL */}
            <button
              type="button"
              onClick={() => {
                setIsPhotoActionSheetOpen(false);
                setShowUrlInput(true);
              }}
              className="w-full p-2.5 rounded-xl hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <LinkIcon className="w-4 h-4 text-gray-500" />
              <span>🌐 Paste Image URL</span>
            </button>

            {/* 5. Delete Photo (if photo present) */}
            {(activeImageTab === "front" ? imageUrl : backImageUrl) && (
              <button
                type="button"
                onClick={() => {
                  setIsPhotoActionSheetOpen(false);
                  if (activeImageTab === "front") setImageUrl("");
                  else setBackImageUrl("");
                }}
                className="w-full p-2.5 rounded-xl hover:bg-rose-50 border border-rose-200 text-rose-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Current Photo</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
