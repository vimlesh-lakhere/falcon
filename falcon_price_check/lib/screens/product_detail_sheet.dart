import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import '../models/product.dart';

class ProductDetailSheet extends StatelessWidget {
  final Product product;
  final VoidCallback? onScanNext;

  const ProductDetailSheet({
    super.key,
    required this.product,
    this.onScanNext,
  });

  static Future<void> show(
    BuildContext context,
    Product product, {
    VoidCallback? onScanNext,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ProductDetailSheet(
        product: product,
        onScanNext: onScanNext,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);

    return Container(
      constraints: BoxConstraints(
        maxHeight: media.size.height * 0.92,
      ),
      decoration: const BoxDecoration(
        color: Color(0xFF1E222D),
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: [
          BoxShadow(
            color: Colors.black54,
            blurRadius: 20,
            offset: Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 48,
              height: 5,
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),

          // Scrollable body
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // --- 1. BIG PRODUCT IMAGE ---
                  _buildBigImage(context),

                  const SizedBox(height: 16),

                  // --- 2. PRODUCT TITLE & HINDI NAME ---
                  Text(
                    product.name,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                      height: 1.25,
                    ),
                    textAlign: TextAlign.center,
                  ),

                  if (product.nameHindi != null &&
                      product.nameHindi!.trim().isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      product.nameHindi!,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF90CAF9),
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],

                  if (product.brand != null && product.brand!.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          product.brand!,
                          style: const TextStyle(
                            fontSize: 13,
                            color: Colors.white70,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                  ],

                  const SizedBox(height: 20),

                  // --- 3. LARGE SELLING PRICE CARD ---
                  _buildPriceCard(
                    title: 'SELLING PRICE (खुदरा भाव)',
                    price: product.formattedSellingPrice,
                    subtitle: product.priceBasis == 'pack'
                        ? 'प्रति पैक (Per Pack)'
                        : 'प्रति पीस (Per Piece)',
                    gradient: const LinearGradient(
                      colors: [Color(0xFF00C853), Color(0xFF009624)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    icon: Icons.sell_rounded,
                  ),

                  const SizedBox(height: 14),

                  // --- 4. LARGE WHOLESALE PRICE CARD ---
                  _buildPriceCard(
                    title: 'WHOLESALE PRICE (थोक भाव)',
                    price: product.formattedWholesalePrice,
                    subtitle: product.wholesalePrice != null &&
                            product.wholesalePrice! > 0
                        ? product.wholesaleQtyText
                        : 'Contact shop for bulk rate',
                    gradient: const LinearGradient(
                      colors: [Color(0xFF2979FF), Color(0xFF1565C0)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    icon: Icons.inventory_2_rounded,
                  ),

                  const SizedBox(height: 14),

                  // --- 5. MRP & SAVINGS BADGE (IF AVAILABLE) ---
                  if (product.mrp != null && product.mrp! > 0)
                    _buildMrpAndSavingsCard(),

                  const SizedBox(height: 16),

                  // Barcode & Stock details badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2A2E3D),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.qr_code_rounded,
                                color: Colors.white54, size: 20),
                            const SizedBox(width: 8),
                            Text(
                              product.barcode != null &&
                                      product.barcode!.isNotEmpty
                                  ? product.barcode!
                                  : 'No Barcode',
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 13,
                                fontFamily: 'monospace',
                              ),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: product.currentStock > 0
                                ? Colors.green.withValues(alpha: 0.15)
                                : Colors.red.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            product.currentStock > 0
                                ? 'Stock: ${product.currentStock}'
                                : 'Stock: 0',
                            style: TextStyle(
                              color: product.currentStock > 0
                                  ? Colors.greenAccent
                                  : Colors.redAccent,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // --- 6. ACTION BUTTONS ---
                  Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.of(context).pop();
                            if (onScanNext != null) {
                              onScanNext!();
                            }
                          },
                          icon: const Icon(Icons.camera_alt_rounded, size: 24),
                          label: const Text(
                            'SCAN NEXT PRODUCT',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.5,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFFF6D00),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            elevation: 4,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.close_rounded,
                            color: Colors.white70),
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.white12,
                          padding: const EdgeInsets.all(16),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Big image widget
  Widget _buildBigImage(BuildContext context) {
    final hasImage =
        product.imageUrl != null && product.imageUrl!.trim().isNotEmpty;

    return Container(
      height: 230,
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFF13161F),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white12, width: 1.5),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(19),
        child: hasImage
            ? CachedNetworkImage(
                imageUrl: product.imageUrl!,
                fit: BoxFit.contain,
                placeholder: (context, url) => const Center(
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    color: Color(0xFFFF6D00),
                  ),
                ),
                errorWidget: (context, url, error) => _buildImagePlaceholder(),
              )
            : _buildImagePlaceholder(),
      ),
    );
  }

  Widget _buildImagePlaceholder() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          Icons.shopping_bag_outlined,
          size: 64,
          color: Colors.white.withValues(alpha: 0.25),
        ),
        const SizedBox(height: 8),
        Text(
          'Product Photo',
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.4),
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  /// Large price badge card
  Widget _buildPriceCard({
    required String title,
    required String price,
    required String subtitle,
    required Gradient gradient,
    required IconData icon,
  }) {
    return Container(
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(icon, color: Colors.white70, size: 16),
                    const SizedBox(width: 6),
                    Text(
                      title,
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                // HUGE PRICE FONT
                Text(
                  price,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 42,
                    fontWeight: FontWeight.w900,
                    height: 1.1,
                    letterSpacing: -1,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: Colors.white, size: 28),
          ),
        ],
      ),
    );
  }

  /// MRP and savings card
  Widget _buildMrpAndSavingsCard() {
    final savings = product.savingsAmount;
    final percentage = savings != null && product.mrp! > 0
        ? ((savings / product.mrp!) * 100).round()
        : null;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF2A2E3D),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              const Text(
                'MRP: ',
                style: TextStyle(
                  color: Colors.white60,
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                product.formattedMrp ?? '',
                style: const TextStyle(
                  color: Colors.white60,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  decoration: TextDecoration.lineThrough,
                  decorationColor: Colors.redAccent,
                  decorationThickness: 2,
                ),
              ),
            ],
          ),
          if (savings != null && savings > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFFF6D00).withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: const Color(0xFFFF6D00).withValues(alpha: 0.5),
                ),
              ),
              child: Text(
                'बचत: ₹${savings.toInt()} (${percentage ?? 0}%)',
                style: const TextStyle(
                  color: Color(0xFFFFAB40),
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
