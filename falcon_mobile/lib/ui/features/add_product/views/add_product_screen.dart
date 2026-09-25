import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_contacts/flutter_contacts.dart';
import 'package:provider/provider.dart';
import '../../../core/app_theme.dart';
import '../../../../data/models/product_model.dart';
import '../../../../data/models/catalog_models.dart';
import '../../../../data/services/product_scanner_service.dart';
import '../../../../data/services/white_background_service.dart';
import '../../../../data/services/session_service.dart';
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
              // Sign out
              IconButton(
                icon: const Icon(Icons.logout, color: AppTheme.textMuted, size: 20),
                tooltip: 'Sign out',
                onPressed: () async {
                  final ok = await showDialog<bool>(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      backgroundColor: AppTheme.surface,
                      title: const Text('Sign out?'),
                      content: const Text('You will need to sign in again to add products.'),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                        TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Sign out')),
                      ],
                    ),
                  );
                  if (ok == true) await SessionService.instance.signOut();
                },
              ),
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

                      // 4. Unit & Packaging
                      _buildUnitAndPackagingCard(context, vm),
                      const SizedBox(height: 14),

                      // 5. Pricing & Margin Shortcuts
                      _buildPricingCard(vm),
                      const SizedBox(height: 14),

                      // 6. Stock & Category
                      _buildStockAndCategoryCard(context, vm),
                      const SizedBox(height: 14),

                      // 7. Additional Details & Suppliers (Multiple Suppliers)
                      _buildAdditionalDetailsAndSuppliersCard(context, vm),
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
              const SizedBox(width: 8),
              IconButton(
                style: IconButton.styleFrom(
                  backgroundColor: AppTheme.surfaceElevated,
                  foregroundColor: AppTheme.primaryLight,
                  padding: const EdgeInsets.all(14),
                  side: const BorderSide(color: AppTheme.cardBorder),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(Icons.auto_awesome, size: 20),
                tooltip: 'Auto Generate 890 Barcode',
                onPressed: () => vm.generateAutoBarcode(),
              ),
              const SizedBox(width: 8),
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
                      'Stock: ${_formatExistingStock(existing, vm)} | MRP: ₹${existing.mrp?.toStringAsFixed(0) ?? "N/A"} | Price: ₹${existing.sellingPrice.toStringAsFixed(0)}',
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
                  label: Text(
                    vm.isMultiUnit && !vm.sellAsFullPack ? 'Quick +10 Boxes' : 'Quick +10 Stock',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
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

  String _formatExistingStock(ProductModel existing, AddProductViewModel vm) {
    if (existing.unitId != null) {
      final unit = vm.units.firstWhere(
        (u) => u.id == existing.unitId,
        orElse: () => UnitModel(id: '', shopId: '', name: ''),
      );
      if (unit.conversionFactor > 1) {
        final boxes = (existing.currentStock / unit.conversionFactor).round();
        return '${existing.currentStock} pcs ($boxes ${unit.name})';
      }
    }
    return '${existing.currentStock} units';
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
              InkWell(
                onTap: vm.toggleAutoWhiteBackground,
                borderRadius: BorderRadius.circular(6),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: vm.autoWhiteBackground
                        ? AppTheme.primary.withValues(alpha: 0.2)
                        : Colors.transparent,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: vm.autoWhiteBackground
                          ? AppTheme.primaryLight
                          : AppTheme.cardBorder,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.auto_fix_high,
                        size: 14,
                        color: vm.autoWhiteBackground
                            ? AppTheme.primaryLight
                            : AppTheme.textMuted,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Auto White',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: vm.autoWhiteBackground
                              ? AppTheme.primaryLight
                              : AppTheme.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 6),
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
                  isWhiteBgApplied: vm.hasAppliedBackWhiteBg,
                  onSnapCamera: () => vm.captureBackImage(ImageSource.camera),
                  onPickGallery: () => vm.captureBackImage(ImageSource.gallery),
                  onToggleWhiteBg: vm.toggleBackWhiteBackground,
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
          // Name English with Live Auto-Suggest
          TextField(
            controller: vm.nameController,
            textCapitalization: TextCapitalization.words,
            onChanged: (val) => vm.onNameQueryChanged(val),
            decoration: InputDecoration(
              labelText: 'Product Name (English) *',
              hintText: 'e.g. Parachute 100% Pure Coconut Oil 100ml',
              suffixIcon: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (vm.isSearchingName)
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 6),
                      child: SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryLight),
                      ),
                    ),
                  IconButton(
                    icon: const Icon(Icons.translate, size: 18, color: AppTheme.secondary),
                    tooltip: 'Auto generate Hindi name',
                    onPressed: () => vm.onEnglishNameChanged(vm.nameController.text),
                  ),
                ],
              ),
            ),
            onSubmitted: (val) => vm.onEnglishNameChanged(val),
          ),
          if (vm.matchingNameProducts.isNotEmpty)
            _buildNameSuggestionsCard(vm),
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

  /// Live Name Search Suggestions Dropdown Card
  Widget _buildNameSuggestionsCard(AddProductViewModel vm) {
    return Container(
      margin: const EdgeInsets.only(top: 8, bottom: 4),
      decoration: BoxDecoration(
        color: AppTheme.surfaceElevated,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.primaryLight.withValues(alpha: 0.5), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 8, 8, 4),
            child: Row(
              children: [
                const Icon(Icons.search, size: 14, color: AppTheme.primaryLight),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Matching Products (${vm.matchingNameProducts.length}) - Tap to Auto-Fill',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryLight),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                InkWell(
                  onTap: vm.clearNameSuggestions,
                  child: const Padding(
                    padding: EdgeInsets.all(2),
                    child: Icon(Icons.close, size: 14, color: AppTheme.textMuted),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 220),
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: vm.matchingNameProducts.length,
              separatorBuilder: (context, index) => const Divider(height: 1, indent: 8, endIndent: 8),
              itemBuilder: (context, idx) {
                final p = vm.matchingNameProducts[idx];
                return ListTile(
                  dense: true,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                  leading: Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: AppTheme.cardBorder),
                    ),
                    child: p.imageUrl != null && p.imageUrl!.isNotEmpty
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: Image.network(
                              p.imageUrl!,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => const Icon(Icons.inventory_2, size: 16, color: AppTheme.primaryLight),
                            ),
                          )
                        : const Icon(Icons.inventory_2, size: 16, color: AppTheme.primaryLight),
                  ),
                  title: Text(
                    p.name,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: Row(
                    children: [
                      if (p.brand != null && p.brand!.isNotEmpty) ...[
                        Text(p.brand!, style: const TextStyle(fontSize: 10, color: AppTheme.textMuted)),
                        const Text(' • ', style: TextStyle(fontSize: 10, color: AppTheme.textMuted)),
                      ],
                      Text(
                        'Stock: ${p.currentStock.toStringAsFixed(0)}',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: p.currentStock > 0 ? AppTheme.success : AppTheme.error,
                        ),
                      ),
                      const Text(' • ', style: TextStyle(fontSize: 10, color: AppTheme.textMuted)),
                      Text(
                        '₹${p.sellingPrice.toStringAsFixed(0)}',
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.accent),
                      ),
                    ],
                  ),
                  trailing: const Icon(Icons.touch_app, size: 16, color: AppTheme.primaryLight),
                  onTap: () => vm.selectExistingProduct(p),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRICING CARD WITH 1-TAP MARGIN PILLS
  // ───────────────────────────────────────────────────────────────────────────
  // ───────────────────────────────────────────────────────────────────────────
  // 4. UNIT & PACKAGING CARD
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildUnitAndPackagingCard(BuildContext context, AddProductViewModel vm) {
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
              const Icon(Icons.straighten, size: 18, color: AppTheme.primaryLight),
              const SizedBox(width: 8),
              const Text(
                'Unit & Packaging',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
              ),
              const Spacer(),
              if (vm.isMultiUnit)
                Container(
                  margin: const EdgeInsets.only(right: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '1 ${vm.selectedUnit?.name.split(" ").first ?? "Unit"} = ${vm.currentConversionFactor.round()} Pcs',
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.primaryLight),
                  ),
                ),
              InkWell(
                onTap: () => _showCreateUnitBottomSheet(context, vm),
                borderRadius: BorderRadius.circular(6),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppTheme.primaryLight.withValues(alpha: 0.3)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.add, size: 14, color: AppTheme.primaryLight),
                      SizedBox(width: 3),
                      Text(
                        '+ New Unit',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryLight),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: vm.selectedUnitId,
            decoration: const InputDecoration(
              labelText: 'Unit of Measure *',
              prefixIcon: Icon(Icons.shopping_bag_outlined, size: 20, color: AppTheme.textMuted),
            ),
            items: vm.units.map((u) {
              return DropdownMenuItem<String>(
                value: u.id,
                child: Text(
                  u.conversionFactor > 1 ? '${u.name} (${u.conversionFactor.round()} pcs)' : u.name,
                  overflow: TextOverflow.ellipsis,
                ),
              );
            }).toList(),
            onChanged: (val) => vm.setSelectedUnitId(val),
          ),
          const SizedBox(height: 8),
          InkWell(
            onTap: () => _showCreateUnitBottomSheet(context, vm),
            borderRadius: BorderRadius.circular(6),
            child: const Padding(
              padding: EdgeInsets.symmetric(vertical: 4, horizontal: 2),
              child: Row(
                children: [
                  Icon(Icons.add_circle_outline, size: 14, color: AppTheme.primaryLight),
                  SizedBox(width: 6),
                  Text(
                    '+ Create New Unit (जैसे Box of 24, Pack of 10, Litre)',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.primaryLight),
                  ),
                ],
              ),
            ),
          ),
          if (vm.isMultiUnit) ...[
            const SizedBox(height: 12),
            const Text(
              'How is this product sold?',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: ChoiceChip(
                    label: const Text('Sell as Pieces (Khulla)'),
                    selected: !vm.sellAsFullPack,
                    selectedColor: AppTheme.primary.withValues(alpha: 0.2),
                    labelStyle: TextStyle(
                      fontSize: 11,
                      fontWeight: !vm.sellAsFullPack ? FontWeight.bold : FontWeight.normal,
                      color: !vm.sellAsFullPack ? AppTheme.primaryLight : AppTheme.textMuted,
                    ),
                    onSelected: (_) => vm.setSellAsFullPack(false),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ChoiceChip(
                    label: const Text('Sell Full Pack (Sealed)'),
                    selected: vm.sellAsFullPack,
                    selectedColor: AppTheme.primary.withValues(alpha: 0.2),
                    labelStyle: TextStyle(
                      fontSize: 11,
                      fontWeight: vm.sellAsFullPack ? FontWeight.bold : FontWeight.normal,
                      color: vm.sellAsFullPack ? AppTheme.primaryLight : AppTheme.textMuted,
                    ),
                    onSelected: (_) => vm.setSellAsFullPack(true),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CREATE NEW UNIT BOTTOM SHEET
  // ───────────────────────────────────────────────────────────────────────────
  void _showCreateUnitBottomSheet(BuildContext context, AddProductViewModel vm) {
    final nameController = TextEditingController();
    final factorController = TextEditingController(text: '10');
    bool isSaving = false;
    String? errorText;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            void onNameChanged(String val) {
              final match = RegExp(r'(?:of|\(?)\s*(\d+)\s*(?:pcs|pc|units)?', caseSensitive: false).firstMatch(val);
              if (match != null && match.group(1) != null) {
                final parsed = int.tryParse(match.group(1)!);
                if (parsed != null && parsed > 0) {
                  setSheetState(() {
                    factorController.text = parsed.toString();
                  });
                }
              }
            }

            Future<void> handleSave() async {
              final name = nameController.text.trim();
              if (name.isEmpty) {
                setSheetState(() {
                  errorText = 'कृपया यूनिट का नाम लिखें (e.g. Pack of 12)';
                });
                return;
              }

              final factor = double.tryParse(factorController.text.trim()) ?? 1.0;
              if (factor <= 0) {
                setSheetState(() {
                  errorText = 'पीस / मल्टीप्लायर कम से कम 1 होना चाहिए';
                });
                return;
              }

              setSheetState(() {
                isSaving = true;
                errorText = null;
              });

              try {
                await vm.createAndSelectUnit(name, factor);
                if (context.mounted) {
                  Navigator.of(context).pop();
                }
              } catch (e) {
                setSheetState(() {
                  isSaving = false;
                  errorText = 'यूनिट नहीं बन सकी: $e';
                });
              }
            }

            final presets = [
              {'label': '1 (Khulla)', 'val': '1'},
              {'label': '6 (Half Doz)', 'val': '6'},
              {'label': '10', 'val': '10'},
              {'label': '12 (1 Dozen)', 'val': '12'},
              {'label': '24 (1 Box)', 'val': '24'},
              {'label': '50', 'val': '50'},
              {'label': '100', 'val': '100'},
            ];

            return Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 16,
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.add_circle, color: AppTheme.primaryLight, size: 20),
                            SizedBox(width: 8),
                            Text(
                              'Create New Unit (नई यूनिट)',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                            ),
                          ],
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: AppTheme.textMuted),
                          onPressed: () => Navigator.of(context).pop(),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'नए पैकेजिंग यूनिट का नाम और उसमें मौजूद पीस दर्ज करें',
                      style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
                    ),
                    const SizedBox(height: 16),
                    if (errorText != null) ...[
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppTheme.error.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppTheme.error.withValues(alpha: 0.4)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, color: AppTheme.error, size: 16),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                errorText!,
                                style: const TextStyle(fontSize: 12, color: AppTheme.error, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    // Unit Name Input
                    TextField(
                      controller: nameController,
                      autofocus: true,
                      decoration: const InputDecoration(
                        labelText: 'Unit Name (यूनिट का नाम) *',
                        hintText: 'e.g. Pack of 12, Box (24 pcs), Litre, Kg',
                        prefixIcon: Icon(Icons.shopping_bag_outlined, color: AppTheme.primaryLight, size: 20),
                      ),
                      onChanged: onNameChanged,
                    ),
                    const SizedBox(height: 14),
                    // Conversion Factor Input
                    TextField(
                      controller: factorController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Pieces per Unit (1 यूनिट में कितने पीस) *',
                        hintText: 'e.g. 10 or 12 or 24',
                        prefixIcon: Icon(Icons.numbers, color: AppTheme.primaryLight, size: 20),
                        helperText: 'जैसे 1 Box = 24 Pieces (खूल्ला पीस 1 रखें)',
                      ),
                    ),
                    const SizedBox(height: 10),
                    // Quick Multiplier Preset Chips
                    const Text(
                      'Quick Presets (जल्दी चुनने के लिए):',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.textSecondary),
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: presets.map((p) {
                        final isSelected = factorController.text == p['val'];
                        return ActionChip(
                          label: Text(p['label']!),
                          backgroundColor: isSelected ? AppTheme.primary.withValues(alpha: 0.25) : AppTheme.surfaceElevated,
                          side: BorderSide(
                            color: isSelected ? AppTheme.primaryLight : AppTheme.cardBorder,
                          ),
                          labelStyle: TextStyle(
                            fontSize: 11,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            color: isSelected ? AppTheme.primaryLight : AppTheme.textSecondary,
                          ),
                          onPressed: () {
                            setSheetState(() {
                              factorController.text = p['val']!;
                            });
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 20),
                    // Save Button
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: isSaving ? null : handleSave,
                        child: isSaving
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.check_circle_outline, size: 18),
                                  SizedBox(width: 8),
                                  Text(
                                    'Save & Select Unit (यूनिट जोड़ें)',
                                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
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
      },
    );
  }


  // ───────────────────────────────────────────────────────────────────────────
  // 5. PRICING & PROFIT MARGINS CARD
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
          if (vm.isMultiUnit) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: AppTheme.surfaceElevated,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.cardBorder),
              ),
              child: Row(
                children: [
                  const Text('Price Entry: ', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                  const SizedBox(width: 6),
                  InkWell(
                    onTap: () => vm.setPriceEntryMode(true),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: vm.enterPriceAsPack ? AppTheme.primary.withValues(alpha: 0.2) : Colors.transparent,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'Full ${vm.selectedUnit?.name.split(" ").first ?? "Pack"}',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: vm.enterPriceAsPack ? FontWeight.bold : FontWeight.normal,
                          color: vm.enterPriceAsPack ? AppTheme.primaryLight : AppTheme.textMuted,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),
                  InkWell(
                    onTap: () => vm.setPriceEntryMode(false),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: !vm.enterPriceAsPack ? AppTheme.primary.withValues(alpha: 0.2) : Colors.transparent,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'Per Piece',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: !vm.enterPriceAsPack ? FontWeight.bold : FontWeight.normal,
                          color: !vm.enterPriceAsPack ? AppTheme.primaryLight : AppTheme.textMuted,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
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
                  decoration: InputDecoration(
                    labelText: vm.isMultiUnit && vm.enterPriceAsPack
                        ? '${vm.selectedUnit?.name.split(" ").first ?? "Pack"} MRP (₹)'
                        : 'MRP (₹)',
                    hintText: '0',
                    prefixText: '₹ ',
                    helperText: vm.isMultiUnit && vm.enterPriceAsPack
                        ? '₹${((double.tryParse(vm.mrpController.text) ?? 0) / (vm.currentConversionFactor > 0 ? vm.currentConversionFactor : 1)).toStringAsFixed(2)} / pc MRP'
                        : null,
                    helperStyle: const TextStyle(fontSize: 10, color: AppTheme.primaryLight),
                  ),
                  onChanged: (_) => vm.refreshPricingState(),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: vm.sellingPriceController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(
                    labelText: vm.isMultiUnit && vm.enterPriceAsPack
                        ? '${vm.selectedUnit?.name.split(" ").first ?? "Pack"} Selling (₹) *'
                        : 'Selling Price (₹) *',
                    hintText: '0',
                    prefixText: '₹ ',
                    helperText: vm.isMultiUnit && vm.enterPriceAsPack
                        ? '₹${vm.perPieceSelling.toStringAsFixed(2)} / pc'
                        : null,
                    helperStyle: const TextStyle(fontSize: 10, color: AppTheme.primaryLight),
                  ),
                  onChanged: (_) => vm.refreshPricingState(),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Purchase Price (Cost)
          TextField(
            controller: vm.purchasePriceController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(
              labelText: vm.isMultiUnit && vm.enterPriceAsPack
                  ? '${vm.selectedUnit?.name.split(" ").first ?? "Pack"} Cost / Khareed (₹)'
                  : 'Purchase Price (Cost) (₹)',
              hintText: '0',
              prefixText: '₹ ',
              helperText: vm.isMultiUnit && vm.enterPriceAsPack
                  ? '₹${vm.perPieceCost.toStringAsFixed(2)} / pc cost'
                  : null,
              helperStyle: const TextStyle(fontSize: 10, color: AppTheme.primaryLight),
            ),
            onChanged: (_) => vm.refreshPricingState(),
          ),
          const SizedBox(height: 12),

          // Wholesale Switch & Fields
          const Divider(height: 1),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Wholesale Pricing', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            subtitle: Text(
              vm.isWholesaleEnabled
                  ? 'Active: Special bulk rate configured'
                  : 'Enable special rate for bulk / full pack buyers',
              style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
            ),
            value: vm.isWholesaleEnabled,
            activeThumbColor: AppTheme.primary,
            onChanged: (val) => vm.setWholesaleEnabled(val),
          ),
          if (vm.isWholesaleEnabled) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  flex: 3,
                  child: TextField(
                    controller: vm.wholesalePriceController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(
                      labelText: vm.isMultiUnit && vm.enterPriceAsPack
                          ? '${vm.selectedUnit?.name.split(" ").first ?? "Pack"} Wholesale (₹)'
                          : 'Wholesale Price / pc',
                      hintText: 'selling se kam',
                      prefixText: '₹ ',
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: TextField(
                    controller: vm.wholesaleMinQtyController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Min Qty *',
                      hintText: '12',
                      suffixText: 'pcs',
                    ),
                  ),
                ),
              ],
            ),
          ],
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
  // 6. STOCK & CATEGORY CARD
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildStockAndCategoryCard(BuildContext context, AddProductViewModel vm) {
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
            'Inventory & Stock',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
          ),
          const SizedBox(height: 12),
          // Category (select + manage: add / edit / delete)
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: vm.categories.any((c) => c.id == vm.selectedCategoryId)
                      ? vm.selectedCategoryId
                      : null,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Category',
                    prefixIcon: Icon(Icons.category, size: 20, color: AppTheme.textMuted),
                  ),
                  items: vm.categories.map((c) {
                    return DropdownMenuItem<String>(
                      value: c.id,
                      child: Text(c.name, overflow: TextOverflow.ellipsis),
                    );
                  }).toList(),
                  onChanged: (val) => vm.setSelectedCategoryId(val),
                ),
              ),
              const SizedBox(width: 8),
              Material(
                color: AppTheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
                child: InkWell(
                  borderRadius: BorderRadius.circular(10),
                  onTap: () => _showManageCategoriesSheet(context, vm),
                  child: const Padding(
                    padding: EdgeInsets.all(12),
                    child: Icon(Icons.tune, size: 20, color: AppTheme.primary),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Stock & Min Stock
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: vm.stockController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: vm.isMultiUnit
                        ? (vm.sellAsFullPack ? 'Pack Qty' : '${vm.selectedUnit?.name.split(" ").first ?? "Box"} Qty')
                        : 'Initial Stock',
                    hintText: '10',
                  ),
                  onChanged: (_) => vm.refreshStockCalculation(),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: vm.minStockController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Low Stock Alert',
                    hintText: '5',
                  ),
                ),
              ),
            ],
          ),
          if (vm.isMultiUnit) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.primary.withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.inventory_2, size: 16, color: AppTheme.primaryLight),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      !vm.sellAsFullPack
                          ? '📦 ${(int.tryParse(vm.stockController.text.trim()) ?? 0)} ${vm.selectedUnit?.name ?? 'Boxes'} × ${vm.currentConversionFactor.round()} = ${vm.calculatedBaseStock} Total Pieces in Inventory'
                          : '📦 ${(int.tryParse(vm.stockController.text.trim()) ?? 0)} Sealed Packs in Inventory (Sold as complete pack)',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.primaryLight),
                    ),
                  ),
                ],
              ),
            ),
          ],
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
          if (vm.isOnline) ...[
            const SizedBox(height: 4),
            TextField(
              controller: vm.onlinePriceController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              onChanged: vm.onOnlinePriceEdited,
              decoration: InputDecoration(
                labelText: vm.isMultiUnit && vm.enterPriceAsPack
                    ? 'Online Store ${vm.selectedUnit?.name.split(" ").first ?? "Pack"} Price (₹)'
                    : 'Online Store Price (₹)',
                prefixText: '₹ ',
                helperText: vm.onlineLinked
                    ? '🔗 POS price ke saath linked — POS badlega to online bhi badlega'
                    : '✏️ Online ka alag rate — POS badalne par ye nahi badlega',
                helperMaxLines: 2,
                helperStyle: TextStyle(
                  fontSize: 10,
                  color: vm.onlineLinked ? AppTheme.textMuted : AppTheme.primaryLight,
                ),
              ),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              children: [
                for (final opt in const [
                  ['Same as POS', 0.0],
                  ['+5%', 5.0],
                  ['+10%', 10.0],
                ])
                  ActionChip(
                    label: Text(opt[0] as String, style: const TextStyle(fontSize: 11)),
                    visualDensity: VisualDensity.compact,
                    onPressed: () => vm.applyOnlinePriceAdjustment(opt[1] as double),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY MANAGEMENT (create / rename / delete from the APK)
  // ───────────────────────────────────────────────────────────────────────────
  void _showManageCategoriesSheet(BuildContext context, AddProductViewModel vm) {
    final addController = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: Container(
            decoration: const BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: AnimatedBuilder(
              animation: vm,
              builder: (context, _) => Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.category, color: AppTheme.primary, size: 22),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text('Manage Categories (श्रेणियाँ)',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                      ),
                      IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: addController,
                          textCapitalization: TextCapitalization.words,
                          decoration: const InputDecoration(
                            labelText: 'New category name (नई श्रेणी)',
                            isDense: true,
                          ),
                          onSubmitted: (v) async {
                            if (v.trim().isNotEmpty) {
                              await vm.createAndSelectCategory(v.trim());
                              addController.clear();
                            }
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton.icon(
                        onPressed: vm.isCreatingCategory
                            ? null
                            : () async {
                                if (addController.text.trim().isNotEmpty) {
                                  await vm.createAndSelectCategory(addController.text.trim());
                                  addController.clear();
                                }
                              },
                        icon: const Icon(Icons.add, size: 18),
                        label: const Text('Add'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Divider(height: 1),
                  if (vm.categories.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Center(
                        child: Text('No categories yet. Add one above.',
                            style: TextStyle(color: AppTheme.textMuted)),
                      ),
                    )
                  else
                    Flexible(
                      child: ListView.separated(
                        shrinkWrap: true,
                        itemCount: vm.categories.length,
                        separatorBuilder: (_, _) => const Divider(height: 1),
                        itemBuilder: (context, i) {
                          final c = vm.categories[i];
                          final isSelected = vm.selectedCategoryId == c.id;
                          return ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: Icon(
                              isSelected ? Icons.check_circle : Icons.label_outline,
                              color: isSelected ? AppTheme.primary : AppTheme.textMuted,
                              size: 20,
                            ),
                            title: Text(c.name, style: const TextStyle(fontSize: 14)),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.edit, size: 20, color: AppTheme.primary),
                                  onPressed: () => _showEditCategoryDialog(context, vm, c),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, size: 20, color: Color(0xFFEF4444)),
                                  onPressed: () => _confirmDeleteCategory(context, vm, c),
                                ),
                              ],
                            ),
                            onTap: () {
                              vm.setSelectedCategoryId(c.id);
                              Navigator.pop(ctx);
                            },
                          );
                        },
                      ),
                    ),
                  SizedBox(height: MediaQuery.of(ctx).padding.bottom + 8),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  void _showEditCategoryDialog(BuildContext context, AddProductViewModel vm, CategoryModel c) {
    final ctrl = TextEditingController(text: c.name);
    showDialog(
      context: context,
      builder: (dctx) => AlertDialog(
        title: const Text('Rename Category'),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(labelText: 'Category name'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final n = ctrl.text.trim();
              Navigator.pop(dctx);
              if (n.isNotEmpty && n != c.name) await vm.renameCategory(c.id, n);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteCategory(BuildContext context, AddProductViewModel vm, CategoryModel c) {
    showDialog(
      context: context,
      builder: (dctx) => AlertDialog(
        title: const Text('Delete Category?'),
        content: Text(
            'Remove "${c.name}"? Products already using it keep working — it just won\'t show in the list any more.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            onPressed: () async {
              Navigator.pop(dctx);
              await vm.deleteCategoryById(c.id);
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. ADDITIONAL DETAILS & MULTIPLE SUPPLIERS CARD
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildAdditionalDetailsAndSuppliersCard(BuildContext context, AddProductViewModel vm) {
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
              const Icon(Icons.local_shipping_outlined, size: 18, color: AppTheme.primaryLight),
              const SizedBox(width: 8),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Suppliers & Reordering',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                    ),
                    Text(
                      'Select multiple suppliers for fast stock ordering',
                      style: TextStyle(fontSize: 10, color: AppTheme.textMuted),
                    ),
                  ],
                ),
              ),
              InkWell(
                onTap: () => _showCreateSupplierBottomSheet(context, vm),
                borderRadius: BorderRadius.circular(6),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppTheme.primaryLight.withValues(alpha: 0.3)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.add, size: 14, color: AppTheme.primaryLight),
                      SizedBox(width: 3),
                      Text(
                        '+ New Supplier',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryLight),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Available Suppliers Chips (Multi-Select)
          if (vm.suppliers.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: InkWell(
                onTap: () => _showCreateSupplierBottomSheet(context, vm),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceElevated,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.cardBorder),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.person_add_outlined, size: 16, color: AppTheme.primaryLight),
                      SizedBox(width: 8),
                      Text(
                        'No suppliers added yet. Tap to add your first supplier',
                        style: TextStyle(fontSize: 11, color: AppTheme.primaryLight, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ),
            )
          else ...[
            const Text(
              'Tap to select • Long-press to edit/delete (एडिट/डिलीट के लिए दबाकर रखें):',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.textMuted),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: vm.suppliers.map((s) {
                final isSelected = vm.isSupplierSelected(s.id);
                return GestureDetector(
                  onLongPress: () => _showSupplierActionsSheet(context, vm, s),
                  child: FilterChip(
                    label: Text(
                      s.phone != null && s.phone!.isNotEmpty ? '${s.name} (${s.phone})' : s.name,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected ? Colors.white : AppTheme.textSecondary,
                      ),
                    ),
                    selected: isSelected,
                    selectedColor: AppTheme.primary,
                    checkmarkColor: Colors.white,
                    backgroundColor: AppTheme.surfaceElevated,
                    side: BorderSide(
                      color: isSelected ? AppTheme.primaryLight : AppTheme.cardBorder,
                    ),
                    onSelected: (_) => vm.toggleSupplier(s.id),
                  ),
                );
              }).toList(),
            ),
          ],

          // Selected Suppliers Summary List
          if (vm.selectedSuppliers.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.primary.withValues(alpha: 0.2)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Selected Suppliers (${vm.selectedSuppliers.length})',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryLight),
                      ),
                      InkWell(
                        onTap: () => vm.clearSuppliers(),
                        child: const Text(
                          'Clear All',
                          style: TextStyle(fontSize: 10, color: AppTheme.error, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ...vm.selectedSuppliers.asMap().entries.map((entry) {
                    final index = entry.key;
                    final s = entry.value;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 4),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: AppTheme.cardBorder),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: index == 0
                                  ? AppTheme.primary.withValues(alpha: 0.2)
                                  : AppTheme.surfaceElevated,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              index == 0 ? 'Primary' : 'Alt #${index + 1}',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: index == 0 ? AppTheme.primaryLight : AppTheme.textMuted,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  s.name,
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                                  overflow: TextOverflow.ellipsis,
                                ),
                                if (s.phone != null && s.phone!.isNotEmpty)
                                  Text(
                                    s.phone!,
                                    style: const TextStyle(fontSize: 10, color: AppTheme.textMuted),
                                  ),
                              ],
                            ),
                          ),
                          if (s.phone != null && s.phone!.isNotEmpty)
                            IconButton(
                              icon: const Icon(Icons.copy, size: 14, color: AppTheme.textMuted),
                              tooltip: 'Copy Phone',
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              onPressed: () {
                                Clipboard.setData(ClipboardData(text: s.phone!));
                                Fluttertoast.showToast(msg: 'Phone copied: ${s.phone!}');
                              },
                            ),
                          const SizedBox(width: 6),
                          IconButton(
                            icon: const Icon(Icons.close, size: 14, color: AppTheme.textMuted),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            onPressed: () => vm.removeSupplier(s.id),
                          ),
                        ],
                      ),
                    );
                  }),
                  const SizedBox(height: 4),
                  const Text(
                    '💡 जब भी स्टॉक खत्म होगा, आप सीधे इन सप्लायर्स से नया माल मंगा सकते हैं।',
                    style: TextStyle(fontSize: 10, color: AppTheme.textMuted),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CREATE NEW SUPPLIER BOTTOM SHEET
  // ───────────────────────────────────────────────────────────────────────────
  void _showCreateSupplierBottomSheet(BuildContext context, AddProductViewModel vm, {SupplierModel? existing}) {
    final isEditing = existing != null;
    final nameController = TextEditingController(text: existing?.name ?? '');
    final phoneController = TextEditingController(text: existing?.phone ?? '');
    final addressController = TextEditingController(text: existing?.address ?? '');
    bool isSaving = false;
    String? errorText;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            Future<void> pickFromContacts() async {
              try {
                final granted = await FlutterContacts.requestPermission(readonly: true);
                if (!granted) {
                  Fluttertoast.showToast(
                    msg: 'Contacts की अनुमति दें (Allow contacts access)',
                    backgroundColor: const Color(0xFFEF4444),
                    textColor: Colors.white,
                  );
                  return;
                }
                final picked = await FlutterContacts.openExternalPick();
                if (picked == null) return;
                Contact? full;
                try {
                  full = await FlutterContacts.getContact(picked.id, withProperties: true);
                } catch (_) {}
                final c = full ?? picked;
                final pickedName = c.displayName.trim();
                final pickedPhone = c.phones.isNotEmpty
                    ? c.phones.first.number.replaceAll(RegExp(r'[^0-9+]'), '')
                    : '';
                setSheetState(() {
                  if (pickedName.isNotEmpty) nameController.text = pickedName;
                  if (pickedPhone.isNotEmpty) phoneController.text = pickedPhone;
                  errorText = null;
                });
              } catch (e) {
                Fluttertoast.showToast(
                  msg: 'Contact नहीं मिला: $e',
                  backgroundColor: const Color(0xFFEF4444),
                  textColor: Colors.white,
                );
              }
            }

            Future<void> handleSave() async {
              final name = nameController.text.trim();
              if (name.isEmpty) {
                setSheetState(() {
                  errorText = 'कृपया सप्लायर का नाम लिखें';
                });
                return;
              }

              setSheetState(() {
                isSaving = true;
                errorText = null;
              });

              try {
                if (existing != null) {
                  await vm.updateSupplierDetails(
                    existing.id,
                    name: name,
                    phone: phoneController.text.trim(),
                    address: addressController.text.trim(),
                  );
                } else {
                  await vm.createAndSelectSupplier(
                    name: name,
                    phone: phoneController.text.trim().isEmpty ? null : phoneController.text.trim(),
                    address: addressController.text.trim().isEmpty ? null : addressController.text.trim(),
                  );
                }
                if (context.mounted) {
                  Navigator.of(context).pop();
                }
              } catch (e) {
                setSheetState(() {
                  isSaving = false;
                  errorText = 'सेव नहीं हुआ: $e';
                });
              }
            }

            return Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 16,
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.store, color: AppTheme.primaryLight, size: 20),
                            const SizedBox(width: 8),
                            Text(
                              isEditing ? 'Edit Supplier (सप्लायर बदलें)' : 'Add New Supplier (नया सप्लायर)',
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                            ),
                          ],
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: AppTheme.textMuted),
                          onPressed: () => Navigator.of(context).pop(),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    // Pick straight from the phone's contacts (fills name + number)
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: pickFromContacts,
                        icon: const Icon(Icons.contacts_outlined, size: 18, color: AppTheme.primary),
                        label: const Text(
                          'Contacts से चुनें (Pick from Contacts)',
                          style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w600),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppTheme.primary),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    if (errorText != null) ...[
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppTheme.error.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppTheme.error.withValues(alpha: 0.4)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, color: AppTheme.error, size: 16),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                errorText!,
                                style: const TextStyle(fontSize: 12, color: AppTheme.error, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    // Supplier Name
                    TextField(
                      controller: nameController,
                      autofocus: !isEditing,
                      textCapitalization: TextCapitalization.words,
                      decoration: const InputDecoration(
                        labelText: 'Supplier / Agency Name (सप्लायर का नाम) *',
                        hintText: 'e.g. Balaji Agencies, Sharma Distributor',
                        prefixIcon: Icon(Icons.storefront_outlined, color: AppTheme.primaryLight, size: 20),
                      ),
                    ),
                    const SizedBox(height: 14),
                    // Phone / WhatsApp
                    TextField(
                      controller: phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Mobile / WhatsApp Number (ऑर्डर के लिए)',
                        hintText: 'e.g. 98260XXXXX',
                        prefixIcon: Icon(Icons.phone_outlined, color: AppTheme.primaryLight, size: 20),
                        helperText: 'री-ऑर्डर और संपर्क के लिए उपयोगी',
                      ),
                    ),
                    const SizedBox(height: 14),
                    // Address / City
                    TextField(
                      controller: addressController,
                      decoration: const InputDecoration(
                        labelText: 'Address / City (पता / शहर - Optional)',
                        hintText: 'e.g. Katni Road, Jabalpur',
                        prefixIcon: Icon(Icons.location_on_outlined, color: AppTheme.primaryLight, size: 20),
                      ),
                    ),
                    const SizedBox(height: 20),
                    // Save Button
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: isSaving ? null : handleSave,
                        child: isSaving
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.check_circle_outline, size: 18),
                                  const SizedBox(width: 8),
                                  Text(
                                    isEditing ? 'Update Supplier (अपडेट करें)' : 'Save & Select Supplier (सप्लायर जोड़ें)',
                                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
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
      },
    );
  }

  // Long-press actions for a supplier chip: edit or delete.
  void _showSupplierActionsSheet(BuildContext context, AddProductViewModel vm, SupplierModel s) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    const Icon(Icons.store, color: AppTheme.primaryLight, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(s.name,
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                    ),
                  ],
                ),
              ),
              ListTile(
                leading: const Icon(Icons.edit, color: AppTheme.primary),
                title: const Text('Edit (बदलें)'),
                onTap: () {
                  Navigator.pop(ctx);
                  _showCreateSupplierBottomSheet(context, vm, existing: s);
                },
              ),
              ListTile(
                leading: const Icon(Icons.delete_outline, color: Color(0xFFEF4444)),
                title: const Text('Delete (हटाएँ)', style: TextStyle(color: Color(0xFFEF4444))),
                onTap: () {
                  Navigator.pop(ctx);
                  _confirmDeleteSupplier(context, vm, s);
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  void _confirmDeleteSupplier(BuildContext context, AddProductViewModel vm, SupplierModel s) {
    showDialog(
      context: context,
      builder: (dctx) => AlertDialog(
        title: const Text('Delete Supplier?'),
        content: Text('Remove "${s.name}"? Past purchases stay intact — it just won\'t show in the list any more.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            onPressed: () async {
              Navigator.pop(dctx);
              await vm.deleteSupplierById(s.id);
            },
            child: const Text('Delete'),
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
                                final rawKey = geminiController.text;
                                final clean = ProductScannerService.cleanGeminiKey(rawKey);
                                if (clean.isEmpty) {
                                  Fluttertoast.showToast(msg: 'Enter or paste a key first');
                                  return;
                                }
                                setState(() => isTesting = true);
                                final result = await ProductScannerService.testGeminiKeyDetailed(clean);
                                setState(() => isTesting = false);
                                if (result.isValid) {
                                  geminiController.text = clean;
                                  Fluttertoast.showToast(
                                    msg: result.message,
                                    backgroundColor: const Color(0xFF10B981),
                                    toastLength: Toast.LENGTH_LONG,
                                  );
                                } else {
                                  Fluttertoast.showToast(
                                    msg: result.message,
                                    backgroundColor: Colors.red,
                                    toastLength: Toast.LENGTH_LONG,
                                  );
                                }
                              },
                      ),
                      const SizedBox(width: 8),
                      TextButton.icon(
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                        ),
                        icon: const Icon(Icons.content_paste, size: 14),
                        label: const Text('Paste Key', style: TextStyle(fontSize: 11)),
                        onPressed: () async {
                          final data = await Clipboard.getData(Clipboard.kTextPlain);
                          if (data?.text != null && data!.text!.trim().isNotEmpty) {
                            final clean = ProductScannerService.cleanGeminiKey(data.text!);
                            geminiController.text = clean;
                            Fluttertoast.showToast(msg: 'Pasted key from clipboard');
                          } else {
                            Fluttertoast.showToast(msg: 'Clipboard is empty');
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
                  final clean = ProductScannerService.cleanGeminiKey(geminiController.text);
                  await ProductScannerService.saveGeminiKey(clean);
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
