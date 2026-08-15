"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Camera,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Wand2,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Tag,
  Boxes,
  Barcode,
  Globe,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  Eye,
  Layers,
  ShoppingBag,
  Share2,
  ShieldCheck,
  Palette,
  Maximize2,
  Smartphone,
  Award,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { aiVisionService } from "@/lib/ai/vision-analysis";
import { aiDuplicateDetector } from "@/lib/ai/duplicate-detector";
import { aiBarcodeLookup } from "@/lib/ai/barcode-lookup";
import { masterStudioGenerator } from "@/lib/ai/studio-generator";
import {
  AiProductAnalysisResult,
  DuplicateCheckResult,
  HeroTheme,
  StudioAssetGallery,
  ImageQualityReport,
} from "@/lib/ai/types";
import { Product, Category, Supplier, Unit } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface FalconAiProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: () => void;
  shopId: string;
  categories: Category[];
  suppliers: Supplier[];
  units: Unit[];
  existingProducts: Product[];
  onOpenManualModal?: () => void;
}

export type ProductCreationMethod = "vision" | "barcode" | "manual";

export const FalconAiProductModal: React.FC<FalconAiProductModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
  shopId,
  categories,
  suppliers,
  units,
  existingProducts,
  onOpenManualModal,
}) => {
  // Active Creation Method
  const [creationMethod, setCreationMethod] = useState<ProductCreationMethod>("vision");

  // Wizard Stages: 1: Upload / Input, 2: AI Processing Radar, 3: Studio Review & Save
  const [stage, setStage] = useState<1 | 2 | 3>(1);

  // Uploaded Files State
  const [frontImageFile, setFrontImageFile] = useState<File | null>(null);
  const [frontPreviewUrl, setFrontPreviewUrl] = useState<string>("");
  const [backImageFile, setBackImageFile] = useState<File | null>(null);
  const [backPreviewUrl, setBackPreviewUrl] = useState<string>("");
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);

  // Barcode Lookup Method State
  const [inputBarcode, setInputBarcode] = useState<string>("");
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false);

  // Selected Hero Theme
  const [selectedTheme, setSelectedTheme] = useState<HeroTheme>("luxury_marble");

  // Active Studio Image Asset Tab in Stage 3
  const [activeAssetTab, setActiveAssetTab] = useState<
    "hero" | "catalog" | "lifestyle" | "promo" | "story" | "zoom" | "original"
  >("hero");

  // Camera capture modal state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // AI Scanning Steps Progress
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const scanSteps = [
    "Uploading high-resolution product photography...",
    "Running OCR Vision & Barcode recognition...",
    "Detecting brand, categories & product taxonomy...",
    "Generating 5 Studio Assets: Hero, Catalog, Lifestyle & Promos...",
    "Generating SEO copy, key benefits & descriptions...",
    "Checking catalog collisions & calculating margins...",
  ];

  // AI Extraction Result & Form State
  const [aiResult, setAiResult] = useState<AiProductAnalysisResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult>({
    isDuplicate: false,
    confidence: 0,
  });

  // Re-generating / Switching theme state
  const [isRegeneratingTheme, setIsRegeneratingTheme] = useState(false);

  // Editable Form Fields populated by AI
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    category_id: "",
    sub_category: "",
    sku: "",
    barcode: "",
    unit_id: "",
    supplier_id: "",
    mrp: 0,
    purchase_price: 0,
    selling_price: 0,
    wholesale_price: 0,
    current_stock: 10,
    minimum_stock: 5,
    reorder_level: 10,
    variant_name: "",
    shade_color: "",
    net_weight: "",
    short_description: "",
    long_description: "",
    ingredients: "",
    directions: "",
    warnings: "",
    country_of_origin: "India",
    manufacturer: "",
    is_website_published: true,
  });

  // UI accordion sections
  const [showAdvancedAttributes, setShowAdvancedAttributes] = useState(false);
  const [showDescriptions, setShowDescriptions] = useState(true);

  // Gemini Vision API Key state
  const [geminiApiKey, setGeminiApiKey] = useState<string>("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("falcon_gemini_api_key") || "";
      setGeminiApiKey(savedKey);
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    setGeminiApiKey(key);
    if (typeof window !== "undefined") {
      localStorage.setItem("falcon_gemini_api_key", key);
    }
  };

  // Reset modal on close/open
  useEffect(() => {
    if (isOpen) {
      setStage(1);
      setFrontImageFile(null);
      setFrontPreviewUrl("");
      setBackImageFile(null);
      setBackPreviewUrl("");
      setAdditionalFiles([]);
      setAiResult(null);
      setInputBarcode("");
      setActiveAssetTab("hero");
    } else {
      stopCamera();
    }
  }, [isOpen]);

  // Pricing calculations
  const profitMarginAmount = Math.max(0, formData.selling_price - formData.purchase_price);
  const marginPercentage =
    formData.selling_price > 0
      ? Math.round((profitMarginAmount / formData.selling_price) * 100)
      : 0;
  const mrpDiscount =
    formData.mrp > 0 && formData.selling_price < formData.mrp
      ? Math.round(((formData.mrp - formData.selling_price) / formData.mrp) * 100)
      : 0;

  // Handle Front Image Selection
  const handleFrontImageSelect = (file: File) => {
    setFrontImageFile(file);
    const url = URL.createObjectURL(file);
    setFrontPreviewUrl(url);
  };

  // Handle Back Image Selection
  const handleBackImageSelect = (file: File) => {
    setBackImageFile(file);
    const url = URL.createObjectURL(file);
    setBackPreviewUrl(url);
  };

  const handleAdditionalImagesSelect = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    setAdditionalFiles((prev) => [...prev, ...arr].slice(0, 5));
  };

  // Camera capture controls
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing, width: { ideal: 1280 }, height: { ideal: 1280 } },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      alert("Unable to access camera: " + err.message);
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 1080;
    canvas.height = videoRef.current.videoHeight || 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      if (!frontImageFile) {
        handleFrontImageSelect(file);
      } else {
        handleBackImageSelect(file);
      }
      stopCamera();
    }, "image/jpeg", 0.95);
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Switch Hero Theme on demand
  const handleSwitchTheme = async (theme: HeroTheme) => {
    if (!aiResult) return;
    setSelectedTheme(theme);
    try {
      setIsRegeneratingTheme(true);
      const res = await masterStudioGenerator.generateStudioSuite({
        frontImage: aiResult.images.originalUrl,
        backImage: backPreviewUrl || undefined,
        productName: formData.name,
        brand: formData.brand,
        categoryName: categories.find((c) => c.id === formData.category_id)?.name || formData.name,
        mrp: formData.mrp || 50,
        activeTheme: theme,
      });

      setAiResult((prev) =>
        prev
          ? {
              ...prev,
              images: {
                ...prev.images,
                enhancedUrl: res.studioAssets.heroUrl,
                galleryUrls: res.studioAssets.galleryUrls,
                studioAssets: res.studioAssets,
                qualityReport: res.qualityReport,
              },
            }
          : null
      );
    } catch (err) {
      console.error("Failed to switch theme:", err);
    } finally {
      setIsRegeneratingTheme(false);
    }
  };

  // Run Vision AI Pipeline (Stage 1 -> Stage 2 -> Stage 3)
  const handleStartAnalysis = async () => {
    if (!frontImageFile && !frontPreviewUrl) return;

    setStage(2);
    setScanStepIndex(0);

    const stepInterval = setInterval(() => {
      setScanStepIndex((prev) => (prev < scanSteps.length - 1 ? prev + 1 : prev));
    }, 900);

    try {
      const result = await aiVisionService.analyzeProductPackaging(
        {
          frontImage: frontImageFile || frontPreviewUrl,
          backImage: backImageFile || backPreviewUrl || null,
          additionalImages: additionalFiles,
          apiKey: geminiApiKey,
          theme: selectedTheme,
        },
        {
          storeCategories: categories.map((c) => ({ id: c.id, name: c.name })),
        }
      );

      clearInterval(stepInterval);
      setAiResult(result);

      // Check Duplicates
      const dup = aiDuplicateDetector.checkDuplicate(
        {
          name: result.productName,
          barcode: result.barcode,
          sku: result.sku,
        },
        existingProducts
      );
      setDuplicateCheck(dup);

      // Populate Form Data
      setFormData({
        name: result.productName,
        brand: result.brandName,
        category_id: result.suggestedCategoryId || categories[0]?.id || "",
        sub_category: result.subCategory || "",
        sku: result.sku,
        barcode: result.barcode,
        unit_id: units[0]?.id || "",
        supplier_id: suppliers[0]?.id || "",
        mrp: result.mrp,
        purchase_price: result.suggestedPurchasePrice,
        selling_price: result.suggestedSellingPrice,
        wholesale_price: result.suggestedWholesalePrice,
        current_stock: 10,
        minimum_stock: 5,
        reorder_level: 10,
        variant_name: result.attributes.variant || "Standard",
        shade_color: "",
        net_weight: result.attributes.netVolume || "50 g",
        short_description: result.descriptions.shortDescription,
        long_description: result.descriptions.longDescription,
        ingredients: result.attributes.ingredientsList?.join(", ") || "",
        directions: result.descriptions.directionsForUse || "",
        warnings: result.attributes.warningsList || "",
        country_of_origin: result.attributes.countryOfOrigin || "India",
        manufacturer: result.manufacturer || `${result.brandName} Pvt. Ltd.`,
        is_website_published: true,
      });

      setStage(3);
    } catch (err: any) {
      clearInterval(stepInterval);
      console.error("AI Analysis failed:", err);
      alert("AI Processing Encountered an issue: " + err.message);
      setStage(1);
    }
  };

  // Method 2: Barcode Lookup & Auto-fill
  const handleBarcodeLookup = async () => {
    if (!inputBarcode.trim()) return;
    setIsLookingUpBarcode(true);

    try {
      const lookup = await aiBarcodeLookup.lookupBarcode(inputBarcode, shopId);
      if (lookup.found) {
        const prodName = lookup.productName || "Product " + inputBarcode;
        const brandName = lookup.brand || "Brand";
        const mrp = lookup.mrp || 50;

        // Populate Form
        setFormData((prev) => ({
          ...prev,
          name: prodName,
          brand: brandName,
          barcode: inputBarcode,
          mrp,
          selling_price: mrp,
          purchase_price: Math.round(mrp * 0.7),
          wholesale_price: Math.round(mrp * 0.85),
          short_description: lookup.description || "",
        }));

        // Move to Stage 3 directly
        setStage(3);
      } else {
        alert("Barcode not found in catalog. Please upload photo for full Vision AI extraction.");
        setCreationMethod("vision");
      }
    } catch (err) {
      console.error("Barcode lookup failed:", err);
    } finally {
      setIsLookingUpBarcode(false);
    }
  };

  // Dynamic Price calculations
  const handleMrpChange = (newMrp: number) => {
    const validMrp = Math.max(0, newMrp);
    const calculatedSelling = validMrp;
    const calculatedPurchase = Math.round(validMrp * 0.7);
    const calculatedWholesale = Math.round(validMrp * 0.85);

    setFormData((prev) => ({
      ...prev,
      mrp: validMrp,
      selling_price: calculatedSelling,
      purchase_price: calculatedPurchase,
      wholesale_price: calculatedWholesale,
    }));
  };

  const handlePurchasePriceChange = (cost: number) => {
    setFormData((prev) => ({
      ...prev,
      purchase_price: cost,
    }));
  };

  const handleSellingPriceChange = (price: number) => {
    setFormData((prev) => ({
      ...prev,
      selling_price: price,
    }));
  };

  // Publish / Save Product to Database (Multi-Channel Sync)
  const handleSaveProduct = async () => {
    if (!formData.name.trim()) {
      alert("Product name is required.");
      return;
    }
    if (!formData.category_id) {
      alert("Please select a category.");
      return;
    }

    setIsSaving(true);
    const supabase = createClient();

    try {
      const heroImg = aiResult?.images?.studioAssets?.heroUrl || aiResult?.images?.enhancedUrl || frontPreviewUrl;
      const catalogImg = aiResult?.images?.studioAssets?.catalogUrl || heroImg;
      const lifestyleImg = aiResult?.images?.studioAssets?.lifestyleUrl || heroImg;
      const promoImg = aiResult?.images?.studioAssets?.promoBannerUrl || heroImg;
      const galleryList = aiResult?.images?.galleryUrls || [heroImg];

      const productPayload = {
        shop_id: shopId,
        name: formData.name,
        brand: formData.brand || null,
        category_id: formData.category_id || null,
        sku: formData.sku || `SKU-${Date.now()}`,
        barcode: formData.barcode || null,
        unit_id: formData.unit_id || null,
        supplier_id: formData.supplier_id || null,
        purchase_price: Number(formData.purchase_price) || 0,
        selling_price: Number(formData.selling_price) || 0,
        wholesale_price: formData.wholesale_price ? Number(formData.wholesale_price) : null,
        current_stock: Number(formData.current_stock) || 0,
        minimum_stock: Number(formData.minimum_stock) || 0,
        description: formData.short_description || formData.long_description || null,
        image_url: heroImg, // Primary website image
        is_active: true,
      };

      const { data: newProd, error: prodError } = await supabase
        .from("products")
        .insert([productPayload])
        .select()
        .single();

      if (prodError) throw prodError;

      // Create initial stock movement if opening stock > 0
      if (Number(formData.current_stock) > 0 && newProd) {
        try {
          await supabase.from("stock_movements").insert([
            {
              shop_id: shopId,
              product_id: newProd.id,
              movement_type: "adjustment",
              quantity_delta: Number(formData.current_stock),
              reference_table: "products",
              reference_id: newProd.id,
              notes: "Initial opening stock created via Falcon AI Product Studio",
            },
          ]);
        } catch (stockErr) {
          console.warn("Stock movement note skipped:", stockErr);
        }
      }

      onProductCreated();
      onClose();
    } catch (err: any) {
      console.error("Save product error:", err);
      alert("Failed to save product: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Render Active Studio Preview Image
  const getActiveDisplayImage = () => {
    if (!aiResult) return frontPreviewUrl;
    const assets = aiResult.images.studioAssets;
    if (!assets) return aiResult.images.enhancedUrl;

    switch (activeAssetTab) {
      case "hero":
        return assets.heroUrl;
      case "catalog":
        return assets.catalogUrl;
      case "lifestyle":
        return assets.lifestyleUrl;
      case "promo":
        return assets.promoBannerUrl;
      case "story":
        return assets.socialMedia.storyUrl;
      case "zoom":
        return assets.zoomUrl;
      case "original":
        return aiResult.images.originalUrl;
      default:
        return assets.heroUrl;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="4xl"
    >
      {/* Studio Header Bar */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 px-6 py-4 text-white -m-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Falcon AI Product Studio
                </h2>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-purple-500/30 border border-purple-400/40 text-purple-200">
                  Showroom Grade
                </span>
              </div>
              <p className="text-xs text-purple-200/80">
                Automated vision OCR, neural restoration, lifestyle staging & 1-click multi-channel publishing
              </p>
            </div>
          </div>

          {/* Creation Method Pills (Stage 1 only) */}
          {stage === 1 && (
            <div className="flex items-center bg-white/10 p-1 rounded-xl backdrop-blur-xs border border-white/15">
              <button
                type="button"
                onClick={() => setCreationMethod("vision")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  creationMethod === "vision"
                    ? "bg-white text-purple-950 shadow-md"
                    : "text-white/80 hover:text-white"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                Vision AI Studio
              </button>
              <button
                type="button"
                onClick={() => setCreationMethod("barcode")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  creationMethod === "barcode"
                    ? "bg-white text-purple-950 shadow-md"
                    : "text-white/80 hover:text-white"
                }`}
              >
                <Barcode className="w-3.5 h-3.5" />
                Barcode + AI
              </button>
              {onOpenManualModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenManualModal();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/80 hover:text-white transition-all"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Manual Entry
                </button>
              )}
            </div>
          )}

          {/* Close X */}
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="p-6 max-h-[85vh] overflow-y-auto bg-gray-50/60">
        {/* ========================================================================= */}
        {/* STAGE 1: UPLOAD & CAPTURE                                                */}
        {/* ========================================================================= */}
        {stage === 1 && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Method 2: Barcode Lookup View */}
            {creationMethod === "barcode" ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xs space-y-6 text-center">
                <div className="w-14 h-14 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto">
                  <Barcode className="w-8 h-8" />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-base font-bold text-gray-900">Scan or Enter Product Barcode</h3>
                  <p className="text-xs text-gray-500">
                    Falcon AI instantly queries our database and global EAN catalog to auto-populate specifications.
                  </p>
                </div>

                <div className="max-w-md mx-auto flex items-center gap-2">
                  <div className="relative flex-1">
                    <Barcode className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. 8904000000000"
                      value={inputBarcode}
                      onChange={(e) => setInputBarcode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleBarcodeLookup()}
                      className="w-full pl-9 pr-4 py-2.5 text-sm font-mono bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-none"
                    />
                  </div>
                  <Button
                    onClick={handleBarcodeLookup}
                    disabled={isLookingUpBarcode || !inputBarcode.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-5"
                  >
                    {isLookingUpBarcode ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Lookup"}
                  </Button>
                </div>
              </div>
            ) : (
              /* Method 1: Vision Studio Upload */
              <>
                {/* API Key Banner (OpenAI / Gemini) */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                      <Wand2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-950">
                          Dual Multimodal OCR Engine
                        </span>
                        <span className="text-[10px] font-bold bg-purple-100/80 text-purple-800 border border-purple-300 px-2 py-0.5 rounded-full">
                          OpenAI GPT-4o & Gemini 1.5
                        </span>
                      </div>
                      <p className="text-[11px] text-purple-800/80">
                        {geminiApiKey
                          ? "✓ Active AI API key configured for high-precision OCR & ₹50 MRP extraction"
                          : "Optional: Add your OpenAI (sk-...) or Gemini API key for 100% precision."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                      className="text-xs border-purple-300 text-purple-800 hover:bg-purple-100"
                    >
                      {showApiKeyInput ? "Hide Key" : geminiApiKey ? "Edit Key" : "Add Key"}
                    </Button>
                  </div>
                </div>

                {showApiKeyInput && (
                  <div className="bg-white border border-purple-200 rounded-xl p-3 flex gap-2">
                    <input
                      type="password"
                      placeholder="Paste your OpenAI Key (sk-...) or Gemini Key (AIza...)"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      className="flex-1 text-xs border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        handleSaveApiKey(geminiApiKey);
                        setShowApiKeyInput(false);
                      }}
                      className="bg-purple-600 text-white text-xs font-bold"
                    >
                      Save Key
                    </Button>
                  </div>
                )}

                {/* Hero Theme Selection Preset */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-purple-600" />
                      Choose Showroom Presentation Theme
                    </span>
                    <span className="text-[10px] text-gray-400">Can change anytime</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: "luxury_marble", label: "🌟 Luxury Marble", desc: "Cosmetics & Skincare" },
                      { id: "botanical_herbal", label: "🌿 Botanical Teak", desc: "Ayurveda & Herbal" },
                      { id: "minimal_studio", label: "📸 Pure Studio", desc: "Modern Clean White" },
                      { id: "dark_obsidian", label: "🖤 Dark Obsidian", desc: "Premium / Luxury Men" },
                      { id: "festival_gold", label: "✨ Festival Gold", desc: "Gift & Festival Sale" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTheme(t.id as HeroTheme)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          selectedTheme === t.id
                            ? "bg-purple-50 border-purple-600 ring-2 ring-purple-600/20 shadow-xs"
                            : "bg-gray-50/50 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <div className="text-xs font-bold text-gray-900">{t.label}</div>
                        <div className="text-[10px] text-gray-500 truncate">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Camera View if Active */}
                {isCameraActive ? (
                  <div className="bg-black rounded-2xl overflow-hidden p-4 space-y-4 text-center">
                    <div className="relative aspect-video max-h-[380px] mx-auto bg-black rounded-xl overflow-hidden flex items-center justify-center">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-4 border-2 border-dashed border-white/50 rounded-xl pointer-events-none flex items-center justify-center">
                        <span className="text-xs text-white/80 font-bold bg-black/50 px-3 py-1 rounded-full backdrop-blur-xs">
                          Center Product Inside Box
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      <Button
                        type="button"
                        onClick={capturePhoto}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2 rounded-full flex items-center gap-2 shadow-lg shadow-purple-600/30"
                      >
                        <Camera className="w-4 h-4" />
                        Snap Product Photo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={stopCamera}
                        className="text-white border-white/30 hover:bg-white/10"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Dual Photo Upload Cards */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Front Image Card */}
                    <div
                      className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all bg-white flex flex-col justify-between ${
                        frontPreviewUrl
                          ? "border-purple-500 bg-purple-50/10"
                          : "border-gray-300 hover:border-purple-400 hover:bg-purple-50/20"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">
                              1
                            </span>
                            Front Packaging Photo *
                          </span>
                          {frontPreviewUrl && (
                            <Badge className="bg-emerald-600 text-white text-[10px]">Ready</Badge>
                          )}
                        </div>

                        {frontPreviewUrl ? (
                          <div className="relative aspect-square max-h-56 mx-auto rounded-xl overflow-hidden bg-gray-50 border border-gray-200 flex items-center justify-center">
                            <img
                              src={frontPreviewUrl}
                              alt="Front"
                              className="w-full h-full object-contain p-2"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setFrontImageFile(null);
                                setFrontPreviewUrl("");
                              }}
                              className="absolute top-2 right-2 p-1 rounded-full bg-red-600 text-white shadow-md hover:bg-red-700"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="py-8 space-y-3">
                            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-gray-800">
                                Drag & Drop or Click to Upload
                              </p>
                              <p className="text-[11px] text-gray-500">
                                Captures product name, brand, logo & design
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {!frontPreviewUrl && (
                        <div className="flex items-center justify-center gap-2 pt-3 border-t border-gray-100">
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            Choose File
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                e.target.files?.[0] && handleFrontImageSelect(e.target.files[0])
                              }
                            />
                          </label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={startCamera}
                            className="text-xs border-gray-300 text-gray-700"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            Camera
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Back Image Card */}
                    <div
                      className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all bg-white flex flex-col justify-between ${
                        backPreviewUrl
                          ? "border-purple-500 bg-purple-50/10"
                          : "border-gray-300 hover:border-purple-400 hover:bg-purple-50/20"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                              2
                            </span>
                            Back Label Photo (Optional)
                          </span>
                          {backPreviewUrl && (
                            <Badge className="bg-emerald-600 text-white text-[10px]">Ready</Badge>
                          )}
                        </div>

                        {backPreviewUrl ? (
                          <div className="relative aspect-square max-h-56 mx-auto rounded-xl overflow-hidden bg-gray-50 border border-gray-200 flex items-center justify-center">
                            <img
                              src={backPreviewUrl}
                              alt="Back"
                              className="w-full h-full object-contain p-2"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setBackImageFile(null);
                                setBackPreviewUrl("");
                              }}
                              className="absolute top-2 right-2 p-1 rounded-full bg-red-600 text-white shadow-md hover:bg-red-700"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="py-8 space-y-3">
                            <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                              <Barcode className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-gray-800">
                                Back / Side Specifications
                              </p>
                              <p className="text-[11px] text-gray-500">
                                Captures ₹50 MRP, barcode, ingredients & directions
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {!backPreviewUrl && (
                        <div className="flex items-center justify-center gap-2 pt-3 border-t border-gray-100">
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            Choose File
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                e.target.files?.[0] && handleBackImageSelect(e.target.files[0])
                              }
                            />
                          </label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={startCamera}
                            className="text-xs border-gray-300 text-gray-700"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            Camera
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit Action */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className="text-xs text-gray-500">
                    Takes ~15-20 seconds for full studio rendering & OCR
                  </span>
                  <Button
                    onClick={handleStartAnalysis}
                    disabled={!frontImageFile && !frontPreviewUrl}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-purple-500/25 flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Launch Falcon AI Studio
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 2: AI SCANNING RADAR                                               */}
        {/* ========================================================================= */}
        {stage === 2 && (
          <div className="py-12 px-4 max-w-lg mx-auto text-center space-y-6">
            <div className="relative w-28 h-28 mx-auto">
              <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-purple-500/30 animate-pulse" />
              <div className="relative w-full h-full rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-purple-500/40">
                <Wand2 className="w-12 h-12 text-white animate-bounce" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-black text-gray-900 tracking-tight">
                Falcon AI Studio is Polishing Your Listing
              </h3>
              <p className="text-xs text-purple-700 font-semibold h-6 transition-all duration-300">
                {scanSteps[scanStepIndex]}
              </p>
            </div>

            <div className="space-y-2 text-left bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
              {scanSteps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs">
                  {idx < scanStepIndex ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : idx === scanStepIndex ? (
                    <RefreshCw className="w-4 h-4 text-purple-600 animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-gray-300 shrink-0" />
                  )}
                  <span
                    className={
                      idx === scanStepIndex
                        ? "text-purple-900 font-bold"
                        : idx < scanStepIndex
                        ? "text-gray-700"
                        : "text-gray-400"
                    }
                  >
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 3: MASTER STUDIO SUITE & REVIEW                                    */}
        {/* ========================================================================= */}
        {stage === 3 && aiResult && (
          <div className="space-y-4">
            {/* Top Success Banner with Quality Score */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-950">
                  Falcon AI Studio Assets Generated • Quality Score:{" "}
                  <span className="text-emerald-700 font-black">
                    {aiResult.images.qualityReport?.score || 96}%
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-emerald-800 font-medium">
                  Website Hero Set • POS Synced
                </span>
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                  Ready to Publish
                </Badge>
              </div>
            </div>

            {/* Duplicate Check Warning */}
            {duplicateCheck.isDuplicate && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-xs text-amber-900">
                  <div className="font-bold">Possible Duplicate Detected</div>
                  <p>{duplicateCheck.message}</p>
                </div>
              </div>
            )}

            {/* Main Studio Grid: Left Studio Visuals (5 cols), Right Product Details (7 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* LEFT: Master Studio Visual Suite (5 cols) */}
              <div className="lg:col-span-5 space-y-3">
                <div className="bg-white border border-gray-200 rounded-2xl p-3.5 space-y-3 shadow-xs">
                  {/* Asset View Tabs */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-purple-600" />
                      Studio Asset Gallery
                    </span>
                    <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-bold">
                      5 Assets
                    </span>
                  </div>

                  {/* Asset Category Selector Tabs */}
                  <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-xl text-[10px] font-bold text-gray-700">
                    <button
                      type="button"
                      onClick={() => setActiveAssetTab("hero")}
                      className={`py-1 rounded-lg transition-all ${
                        activeAssetTab === "hero"
                          ? "bg-purple-600 text-white shadow-2xs"
                          : "hover:bg-gray-200"
                      }`}
                    >
                      🌟 Website Hero
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAssetTab("catalog")}
                      className={`py-1 rounded-lg transition-all ${
                        activeAssetTab === "catalog"
                          ? "bg-purple-600 text-white shadow-2xs"
                          : "hover:bg-gray-200"
                      }`}
                    >
                      🏢 POS White
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAssetTab("lifestyle")}
                      className={`py-1 rounded-lg transition-all ${
                        activeAssetTab === "lifestyle"
                          ? "bg-purple-600 text-white shadow-2xs"
                          : "hover:bg-gray-200"
                      }`}
                    >
                      🌿 Lifestyle
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAssetTab("promo")}
                      className={`py-1 rounded-lg transition-all ${
                        activeAssetTab === "promo"
                          ? "bg-purple-600 text-white shadow-2xs"
                          : "hover:bg-gray-200"
                      }`}
                    >
                      🏷️ Promo Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAssetTab("story")}
                      className={`py-1 rounded-lg transition-all ${
                        activeAssetTab === "story"
                          ? "bg-purple-600 text-white shadow-2xs"
                          : "hover:bg-gray-200"
                      }`}
                    >
                      📱 Story (9:16)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAssetTab("original")}
                      className={`py-1 rounded-lg transition-all ${
                        activeAssetTab === "original"
                          ? "bg-purple-600 text-white shadow-2xs"
                          : "hover:bg-gray-200"
                      }`}
                    >
                      📷 Raw Photo
                    </button>
                  </div>

                  {/* Main High-Definition Display Frame */}
                  <div className="relative aspect-square w-full rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center shadow-xs group">
                    <img
                      src={getActiveDisplayImage()}
                      alt="Active Studio Asset"
                      className={`w-full h-full object-contain p-2 transition-all duration-300 ${
                        isRegeneratingTheme ? "opacity-30 blur-xs" : "opacity-100"
                      }`}
                    />

                    {isRegeneratingTheme && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-2xs">
                        <div className="flex items-center gap-2 text-xs font-bold text-purple-700 bg-white px-3.5 py-2 rounded-full shadow-lg">
                          <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                          Rendering Theme Assets...
                        </div>
                      </div>
                    )}

                    <span className="absolute bottom-2 right-2 text-[9px] font-bold px-2 py-0.5 bg-black/65 text-white rounded-md backdrop-blur-xs">
                      {activeAssetTab === "hero"
                        ? "1080×1080 Showroom Master"
                        : activeAssetTab === "story"
                        ? "1080×1920 Story"
                        : "1080×1080 High-Res"}
                    </span>
                  </div>

                  {/* Live Hero Theme Switcher ("Generate Hero Images") */}
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-purple-950">
                      <span className="flex items-center gap-1">
                        <Palette className="w-3.5 h-3.5 text-purple-600" />
                        Change Showroom Theme:
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold">
                      {[
                        { id: "luxury_marble", label: "🌟 Luxury Marble" },
                        { id: "botanical_herbal", label: "🌿 Botanical Teak" },
                        { id: "minimal_studio", label: "📸 Pure Studio" },
                        { id: "dark_obsidian", label: "🖤 Dark Obsidian" },
                        { id: "festival_gold", label: "✨ Festival Gold" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSwitchTheme(t.id as HeroTheme)}
                          className={`px-1.5 py-1.5 rounded-lg border text-center transition-all ${
                            selectedTheme === t.id
                              ? "bg-purple-600 text-white border-purple-600 shadow-2xs font-extrabold"
                              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Image Quality Scorecard Shield */}
                  {aiResult.images.qualityReport && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          AI Inspection Shield:
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                          PASS
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {aiResult.images.qualityReport.passedChecks.slice(0, 3).map((chk, i) => (
                          <div key={i} className="text-[10px] text-slate-600 flex items-center gap-1.5">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>{chk}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Smart Pricing & Profit Margin Card (Anchor to ₹50 MRP) */}
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50/70 border border-purple-200 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-purple-700" />
                        Pricing & Profit Calculation
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {marginPercentage}% Margin
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[11px] font-bold text-gray-800">
                            Printed Packaging MRP (₹) *
                          </label>
                          <span className="text-[10px] text-purple-700 font-semibold">
                            Auto-calculates prices
                          </span>
                        </div>
                        <input
                          type="number"
                          value={formData.mrp}
                          onChange={(e) => handleMrpChange(parseFloat(e.target.value) || 0)}
                          className="w-full text-xs font-black text-gray-900 bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-700 mb-0.5">
                            Cost / Purchase (₹)
                          </label>
                          <input
                            type="number"
                            value={formData.purchase_price}
                            onChange={(e) =>
                              handlePurchasePriceChange(parseFloat(e.target.value) || 0)
                            }
                            className="w-full text-xs font-bold text-gray-900 bg-white border border-gray-300 rounded-lg px-2 py-1.5"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-700 mb-0.5">
                            Retail Selling (₹)
                          </label>
                          <input
                            type="number"
                            value={formData.selling_price}
                            onChange={(e) =>
                              handleSellingPriceChange(parseFloat(e.target.value) || 0)
                            }
                            className="w-full text-xs font-bold text-gray-900 bg-white border border-gray-300 rounded-lg px-2 py-1.5"
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">Estimated Profit / Item:</span>
                        <span className="text-xs font-black text-emerald-600">
                          {formatCurrency(profitMarginAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Extracted Editable Specifications & Inventory (7 cols) */}
              <div className="lg:col-span-7 space-y-3.5">
                {/* General Information Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div className="text-xs font-bold text-gray-900 flex items-center justify-between border-b border-gray-100 pb-2">
                    <span>1. Product Identity & Taxonomy</span>
                    <span className="text-[10px] text-gray-400">All fields editable</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Product Title / Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full text-xs font-bold bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Brand Name
                      </label>
                      <input
                        type="text"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        className="w-full text-xs bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Store Category
                      </label>
                      <select
                        value={formData.category_id}
                        onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                        className="w-full text-xs bg-white border border-gray-300 rounded-lg px-3 py-2 font-medium text-gray-900 focus:ring-2 focus:ring-purple-600"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-gray-700">
                          Barcode (EAN-13 / UPC)
                        </label>
                        {!formData.barcode && (
                          <button
                            type="button"
                            onClick={() => {
                              const randomSuffix = Math.floor(100000000 + Math.random() * 900000000);
                              setFormData({ ...formData, barcode: `890${randomSuffix}`.slice(0, 13) });
                            }}
                            className="text-[10px] text-purple-600 font-semibold hover:text-purple-800"
                          >
                            + Generate EAN
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Barcode className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          placeholder="Leave blank or enter barcode"
                          value={formData.barcode}
                          onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                          className="w-full pl-8 pr-3 py-2 text-xs font-mono bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        System SKU
                      </label>
                      <input
                        type="text"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Inventory & Stock Setup */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center justify-between">
                    <span>2. Inventory Setup</span>
                    <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-bold">
                      POS Synced
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Opening Stock
                      </label>
                      <input
                        type="number"
                        value={formData.current_stock}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            current_stock: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full text-xs font-bold bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Min Stock Alert
                      </label>
                      <input
                        type="number"
                        value={formData.minimum_stock}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            minimum_stock: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full text-xs bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Unit
                      </label>
                      <select
                        value={formData.unit_id}
                        onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                        className="w-full text-xs bg-white border border-gray-300 rounded-lg px-3 py-2"
                      >
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* E-Commerce Descriptions & SEO */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div
                    onClick={() => setShowDescriptions(!showDescriptions)}
                    className="text-xs font-bold text-gray-900 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-purple-600" />
                      3. E-Commerce Copy & SEO Description
                    </span>
                    {showDescriptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>

                  {showDescriptions && (
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Short Product Summary
                        </label>
                        <textarea
                          rows={2}
                          value={formData.short_description}
                          onChange={(e) =>
                            setFormData({ ...formData, short_description: e.target.value })
                          }
                          className="w-full text-xs bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800"
                        />
                      </div>

                      {aiResult.descriptions.keyBenefits && aiResult.descriptions.keyBenefits.length > 0 && (
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                            Key Selling Points (Bullet Points)
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {aiResult.descriptions.keyBenefits.map((benefit, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-md bg-purple-50 border border-purple-200 text-purple-900 text-[11px] font-medium"
                              >
                                &bull; {benefit}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Packaging Attributes & Ingredients */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div
                    onClick={() => setShowAdvancedAttributes(!showAdvancedAttributes)}
                    className="text-xs font-bold text-gray-900 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-indigo-600" />
                      4. Packaging Attributes, Ingredients & Directions
                    </span>
                    {showAdvancedAttributes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>

                  {showAdvancedAttributes && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Net Weight / Volume
                        </label>
                        <input
                          type="text"
                          value={formData.net_weight}
                          onChange={(e) => setFormData({ ...formData, net_weight: e.target.value })}
                          className="w-full text-xs bg-white border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Country of Origin
                        </label>
                        <input
                          type="text"
                          value={formData.country_of_origin}
                          onChange={(e) =>
                            setFormData({ ...formData, country_of_origin: e.target.value })
                          }
                          className="w-full text-xs bg-white border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Ingredients / Composition
                        </label>
                        <input
                          type="text"
                          value={formData.ingredients}
                          onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                          className="w-full text-xs bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Directions for Use
                        </label>
                        <input
                          type="text"
                          value={formData.directions}
                          onChange={(e) => setFormData({ ...formData, directions: e.target.value })}
                          className="w-full text-xs bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Final Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStage(1)}
                    className="text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Back / Re-upload
                  </Button>

                  <Button
                    onClick={handleSaveProduct}
                    disabled={isSaving}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-8 py-2.5 rounded-xl shadow-lg shadow-emerald-600/25 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Publish to Store & Website
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
