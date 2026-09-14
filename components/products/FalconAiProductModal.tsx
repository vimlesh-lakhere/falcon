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
  Download,
  Copy,
  Cpu,
  Zap,
  Check,
  ImagePlus,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";
import { aiVisionService } from "@/lib/ai/vision-analysis";
import { aiDuplicateDetector } from "@/lib/ai/duplicate-detector";
import { aiBarcodeLookup } from "@/lib/ai/barcode-lookup";
import { aiImageEnhancer } from "@/lib/ai/image-enhancer";
import { aiCategoryDetector } from "@/lib/ai/category-detector";
import { masterStudioGenerator } from "@/lib/ai/studio-generator";
import { aiImagePromptEngine } from "@/lib/ai/image-prompt-engine";
import {
  AiProductAnalysisResult,
  DuplicateCheckResult,
  HeroTheme,
  StudioAssetGallery,
  ImageQualityReport,
} from "@/lib/ai/types";
import { Product, Category, Supplier, Unit } from "@/types/database";
import { formatCurrency, capitalizeFirstLetter } from "@/lib/utils";
import { productsRepository } from "@/repositories/products.repo";
import { createClient } from "@/lib/supabase/client";
import { transliterateToHindi, transliterateSync } from "@/lib/transliterate";
import { localImageStudio, StudioTheme } from "@/lib/ai/local-image-studio";

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

