import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import '../../../../data/models/product_model.dart';
import '../../../../data/models/catalog_models.dart';
import '../../../../data/services/supabase_service.dart';
import '../../../../data/services/session_service.dart';
import '../../../../data/services/product_scanner_service.dart';
import '../../../../data/services/white_background_service.dart';

class AddProductViewModel extends ChangeNotifier {
  final SupabaseService _supabaseService;
  final ImagePicker _imagePicker = ImagePicker();

  AddProductViewModel({SupabaseService? supabaseService})
      : _supabaseService = supabaseService ?? SupabaseService();

  // ───────────────────────────────────────────────────────────────────────────
  // CONTROLLERS
  // ───────────────────────────────────────────────────────────────────────────
  final TextEditingController nameController = TextEditingController();
  final TextEditingController nameHindiController = TextEditingController();
  final TextEditingController barcodeController = TextEditingController();
  final TextEditingController skuController = TextEditingController();
  final TextEditingController brandController = TextEditingController();
  final TextEditingController purchasePriceController = TextEditingController();
  final TextEditingController mrpController = TextEditingController();
  final TextEditingController sellingPriceController = TextEditingController();
  final TextEditingController wholesalePriceController = TextEditingController();
  final TextEditingController wholesaleMinQtyController = TextEditingController(text: '12');
  final TextEditingController stockController = TextEditingController(text: '10');
  final TextEditingController minStockController = TextEditingController(text: '5');
  final TextEditingController descriptionController = TextEditingController();

  // Dropdown Selections
  String? selectedCategoryId;
  String? selectedUnitId;
  List<String> selectedSupplierIds = [];
  String? get selectedSupplierId => selectedSupplierIds.isNotEmpty ? selectedSupplierIds.first : null;
  set selectedSupplierId(String? id) {
    if (id != null && id.isNotEmpty) {
      if (!selectedSupplierIds.contains(id)) {
        selectedSupplierIds.add(id);
      }
    }
  }
  bool isOnline = true;
  bool sellAsFullPack = false;
  bool isWholesaleEnabled = false;
  bool enterPriceAsPack = true;

  // ───────────────────────────────────────────────────────────────────────────
  // DUAL PHOTO STATE (FRONT & BACK)
  // ───────────────────────────────────────────────────────────────────────────
  // Front Photo (Hero Catalog Shot)
  Uint8List? frontImageBytes;
  Uint8List? frontOriginalBytes;
  String? frontImagePath;
  bool hasAppliedFrontWhiteBg = false;
  bool isProcessingFrontImage = false;

  // Back Photo (Packaging, Ingredients, Net Weight, MRP details)
  Uint8List? backImageBytes;
  Uint8List? backOriginalBytes;
  String? backImagePath;
  bool hasAppliedBackWhiteBg = false;
  bool isProcessingBackImage = false;
  bool autoWhiteBackground = false; // Auto pure-white background for crisp catalog photos

  // Backwards compatibility getter for single-image references
  Uint8List? get compressedImageBytes => frontImageBytes;
  String? get localImagePath => frontImagePath;

  // ───────────────────────────────────────────────────────────────────────────
  // ASYNC & WORKFLOW STATES
  // ───────────────────────────────────────────────────────────────────────────
  bool isLoading = false;
  bool isInitializing = true;
  bool isCheckingBarcode = false;
  bool isScanningGemini = false;
  bool get isImageProcessing => isProcessingFrontImage || isProcessingBackImage;

  // Existing Product & Variant Flow
  ProductModel? existingProductFound;
  bool isVariantMode = false;
  ProductModel? variantParentProduct;
  bool isReplacingExistingImage = false;

  // Live Name Search & Auto-Suggestions
  List<ProductModel> matchingNameProducts = [];
  bool isSearchingName = false;
  Timer? _nameSearchDebounce;

  // Catalog Lists
  List<CategoryModel> categories = [];
  List<UnitModel> units = [];
  List<SupplierModel> suppliers = [];
  List<ProductModel> recentAddedProducts = [];

  // Profit Margin calculation
  double get profitMargin {
    final sp = double.tryParse(sellingPriceController.text) ?? 0.0;
    final pp = double.tryParse(purchasePriceController.text) ?? 0.0;
    if (sp <= 0 || pp <= 0) return 0.0;
    return ((sp - pp) / sp) * 100;
  }

