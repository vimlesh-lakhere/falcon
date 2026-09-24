import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/product.dart';
import '../services/offline_product_service.dart';
import 'barcode_scanner_screen.dart';
import 'product_detail_sheet.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  final OfflineProductService _productService = OfflineProductService.instance;

  List<Product> _searchResults = [];
  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    _productService.addListener(_onServiceUpdate);
    _searchController.addListener(_onSearchChanged);
    _searchResults = _productService.search('');
  }

  @override
  void dispose() {
    _productService.removeListener(_onServiceUpdate);
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  void _onServiceUpdate() {
    if (mounted) {
      setState(() {
        _searchResults = _productService.search(_searchController.text);
      });
    }
  }

  void _onSearchChanged() {
    final query = _searchController.text;
    setState(() {
      _isSearching = query.trim().isNotEmpty;
      _searchResults = _productService.search(query);
    });
  }

  /// Open full-screen barcode camera scanner
  Future<void> _openBarcodeScanner() async {
    _searchFocusNode.unfocus();

    final scannedBarcode = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => const BarcodeScannerScreen(),
      ),
    );

    if (scannedBarcode != null && scannedBarcode.isNotEmpty && mounted) {
      _handleScannedBarcode(scannedBarcode);
    }
  }

  void _handleScannedBarcode(String barcode) {
    final product = _productService.findByBarcode(barcode);

    if (product != null) {
      ProductDetailSheet.show(
        context,
        product,
        onScanNext: _openBarcodeScanner,
      );
    } else {
      // Product not found dialog
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: const Color(0xFF1E222D),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(Icons.warning_amber_rounded,
                  color: Colors.amberAccent, size: 28),
              SizedBox(width: 10),
              Text(
                'Product Not Found',
                style: TextStyle(color: Colors.white, fontSize: 18),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Yeh barcode catalog me nahi mila:',
                style: TextStyle(color: Colors.white70, fontSize: 14),
              ),
              const SizedBox(height: 8),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white10,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  barcode,
                  style: const TextStyle(
                    color: Color(0xFFFFAB40),
                    fontFamily: 'monospace',
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Tip: Aap upar search bar me product ka naam type karke check kar sakte hain.',
                style: TextStyle(color: Colors.white60, fontSize: 13),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                _searchController.text = barcode;
              },
              child: const Text('Search by Text',
                  style: TextStyle(color: Color(0xFF90CAF9))),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                _openBarcodeScanner();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFF6D00),
                foregroundColor: Colors.white,
              ),
              child: const Text('Scan Again'),
            ),
          ],
        ),
      );
    }
  }

  /// Perform cloud sync
  Future<void> _syncProducts() async {
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    final result = await _productService.syncWithCloud();

    if (!mounted) return;

    if (result.success) {
      scaffoldMessenger.showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF00C853),
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          content: Row(
            children: [
              const Icon(Icons.check_circle_outline, color: Colors.white),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Sync Success! ${result.totalCount} Products Ready (New: ${result.addedCount}, Updated: ${result.updatedCount})',
                  style: const TextStyle(
                      color: Colors.white, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
      );
    } else {
      scaffoldMessenger.showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFFD32F2F),
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          content: Row(
            children: [
              const Icon(Icons.error_outline, color: Colors.white),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  result.errorMessage ?? 'Sync failed. You are currently offline.',
                  style: const TextStyle(color: Colors.white),
                ),
              ),
            ],
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final lastSyncText = _productService.lastSyncTime != null
        ? DateFormat('dd MMM, hh:mm a').format(_productService.lastSyncTime!)
        : 'Offline Ready';

    return Scaffold(
      backgroundColor: const Color(0xFF11141C),
      appBar: AppBar(
        backgroundColor: const Color(0xFF181C26),
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Falcon Price Check',
              style: TextStyle(
                color: Colors.white,
                fontSize: 19,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.2,
              ),
            ),
            Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Color(0xFF00E676),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  '${_productService.productCount} Products • $lastSyncText',
                  style: const TextStyle(
                    color: Colors.white60,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          // SYNC BUTTON
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: _productService.isSyncing
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.all(12.0),
                      child: SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: Color(0xFFFF6D00),
                        ),
                      ),
                    ),
                  )
                : IconButton(
                    tooltip: 'Sync Products / रीफ्रेश करें',
                    icon: const Icon(Icons.sync_rounded,
                        color: Colors.white, size: 26),
                    onPressed: _syncProducts,
                  ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Top Controls Section (Big Scan Button + Search Input)
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
            decoration: const BoxDecoration(
              color: Color(0xFF181C26),
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(24)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black45,
                  blurRadius: 10,
                  offset: Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              children: [
                // --- 1. BIG SCAN BARCODE BUTTON ---
                _buildGiantScanButton(),

                const SizedBox(height: 12),

                // --- 2. SEARCH BAR ---
                _buildSearchBar(),
              ],
            ),
          ),

          // Header for List
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 14, 18, 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _isSearching ? 'Search Results' : 'Catalog Products (दुकान के सामान)',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                  ),
                ),
                Text(
                  '${_searchResults.length} found',
                  style: const TextStyle(
                    color: Colors.white38,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),

          // --- 3. PRODUCTS LIST ---
          Expanded(
            child: _searchResults.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 6),
                    itemCount: _searchResults.length,
                    itemBuilder: (context, index) {
                      final product = _searchResults[index];
                      return _buildProductListItem(product);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  /// Big prominent Scan Barcode Button
  Widget _buildGiantScanButton() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFF6D00), Color(0xFFFF3D00)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFFF6D00).withValues(alpha: 0.45),
            blurRadius: 12,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: _openBarcodeScanner,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.22),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.qr_code_scanner_rounded,
                    color: Colors.white,
                    size: 36,
                  ),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'SCAN BARCODE',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.0,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'बारकोड स्कैन करें (कैमरा चालू करें)',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.arrow_forward_ios_rounded,
                  color: Colors.white70,
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Search bar widget
  Widget _buildSearchBar() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF232736),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white12),
      ),
      child: TextField(
        controller: _searchController,
        focusNode: _searchFocusNode,
        style: const TextStyle(color: Colors.white, fontSize: 16),
        decoration: InputDecoration(
          hintText: 'Search by name or barcode (नाम लिखें)...',
          hintStyle: const TextStyle(color: Colors.white38, fontSize: 14),
          prefixIcon: const Icon(Icons.search_rounded,
              color: Color(0xFFFF6D00), size: 24),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear, color: Colors.white60),
                  onPressed: () {
                    _searchController.clear();
                  },
                )
              : null,
          border: InputBorder.none,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      ),
    );
  }

  /// List item card
  Widget _buildProductListItem(Product product) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF1D212D),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            ProductDetailSheet.show(
              context,
              product,
              onScanNext: _openBarcodeScanner,
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // Product Thumbnail
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: const Color(0xFF13161F),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white12),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(11),
                    child: product.imageUrl != null &&
                            product.imageUrl!.isNotEmpty
                        ? CachedNetworkImage(
                            imageUrl: product.imageUrl!,
                            fit: BoxFit.contain,
                            placeholder: (context, url) => const Center(
                              child: SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Color(0xFFFF6D00),
                                ),
                              ),
                            ),
                            errorWidget: (context, url, error) => const Icon(
                              Icons.shopping_bag_outlined,
                              color: Colors.white24,
                              size: 28,
                            ),
                          )
                        : const Icon(
                            Icons.shopping_bag_outlined,
                            color: Colors.white24,
                            size: 28,
                          ),
                  ),
                ),

                const SizedBox(width: 14),

                // Name & Barcode
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        product.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          height: 1.2,
                        ),
                      ),
                      if (product.nameHindi != null &&
                          product.nameHindi!.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          product.nameHindi!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Color(0xFF90CAF9),
                            fontSize: 13,
                          ),
                        ),
                      ],
                      const SizedBox(height: 4),
                      if (product.barcode != null &&
                          product.barcode!.isNotEmpty)
                        Row(
                          children: [
                            const Icon(Icons.qr_code,
                                size: 13, color: Colors.white38),
                            const SizedBox(width: 4),
                            Text(
                              product.barcode!,
                              style: const TextStyle(
                                color: Colors.white38,
                                fontSize: 11,
                                fontFamily: 'monospace',
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),

                const SizedBox(width: 12),

                // Prices Display
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    // Selling Price
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF00C853).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: const Color(0xFF00C853).withValues(alpha: 0.5),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text(
                            'SELLING',
                            style: TextStyle(
                              color: Color(0xFF00E676),
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                          ),
                          Text(
                            product.formattedSellingPrice,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 4),

                    // Wholesale Price
                    if (product.wholesalePrice != null &&
                        product.wholesalePrice! > 0)
                      Text(
                        'थोक: ${product.formattedWholesalePrice}',
                        style: const TextStyle(
                          color: Color(0xFF64B5F6),
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Empty state
  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.search_off_rounded,
              size: 64, color: Colors.white.withValues(alpha: 0.2)),
          const SizedBox(height: 12),
          Text(
            'Koi product nahi mila',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.7),
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Dusra naam ya barcode try karein',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.4),
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}