export type ProductCreationMethod = "vision" | "barcode" | "prompt" | "manual";

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

  // Direct Prompt Generation State (Stage 1 Method 3)
  const [promptFormData, setPromptFormData] = useState({
    name: "",
    brand: "",
    category_id: "",
    mrp: 999,
    prompt: "",
    theme: "luxury_marble",
  });
  const [isPromptGenerating, setIsPromptGenerating] = useState(false);

  // Selected Hero Theme
  const [selectedTheme, setSelectedTheme] = useState<HeroTheme>("luxury_marble");

  // Production AI Image Generation & Magic Prompt Editor States (ChatGPT / Gemini grade)
  const [customAiPrompt, setCustomAiPrompt] = useState<string>("");
  const [aiEngineProvider, setAiEngineProvider] = useState<"auto" | "openai" | "google">("auto");
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [aiGeneratedImageUrl, setAiGeneratedImageUrl] = useState<string>("");
  const [aiGeneratedProviderName, setAiGeneratedProviderName] = useState<string>("");
  const [aiGeneratedPrompt, setAiGeneratedPrompt] = useState<string>("");
  const [isCopiedPrompt, setIsCopiedPrompt] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<"1:1" | "9:16" | "16:9">("1:1");
  const [customDirectImageUrl, setCustomDirectImageUrl] = useState<string>("");

  // Active Studio Image Asset Tab in Stage 3
  const [activeAssetTab, setActiveAssetTab] = useState<
    "ai_showroom" | "hero" | "catalog" | "lifestyle" | "promo" | "story" | "zoom" | "original"
  >("original");

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
    name_hindi: "",
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
    is_online: true,
    online_price: 0,
  });

  // UI accordion sections
  const [showAdvancedAttributes, setShowAdvancedAttributes] = useState(false);
  const [showDescriptions, setShowDescriptions] = useState(true);

  // Gemini Vision & Remove.bg API Key state
  const [geminiApiKey, setGeminiApiKey] = useState<string>("");
  const [removeBgApiKey, setRemoveBgApiKey] = useState<string>("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isScanningGemini, setIsScanningGemini] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("falcon_gemini_api_key") || "";
      setGeminiApiKey(savedKey);
      const savedRbg = localStorage.getItem("falcon_remove_bg_api_key") || "";
      setRemoveBgApiKey(savedRbg);
    }
  }, []);

  const handleSaveApiKey = (geminiKey: string, rbgKey?: string) => {
    const trimmedGemini = geminiKey.trim();
    setGeminiApiKey(trimmedGemini);
    if (typeof window !== "undefined") {
      localStorage.setItem("falcon_gemini_api_key", trimmedGemini);
    }
    if (rbgKey !== undefined) {
      const trimmedRbg = rbgKey.trim();
      setRemoveBgApiKey(trimmedRbg);
      if (typeof window !== "undefined") {
        localStorage.setItem("falcon_remove_bg_api_key", trimmedRbg);
      }
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
      setActiveAssetTab("original");
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

    const effectiveKey =
      geminiApiKey.trim() ||
      (typeof window !== "undefined"
        ? localStorage.getItem("falcon_gemini_api_key") || ""
        : "");

    const effectiveRbgKey =
      removeBgApiKey.trim() ||
      (typeof window !== "undefined"
        ? localStorage.getItem("falcon_remove_bg_api_key") || ""
        : "");

    try {
      const result = await aiVisionService.analyzeProductPackaging(
        {
          frontImage: frontImageFile || frontPreviewUrl,
          backImage: backImageFile || backPreviewUrl || null,
          additionalImages: additionalFiles,
          apiKey: effectiveKey,
          removeBgApiKey: effectiveRbgKey,
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

      // Transliterate to Hindi for dual billing
      let visionHindi = "";
      if (result.productName) {
        try {
          visionHindi = await transliterateToHindi(result.productName);
        } catch {}
      }

      // Populate Form Data
      setFormData({
        name: result.productName ? capitalizeFirstLetter(result.productName) : "",
        name_hindi: visionHindi,
        brand: result.brandName ? capitalizeFirstLetter(result.brandName) : "",
        category_id: result.suggestedCategoryId || "",
        sub_category: result.subCategory || "",
        sku: result.sku,
        barcode: result.barcode,
        unit_id: units[0]?.id || "",
        supplier_id: suppliers[0]?.id || "",
        mrp: result.mrp || 0,
        purchase_price: result.suggestedPurchasePrice || 0,
        selling_price: result.suggestedSellingPrice || 0,
        wholesale_price: result.suggestedWholesalePrice || 0,
        current_stock: 10,
        minimum_stock: 5,
        reorder_level: 10,
        variant_name: result.attributes?.variant || "Standard",
        shade_color: "",
        net_weight: result.attributes?.netVolume || "",
        short_description: result.descriptions?.shortDescription || "",
        long_description: result.descriptions?.longDescription || "",
        ingredients: result.attributes?.ingredientsList?.join(", ") || "",
        directions: result.attributes?.directionsOfUse || "Use as indicated on packaging.",
        warnings: result.attributes?.warningsList || "Store in a cool dry place.",
        country_of_origin: result.attributes?.countryOfOrigin || "India",
        manufacturer: result.attributes?.manufacturer || (result.brandName ? `${result.brandName} Laboratories` : ""),
        is_website_published: true,
        is_online: true,
        online_price: 0,
      });

      // Clear synthetic showroom url so the user's real product photo is the primary hero
      setAiGeneratedImageUrl("");
      setAiGeneratedProviderName("");
      setAiGeneratedPrompt("");
      if (result.images.studioAssets?.catalogUrl) {
        setActiveAssetTab("catalog");
      } else {
        setActiveAssetTab("original");
      }

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
        const prodName = capitalizeFirstLetter(lookup.productName || "Product " + inputBarcode);
        const brandName = lookup.brand ? capitalizeFirstLetter(lookup.brand) : "Brand";
        const mrp = lookup.mrp || 50;

        let barcodeHindi = transliterateSync(prodName);
        try {
          transliterateToHindi(prodName).then((hi) => {
            if (hi) setFormData((prev) => ({ ...prev, name_hindi: hi }));
          }).catch(() => {});
        } catch {}

        // Populate Form
        setFormData((prev) => ({
          ...prev,
          name: prodName,
          name_hindi: barcodeHindi || prev.name_hindi,
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

  // Method 2.5: Re-scan / Scan Packaging Label with Gemini Vision OCR
  const handleScanWithGemini = async () => {
    const photoToAnalyze = frontPreviewUrl || (aiResult?.images?.originalUrl);
    if (!photoToAnalyze) {
      alert("Please upload a front product photo first.");
      return;
    }

    const keyToUse = geminiApiKey.trim() || (typeof window !== "undefined" ? localStorage.getItem("falcon_gemini_api_key") || "" : "");
    if (!keyToUse) {
      setShowApiKeyInput(true);
      return;
    }

    setIsScanningGemini(true);
    try {
      const frontComp = await aiImageEnhancer.fastCompress(photoToAnalyze, 1080, 0.85);
      const backComp = backPreviewUrl
        ? await aiImageEnhancer.fastCompress(backPreviewUrl, 1080, 0.85)
        : undefined;

      const effectiveRbgKey =
        removeBgApiKey.trim() ||
        (typeof window !== "undefined"
          ? localStorage.getItem("falcon_remove_bg_api_key") || ""
          : "");

      const res = await fetch("/api/ai/analyze-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frontImage: frontComp,
          backImage: backComp,
          apiKey: keyToUse,
          removeBgApiKey: effectiveRbgKey,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (json.success && json.data) {
        const d = json.data;
        const scannedName = d.product_name ? capitalizeFirstLetter(d.product_name) : "";
        const scannedBrand = d.brand ? capitalizeFirstLetter(d.brand) : "";
        const scannedMrp = Number(d.mrp) || 0;

        let scannedHindi = scannedName ? transliterateSync(scannedName) : "";
        if (scannedName) {
          transliterateToHindi(scannedName)
            .then((hi) => {
              if (hi) setFormData((prev) => ({ ...prev, name_hindi: hi }));
            })
            .catch(() => {});
        }

        setFormData((prev) => {
          const updated = {
            ...prev,
            name: scannedName || prev.name,
            name_hindi: scannedHindi || prev.name_hindi,
            brand: scannedBrand || prev.brand,
            mrp: scannedMrp > 0 ? scannedMrp : prev.mrp,
            selling_price: scannedMrp > 0 ? scannedMrp : prev.selling_price,
            purchase_price: scannedMrp > 0 ? Math.round(scannedMrp * 0.7) : prev.purchase_price,
            wholesale_price: scannedMrp > 0 ? Math.round(scannedMrp * 0.85) : prev.wholesale_price,
            barcode: d.barcode ? String(d.barcode).replace(/[^0-9]/g, "") : prev.barcode,
            net_weight: d.net_weight || prev.net_weight,
            short_description: d.short_description || prev.short_description,
            directions: d.directions || prev.directions,
            ingredients: Array.isArray(d.ingredients) ? d.ingredients.join(", ") : prev.ingredients,
          };

          // Try matching category
          if (d.category_name) {
            const detected = aiCategoryDetector.detect(d.category_name, scannedBrand);
            const matched = categories.find(
              (c) =>
                c.name.toLowerCase().includes(detected.categoryName.toLowerCase()) ||
                detected.categoryName.toLowerCase().includes(c.name.toLowerCase())
            );
            if (matched) {
              updated.category_id = matched.id;
            }
          }

          return updated;
        });

        if (d.pos_white_url) {
          setAiResult((prev) => {
            if (!prev) return prev;
            const updatedGallery = [...(prev.images.galleryUrls || [])];
            if (updatedGallery.length > 1) {
              updatedGallery[1] = d.pos_white_url;
            } else if (updatedGallery.length === 1) {
              updatedGallery.push(d.pos_white_url);
            }
            const existingAssets = prev.images.studioAssets;
            const studioAssets: StudioAssetGallery = existingAssets
              ? { ...existingAssets, catalogUrl: d.pos_white_url }
              : {
                  heroUrl: d.pos_white_url,
                  catalogUrl: d.pos_white_url,
                  lifestyleUrl: d.pos_white_url,
                  promoBannerUrl: d.pos_white_url,
                  socialMedia: {
                    instagramPostUrl: d.pos_white_url,
                    storyUrl: d.pos_white_url,
                    landscapeBannerUrl: d.pos_white_url,
                  },
                  zoomUrl: d.pos_white_url,
                  galleryUrls: updatedGallery,
                  activeTheme: "luxury_marble",
                };
            return {
              ...prev,
              images: {
                ...prev.images,
                enhancedUrl: d.pos_white_url,
                thumbnailUrl: d.pos_white_url,
                galleryUrls: updatedGallery,
                studioAssets,
              },
            };
          });
          setActiveAssetTab("catalog");
        }

        if (scannedName) {
          toast.success(`Scanned: ${scannedName} (${scannedBrand || ""})`);
        } else {
          toast.info("Packaging scanned. Please review details.");
        }
      } else if (json.error) {
        alert("Gemini Scan Notice: " + json.error);
      }
    } catch (scanErr: any) {
      console.error("Gemini scan error:", scanErr);
      alert("Failed to scan packaging: " + (scanErr.message || "Unknown error"));
    } finally {
      setIsScanningGemini(false);
    }
  };

  // Method 3: ChatGPT / Gemini Style Direct Prompt to Product Generation
  const handleGenerateFromDirectPrompt = async () => {
    if (!promptFormData.name.trim()) {
      alert("Please enter a product name.");
      return;
    }

    setIsPromptGenerating(true);
    setStage(2);
    setScanStepIndex(0);

    const stepInterval = setInterval(() => {
      setScanStepIndex((prev) => (prev < scanSteps.length - 1 ? prev + 1 : prev));
    }, 800);

    try {
      const catObj = categories.find((c) => c.id === promptFormData.category_id);
      const catName = catObj?.name || "General Goods";

      const imageRes = await masterStudioGenerator.generateAiShowroomImage({
        productName: promptFormData.name,
        brand: promptFormData.brand,
        categoryName: catName,
        theme: promptFormData.theme,
        customPrompt: promptFormData.prompt,
        aspectRatio: imageAspectRatio,
        provider: aiEngineProvider,
        apiKey: geminiApiKey || undefined,
      });

      clearInterval(stepInterval);

      setAiGeneratedImageUrl(imageRes.imageUrl);
      setAiGeneratedProviderName(imageRes.provider);
      setAiGeneratedPrompt(imageRes.prompt);
      setFrontPreviewUrl(imageRes.imageUrl);

      const mrp = Number(promptFormData.mrp) || 999;
      const sku = `${(promptFormData.brand.slice(0, 3) || "PRD").toUpperCase()}-${(catName.slice(0, 3) || "GEN").toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

      let promptHindi = "";
      if (promptFormData.name) {
        try {
          promptHindi = await transliterateToHindi(promptFormData.name);
        } catch {}
      }

      setFormData({
        name: promptFormData.name,
        name_hindi: promptHindi,
        brand: promptFormData.brand,
        category_id: promptFormData.category_id || categories[0]?.id || "",
        sub_category: "",
        sku,
        barcode: `890${Math.floor(100000000 + Math.random() * 900000000)}`.slice(0, 13),
        unit_id: units[0]?.id || "",
        supplier_id: suppliers[0]?.id || "",
        mrp,
        purchase_price: Math.round(mrp * 0.7),
        selling_price: mrp,
        wholesale_price: Math.round(mrp * 0.85),
        current_stock: 10,
        minimum_stock: 5,
        reorder_level: 10,
        variant_name: "Standard",
        shade_color: "",
        net_weight: "1 Unit",
        short_description: `Premium showroom grade ${promptFormData.name} by ${promptFormData.brand || "our brand"}. Crafted with superior standards.`,
        long_description: `Experience the finest quality with ${promptFormData.name}. Designed for exceptional everyday performance and customer delight.`,
        ingredients: "",
        directions: "Use as indicated on packaging.",
        warnings: "Store in a cool dry place.",
        country_of_origin: "India",
        manufacturer: `${promptFormData.brand || "Falcon"} Enterprise Pvt. Ltd.`,
        is_website_published: true,
        is_online: true,
        online_price: 0,
      });

      setAiResult({
        productName: promptFormData.name,
        brandName: promptFormData.brand,
        category: catName,
        subCategory: "",
        suggestedCategoryId: promptFormData.category_id || categories[0]?.id || "",
        mrp,
        suggestedPurchasePrice: Math.round(mrp * 0.7),
        suggestedSellingPrice: mrp,
        suggestedWholesalePrice: Math.round(mrp * 0.85),
        sku,
        barcode: "",
        confidenceScore: 0.99,
        provider: imageRes.provider,
        attributes: {
          brand: promptFormData.brand,
          countryOfOrigin: "India",
          packagingType: "Showroom Display",
        },
        descriptions: {
          shortDescription: `Showroom Grade ${promptFormData.name}`,
          longDescription: `Full commercial listing for ${promptFormData.name}`,
        },
        images: {
          originalUrl: imageRes.imageUrl,
          enhancedUrl: imageRes.imageUrl,
          thumbnailUrl: imageRes.imageUrl,
          galleryUrls: [imageRes.imageUrl],
        },
      });

      setActiveAssetTab("ai_showroom");
      setStage(3);
    } catch (err: any) {
      clearInterval(stepInterval);
      console.error("Direct prompt generation error:", err);
      alert("AI Generation Error: " + (err.message || "Failed to generate AI product image."));
      setStage(1);
    } finally {
      setIsPromptGenerating(false);
    }
  };

  // Interactive ChatGPT / Gemini Magic Image Studio & Prompt Generator
  const handleGenerateCustomAiImage = async (promptOverride?: string, themeOverride?: string) => {
    const promptToUse = promptOverride !== undefined ? promptOverride : customAiPrompt;
    const themeToUse = themeOverride || selectedTheme;

    setIsGeneratingAiImage(true);
    try {
      let finalImageUrl = "";
      let providerName = "Falcon Smart Studio (100% Free)";
      let promptText = `8K commercial showroom showcase of ${formData.name}`;

      const rawPhotoSource = frontPreviewUrl || frontImageFile || aiResult?.images?.originalUrl;

      if (aiEngineProvider === "auto" && rawPhotoSource) {
        // Map selected hero theme to StudioTheme
        const themeMap: Record<string, StudioTheme> = {
          luxury_marble: "luxury_marble",
          botanical_herbal: "botanical_fresh",
          minimal_studio: "pure_white",
          dark_obsidian: "dark_obsidian",
          festival_gold: "luxury_marble",
        };
        const resolvedTheme: StudioTheme = themeMap[themeToUse] || "luxury_marble";

        finalImageUrl = await localImageStudio.processStudioPhoto(rawPhotoSource, {
          targetSize: 1080,
          theme: resolvedTheme,
          addGloss: true,
          addGroundShadow: true,
          addReflection: true,
          sharpnessBoost: true,
        });
        providerName = "Falcon Smart Studio (Built-in)";
      } else {
        const activeCat = categories.find((c) => c.id === formData.category_id)?.name || formData.name;
        const res = await masterStudioGenerator.generateAiShowroomImage({
          productName: formData.name || "Product",
          brand: formData.brand,
          categoryName: activeCat,
          theme: themeToUse,
          customPrompt: promptToUse,
          aspectRatio: imageAspectRatio,
          provider: aiEngineProvider,
          apiKey: geminiApiKey || undefined,
        });
        finalImageUrl = res.imageUrl;
        providerName = res.provider;
        promptText = res.prompt;
      }

      setAiGeneratedImageUrl(finalImageUrl);
      setAiGeneratedProviderName(providerName);
      setAiGeneratedPrompt(promptText);
      setActiveAssetTab("ai_showroom");

      // Attach to AI studio gallery
      setAiResult((prev) =>
        prev
          ? {
              ...prev,
              images: {
                ...prev.images,
                enhancedUrl: finalImageUrl,
                galleryUrls: [finalImageUrl, ...prev.images.galleryUrls.filter((u) => u !== finalImageUrl)],
                studioAssets: prev.images.studioAssets
                  ? {
                      ...prev.images.studioAssets,
                      aiGeneratedHeroUrl: finalImageUrl,
                      aiProvider: providerName,
                      aiPromptUsed: promptText,
                      heroUrl: finalImageUrl,
                      galleryUrls: [finalImageUrl, ...prev.images.studioAssets.galleryUrls.filter((u) => u !== finalImageUrl)],
                    }
                  : undefined,
              },
            }
          : null
      );
    } catch (err: any) {
      console.error("AI Image Generation failed:", err);
      alert("AI Image Generation Notice: " + (err.message || "Failed to generate image."));
    } finally {
      setIsGeneratingAiImage(false);
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
      // Prioritize Real Studio Hero image for Vision Scan > Enhanced Cutout > Original Preview
      const heroImg =
        creationMethod === "prompt" && aiGeneratedImageUrl
          ? aiGeneratedImageUrl
          : activeAssetTab === "catalog" && aiResult?.images?.studioAssets?.catalogUrl
          ? aiResult.images.studioAssets.catalogUrl
          : activeAssetTab === "lifestyle" && aiResult?.images?.studioAssets?.lifestyleUrl
          ? aiResult.images.studioAssets.lifestyleUrl
          : aiResult?.images?.studioAssets?.heroUrl ||
            aiResult?.images?.enhancedUrl ||
            frontPreviewUrl ||
            aiGeneratedImageUrl;

      const catalogImg = aiResult?.images?.studioAssets?.catalogUrl || heroImg;
      const lifestyleImg = aiResult?.images?.studioAssets?.lifestyleUrl || heroImg;
      const promoImg = aiResult?.images?.studioAssets?.promoBannerUrl || heroImg;
      const galleryList = aiResult?.images?.galleryUrls || [heroImg];

      let hindiTitle: string | null = null;
      if (formData.name) {
        try {
          hindiTitle = await transliterateToHindi(formData.name);
        } catch {}
      }

      const productPayload = {
        shop_id: shopId,
        name: capitalizeFirstLetter(formData.name.trim()),
        name_hindi: formData.name_hindi?.trim() || hindiTitle || null,
        brand: formData.brand ? capitalizeFirstLetter(formData.brand.trim()) : null,
        category_id: formData.category_id || null,
        sku: formData.sku || `SKU-${Date.now()}`,
        barcode: formData.barcode || null,
        unit_id: formData.unit_id || null,
        supplier_id: formData.supplier_id || null,
        purchase_price: Number(formData.purchase_price) || 0,
        mrp: formData.mrp ? Number(formData.mrp) : Number(formData.selling_price) || 0,
        selling_price: Number(formData.selling_price) || 0,
        wholesale_price: formData.wholesale_price ? Number(formData.wholesale_price) : null,
        wholesale_min_qty: (formData as any).wholesale_min_qty ? Number((formData as any).wholesale_min_qty) : 12,
        current_stock: Number(formData.current_stock) || 0,
        minimum_stock: Number(formData.minimum_stock) || 0,
        description: formData.short_description || formData.long_description || null,
        image_url: heroImg, // Primary website & showroom display image
        is_active: true,
        is_online: formData.is_online !== false,
        online_price: Number(formData.online_price) > 0 ? Number(formData.online_price) : null,
      };

      const newProd = await productsRepository.create(productPayload as any);

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
    if (activeAssetTab === "ai_showroom") {
      return aiGeneratedImageUrl || aiResult?.images?.studioAssets?.heroUrl || frontPreviewUrl;
    }
    if (!aiResult) return frontPreviewUrl;
    const assets = aiResult.images.studioAssets;
    if (!assets) return aiGeneratedImageUrl || aiResult.images.enhancedUrl;

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
        return aiGeneratedImageUrl || assets.heroUrl;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      showHeader={false}
      maxWidth="4xl"
      contentClassName="p-0 max-h-[88vh] flex flex-col overflow-hidden"
    >
      {/* Studio Header Bar */}
      <div className="shrink-0 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 px-6 py-4 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
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

          <div className="flex items-center gap-3 self-end sm:self-center">
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
                  Vision AI Scan
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMethod("prompt")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    creationMethod === "prompt"
                      ? "bg-white text-purple-950 shadow-md"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  Prompt AI Studio
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

            {/* Single Close X */}
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 bg-gray-50/60">
        {/* ========================================================================= */}
        {/* STAGE 1: UPLOAD & CAPTURE                                                */}
        {/* ========================================================================= */}
        {stage === 1 && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Method 3: Direct Prompt AI Studio (ChatGPT / Gemini Grade) */}
            {creationMethod === "prompt" ? (
              <div className="bg-white border border-purple-200/80 rounded-2xl p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-tr from-purple-600 to-pink-600 text-white rounded-2xl flex items-center justify-center shadow-md">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900">
                      ChatGPT & Gemini Grade AI Product Generator
                    </h3>
                    <p className="text-xs text-gray-500">
                      Type product details or visual concepts. AI generates 8K showroom photography and populates the entire catalog spec.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Product Name / Title *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lumina Hydrating Rose Facial Serum"
                      value={promptFormData.name}
                      onChange={(e) =>
                        setPromptFormData({ ...promptFormData, name: capitalizeFirstLetter(e.target.value) })
                      }
                      className="w-full text-xs font-bold border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Brand Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lumina Skin"
                      value={promptFormData.brand}
                      onChange={(e) =>
                        setPromptFormData({ ...promptFormData, brand: e.target.value })
                      }
                      className="w-full text-xs border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">Category</label>
                    <select
                      value={promptFormData.category_id}
                      onChange={(e) =>
                        setPromptFormData({ ...promptFormData, category_id: e.target.value })
                      }
                      className="w-full text-xs border border-gray-300 rounded-xl px-3.5 py-2.5 font-medium bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
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
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Packaging MRP (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="999"
                      value={promptFormData.mrp === 0 ? "" : promptFormData.mrp}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) =>
                        setPromptFormData({
                          ...promptFormData,
                          mrp: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full text-xs font-bold border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Custom Scene Prompt Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                      <Wand2 className="w-4 h-4 text-purple-600" />
                      Scene & Photography Art Direction (ChatGPT / Gemini Prompt)
                    </label>
                    <span className="text-[11px] text-gray-400">Optional - AI enhances automatically</span>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="e.g. Place the luxury glass serum bottle on a wet Carrara marble slab with soft morning sunbeams, fresh pink rose petals and subtle water reflections..."
                    value={promptFormData.prompt}
                    onChange={(e) =>
                      setPromptFormData({ ...promptFormData, prompt: e.target.value })
                    }
                    className="w-full text-xs border border-purple-200 rounded-xl p-3 focus:ring-2 focus:ring-purple-600 focus:outline-none bg-purple-50/20"
                  />
                </div>

                {/* Preset Style Chips */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-700">
                    Quick Photography Style Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {aiImagePromptEngine.getQuickPromptPresets().map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setPromptFormData({
                            ...promptFormData,
                            theme: preset.id,
                            prompt: preset.prompt,
                          });
                        }}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-purple-100 hover:text-purple-900 border border-gray-200 transition-colors flex items-center gap-1"
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model Engine & Aspect Ratio */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-gray-700">Studio Engine:</span>
                      <select
                        value={aiEngineProvider}
                        onChange={(e) => setAiEngineProvider(e.target.value as any)}
                        className="text-xs border border-gray-300 rounded-lg px-2.5 py-1 font-semibold bg-white"
                      >
                        <option value="auto">⚡ Falcon Smart Studio (Built-in & Free)</option>
                        <option value="google">Google Imagen 3 (Showroom HD)</option>
                        <option value="openai">OpenAI DALL-E 3 (Ultra HD)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-gray-700">Ratio:</span>
                      <select
                        value={imageAspectRatio}
                        onChange={(e) => setImageAspectRatio(e.target.value as any)}
                        className="text-xs border border-gray-300 rounded-lg px-2 py-1 font-semibold bg-white"
                      >
                        <option value="1:1">1:1 (Square)</option>
                        <option value="9:16">9:16 (Story)</option>
                        <option value="16:9">16:9 (Banner)</option>
                      </select>
                    </div>
                  </div>

                  <span className="text-[11px] text-gray-500 italic">
                    Configure prompt & options, then generate below
                  </span>
                </div>
              </div>
            ) : creationMethod === "barcode" ? (
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
                  <div className="bg-white border border-purple-200 rounded-xl p-4 space-y-3 shadow-xs">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                        <span>1. Gemini Vision / OpenAI OCR Key (Product Details & Barcode):</span>
                        <span className="text-[10px] text-emerald-600 font-semibold">{geminiApiKey ? "✓ Saved" : "Required"}</span>
                      </label>
                      <input
                        type="password"
                        placeholder="Paste Google Gemini Key (AIza...) or OpenAI Key (sk-...)"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        className="w-full text-xs border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                        <span>2. Remove.bg Commercial Studio Key (50 Free HD Cuts / Month):</span>
                        <a
                          href="https://www.remove.bg/api"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-purple-600 underline font-semibold hover:text-purple-800"
                        >
                          Get Free Key (remove.bg/api) →
                        </a>
                      </label>
                      <input
                        type="password"
                        placeholder="Paste Remove.bg API Key for gold-standard studio cutouts..."
                        value={removeBgApiKey}
                        onChange={(e) => setRemoveBgApiKey(e.target.value)}
                        className="w-full text-xs border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowApiKeyInput(false)}
                        className="text-xs text-gray-500"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          handleSaveApiKey(geminiApiKey, removeBgApiKey);
                          setShowApiKeyInput(false);
                          toast.success("AI API Keys saved successfully!");
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4"
                      >
                        Save API Keys
                      </Button>
                    </div>
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
                      className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition-all bg-white flex flex-col justify-between ${
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
                          <div className="relative aspect-square max-h-52 mx-auto rounded-xl overflow-hidden bg-gray-50 border border-gray-200 flex items-center justify-center">
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
                          <div className="py-5 sm:py-6 space-y-2">
                            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                            <div className="space-y-0.5">
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
                      className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition-all bg-white flex flex-col justify-between ${
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
                          <div className="relative aspect-square max-h-52 mx-auto rounded-xl overflow-hidden bg-gray-50 border border-gray-200 flex items-center justify-center">
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
                          <div className="py-5 sm:py-6 space-y-2">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                              <Barcode className="w-5 h-5" />
                            </div>
                            <div className="space-y-0.5">
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
                      {aiGeneratedImageUrl ? "6 Assets" : "5 Assets"}
                    </span>
                  </div>

                  {/* Asset Category Selector Tabs */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 bg-gray-100 p-1 rounded-xl text-[10px] font-bold text-gray-700">
                    <button
                      type="button"
                      onClick={() => setActiveAssetTab("original")}
                      className={`py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                        activeAssetTab === "original"
                          ? "bg-purple-600 text-white shadow-2xs font-black"
                          : "hover:bg-gray-200 font-medium"
                      }`}
                    >
                      📷 Raw Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAssetTab("catalog")}
                      className={`py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                        activeAssetTab === "catalog"
                          ? "bg-purple-600 text-white shadow-2xs font-black"
                          : "hover:bg-gray-200 font-medium"
                      }`}
                    >
                      🏢 POS White
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAssetTab("hero")}
                      className={`py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                        activeAssetTab === "hero"
                          ? "bg-purple-600 text-white shadow-2xs font-black"
                          : "hover:bg-gray-200 font-medium"
                      }`}
                    >
                      🌟 Web Hero
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAssetTab("lifestyle")}
                      className={`py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                        activeAssetTab === "lifestyle"
                          ? "bg-purple-600 text-white shadow-2xs font-black"
                          : "hover:bg-gray-200 font-medium"
                      }`}
                    >
                      🌿 Lifestyle
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAssetTab("promo")}
                      className={`py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                        activeAssetTab === "promo"
                          ? "bg-purple-600 text-white shadow-2xs font-black"
                          : "hover:bg-gray-200 font-medium"
                      }`}
                    >
                      🏷️ Promo Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAssetTab("story")}
                      className={`py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                        activeAssetTab === "story"
                          ? "bg-purple-600 text-white shadow-2xs font-black"
                          : "hover:bg-gray-200 font-medium"
                      }`}
                    >
                      📱 Story (9:16)
                    </button>
                    {aiGeneratedImageUrl && (
                      <button
                        type="button"
                        onClick={() => setActiveAssetTab("ai_showroom")}
                        className={`py-1 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                          activeAssetTab === "ai_showroom"
                            ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-2xs font-black"
                            : "hover:bg-gray-200 text-purple-900"
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        AI Concept Art
                      </button>
                    )}
                  </div>

                  {/* Main High-Definition Display Frame */}
                  <div className="relative aspect-square w-full rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center shadow-xs group">
                    <img
                      src={getActiveDisplayImage()}
                      alt="Active Studio Asset"
                      className={`w-full h-full object-contain p-2 transition-all duration-300 ${
                        isRegeneratingTheme || isGeneratingAiImage
                          ? "opacity-30 blur-xs"
                          : "opacity-100"
                      }`}
                    />

                    {/* AI Loading State Overlay */}
                    {(isRegeneratingTheme || isGeneratingAiImage) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/75 backdrop-blur-2xs">
                        <div className="flex flex-col items-center gap-2 text-xs font-bold text-purple-900 bg-white px-5 py-3 rounded-2xl shadow-xl border border-purple-100">
                          <div className="relative w-8 h-8">
                            <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
                            <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
                          </div>
                          <span>
                            {isGeneratingAiImage
                              ? "Rendering AI Scene..."
                              : "Staging Studio 3D Backdrop..."}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Studio Theme Badge (bottom-left, prevents collision with top-right buttons) */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-md shadow-md border border-white/10">
                      <Sparkles className="w-3 h-3 text-purple-300" />
                      <span>
                        {activeAssetTab === "hero"
                          ? `3D Stage: ${selectedTheme.replace(/_/g, " ")}`
                          : activeAssetTab === "catalog"
                          ? "POS Pure White"
                          : activeAssetTab === "lifestyle"
                          ? "Lifestyle Staging"
                          : activeAssetTab === "promo"
                          ? "Promo Card"
                          : activeAssetTab === "story"
                          ? "Story (9:16)"
                          : activeAssetTab === "original"
                          ? "Raw Uploaded Photo"
                          : "AI Concept Art"}
                      </span>
                    </div>

                    {/* Download, Compare & Fullscreen Controls (top right) */}
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                      {aiResult?.images?.originalUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveAssetTab((prev) => (prev === "original" ? "hero" : "original"))
                          }
                          className="px-2.5 py-1 bg-black/65 hover:bg-black/85 text-white text-[10px] font-bold rounded-lg backdrop-blur-xs transition-colors flex items-center gap-1 shadow-xs border border-white/10"
                          title="Toggle Original vs Studio Polished"
                        >
                          <Eye className="w-3 h-3 text-purple-300" />
                          <span>{activeAssetTab === "original" ? "Show Studio Cutout" : "Compare Original"}</span>
                        </button>
                      )}
                      <a
                        href={getActiveDisplayImage()}
                        download={`product-${formData.name.toLowerCase().replace(/\s+/g, "-") || "photo"}.jpg`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-xs transition-colors border border-white/10"
                        title="Download Asset"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <span className="absolute bottom-2 right-2 text-[9px] font-bold px-2 py-0.5 bg-black/65 text-white rounded-md backdrop-blur-xs border border-white/10">
                      {activeAssetTab === "hero"
                        ? "1080×1080 Studio Hero"
                        : activeAssetTab === "story"
                        ? "1080×1920 Story"
                        : "1080×1080 High-Res"}
                    </span>
                  </div>

                  {/* 1-Click 3D Studio Stage Selector Pills */}
                  <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-purple-950 flex items-center gap-1">
                        <Palette className="w-3.5 h-3.5 text-purple-600" />
                        1-Click 3D Studio Stage:
                      </span>
                      <span className="text-[10px] text-purple-600 font-semibold">
                        Real-time 3D lighting & shadows
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: "luxury_marble", label: "🌟 Luxury Marble" },
                        { id: "minimal_studio", label: "📸 Pure Studio White" },
                        { id: "botanical_herbal", label: "🌿 Botanical Fresh" },
                        { id: "dark_obsidian", label: "🖤 Dark Obsidian" },
                        { id: "festival_gold", label: "🪵 Modern Wood" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedTheme(t.id as HeroTheme);
                            handleSwitchTheme(t.id as HeroTheme);
                            setActiveAssetTab("hero");
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            selectedTheme === t.id && activeAssetTab === "hero"
                              ? "bg-purple-600 text-white shadow-xs"
                              : "bg-white text-gray-700 hover:bg-purple-100 border border-purple-200/60"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Direct Image URL & Manufacturer Catalog Upload Override */}
                  <div className="flex items-center gap-1.5 p-2 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                    <input
                      type="text"
                      placeholder="Paste official brand/catalog image URL..."
                      value={customDirectImageUrl}
                      onChange={(e) => setCustomDirectImageUrl(e.target.value)}
                      className="flex-1 text-[11px] bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-600 font-mono"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (customDirectImageUrl.trim()) {
                          setAiGeneratedImageUrl(customDirectImageUrl.trim());
                          setFrontPreviewUrl(customDirectImageUrl.trim());
                          setActiveAssetTab("ai_showroom");
                        }
                      }}
                      className="text-[11px] h-7 px-2.5 font-bold"
                    >
                      Use URL
                    </Button>
                  </div>

                  {/* ============================================================== */}
                  {/* ✨ MAGIC AI IMAGE STUDIO & PROMPT EDITOR (ChatGPT / Gemini)  */}
                  {/* ============================================================== */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-950 text-white space-y-3 shadow-md border border-purple-500/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-400 to-pink-500 flex items-center justify-center shadow-xs">
                          <Wand2 className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
                            Magic AI Image Studio
                            <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded-full bg-pink-500/30 text-pink-300 border border-pink-400/40">
                              DALL-E 3 / Imagen
                            </span>
                          </h4>
                          <p className="text-[10px] text-purple-200/80">
                            Ask AI to stage custom scene or edit lighting like in ChatGPT
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Custom Prompt Input */}
                    <div className="space-y-1.5">
                      <textarea
                        rows={2}
                        value={customAiPrompt}
                        onChange={(e) => setCustomAiPrompt(e.target.value)}
                        placeholder="e.g. Place on luxury dark granite with fresh water droplets, morning sunlight through blinds, and gold rim light..."
                        className="w-full text-xs bg-white/10 text-white placeholder-white/50 border border-white/20 rounded-xl p-2.5 focus:ring-2 focus:ring-purple-400 focus:outline-none backdrop-blur-xs font-normal"
                      />
                    </div>

                    {/* Quick Style Chips */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-purple-200">
                        1-Click Showroom Themes:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {aiImagePromptEngine.getQuickPromptPresets().map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setSelectedTheme(preset.id as HeroTheme);
                              setCustomAiPrompt(preset.prompt);
                              handleGenerateCustomAiImage(preset.prompt, preset.id);
                            }}
                            className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                              selectedTheme === preset.id
                                ? "bg-white text-purple-950 border-white shadow-xs"
                                : "bg-white/10 text-purple-100 border-white/15 hover:bg-white/20"
                            }`}
                          >
                            <span>{preset.icon}</span>
                            <span>{preset.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Model & Generation Action Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs">
                      <div className="flex items-center gap-2">
                        <select
                          value={aiEngineProvider}
                          onChange={(e) => setAiEngineProvider(e.target.value as any)}
                          className="text-[10px] bg-white/10 text-white border border-white/20 rounded-lg px-2 py-1 font-bold focus:outline-none"
                        >
                          <option value="auto" className="bg-slate-900 text-white">
                            ⚡ Falcon Smart Studio (Built-in & Free)
                          </option>
                          <option value="google" className="bg-slate-900 text-white">
                            Google Imagen 3 (Showroom HD)
                          </option>
                          <option value="openai" className="bg-slate-900 text-white">
                            OpenAI DALL-E 3 (Ultra HD)
                          </option>
                        </select>

                        <select
                          value={imageAspectRatio}
                          onChange={(e) => setImageAspectRatio(e.target.value as any)}
                          className="text-[10px] bg-white/10 text-white border border-white/20 rounded-lg px-2 py-1 font-bold focus:outline-none"
                        >
                          <option value="1:1" className="bg-slate-900 text-white">
                            1:1 Square
                          </option>
                          <option value="9:16" className="bg-slate-900 text-white">
                            9:16 Story
                          </option>
                          <option value="16:9" className="bg-slate-900 text-white">
                            16:9 Banner
                          </option>
                        </select>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleGenerateCustomAiImage()}
                        disabled={isGeneratingAiImage}
                        className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-lg shadow-pink-500/30 flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {isGeneratingAiImage ? "Generating..." : "Generate with AI"}
                      </Button>
                    </div>
                  </div>

                  {/* Image Quality Scorecard Shield */}
                  {aiResult.images.qualityReport &&
                    Array.isArray(aiResult.images.qualityReport.passedChecks) &&
                    aiResult.images.qualityReport.passedChecks.length > 0 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            AI Inspection Shield:
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                            PASS ({aiResult.images.qualityReport.score || 92}%)
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
                          placeholder="0.00"
                          value={formData.mrp === 0 ? "" : formData.mrp}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) => handleMrpChange(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
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
                            placeholder="0.00"
                            value={formData.purchase_price === 0 ? "" : formData.purchase_price}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) =>
                              handlePurchasePriceChange(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)
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
                            placeholder="0.00"
                            value={formData.selling_price === 0 ? "" : formData.selling_price}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) =>
                              handleSellingPriceChange(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)
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

                {/* Online Storefront Visibility & Special Price */}
                <div className="bg-gradient-to-br from-purple-50/60 to-indigo-50/40 border border-purple-200/80 rounded-2xl p-3.5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${formData.is_online !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        <Globe className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-950">Online Storefront</div>
                        <div className="text-[10px] text-gray-500">
                          {formData.is_online !== false ? '🟢 Visible on /store' : '🔒 Store counter sale only'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_online: formData.is_online === false ? true : false })}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.is_online !== false ? 'bg-emerald-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          formData.is_online !== false ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {formData.is_online !== false && (
                    <div className="pt-2 border-t border-purple-100/80">
                      <label className="block text-[10px] font-bold text-gray-700 mb-0.5">
                        Online Offer Price (₹) <span className="font-normal text-gray-500">(Optional)</span>
                      </label>
                      <input
                        type="number"
                        placeholder={formData.selling_price ? `Default: ₹${formData.selling_price}` : "0.00"}
                        value={formData.online_price === 0 || !formData.online_price ? "" : formData.online_price}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            online_price: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full text-xs font-bold text-purple-900 bg-white border border-purple-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                      />
                      <p className="text-[9px] text-gray-500 mt-1">
                        Leave empty to sell online at standard counter price (₹{formData.selling_price || 0}).
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Extracted Editable Specifications & Inventory (7 cols) */}
              <div className="lg:col-span-7 space-y-3.5">
                {/* Gemini OCR Scanner Quick Banner */}
                <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200/90 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                          Packaging OCR & Label Reader
                          {geminiApiKey && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-1.5 py-0.2 rounded-full">
                              Connected
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-purple-800/80">
                          {geminiApiKey
                            ? "Reads product name, brand, MRP & ingredients directly from the photo."
                            : "Add your Free Google Gemini API Key from Google AI Studio for 1-click OCR."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {geminiApiKey ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleScanWithGemini}
                          disabled={isScanningGemini}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 h-auto rounded-lg shadow-xs"
                        >
                          {isScanningGemini ? (
                            <span className="flex items-center gap-1.5">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Reading Label...
                            </span>
                          ) : (
                            "⚡ Auto-Scan Label"
                          )}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                          className="border-purple-300 text-purple-800 hover:bg-purple-100 text-xs font-bold px-3 py-1.5 h-auto rounded-lg"
                        >
                          {showApiKeyInput ? "Cancel" : "+ Add Free Gemini Key"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {showApiKeyInput && (
                    <div className="bg-white border border-purple-200 rounded-xl p-2.5 flex gap-2">
                      <input
                        type="password"
                        placeholder="Paste Free Google Gemini API Key (AIzaSy...)"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        className="flex-1 text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          handleSaveApiKey(geminiApiKey);
                          setShowApiKeyInput(false);
                          if (geminiApiKey.trim()) {
                            handleScanWithGemini();
                          }
                        }}
                        className="bg-purple-600 text-white text-xs font-bold shrink-0"
                      >
                        Save & Scan
                      </Button>
                    </div>
                  )}
                </div>

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
                        placeholder="e.g. Sofy AntiBacteria Sanitary Pads (Extra Long)"
                        value={formData.name}
                        onChange={(e) => {
                          const val = capitalizeFirstLetter(e.target.value);
                          const instantHi = transliterateSync(val);
                          setFormData((prev) => ({
                            ...prev,
                            name: val,
                            name_hindi: instantHi && instantHi !== val ? instantHi : prev.name_hindi,
                          }));
                          if (val.trim()) {
                            transliterateToHindi(val)
                              .then((hi) => {
                                if (hi) setFormData((prev) => ({ ...prev, name_hindi: hi }));
                              })
                              .catch(() => {});
                          }
                        }}
                        onBlur={() => {
                          if (formData.name.trim() && !formData.name_hindi?.trim()) {
                            transliterateToHindi(formData.name.trim())
                              .then((hi) => {
                                if (hi) setFormData((prev) => ({ ...prev, name_hindi: hi }));
                              })
                              .catch(() => {});
                          }
                        }}
                        className="w-full text-xs font-bold bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-600"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-gray-700">
                          🇮🇳 Hindi Name / हिंदी नाम (Auto Transliterated for Bills & Receipts)
                        </label>
                        {formData.name.trim() && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const hi = await transliterateToHindi(formData.name);
                                if (hi) setFormData((prev) => ({ ...prev, name_hindi: hi }));
                              } catch {}
                            }}
                            className="text-[10px] text-purple-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-2.5 h-2.5" /> 🔄 Re-Generate Hindi
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="उदा. पैराशूट 100% प्योर कोकोनट ऑयल 100ml"
                        value={formData.name_hindi || ""}
                        onChange={(e) => setFormData({ ...formData, name_hindi: e.target.value })}
                        className="w-full text-xs font-medium bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Brand Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sofy, Whisper, Parachute"
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
                        <option value="">-- Select Store Category --</option>
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
                        placeholder="0"
                        value={formData.current_stock === 0 ? "" : formData.current_stock}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            current_stock: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0,
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
                        placeholder="0"
                        value={formData.minimum_stock === 0 ? "" : formData.minimum_stock}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            minimum_stock: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0,
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

                {/* Final publish note */}
                <div className="pt-2 text-right">
                  <span className="text-[11px] text-gray-500">
                    All set? Publish below to update your inventory & online store
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STICKY BOTTOM FOOTER BAR                                                  */}
      {/* ========================================================================= */}
      {stage === 1 && creationMethod === "vision" && !isCameraActive && (
        <div className="shrink-0 bg-white border-t border-gray-200 px-6 py-3.5 flex items-center justify-between shadow-lg shadow-black/5 z-10">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>
              {frontPreviewUrl
                ? "Ready to scan • Studio rendering takes ~15-20s"
                : "Upload front packaging photo to launch studio"}
            </span>
          </div>
          <Button
            onClick={handleStartAnalysis}
            disabled={!frontImageFile && !frontPreviewUrl}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-purple-500/25 flex items-center gap-2 transition-all disabled:opacity-50 disabled:shadow-none cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Launch Falcon AI Studio
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {stage === 1 && creationMethod === "prompt" && (
        <div className="shrink-0 bg-white border-t border-gray-200 px-6 py-3.5 flex items-center justify-between shadow-lg shadow-black/5 z-10">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>
              {promptFormData.name.trim()
                ? "Ready to generate showroom asset"
                : "Enter product name above to generate"}
            </span>
          </div>
          <Button
            onClick={handleGenerateFromDirectPrompt}
            disabled={isPromptGenerating || !promptFormData.name.trim()}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-purple-500/25 flex items-center gap-2 transition-all disabled:opacity-50 disabled:shadow-none cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            {isPromptGenerating ? "Generating 8K Showroom Assets..." : "Generate Product with AI"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {stage === 3 && aiResult && (
        <div className="shrink-0 bg-white border-t border-gray-200 px-6 py-3.5 flex items-center justify-between shadow-lg shadow-black/5 z-10">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setStage(1);
              setAiResult(null);
            }}
            className="text-xs font-semibold text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back / Re-upload
          </Button>

          <div className="flex items-center gap-4">
            {formData.selling_price > 0 && (
              <div className="hidden sm:flex items-center gap-2 text-xs">
                <span className="text-gray-500">Est. Profit:</span>
                <span className="font-bold text-emerald-600">
                  {formatCurrency(profitMarginAmount)} ({marginPercentage}%)
                </span>
              </div>
            )}
            <Button
              onClick={handleSaveProduct}
              disabled={isSaving}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-8 py-2.5 rounded-xl shadow-lg shadow-emerald-600/25 flex items-center gap-2 cursor-pointer"
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
      )}
    </Modal>
  );
};
