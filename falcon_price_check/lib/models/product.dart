class Product {
  final String id;
  final String name;
  final String? nameHindi;
  final String? barcode;
  final String? brand;
  final double sellingPrice;
  final double? wholesalePrice;
  final double? wholesaleMinQty;
  final double? mrp;
  final double? purchasePrice;
  final String? imageUrl;
  final int currentStock;
  final String priceBasis;
  final bool isActive;
  final String? createdAt;

  Product({
    required this.id,
    required this.name,
    this.nameHindi,
    this.barcode,
    this.brand,
    required this.sellingPrice,
    this.wholesalePrice,
    this.wholesaleMinQty,
    this.mrp,
    this.purchasePrice,
    this.imageUrl,
    this.currentStock = 0,
    this.priceBasis = 'piece',
    this.isActive = true,
    this.createdAt,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      nameHindi: json['name_hindi']?.toString(),
      barcode: json['barcode']?.toString().trim(),
      brand: json['brand']?.toString(),
      sellingPrice: (json['selling_price'] as num?)?.toDouble() ?? 0.0,
      wholesalePrice: (json['wholesale_price'] as num?)?.toDouble(),
      wholesaleMinQty: (json['wholesale_min_qty'] as num?)?.toDouble(),
      mrp: (json['mrp'] as num?)?.toDouble(),
      purchasePrice: (json['purchase_price'] as num?)?.toDouble(),
      imageUrl: json['image_url']?.toString(),
      currentStock: (json['current_stock'] as num?)?.toInt() ?? 0,
      priceBasis: json['price_basis']?.toString() ?? 'piece',
      isActive: json['is_active'] == null ? true : (json['is_active'] as bool),
      createdAt: json['created_at']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'name_hindi': nameHindi,
      'barcode': barcode,
      'brand': brand,
      'selling_price': sellingPrice,
      'wholesale_price': wholesalePrice,
      'wholesale_min_qty': wholesaleMinQty,
      'mrp': mrp,
      'purchase_price': purchasePrice,
      'image_url': imageUrl,
      'current_stock': currentStock,
      'price_basis': priceBasis,
      'is_active': isActive,
      'created_at': createdAt,
    };
  }

  /// Whether this product matches a search query
  bool matches(String query) {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return true;

    if (barcode != null && barcode!.toLowerCase().contains(q)) return true;
    if (name.toLowerCase().contains(q)) return true;
    if (nameHindi != null && nameHindi!.toLowerCase().contains(q)) return true;
    if (brand != null && brand!.toLowerCase().contains(q)) return true;

    return false;
  }

  /// Formatted selling price
  String get formattedSellingPrice {
    if (sellingPrice == sellingPrice.roundToDouble()) {
      return '₹${sellingPrice.toInt()}';
    }
    return '₹${sellingPrice.toStringAsFixed(2)}';
  }

  /// Formatted wholesale price
  String get formattedWholesalePrice {
    if (wholesalePrice == null || wholesalePrice! <= 0) {
      return 'N/A';
    }
    if (wholesalePrice! == wholesalePrice!.roundToDouble()) {
      return '₹${wholesalePrice!.toInt()}';
    }
    return '₹${wholesalePrice!.toStringAsFixed(2)}';
  }

  /// Wholesale quantity text
  String get wholesaleQtyText {
    final qty = wholesaleMinQty != null && wholesaleMinQty! > 0
        ? (wholesaleMinQty! == wholesaleMinQty!.roundToDouble()
            ? '${wholesaleMinQty!.toInt()}'
            : '$wholesaleMinQty')
        : '12';
    final basis = priceBasis == 'pack' ? 'Packs' : 'Pcs';
    return 'Min $qty $basis';
  }

  /// MRP formatted
  String? get formattedMrp {
    if (mrp == null || mrp! <= 0) return null;
    if (mrp! == mrp!.roundToDouble()) {
      return '₹${mrp!.toInt()}';
    }
    return '₹${mrp!.toStringAsFixed(2)}';
  }

  /// Calculate savings against MRP
  double? get savingsAmount {
    if (mrp != null && mrp! > sellingPrice) {
      return mrp! - sellingPrice;
    }
    return null;
  }
}