  // Profit in Rupees per unit
  double get profitRupees {
    final sp = double.tryParse(sellingPriceController.text) ?? 0.0;
    final pp = double.tryParse(purchasePriceController.text) ?? 0.0;
    if (sp <= 0 || pp <= 0) return 0.0;
    return sp - pp;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ───────────────────────────────────────────────────────────────────────────
  Future<void> init() async {
    isInitializing = true;
    notifyListeners();

    try {
      final results = await Future.wait([
        _supabaseService.getCategories(),
        _supabaseService.getUnits(),
        _supabaseService.getSuppliers(),
        _supabaseService.getRecentProducts(limit: 5),
      ]);

      categories = results[0] as List<CategoryModel>;
      units = results[1] as List<UnitModel>;
      suppliers = results[2] as List<SupplierModel>;
      recentAddedProducts = results[3] as List<ProductModel>;

      if (units.isNotEmpty && selectedUnitId == null) {
        final pcsUnit = units.firstWhere(
          (u) =>
              u.name.toLowerCase().contains('pc') ||
              u.name.toLowerCase().contains('piece'),
          orElse: () => units.first,
        );
        selectedUnitId = pcsUnit.id;
      }
    } catch (e) {
      debugPrint('Error loading initial catalog: $e');
    } finally {
      isInitializing = false;
      notifyListeners();
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 1. BARCODE SCAN & SMART LOOKUP (FALCON DB + OPENFOODFACTS)
  // ───────────────────────────────────────────────────────────────────────────
  Future<void> setBarcode(String code) async {
    final clean = code.trim();
    barcodeController.text = clean;
    if (clean.isEmpty) {
      existingProductFound = null;
      notifyListeners();
      return;
    }

    if (skuController.text.isEmpty) {
      skuController.text = clean;
    }

    isCheckingBarcode = true;
    notifyListeners();

    try {
      // Step A: Search in Falcon Database
      final found = await _supabaseService.findProductByBarcode(clean);
      if (found != null) {
        _populateFromExistingProduct(found);

        HapticFeedback.mediumImpact();
        Fluttertoast.showToast(
          msg: 'Existing product: ${found.name}',
          backgroundColor: const Color(0xFF38BDF8),
          textColor: Colors.white,
        );
      } else {
        existingProductFound = null;

        // Step B: Free Indian Barcode Reverse Lookup (OpenFoodFacts)
        final offProduct = await ProductScannerService.lookupOpenFoodFacts(clean);
        if (offProduct != null) {
          if (nameController.text.trim().isEmpty) {
            nameController.text = offProduct.nameEnglish;
          }
          if (nameHindiController.text.trim().isEmpty && offProduct.nameHindi.isNotEmpty) {
            nameHindiController.text = offProduct.nameHindi;
          }
          if (brandController.text.trim().isEmpty && offProduct.brand != null) {
            brandController.text = offProduct.brand!;
          }

          HapticFeedback.lightImpact();
          Fluttertoast.showToast(
            msg: 'Found in Indian Product Database: ${offProduct.nameEnglish}',
            backgroundColor: const Color(0xFF10B981),
            textColor: Colors.white,
          );
        }
      }
    } catch (e) {
      debugPrint('Barcode lookup error: $e');
    } finally {
      isCheckingBarcode = false;
      notifyListeners();
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. EXISTING PRODUCT & VARIANT MANAGEMENT
  // ───────────────────────────────────────────────────────────────────────────

  /// Live Name Search for existing products (Auto-Suggest as user types)
  void onNameQueryChanged(String query) {
    _nameSearchDebounce?.cancel();
    final clean = query.trim();
    if (clean.length < 2) {
      matchingNameProducts = [];
      isSearchingName = false;
      notifyListeners();
      return;
    }

    _nameSearchDebounce = Timer(const Duration(milliseconds: 300), () async {
      isSearchingName = true;
      notifyListeners();

      final results = await _supabaseService.searchProductsByName(clean);
      matchingNameProducts = results.where((p) => p.id != existingProductFound?.id).toList();
      isSearchingName = false;
      notifyListeners();
    });
  }

  /// Select an existing product from live suggestions to auto-fill details
  void selectExistingProduct(ProductModel found) {
    matchingNameProducts = [];
    _populateFromExistingProduct(found);

    try {
      HapticFeedback.mediumImpact().catchError((_) {});
      Fluttertoast.showToast(
        msg: 'Loaded: ${found.name} (Stock: ${found.currentStock})',
        backgroundColor: const Color(0xFF38BDF8),
        textColor: Colors.white,
      );
    } catch (_) {}
    notifyListeners();
  }

  /// Shared helper to populate existing product details without corrupting multi-unit prices & stock
  void _populateFromExistingProduct(ProductModel found) {
    existingProductFound = found;
    isVariantMode = false;
    variantParentProduct = null;

    nameController.text = found.name;
    if (found.nameHindi != null && found.nameHindi!.isNotEmpty) {
      nameHindiController.text = found.nameHindi!;
    }
    if (found.brand != null && found.brand!.isNotEmpty) {
      brandController.text = found.brand!;
    }
    if (found.categoryId != null) selectedCategoryId = found.categoryId;
    if (found.unitId != null) selectedUnitId = found.unitId;

    final factor = currentConversionFactor;

    // Detect if product was originally sold as full pack or loose
    final lowerName = found.name.toLowerCase();
    final unitName = selectedUnit?.name.toLowerCase() ?? '';
    if (factor > 1 && (lowerName.contains('box') || lowerName.contains('pack') || (unitName.isNotEmpty && lowerName.contains(unitName)))) {
      sellAsFullPack = true;
    } else {
      sellAsFullPack = false;
    }

    // Populate prices according to enterPriceAsPack mode so save doesn't re-divide
    if (factor > 1 && enterPriceAsPack && !sellAsFullPack) {
      final packSelling = (found.wholesalePrice != null && found.wholesalePrice! > found.sellingPrice)
          ? found.wholesalePrice!
          : (found.sellingPrice * factor);
      sellingPriceController.text = packSelling.toStringAsFixed(0);

      if (found.purchasePrice > 0) {
        purchasePriceController.text = (found.purchasePrice * factor).toStringAsFixed(0);
      }
      if (found.mrp != null && found.mrp! > 0) {
        mrpController.text = (found.mrp! * factor).toStringAsFixed(0);
      }
    } else {
      if (found.purchasePrice > 0) {
        purchasePriceController.text = found.purchasePrice.toStringAsFixed(0);
      }
      if (found.mrp != null && found.mrp! > 0) {
        mrpController.text = found.mrp!.toStringAsFixed(0);
      }
      if (found.sellingPrice > 0) {
        sellingPriceController.text = found.sellingPrice.toStringAsFixed(0);
      }
    }

    if (found.wholesalePrice != null && found.wholesalePrice! > 0) {
      isWholesaleEnabled = true;
      wholesalePriceController.text = found.wholesalePrice!.toStringAsFixed(0);
      wholesaleMinQtyController.text = (found.wholesaleMinQty ?? 12).toString();
    } else {
      isWholesaleEnabled = false;
      wholesalePriceController.clear();
      wholesaleMinQtyController.text = '12';
    }

    selectedSupplierIds.clear();
    if (found.supplierId != null && found.supplierId!.isNotEmpty) {
      selectedSupplierIds.add(found.supplierId!);
    }
    if (found.description != null && found.description!.isNotEmpty) {
      final sMatch = RegExp(r'<!--SUPPLIERS:(.*?)-->').firstMatch(found.description!);
      if (sMatch != null && sMatch.group(1) != null) {
        try {
          final list = jsonDecode(sMatch.group(1)!) as List;
          for (final item in list) {
            final sId = item.toString();
            if (!selectedSupplierIds.contains(sId)) {
              selectedSupplierIds.add(sId);
            }
          }
        } catch (_) {}
      }
      descriptionController.text = found.description!
          .replaceAll(RegExp(r'<!--.*?-->', dotAll: true), '')
          .trim();
    }

    if (found.barcode != null && found.barcode!.isNotEmpty) {
      barcodeController.text = found.barcode!;
    }
    if (found.sku != null && found.sku!.isNotEmpty) {
      skuController.text = found.sku!;
    }

    populateStockForExistingProduct(found);
  }

  /// Clear name suggestions dropdown
  void clearNameSuggestions() {
    matchingNameProducts = [];
    notifyListeners();
  }

  /// Enter Variant Creation Mode for the existing product
  void enterVariantMode(String variantAttribute) {
    if (existingProductFound == null && variantParentProduct == null) return;

    final baseProduct = existingProductFound ?? variantParentProduct!;
    variantParentProduct = baseProduct;
    existingProductFound = null; // Do NOT update original product
    isVariantMode = true;

    final cleanAttr = variantAttribute.trim();
    if (cleanAttr.isNotEmpty && !nameController.text.contains(cleanAttr)) {
      nameController.text = '${baseProduct.name} - $cleanAttr';
      if (baseProduct.nameHindi != null && baseProduct.nameHindi!.isNotEmpty) {
        nameHindiController.text = '${baseProduct.nameHindi} - $cleanAttr';
      }
    }

    // Generate dedicated variant SKU
    final prefix = (baseProduct.brand?.isNotEmpty == true
            ? baseProduct.brand!.substring(0, baseProduct.brand!.length >= 3 ? 3 : baseProduct.brand!.length)
            : 'VAR')
        .toUpperCase();
    final rand = DateTime.now().millisecondsSinceEpoch.toString().substring(8);
    skuController.text = '$prefix-V-$rand';

    // Clear barcode so user can scan this variant's packaging barcode
    barcodeController.clear();
    stockController.text = '10';

    try {
      HapticFeedback.mediumImpact().catchError((_) {});
      Fluttertoast.showToast(
        msg: 'Variant Mode: Set barcode & price for "$cleanAttr"',
        backgroundColor: const Color(0xFF8B5CF6),
        textColor: Colors.white,
      ).catchError((_) => null);
    } catch (_) {}
    notifyListeners();
  }

  /// Quick 1-tap stock update for existing product without creating duplicates
  Future<bool> quickUpdateExistingStock(int addQuantity) async {
    if (existingProductFound == null || existingProductFound!.id == null) return false;

    isLoading = true;
    notifyListeners();

    try {
      final pid = existingProductFound!.id!;
      final currentStock = existingProductFound!.currentStock;
      int quantityToAdd = addQuantity;
      if (isMultiUnit && !sellAsFullPack) {
        quantityToAdd = (addQuantity * currentConversionFactor).round();
      }
      ProductModel updated = await _supabaseService.quickAddStock(pid, currentStock, quantityToAdd);

      // If user took a new photo, update the image too
      if (frontImageBytes != null) {
        final newImageUrl = await _supabaseService.uploadProductImage(
          bytes: frontImageBytes!,
          extension: 'jpg',
          prefix: 'prod_updated',
        );
        if (newImageUrl != null) {
          updated = await _supabaseService.updateProductImage(pid, newImageUrl);
        }
      }

      Fluttertoast.showToast(
        msg: '✓ Added +$addQuantity stock (New Total: ${updated.currentStock})',
        backgroundColor: const Color(0xFF10B981),
        textColor: Colors.white,
      );

      HapticFeedback.heavyImpact();
      resetFormForNextProduct();
      return true;
    } catch (e) {
      Fluttertoast.showToast(msg: 'Quick stock update failed: $e', backgroundColor: Colors.red);
      return false;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  /// Clear existing product match and treat as fresh item
  void clearExistingMatch() {
    existingProductFound = null;
    isVariantMode = false;
    variantParentProduct = null;
    notifyListeners();
    Fluttertoast.showToast(msg: 'Editing as new separate product');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. DUAL PHOTO CAPTURE (FRONT & BACK) — ZERO AUTO-SCAN, ZERO AUTO-WHITEN
  // ───────────────────────────────────────────────────────────────────────────

  /// Capture Front Hero Photo (Leaves photo original by default)
  Future<void> captureFrontImage(ImageSource source) async {
    try {
      final XFile? photo = await _imagePicker.pickImage(
        source: source,
        maxWidth: 1200,
        maxHeight: 1200,
        imageQuality: 88,
        preferredCameraDevice: CameraDevice.rear,
      );

      if (photo != null) {
        isProcessingFrontImage = true;
        notifyListeners();

        final compressed = await FlutterImageCompress.compressWithFile(
          photo.path,
          minWidth: 1000,
          minHeight: 1000,
          quality: 85,
          format: CompressFormat.jpeg,
        );

        final bytes = compressed ?? await File(photo.path).readAsBytes();
        frontOriginalBytes = bytes;
        frontImageBytes = bytes;
        frontImagePath = photo.path;
        hasAppliedFrontWhiteBg = false;
        isReplacingExistingImage = true;

        if (autoWhiteBackground) {
          try {
            final whiteBytes = await WhiteBackgroundService.makeBackgroundPureWhite(
              filePath: photo.path,
              inputBytes: bytes,
            );
            frontImageBytes = whiteBytes;
            hasAppliedFrontWhiteBg = true;
          } catch (wErr) {
            debugPrint('Auto front white bg notice: $wErr');
          }
        }

        HapticFeedback.mediumImpact();
        Fluttertoast.showToast(
          msg: hasAppliedFrontWhiteBg
              ? 'Front photo ready (White BG applied ✨)'
              : 'Front photo ready. Tap "Scan with Gemini AI" to auto-fill details.',
          backgroundColor: const Color(0xFF38BDF8),
          textColor: Colors.white,
        );
      }
    } catch (e) {
      Fluttertoast.showToast(msg: 'Front photo error: $e');
    } finally {
      isProcessingFrontImage = false;
      notifyListeners();
    }
  }

  /// Capture Back Packaging Photo (MRP, Ingredients, Net Weight)
  Future<void> captureBackImage(ImageSource source) async {
    try {
      final XFile? photo = await _imagePicker.pickImage(
        source: source,
        maxWidth: 1200,
        maxHeight: 1200,
        imageQuality: 88,
        preferredCameraDevice: CameraDevice.rear,
      );

      if (photo != null) {
        isProcessingBackImage = true;
        notifyListeners();

        final compressed = await FlutterImageCompress.compressWithFile(
          photo.path,
          minWidth: 1000,
          minHeight: 1000,
          quality: 85,
          format: CompressFormat.jpeg,
        );

        final bytes = compressed ?? await File(photo.path).readAsBytes();
        backOriginalBytes = bytes;
        backImageBytes = bytes;
        backImagePath = photo.path;
        hasAppliedBackWhiteBg = false;

        if (autoWhiteBackground) {
          try {
            final whiteBytes = await WhiteBackgroundService.makeBackgroundPureWhite(
              filePath: photo.path,
              inputBytes: bytes,
            );
            backImageBytes = whiteBytes;
            hasAppliedBackWhiteBg = true;
          } catch (wErr) {
            debugPrint('Auto back white bg notice: $wErr');
          }
        }

        HapticFeedback.mediumImpact();
        Fluttertoast.showToast(
          msg: hasAppliedBackWhiteBg
              ? 'Back photo ready (White BG applied ✨)'
              : 'Back photo added! Gemini will read ingredients, weight & MRP.',
          backgroundColor: const Color(0xFF38BDF8),
          textColor: Colors.white,
        );
      }
    } catch (e) {
      Fluttertoast.showToast(msg: 'Back photo error: $e');
    } finally {
      isProcessingBackImage = false;
      notifyListeners();
    }
  }

  void removeFrontImage() {
    frontImageBytes = null;
    frontOriginalBytes = null;
    frontImagePath = null;
    hasAppliedFrontWhiteBg = false;
    isReplacingExistingImage = false;
    notifyListeners();
  }

  void removeBackImage() {
    backImageBytes = null;
    backOriginalBytes = null;
    backImagePath = null;
    hasAppliedBackWhiteBg = false;
    notifyListeners();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. DEDICATED MANUAL ACTIONS (STUDIO WHITE BG & GEMINI VISION SCAN)
  // ───────────────────────────────────────────────────────────────────────────

  /// Dedicated Manual Studio White Background Toggle
  Future<void> toggleFrontWhiteBackground() async {
    if (frontImageBytes == null) return;

    if (!hasAppliedFrontWhiteBg) {
      isProcessingFrontImage = true;
      notifyListeners();

      Fluttertoast.showToast(
        msg: 'Applying Studio White Background...',
        backgroundColor: const Color(0xFF38BDF8),
        textColor: Colors.white,
      );

      try {
        final whiteBytes = await WhiteBackgroundService.makeBackgroundPureWhite(
          filePath: frontImagePath,
          inputBytes: frontOriginalBytes ?? frontImageBytes,
        );
        frontImageBytes = whiteBytes;
        hasAppliedFrontWhiteBg = true;

        HapticFeedback.heavyImpact();
        Fluttertoast.showToast(
          msg: '✓ Studio White #FFFFFF applied!',
          backgroundColor: const Color(0xFF10B981),
          textColor: Colors.white,
        );
      } catch (e) {
        Fluttertoast.showToast(msg: 'Background removal error: $e');
      } finally {
        isProcessingFrontImage = false;
        notifyListeners();
      }
    } else {
      // Revert to original photo
      if (frontOriginalBytes != null) {
        frontImageBytes = frontOriginalBytes;
        hasAppliedFrontWhiteBg = false;
        HapticFeedback.mediumImpact();
        Fluttertoast.showToast(
          msg: 'Restored original photo',
          backgroundColor: const Color(0xFF64748B),
          textColor: Colors.white,
        );
        notifyListeners();
      }
    }
  }

  /// Dedicated Manual Studio White Background Toggle for Back Photo
  Future<void> toggleBackWhiteBackground() async {
    if (backImageBytes == null) return;

    if (!hasAppliedBackWhiteBg) {
      isProcessingBackImage = true;
      notifyListeners();

      Fluttertoast.showToast(
        msg: 'Applying Studio White Background to Back Photo...',
        backgroundColor: const Color(0xFF38BDF8),
        textColor: Colors.white,
      );

      try {
        final whiteBytes = await WhiteBackgroundService.makeBackgroundPureWhite(
          filePath: backImagePath,
          inputBytes: backOriginalBytes ?? backImageBytes,
        );
        backImageBytes = whiteBytes;
        hasAppliedBackWhiteBg = true;

        HapticFeedback.heavyImpact();
        Fluttertoast.showToast(
          msg: '✓ Back Photo: Studio White #FFFFFF applied!',
          backgroundColor: const Color(0xFF10B981),
          textColor: Colors.white,
        );
      } catch (e) {
        Fluttertoast.showToast(msg: 'Background removal error: $e');
      } finally {
        isProcessingBackImage = false;
        notifyListeners();
      }
    } else {
      // Revert to original photo
      if (backOriginalBytes != null) {
        backImageBytes = backOriginalBytes;
        hasAppliedBackWhiteBg = false;
        HapticFeedback.mediumImpact();
        Fluttertoast.showToast(
          msg: 'Restored original back photo',
          backgroundColor: const Color(0xFF64748B),
          textColor: Colors.white,
        );
        notifyListeners();
      }
    }
  }

  void toggleAutoWhiteBackground() {
    autoWhiteBackground = !autoWhiteBackground;
    Fluttertoast.showToast(
      msg: autoWhiteBackground ? 'Auto White Background: ON' : 'Auto White Background: OFF',
      backgroundColor: autoWhiteBackground ? const Color(0xFF10B981) : const Color(0xFF64748B),
    );
    notifyListeners();
  }

  /// Dedicated Manual Gemini Vision Scan (Reads Front + Back images simultaneously)
  Future<bool> scanWithGeminiVision({String? overrideKey}) async {
    final imageToScan = frontImageBytes ?? backImageBytes;
    if (imageToScan == null) {
      Fluttertoast.showToast(
        msg: 'Please snap Front or Back photo first.',
        backgroundColor: Colors.orange,
      );
      return false;
    }

    final key = (overrideKey != null && overrideKey.trim().isNotEmpty)
        ? overrideKey.trim()
        : await ProductScannerService.getSavedGeminiKey();

    if (key.isEmpty) {
      // Signal UI to open Gemini Key config dialog
      return false;
    }

    isScanningGemini = true;
    notifyListeners();

    Fluttertoast.showToast(
      msg: backImageBytes != null
          ? 'Scanning Front + Back Packaging with Gemini AI...'
          : 'Scanning Packaging with Gemini AI...',
      backgroundColor: const Color(0xFF38BDF8),
      textColor: Colors.white,
    );

    try {
      final scanned = await ProductScannerService.scanWithGeminiVision(
        frontBytes: frontImageBytes ?? backImageBytes!,
        backBytes: frontImageBytes != null ? backImageBytes : null,
        overrideKey: key,
      );

      if (scanned != null) {
        if (scanned.nameEnglish.isNotEmpty) {
          nameController.text = scanned.nameEnglish;
        }
        if (scanned.nameHindi.isNotEmpty) {
          nameHindiController.text = scanned.nameHindi;
        }
        if (scanned.brand != null && scanned.brand!.isNotEmpty) {
          brandController.text = scanned.brand!;
          if (skuController.text.isEmpty) {
            generateRandomSku();
          }
        }
        if (scanned.mrp != null && scanned.mrp! > 0) {
          mrpController.text = scanned.mrp!.toStringAsFixed(0);
          if (sellingPriceController.text.trim().isEmpty) {
            sellingPriceController.text = (scanned.sellingPrice ?? scanned.mrp!).toStringAsFixed(0);
          }
          if (purchasePriceController.text.trim().isEmpty && scanned.purchasePrice != null) {
            purchasePriceController.text = scanned.purchasePrice!.toStringAsFixed(0);
          }
          if (wholesalePriceController.text.trim().isEmpty && scanned.wholesalePrice != null) {
            wholesalePriceController.text = scanned.wholesalePrice!.toStringAsFixed(0);
          }
        }
        if (scanned.description != null && scanned.description!.isNotEmpty) {
          descriptionController.text = scanned.description!;
        }
        if (scanned.barcode != null && barcodeController.text.trim().isEmpty) {
          barcodeController.text = scanned.barcode!;
        }

        // Match Category
        if (scanned.categoryName != null && categories.isNotEmpty) {
          final matchedCat = categories.firstWhere(
            (c) => c.name.toLowerCase().contains(scanned.categoryName!.toLowerCase()),
            orElse: () => categories.first,
          );
          selectedCategoryId = matchedCat.id;
        }

        HapticFeedback.heavyImpact();
        Fluttertoast.showToast(
          msg: '✨ Extracted Name, Brand, MRP & Description via Gemini AI!',
          backgroundColor: const Color(0xFF10B981),
          textColor: Colors.white,
        );
        return true;
      } else {
        final lastErr = ProductScannerService.lastScanError;

        // Fallback: On-Device ML Kit
        if (frontImagePath != null) {
          final mlScanned = await ProductScannerService.scanPackagingPhoto(frontImagePath!);
          if (mlScanned != null) {
            if (nameController.text.isEmpty) nameController.text = mlScanned.nameEnglish;
            if (nameHindiController.text.isEmpty) nameHindiController.text = mlScanned.nameHindi;
            if (brandController.text.isEmpty && mlScanned.brand != null) brandController.text = mlScanned.brand!;
            if (mrpController.text.isEmpty && mlScanned.mrp != null) {
              mrpController.text = mlScanned.mrp!.toStringAsFixed(0);
              sellingPriceController.text = mlScanned.mrp!.toStringAsFixed(0);
            }
            Fluttertoast.showToast(
              msg: lastErr != null
                  ? 'Gemini: $lastErr (Used offline scan)'
                  : 'Used offline on-device scan (verify Gemini Key in settings)',
              backgroundColor: Colors.orange,
              toastLength: Toast.LENGTH_LONG,
            );
            return true;
          }
        }
        Fluttertoast.showToast(
          msg: lastErr != null ? 'Gemini AI: $lastErr' : 'Could not extract text. Please enter details manually.',
          backgroundColor: Colors.red,
          toastLength: Toast.LENGTH_LONG,
        );
        return false;
      }
    } catch (e) {
      debugPrint('Gemini scan error: $e');
      Fluttertoast.showToast(msg: 'Scan error: $e');
      return false;
    } finally {
      isScanningGemini = false;
      notifyListeners();
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. MARGIN & PRICING SHORTCUTS
  // ───────────────────────────────────────────────────────────────────────────

  /// Quick 1-tap margin calculator
  void applyMargin(double percent) {
    final pp = double.tryParse(purchasePriceController.text) ?? 0.0;
    final mrp = double.tryParse(mrpController.text) ?? 0.0;

    if (pp > 0) {
      final sp = pp * (1.0 + (percent / 100.0));
      sellingPriceController.text = sp.toStringAsFixed(0);
      HapticFeedback.lightImpact();
      notifyListeners();
    } else if (mrp > 0) {
      // If no purchase price, set selling price as slight discount from MRP
      final sp = mrp * (1.0 - ((100.0 - percent) / 100.0 * 0.1));
      sellingPriceController.text = sp.toStringAsFixed(0);
      HapticFeedback.lightImpact();
      notifyListeners();
    }
  }

  void setSellingPriceAtMrp() {
    final mrp = double.tryParse(mrpController.text) ?? 0.0;
    if (mrp > 0) {
      sellingPriceController.text = mrp.toStringAsFixed(0);
      HapticFeedback.lightImpact();
      notifyListeners();
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. AUTO-TRANSLITERATE & SKU GENERATOR
  // ───────────────────────────────────────────────────────────────────────────
  Future<void> onEnglishNameChanged(String englishText) async {
    final clean = englishText.trim();
    if (clean.isEmpty) return;

    final hindi = await ProductScannerService.transliterateToHindi(clean);
    if (hindi.isNotEmpty) {
      nameHindiController.text = hindi;
      notifyListeners();
    }
  }

  void generateRandomSku() {
    final prefix = (brandController.text.trim().isNotEmpty
            ? brandController.text.trim().substring(
                0,
                brandController.text.trim().length >= 3 ? 3 : brandController.text.trim().length)
            : 'PRD')
        .toUpperCase();
    final rand = DateTime.now().millisecondsSinceEpoch.toString().substring(8);
    skuController.text = '$prefix-$rand';
    notifyListeners();
  }

  UnitModel? get selectedUnit {
    if (selectedUnitId == null) return null;
    try {
      return units.firstWhere((u) => u.id == selectedUnitId);
    } catch (_) {
      return null;
    }
  }

  double get currentConversionFactor => selectedUnit?.conversionFactor ?? 1.0;

  bool get isMultiUnit => currentConversionFactor > 1;

  void setSellAsFullPack(bool val) {
    sellAsFullPack = val;
    notifyListeners();
  }

  bool isCreatingUnit = false;

  Future<UnitModel?> createAndSelectUnit(String name, double factor) async {
    final cleanName = name.trim();
    if (cleanName.isEmpty) return null;

    isCreatingUnit = true;
    notifyListeners();

    try {
      final created = await _supabaseService.createUnit(
        name: cleanName,
        conversionFactor: factor > 0 ? factor : 1.0,
      );

      // Remove existing duplicate if any, add new unit, sort by name
      units.removeWhere((u) => u.id == created.id);
      units.add(created);
      units.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));

      selectedUnitId = created.id;
      notifyListeners();

      HapticFeedback.lightImpact();
      Fluttertoast.showToast(
        msg: 'Unit "${created.name}" created and selected!',
        backgroundColor: const Color(0xFF10B981),
        textColor: Colors.white,
      );

      return created;
    } catch (e) {
      debugPrint('Error creating unit: $e');
      Fluttertoast.showToast(
        msg: 'Failed to create unit: $e',
        backgroundColor: const Color(0xFFEF4444),
        textColor: Colors.white,
      );
      rethrow;
    } finally {
      isCreatingUnit = false;
      notifyListeners();
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SUPPLIER MANAGEMENT (MULTIPLE SUPPLIERS)
  // ───────────────────────────────────────────────────────────────────────────
  List<SupplierModel> get selectedSuppliers =>
      suppliers.where((s) => selectedSupplierIds.contains(s.id)).toList();

  void toggleSupplier(String id) {
    if (selectedSupplierIds.contains(id)) {
      selectedSupplierIds.remove(id);
    } else {
      selectedSupplierIds.add(id);
    }
    notifyListeners();
  }

  bool isSupplierSelected(String id) => selectedSupplierIds.contains(id);

  void removeSupplier(String id) {
    selectedSupplierIds.remove(id);
    notifyListeners();
  }

  void clearSuppliers() {
    selectedSupplierIds.clear();
    notifyListeners();
  }

  bool isCreatingSupplier = false;

  Future<SupplierModel?> createAndSelectSupplier({
    required String name,
    String? phone,
    String? address,
  }) async {
    final cleanName = name.trim();
    if (cleanName.isEmpty) return null;

    isCreatingSupplier = true;
    notifyListeners();

    try {
      final created = await _supabaseService.createSupplier(
        name: cleanName,
        phone: phone,
        address: address,
      );

      suppliers.removeWhere((s) => s.id == created.id);
      suppliers.add(created);
      suppliers.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));

      if (!selectedSupplierIds.contains(created.id)) {
        selectedSupplierIds.add(created.id);
      }
      notifyListeners();

      HapticFeedback.lightImpact();
      Fluttertoast.showToast(
        msg: 'Supplier "${created.name}" created & selected!',
        backgroundColor: const Color(0xFF10B981),
        textColor: Colors.white,
      );

      return created;
    } catch (e) {
      debugPrint('Error creating supplier: $e');
      Fluttertoast.showToast(
        msg: 'Failed to create supplier: $e',
        backgroundColor: const Color(0xFFEF4444),
        textColor: Colors.white,
      );
      rethrow;
    } finally {
      isCreatingSupplier = false;
      notifyListeners();
    }
  }

  void refreshStockCalculation() {
    notifyListeners();
  }

  int get calculatedBaseStock {
    final rawStock = int.tryParse(stockController.text.trim()) ?? 0;
    if (isMultiUnit && !sellAsFullPack) {
      return (rawStock * currentConversionFactor).round();
    }
    return rawStock;
  }

  void populateStockForExistingProduct(ProductModel found) {
    if (found.unitId != null) {
      selectedUnitId = found.unitId;
    }
    if (found.wholesalePrice != null && found.wholesalePrice! > 0) {
      isWholesaleEnabled = true;
      wholesalePriceController.text = found.wholesalePrice!.toStringAsFixed(0);
      wholesaleMinQtyController.text = (found.wholesaleMinQty ?? 12).toString();
    } else {
      isWholesaleEnabled = false;
      wholesalePriceController.clear();
      wholesaleMinQtyController.text = '12';
    }

    final factor = currentConversionFactor;
    if (factor > 1 && !sellAsFullPack) {
      // Database currentStock is stored in base pieces (e.g. 240 pcs).
      // Calculate unit pack/box count for the UI input field (e.g. 240 / 24 = 10 boxes).
      final boxCount = (found.currentStock / factor).round();
      stockController.text = boxCount.toString();
    } else {
      stockController.text = found.currentStock.toString();
    }
  }

  void setWholesaleEnabled(bool val) {
    isWholesaleEnabled = val;
    if (val) {
      if (wholesaleMinQtyController.text.trim().isEmpty || wholesaleMinQtyController.text == '12') {
        wholesaleMinQtyController.text = currentConversionFactor > 1
            ? currentConversionFactor.round().toString()
            : '12';
      }
      if (wholesalePriceController.text.trim().isEmpty && sellingPriceController.text.trim().isNotEmpty) {
        wholesalePriceController.text = sellingPriceController.text.trim();
      }
    } else {
      wholesalePriceController.clear();
    }
    notifyListeners();
  }

  void setPriceEntryMode(bool asPack) {
    if (enterPriceAsPack == asPack) return;
    enterPriceAsPack = asPack;
    final factor = currentConversionFactor;
    if (factor > 1) {
      if (asPack) {
        // Switched to pack mode: multiply values by factor
        final pp = double.tryParse(purchasePriceController.text);
        if (pp != null && pp > 0) purchasePriceController.text = (pp * factor).toStringAsFixed(0);
        final sp = double.tryParse(sellingPriceController.text);
        if (sp != null && sp > 0) sellingPriceController.text = (sp * factor).toStringAsFixed(0);
        final mrp = double.tryParse(mrpController.text);
        if (mrp != null && mrp > 0) mrpController.text = (mrp * factor).toStringAsFixed(0);
      } else {
        // Switched to piece mode: divide values by factor
        final pp = double.tryParse(purchasePriceController.text);
        if (pp != null && pp > 0) purchasePriceController.text = (pp / factor).toStringAsFixed(0);
        final sp = double.tryParse(sellingPriceController.text);
        if (sp != null && sp > 0) sellingPriceController.text = (sp / factor).toStringAsFixed(0);
        final mrp = double.tryParse(mrpController.text);
        if (mrp != null && mrp > 0) mrpController.text = (mrp / factor).toStringAsFixed(0);
      }
    }
    notifyListeners();
  }

  double get perPieceCost {
    final cost = double.tryParse(purchasePriceController.text) ?? 0.0;
    if (isMultiUnit && enterPriceAsPack) {
      return currentConversionFactor > 0 ? cost / currentConversionFactor : cost;
    }
    return cost;
  }

  double get perPieceSelling {
    final sell = double.tryParse(sellingPriceController.text) ?? 0.0;
    if (isMultiUnit && enterPriceAsPack) {
      return currentConversionFactor > 0 ? sell / currentConversionFactor : sell;
    }
    return sell;
  }

  double get packMrp {
    final pieceMrp = double.tryParse(mrpController.text) ?? 0.0;
    return isMultiUnit ? pieceMrp * currentConversionFactor : pieceMrp;
  }

  void generateAutoBarcode() {
    final rnd = Random();
    // 890 + 10 random digits (standard Indian EAN-13 barcode format)
    final randomDigits = List.generate(10, (_) => rnd.nextInt(10)).join();
    final generated = '890$randomDigits';
    barcodeController.text = generated;

    if (skuController.text.trim().isEmpty) {
      final brandClean = brandController.text.trim();
      final brandPrefix = brandClean.isNotEmpty
          ? (brandClean.length >= 3
              ? brandClean.substring(0, 3).toUpperCase()
              : brandClean.toUpperCase())
          : 'SKU';
      final timestampSuffix = DateTime.now().millisecondsSinceEpoch.toString().substring(9);
      skuController.text = '$brandPrefix-$timestampSuffix';
    }

    try {
      HapticFeedback.lightImpact().catchError((_) {});
      Fluttertoast.showToast(
        msg: '✓ Generated Barcode: $generated',
        backgroundColor: const Color(0xFF10B981),
        textColor: Colors.white,
      ).catchError((_) => null);
    } catch (_) {}

    notifyListeners();
  }

  void setSelectedCategoryId(String? id) {
    selectedCategoryId = id;
    notifyListeners();
  }

  void setSelectedUnitId(String? id) {
    selectedUnitId = id;
    if (id != null) {
      final unit = selectedUnit;
      if (unit != null && unit.conversionFactor > 1) {
        if (wholesaleMinQtyController.text == '12' || wholesaleMinQtyController.text.trim().isEmpty) {
          wholesaleMinQtyController.text = unit.conversionFactor.round().toString();
        }
      }
    }
    notifyListeners();
  }

  void setIsOnline(bool val) {
    isOnline = val;
    notifyListeners();
  }

  void refreshPricingState() {
    notifyListeners();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. SAVE PRODUCT & RESET
  // ───────────────────────────────────────────────────────────────────────────
  Future<bool> saveProduct({bool addAnother = true}) async {
    final name = nameController.text.trim();
    if (name.isEmpty) {
      Fluttertoast.showToast(msg: 'Please enter Product Name', backgroundColor: Colors.red);
      return false;
    }

    final sellingPrice = double.tryParse(sellingPriceController.text) ?? 0.0;
    if (sellingPrice <= 0) {
      Fluttertoast.showToast(msg: 'Please enter valid Selling Price', backgroundColor: Colors.red);
      return false;
    }

    isLoading = true;
    notifyListeners();

    try {
      String? uploadedFrontUrl = existingProductFound?.imageUrl;
      String? uploadedBackUrl = existingProductFound?.backImageUrl;

      // Upload front image if captured
      if (frontImageBytes != null) {
        final prefix = barcodeController.text.trim().isNotEmpty
            ? barcodeController.text.trim()
            : 'prod_front';
        uploadedFrontUrl = await _supabaseService.uploadProductImage(
          bytes: frontImageBytes!,
          extension: 'jpg',
          prefix: prefix,
        );
      }

      // Upload back image if captured
      if (backImageBytes != null) {
        final prefix = barcodeController.text.trim().isNotEmpty
            ? '${barcodeController.text.trim()}_back'
            : 'prod_back';
        uploadedBackUrl = await _supabaseService.uploadProductImage(
          bytes: backImageBytes!,
          extension: 'jpg',
          prefix: prefix,
        );
      }

      final enteredPurchasePrice = double.tryParse(purchasePriceController.text) ?? 0.0;
      final enteredMrp = double.tryParse(mrpController.text);
      final enteredSellingPrice = double.tryParse(sellingPriceController.text) ?? 0.0;
      final stock = calculatedBaseStock;
      final minStock = int.tryParse(minStockController.text) ?? 5;
      final description = descriptionController.text.trim().isNotEmpty
          ? descriptionController.text.trim()
          : null;

      double finalPurchasePrice = enteredPurchasePrice;
      double? finalMrp = enteredMrp;
      double finalSellingPrice = enteredSellingPrice;
      double? finalWholesalePrice = isWholesaleEnabled ? double.tryParse(wholesalePriceController.text) : null;
      int? finalWholesaleMinQty = isWholesaleEnabled ? (int.tryParse(wholesaleMinQtyController.text) ?? 12) : null;
      String finalName = name;

      if (isMultiUnit) {
        if (!sellAsFullPack) {
          // ── Case 1: Khulla Loose Piece Selling ──
          if (enterPriceAsPack) {
            finalPurchasePrice = currentConversionFactor > 0 ? enteredPurchasePrice / currentConversionFactor : enteredPurchasePrice;
            finalSellingPrice = currentConversionFactor > 0 ? enteredSellingPrice / currentConversionFactor : enteredSellingPrice;
            finalMrp = (enteredMrp != null && enteredMrp > 0) ? (currentConversionFactor > 0 ? enteredMrp / currentConversionFactor : enteredMrp) : null;

            // Pack selling price becomes the wholesale rate!
            if (finalWholesalePrice == null || finalWholesalePrice <= 0) {
              finalWholesalePrice = enteredSellingPrice;
              finalWholesaleMinQty = currentConversionFactor.round();
            }
          } else {
            // Entered as Piece Price directly
            finalPurchasePrice = enteredPurchasePrice;
            finalSellingPrice = enteredSellingPrice;
            finalMrp = enteredMrp;
          }
        } else {
          // ── Case 2: Sealed Pack Selling ──
          if (enterPriceAsPack) {
            finalPurchasePrice = enteredPurchasePrice;
            finalSellingPrice = enteredSellingPrice;
            if (enteredMrp != null && enteredMrp > 0) {
              finalMrp = enteredMrp;
            }
          } else {
            // Entered as piece, selling as full pack
            finalPurchasePrice = enteredPurchasePrice * currentConversionFactor;
            finalSellingPrice = enteredSellingPrice * currentConversionFactor;
            if (enteredMrp != null && enteredMrp > 0) {
              finalMrp = enteredMrp * currentConversionFactor;
            }
          }
          final unitLabel = selectedUnit?.name ?? 'Pack';
          if (!finalName.toLowerCase().contains(unitLabel.toLowerCase()) &&
              !finalName.toLowerCase().contains('pack') &&
              !finalName.toLowerCase().contains('box') &&
              !finalName.toLowerCase().contains('lad')) {
            finalName = '$finalName ($unitLabel)';
          }
        }
      }

      String? finalDescription = description;
      if (selectedSupplierIds.length > 1) {
        final supTag = '<!--SUPPLIERS:${jsonEncode(selectedSupplierIds)}-->';
        finalDescription = (finalDescription != null && finalDescription.isNotEmpty)
            ? '$finalDescription\n$supTag'
            : supTag;
      }

      final newProduct = ProductModel(
        shopId: SessionService.instance.shopId,
        name: finalName,
        nameHindi: nameHindiController.text.trim().isEmpty ? null : nameHindiController.text.trim(),
        barcode: barcodeController.text.trim().isEmpty ? null : barcodeController.text.trim(),
        sku: skuController.text.trim().isEmpty ? null : skuController.text.trim(),
        brand: brandController.text.trim().isEmpty ? null : brandController.text.trim(),
        categoryId: selectedCategoryId,
        unitId: selectedUnitId,
        supplierId: selectedSupplierId,
        purchasePrice: finalPurchasePrice,
        mrp: finalMrp,
        sellingPrice: finalSellingPrice,
        wholesalePrice: finalWholesalePrice,
        wholesaleMinQty: finalWholesaleMinQty,
        currentStock: stock,
        minimumStock: minStock,
        imageUrl: uploadedFrontUrl,
        backImageUrl: uploadedBackUrl,
        description: finalDescription,
        isOnline: isOnline,
        onlinePrice: finalSellingPrice,
        isActive: true,
      );

      ProductModel saved;
      if (existingProductFound != null && existingProductFound!.id != null && !isVariantMode) {
        saved = await _supabaseService.updateProduct(
          existingProductFound!.id!,
          newProduct.toInsertJson(),
        );
        Fluttertoast.showToast(
          msg: 'Updated: ${saved.name}',
          backgroundColor: const Color(0xFF10B981),
          textColor: Colors.white,
        );
      } else {
        saved = await _supabaseService.addProduct(newProduct);
        Fluttertoast.showToast(
          msg: isVariantMode ? 'Variant Added: ${saved.name}' : 'Added: ${saved.name}',
          backgroundColor: const Color(0xFF10B981),
          textColor: Colors.white,
        );
      }

      HapticFeedback.heavyImpact();
      recentAddedProducts.insert(0, saved);

      if (addAnother) {
        resetFormForNextProduct();
      }

      return true;
    } catch (e) {
      Fluttertoast.showToast(
        msg: 'Save error: $e',
        backgroundColor: Colors.red,
        textColor: Colors.white,
        toastLength: Toast.LENGTH_LONG,
      );
      return false;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  // Fast Reset Form for next product
  void resetFormForNextProduct() {
    nameController.clear();
    nameHindiController.clear();
    barcodeController.clear();
    skuController.clear();
    brandController.clear();
    purchasePriceController.clear();
    mrpController.clear();
    sellingPriceController.clear();
    wholesalePriceController.clear();
    wholesaleMinQtyController.text = '12';
    sellAsFullPack = false;
    isWholesaleEnabled = false;
    enterPriceAsPack = true;
    descriptionController.clear();
    stockController.text = '10';
    minStockController.text = '5';
    selectedSupplierIds.clear();
    frontImageBytes = null;
    frontOriginalBytes = null;
    frontImagePath = null;
    hasAppliedFrontWhiteBg = false;
    backImageBytes = null;
    backImagePath = null;
    existingProductFound = null;
    isVariantMode = false;
    variantParentProduct = null;
    isReplacingExistingImage = false;
    notifyListeners();
  }

  @override
  void dispose() {
    nameController.dispose();
    nameHindiController.dispose();
    barcodeController.dispose();
    skuController.dispose();
    brandController.dispose();
    purchasePriceController.dispose();
    mrpController.dispose();
    sellingPriceController.dispose();
    wholesalePriceController.dispose();
    wholesaleMinQtyController.dispose();
    descriptionController.dispose();
    stockController.dispose();
    minStockController.dispose();
    super.dispose();
  }
}
