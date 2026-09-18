import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../core/app_theme.dart';
import '../../../../data/services/product_scanner_service.dart';
import '../../../../data/services/white_background_service.dart';
import '../view_models/add_product_view_model.dart';
import '../../barcode_scanner/views/barcode_scanner_screen.dart';

class AddProductScreen extends StatelessWidget {
  const AddProductScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AddProductViewModel>(
      builder: (context, vm, _) {
        return Scaffold(
          appBar: AppBar(
            title: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.bolt, color: AppTheme.primaryLight, size: 20),
                ),
                const SizedBox(width: 10),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Falcon Quick Add',
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                    ),
                    Text(
                      'High-Speed Catalog Entry',
                      style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                    ),
                  ],
                ),
              ],
            ),
            actions: [
              // AI Settings Shortcut
              IconButton(
                icon: const Icon(Icons.auto_awesome, color: AppTheme.primaryLight, size: 20),
                tooltip: 'Gemini AI Settings',
                onPressed: () => _showAiSettingsDialog(context),
              ),
              // Recent added count pill
              TextButton.icon(
                onPressed: () => _showRecentProductsBottomSheet(context, vm),
                style: TextButton.styleFrom(
                  backgroundColor: AppTheme.surfaceElevated,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: const BorderSide(color: AppTheme.cardBorder),
                  ),
                ),
                icon: const Icon(Icons.history, size: 16, color: AppTheme.secondary),
                label: Text(
                  '${vm.recentAddedProducts.length}',
                  style: const TextStyle(fontSize: 12, color: AppTheme.textPrimary, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 10),
            ],
          ),
          body: vm.isInitializing
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(color: AppTheme.primary),
                      SizedBox(height: 16),
                      Text('Connecting to Falcon Database...'),
                    ],
                  ),
                )
              : SafeArea(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 110),
                    children: [
                      // 1. Barcode Section
                      _buildBarcodeCard(context, vm),
                      const SizedBox(height: 14),

                      // Existing Product Detected Banner (Smart Actions)
                      if (vm.existingProductFound != null) ...[
                        _buildExistingProductBanner(context, vm),
                        const SizedBox(height: 14),
                      ],

                      // Active Variant Mode Banner
                      if (vm.isVariantMode && vm.variantParentProduct != null) ...[
                        _buildVariantModeBanner(vm),
                        const SizedBox(height: 14),
                      ],

                      // 2. Dual Photo Section (Front & Back)
                      _buildDualPhotoCard(context, vm),
                      const SizedBox(height: 14),

                      // 3. Product Basic Info & Description
                      _buildBasicInfoCard(vm),
                      const SizedBox(height: 14),

                      // 4. Pricing & Margin Shortcuts
                      _buildPricingCard(vm),
                      const SizedBox(height: 14),

                      // 5. Stock & Category
                      _buildStockAndCategoryCard(vm),
                    ],
                  ),
                ),
          bottomSheet: vm.isInitializing
              ? null
              : Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    border: const Border(
                      top: BorderSide(color: AppTheme.cardBorder, width: 1),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.4),
                        blurRadius: 10,
                        offset: const Offset(0, -4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      // Reset Button
                      IconButton(
                        style: IconButton.styleFrom(
                          backgroundColor: AppTheme.surfaceElevated,
                          padding: const EdgeInsets.all(14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: const BorderSide(color: AppTheme.cardBorder),
                          ),
                        ),
                        icon: const Icon(Icons.refresh, color: AppTheme.textMuted),
                        tooltip: 'Clear Form',
                        onPressed: vm.isLoading ? null : vm.resetFormForNextProduct,
                      ),
                      const SizedBox(width: 12),

                      // Primary "Save & Add Next" Button
                      Expanded(
                        child: ElevatedButton(
                          onPressed: vm.isLoading ? null : () => vm.saveProduct(addAnother: true),
                          child: vm.isLoading
                              ? const SizedBox(
                                  height: 22,
                                  width: 22,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.5,
                                    color: Colors.white,
                                  ),
                                )
                              : Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      vm.isVariantMode
                                          ? Icons.library_add
                                          : (vm.existingProductFound != null
                                              ? Icons.update
                                              : Icons.add_task),
                                      size: 20,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      vm.isVariantMode
                                          ? 'Save Variant & Next'
                                          : (vm.existingProductFound != null
                                              ? 'Update Product & Next'
                                              : 'Save & Add Next'),
                                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
        );
      },
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // BARCODE CARD
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildBarcodeCard(BuildContext context, AddProductViewModel vm) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.qr_code_scanner, size: 18, color: AppTheme.primaryLight),
              const SizedBox(width: 8),
              const Text(
                'Barcode / EAN (Indian FMCG Auto-Lookup)',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
              ),
              const Spacer(),
              if (vm.isCheckingBarcode)
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryLight),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: vm.barcodeController,
                  keyboardType: TextInputType.text,
                  decoration: InputDecoration(
                    hintText: 'Enter or scan barcode (e.g. 8901030...)',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    prefixIcon: const Icon(Icons.barcode_reader, size: 20, color: AppTheme.textMuted),
                    suffixIcon: vm.barcodeController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () => vm.setBarcode(''),
                          )
                        : null,
                  ),
                  onSubmitted: (code) => vm.setBarcode(code),
                ),
              ),
              const SizedBox(width: 10),
              IconButton(
                style: IconButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.all(14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(Icons.camera_alt),
                tooltip: 'Scan Barcode with Camera',
                onPressed: () async {
                  final scanned = await Navigator.push<String>(
                    context,
                    MaterialPageRoute(builder: (_) => const BarcodeScannerScreen()),
                  );
                  if (scanned != null && scanned.isNotEmpty) {
                    vm.setBarcode(scanned);
                  }
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // EXISTING PRODUCT BANNER & ACTIONS (UPDATE / VARIANT / NEW)
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildExistingProductBanner(BuildContext context, AddProductViewModel vm) {
    final existing = vm.existingProductFound!;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.secondary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.secondary.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Product Image preview or placeholder
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: AppTheme.surfaceElevated,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.cardBorder),
                ),
                child: existing.imageUrl != null && existing.imageUrl!.isNotEmpty
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(9),
                        child: Image.network(existing.imageUrl!, fit: BoxFit.cover),
                      )
                    : const Icon(Icons.inventory_2, color: AppTheme.textMuted, size: 26),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.secondary.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'MATCH FOUND',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.secondary),
                          ),
                        ),
                        const SizedBox(width: 6),
                        if (existing.imageUrl == null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.orange.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              'NO PHOTO YET',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.orange),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      existing.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    Text(
                      'Stock: ${existing.currentStock} units | MRP: ₹${existing.mrp?.toStringAsFixed(0) ?? "N/A"} | Price: ₹${existing.sellingPrice.toStringAsFixed(0)}',
                      style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 10),

          // Smart Options Row
          Row(
            children: [
              // 1. Quick +10 Stock
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.secondary,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: const Icon(Icons.add_shopping_cart, size: 16),
                  label: const Text('Quick +10 Stock', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  onPressed: () => vm.quickUpdateExistingStock(10),
                ),
              ),
              const SizedBox(width: 8),

              // 2. Add as Variant
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.primaryLight,
                    side: const BorderSide(color: AppTheme.primaryLight),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: const Icon(Icons.alt_route, size: 16),
                  label: const Text('Add Variant', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  onPressed: () => _showVariantDialog(context, vm),
                ),
              ),
              const SizedBox(width: 8),

              // 3. Detach as New Product
              IconButton(
                icon: const Icon(Icons.close, size: 18, color: AppTheme.textMuted),
                tooltip: 'Treat as new item',
                onPressed: vm.clearExistingMatch,
              ),
            ],
          ),

          if (vm.frontImageBytes != null) ...[
            const SizedBox(height: 6),
            const Row(
              children: [
                Icon(Icons.check, size: 14, color: AppTheme.success),
                SizedBox(width: 4),
                Text(
                  'New photo attached — will update product image on save.',
                  style: TextStyle(fontSize: 11, color: AppTheme.success, fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // VARIANT MODE BANNER
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildVariantModeBanner(AddProductViewModel vm) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.purple.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.purple.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.alt_route, color: Colors.purpleAccent, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Variant Mode Active',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.purpleAccent),
                ),
                Text(
                  'Adding variant of "${vm.variantParentProduct?.name}"',
                  style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: vm.clearExistingMatch,
            child: const Text('Cancel', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
          ),
        ],
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DUAL PHOTO CARD (FRONT HERO + BACK PACKAGING)
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildDualPhotoCard(BuildContext context, AddProductViewModel vm) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.photo_library, size: 18, color: AppTheme.primaryLight),
              const SizedBox(width: 8),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Product Photos (Front & Back)',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                    ),
                    Text(
                      'Front for catalog • Back for MRP, weight & ingredients',
                      style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.tune, size: 18, color: AppTheme.primaryLight),
                tooltip: 'Gemini & AI Settings',
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                onPressed: () => _showAiSettingsDialog(context),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // 2-Slot Grid: Front Photo & Back Photo
          Row(
            children: [
              // SLOT 1: Front Photo (Hero)
              Expanded(
                child: _buildPhotoSlot(
                  title: 'Front Photo (Hero)',
                  subtitle: 'Store & POS display',
                  imageBytes: vm.frontImageBytes,
                  isProcessing: vm.isProcessingFrontImage,
                  isWhiteBgApplied: vm.hasAppliedFrontWhiteBg,
                  onSnapCamera: () => vm.captureFrontImage(ImageSource.camera),
                  onPickGallery: () => vm.captureFrontImage(ImageSource.gallery),
                  onToggleWhiteBg: vm.toggleFrontWhiteBackground,
                  onDelete: vm.removeFrontImage,
                ),
              ),
              const SizedBox(width: 12),

              // SLOT 2: Back Photo (Packaging Info)
              Expanded(
                child: _buildPhotoSlot(
                  title: 'Back Photo (Details)',
                  subtitle: 'MRP, weight, ingredients',
                  imageBytes: vm.backImageBytes,
                  isProcessing: vm.isProcessingBackImage,
                  isWhiteBgApplied: false,
                  onSnapCamera: () => vm.captureBackImage(ImageSource.camera),
                  onPickGallery: () => vm.captureBackImage(ImageSource.gallery),
                  onToggleWhiteBg: null, // White BG only for front hero photo
                  onDelete: vm.removeBackImage,
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // DEDICATED MASTER ACTION: Scan with Gemini AI (Front + Back)
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.surfaceElevated,
                foregroundColor: AppTheme.primaryLight,
                side: const BorderSide(color: AppTheme.primaryLight, width: 1.2),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              icon: vm.isScanningGemini
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryLight),
                    )
                  : const Icon(Icons.auto_awesome, size: 20, color: AppTheme.primaryLight),
              label: Text(
                vm.isScanningGemini
                    ? 'Scanning Packaging with Gemini AI...'
                    : (vm.frontImageBytes != null && vm.backImageBytes != null
                        ? '✨ Scan with Gemini AI (Front + Back)'
                        : '✨ Scan with Gemini AI'),
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
              ),
              onPressed: vm.isScanningGemini
                  ? null
                  : () async {
                      if (vm.frontImageBytes == null && vm.backImageBytes == null) {
                        Fluttertoast.showToast(msg: 'Please snap a front or back photo first.');
                        return;
                      }
                      final key = await ProductScannerService.getSavedGeminiKey();
                      if (key.isEmpty) {
                        if (context.mounted) {
                          _showAiSettingsDialog(context, requireKeyPrompt: true);
                        }
                        return;
                      }
                      await vm.scanWithGeminiVision();
                    },
            ),
          ),
        ],
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PHOTO SLOT WIDGET
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildPhotoSlot({
    required String title,
    required String subtitle,
    required Uint8List? imageBytes,
    required bool isProcessing,
    required bool isWhiteBgApplied,
    required VoidCallback onSnapCamera,
    required VoidCallback onPickGallery,
    required VoidCallback? onToggleWhiteBg,
    required VoidCallback onDelete,
  }) {
    if (isProcessing) {
      return Container(
        height: 145,
        decoration: BoxDecoration(
          color: AppTheme.surfaceElevated,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppTheme.primary.withValues(alpha: 0.4)),
        ),
        child: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(strokeWidth: 2.5, color: AppTheme.primaryLight),
              SizedBox(height: 10),
              Text('Processing...', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
            ],
          ),
        ),
      );
    }

    if (imageBytes != null) {
      return Container(
        height: 165,
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: isWhiteBgApplied ? Colors.white : AppTheme.surfaceElevated,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isWhiteBgApplied ? AppTheme.primaryLight : AppTheme.cardBorder,
            width: isWhiteBgApplied ? 1.5 : 1,
          ),
        ),
        child: Column(
          children: [
            // Preview Image
            Expanded(
              child: Stack(
                children: [
                  Center(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: Image.memory(
                        imageBytes,
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                  Positioned(
                    top: 2,
                    right: 2,
                    child: CircleAvatar(
                      radius: 12,
                      backgroundColor: Colors.black.withValues(alpha: 0.6),
                      child: IconButton(
                        icon: const Icon(Icons.close, size: 12, color: Colors.white),
                        padding: EdgeInsets.zero,
                        onPressed: onDelete,
                      ),
                    ),
                  ),
                  if (isWhiteBgApplied)
                    Positioned(
                      bottom: 2,
                      left: 2,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: AppTheme.primary,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'WHITE BG',
                          style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 4),

            // Controls for this slot
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                if (onToggleWhiteBg != null)
                  InkWell(
                    onTap: onToggleWhiteBg,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            isWhiteBgApplied ? Icons.undo : Icons.auto_fix_high,
                            size: 13,
                            color: isWhiteBgApplied ? Colors.black87 : AppTheme.primaryLight,
                          ),
                          const SizedBox(width: 3),
                          Text(
                            isWhiteBgApplied ? 'Undo' : 'White BG',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: isWhiteBgApplied ? Colors.black87 : AppTheme.primaryLight,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                InkWell(
                  onTap: onSnapCamera,
                  child: const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                    child: Icon(Icons.camera_alt, size: 15, color: AppTheme.textMuted),
                  ),
                ),
                InkWell(
                  onTap: onPickGallery,
                  child: const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                    child: Icon(Icons.photo_library, size: 15, color: AppTheme.textMuted),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    }

    // Empty Slot Picker
    return Container(
      height: 145,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppTheme.surfaceElevated,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.cardBorder),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            onToggleWhiteBg != null ? Icons.photo_camera : Icons.document_scanner,
            color: AppTheme.primaryLight,
            size: 26,
          ),
          const SizedBox(height: 4),
          Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
          Text(subtitle, style: const TextStyle(fontSize: 9, color: AppTheme.textMuted)),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.camera_alt, size: 18),
                style: IconButton.styleFrom(
                  backgroundColor: AppTheme.surface,
                  padding: const EdgeInsets.all(8),
                ),
                tooltip: 'Snap Camera',
                onPressed: onSnapCamera,
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.photo_library, size: 18),
                style: IconButton.styleFrom(
                  backgroundColor: AppTheme.surface,
                  padding: const EdgeInsets.all(8),
                ),
                tooltip: 'Pick Gallery',
                onPressed: onPickGallery,
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // BASIC INFO CARD & DESCRIPTION
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildBasicInfoCard(AddProductViewModel vm) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Product Details',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
          ),
          const SizedBox(height: 12),
          // Name English
          TextField(
            controller: vm.nameController,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(
              labelText: 'Product Name (English) *',
              hintText: 'e.g. Parachute 100% Pure Coconut Oil 100ml',
              suffixIcon: IconButton(
                icon: const Icon(Icons.translate, size: 18, color: AppTheme.secondary),
                tooltip: 'Auto generate Hindi name',
                onPressed: () => vm.onEnglishNameChanged(vm.nameController.text),
              ),
            ),
            onSubmitted: (val) => vm.onEnglishNameChanged(val),
          ),
          const SizedBox(height: 12),
          // Name Hindi
          TextField(
            controller: vm.nameHindiController,
            decoration: const InputDecoration(
              labelText: 'Product Name (हिंदी नाम)',
              hintText: 'उदा. पैराशूट कोकोनट ऑयल 100ml',
              prefixIcon: Icon(Icons.language, color: AppTheme.primaryLight, size: 18),
            ),
          ),
          const SizedBox(height: 12),
          // Brand & SKU
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: vm.brandController,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(
                    labelText: 'Brand',
                    hintText: 'e.g. Marico',
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: vm.skuController,
                  decoration: InputDecoration(
                    labelText: 'SKU',
                    hintText: 'e.g. PAR-101',
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.auto_fix_high, size: 18, color: AppTheme.secondary),
                      tooltip: 'Auto generate SKU',
                      onPressed: vm.generateRandomSku,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Packaging Description & Key Highlights
          TextField(
            controller: vm.descriptionController,
            maxLines: 2,
            decoration: const InputDecoration(
              labelText: 'Description & Formulation Highlights',
              hintText: 'Auto-extracted from back packaging (ingredients, benefits, net weight)',
              alignLabelWithHint: true,
            ),
          ),
        ],
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRICING CARD WITH 1-TAP MARGIN PILLS
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildPricingCard(AddProductViewModel vm) {
    final margin = vm.profitMargin;
    final profitRs = vm.profitRupees;
    Color marginColor = AppTheme.textMuted;
    if (margin > 20) {
      marginColor = AppTheme.success;
    } else if (margin > 0) {
      marginColor = AppTheme.accent;
    } else if (margin < 0) {
      marginColor = AppTheme.error;
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Pricing & Profit Margins',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
              ),
              if (margin != 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: marginColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: marginColor.withValues(alpha: 0.3)),
                  ),
                  child: Text(
                    'Margin: ${margin.toStringAsFixed(1)}% (+₹${profitRs.toStringAsFixed(0)}/unit)',
                    style: TextStyle(color: marginColor, fontWeight: FontWeight.bold, fontSize: 11),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),

          // Quick Margin Shortcut Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                const Text('Quick Margin: ', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                const SizedBox(width: 4),
                _buildMarginChip('+15%', () => vm.applyMargin(15)),
                const SizedBox(width: 6),
                _buildMarginChip('+20%', () => vm.applyMargin(20)),
                const SizedBox(width: 6),
                _buildMarginChip('+25%', () => vm.applyMargin(25)),
                const SizedBox(width: 6),
                _buildMarginChip('+30%', () => vm.applyMargin(30)),
                const SizedBox(width: 6),
                _buildMarginChip('At MRP', vm.setSellingPriceAtMrp, isMrp: true),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // MRP & Selling Price
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: vm.mrpController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    labelText: 'MRP (₹)',
                    hintText: '0',
                    prefixText: '₹ ',
                  ),
                  onChanged: (_) => vm.refreshPricingState(),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: vm.sellingPriceController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    labelText: 'Selling Price (₹) *',
                    hintText: '0',
                    prefixText: '₹ ',
                  ),
                  onChanged: (_) => vm.refreshPricingState(),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Purchase Price & Wholesale Price
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: vm.purchasePriceController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    labelText: 'Purchase Price (Cost)',
                    hintText: '0',
                    prefixText: '₹ ',
                  ),
                  onChanged: (_) => vm.refreshPricingState(),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: vm.wholesalePriceController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    labelText: 'Wholesale Price',
                    hintText: '0',
                    prefixText: '₹ ',
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMarginChip(String label, VoidCallback onTap, {bool isMrp = false}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: isMrp
              ? AppTheme.primary.withValues(alpha: 0.15)
              : AppTheme.surfaceElevated,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(
            color: isMrp ? AppTheme.primaryLight : AppTheme.cardBorder,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: isMrp ? AppTheme.primaryLight : AppTheme.textSecondary,
          ),
        ),
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STOCK & CATEGORY CARD
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildStockAndCategoryCard(AddProductViewModel vm) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Inventory & Categorization',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
          ),
          const SizedBox(height: 12),
          // Category
          DropdownButtonFormField<String>(
            initialValue: vm.selectedCategoryId,
            decoration: const InputDecoration(
              labelText: 'Category',
              prefixIcon: Icon(Icons.category, size: 20, color: AppTheme.textMuted),
            ),
            items: vm.categories.map((c) {
              return DropdownMenuItem<String>(
                value: c.id,
                child: Text(c.name),
              );
            }).toList(),
            onChanged: (val) => vm.setSelectedCategoryId(val),
          ),
          const SizedBox(height: 12),
          // Unit & Stock
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: vm.selectedUnitId,
                  decoration: const InputDecoration(labelText: 'Unit'),
                  items: vm.units.map((u) {
                    return DropdownMenuItem<String>(
                      value: u.id,
                      child: Text(u.name),
                    );
                  }).toList(),
                  onChanged: (val) => vm.setSelectedUnitId(val),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: vm.stockController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Initial Stock',
                    hintText: '10',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Online Store Switch
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Show on Online Store', style: TextStyle(fontSize: 14)),
            subtitle: const Text('Publish this product directly to your Falcon web shop',
                style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
            value: vm.isOnline,
            activeThumbColor: AppTheme.primary,
            onChanged: (val) => vm.setIsOnline(val),
          ),
        ],
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // VARIANT CREATION DIALOG
  // ───────────────────────────────────────────────────────────────────────────
  void _showVariantDialog(BuildContext context, AddProductViewModel vm) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surfaceElevated,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.alt_route, color: AppTheme.primaryLight, size: 22),
            SizedBox(width: 8),
            Text('Add Product Variant', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Creating a new variant for "${vm.existingProductFound?.name}". Brand and category will be preserved.',
              style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: controller,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Variant Attribute / Size',
                hintText: 'e.g. 250g, 500ml, Pack of 3, Red',
                prefixIcon: Icon(Icons.straighten, size: 18),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
            onPressed: () {
              final attr = controller.text.trim();
              if (attr.isNotEmpty) {
                vm.enterVariantMode(attr);
                Navigator.pop(ctx);
              } else {
                Fluttertoast.showToast(msg: 'Please enter a variant size or attribute.');
              }
            },
            child: const Text('Create Variant'),
          ),
        ],
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // AI STUDIO SETTINGS DIALOG (GEMINI KEY + TEST & REMBG IP)
  // ───────────────────────────────────────────────────────────────────────────
  void _showAiSettingsDialog(BuildContext context, {bool requireKeyPrompt = false}) async {
    final currentGeminiKey = await ProductScannerService.getSavedGeminiKey();
    final currentHost = await WhiteBackgroundService.getRembgHost();

    final geminiController = TextEditingController(text: currentGeminiKey);
    final hostController = TextEditingController(text: currentHost);
    bool obscureKey = true;
    bool isTesting = false;

    if (!context.mounted) return;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setState) {
          return AlertDialog(
            backgroundColor: AppTheme.surfaceElevated,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Row(
              children: [
                const Icon(Icons.auto_awesome, color: AppTheme.primaryLight, size: 22),
                const SizedBox(width: 8),
                Text(
                  requireKeyPrompt ? 'Google Gemini Key Needed' : 'Studio AI & Gemini Settings',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '1. Google Gemini AI Key',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.primaryLight),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Used for reading packaging labels, extract title, Hindi name, MRP, net weight & description with extreme precision.',
                    style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: geminiController,
                    obscureText: obscureKey,
                    decoration: InputDecoration(
                      labelText: 'Google Gemini API Key',
                      hintText: 'AIzaSy...',
                      prefixIcon: const Icon(Icons.key, size: 18),
                      suffixIcon: IconButton(
                        icon: Icon(obscureKey ? Icons.visibility : Icons.visibility_off, size: 18),
                        onPressed: () => setState(() => obscureKey = !obscureKey),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          side: const BorderSide(color: AppTheme.primaryLight),
                        ),
                        icon: isTesting
                            ? const SizedBox(
                                width: 12,
                                height: 12,
                                child: CircularProgressIndicator(strokeWidth: 1.5, color: AppTheme.primaryLight),
                              )
                            : const Icon(Icons.speed, size: 14, color: AppTheme.primaryLight),
                        label: const Text('Test Key', style: TextStyle(fontSize: 11)),
                        onPressed: isTesting
                            ? null
                            : () async {
                                final k = geminiController.text.trim();
                                if (k.isEmpty) {
                                  Fluttertoast.showToast(msg: 'Enter a key first');
                                  return;
                                }
                                setState(() => isTesting = true);
                                final ok = await ProductScannerService.testGeminiKey(k);
                                setState(() => isTesting = false);
                                if (ok) {
                                  Fluttertoast.showToast(
                                    msg: '✓ Gemini Key is valid and active!',
                                    backgroundColor: const Color(0xFF10B981),
                                  );
                                } else {
                                  Fluttertoast.showToast(
                                    msg: 'Key verification failed. Please check Google AI Studio key.',
                                    backgroundColor: Colors.red,
                                  );
                                }
                              },
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Divider(),
                  const SizedBox(height: 10),
                  const Text(
                    '2. Wi-Fi Laptop Rembg (U2Net)',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.primaryLight),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Routes to python scripts/start-rembg.py on your laptop for neural background cutouts.',
                    style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: hostController,
                    decoration: const InputDecoration(
                      labelText: 'Laptop IP Address',
                      hintText: '10.55.21.30',
                      prefixIcon: Icon(Icons.laptop, size: 18),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
                onPressed: () async {
                  await ProductScannerService.saveGeminiKey(geminiController.text);
                  await WhiteBackgroundService.setRembgHost(hostController.text);
                  if (ctx.mounted) Navigator.pop(ctx);
                  Fluttertoast.showToast(
                    msg: 'AI Settings Saved!',
                    backgroundColor: const Color(0xFF10B981),
                  );
                },
                child: const Text('Save Settings'),
              ),
            ],
          );
        },
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RECENT PRODUCTS SHEET
  // ───────────────────────────────────────────────────────────────────────────
  void _showRecentProductsBottomSheet(BuildContext context, AddProductViewModel vm) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Recently Added Products',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const Divider(),
              if (vm.recentAddedProducts.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 30),
                  child: Center(
                    child: Text('No products added yet in this session.', style: TextStyle(color: AppTheme.textMuted)),
                  ),
                )
              else
                Flexible(
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: vm.recentAddedProducts.length,
                    separatorBuilder: (context, index) => const Divider(height: 1),
                    itemBuilder: (context, idx) {
                      final p = vm.recentAddedProducts[idx];
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: AppTheme.surfaceElevated,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: p.imageUrl != null
                              ? ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.network(p.imageUrl!, fit: BoxFit.cover),
                                )
                              : const Icon(Icons.inventory_2, color: AppTheme.textMuted),
                        ),
                        title: Text(p.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                        subtitle: Text('Barcode: ${p.barcode ?? "N/A"} | Stock: ${p.currentStock}'),
                        trailing: Text(
                          '₹${p.sellingPrice.toStringAsFixed(0)}',
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, color: AppTheme.primaryLight, fontSize: 15),
                        ),
                      );
                    },
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
