class ProductModel {
  final String? id;
  final String shopId;
  final String name;
  final String? nameHindi;
  final String? barcode;
  final String? sku;
  final String? brand;
  final String? categoryId;
  final String? unitId;
  final String? supplierId;
  final double purchasePrice;
  final double? mrp;
  final double sellingPrice;
  final double? wholesalePrice;
  final int? wholesaleMinQty;
  final double? minimumSellingPrice;
  final int currentStock;
  final int minimumStock;
  final String? imageUrl;
  final String? backImageUrl;
  final String? description;
  final bool isOnline;
  final double? onlinePrice;
  final bool isActive;
  final DateTime? createdAt;

  ProductModel({
    this.id,
    required this.shopId,
    required this.name,
    this.nameHindi,
    this.barcode,
    this.sku,
    this.brand,
    this.categoryId,
    this.unitId,
    this.supplierId,
    required this.purchasePrice,
    this.mrp,
    required this.sellingPrice,
    this.wholesalePrice,
    this.wholesaleMinQty = 12,
    this.minimumSellingPrice,
    this.currentStock = 10,
    this.minimumStock = 5,
    this.imageUrl,
    this.backImageUrl,
    this.description,
    this.isOnline = true,
    this.onlinePrice,
    this.isActive = true,
    this.createdAt,
  });

  Map<String, dynamic> toInsertJson() {
    final map = <String, dynamic>{
      'shop_id': shopId,
      'name': name.trim(),
      'purchase_price': purchasePrice,
      'selling_price': sellingPrice,
      'current_stock': currentStock,
      'minimum_stock': minimumStock,
      'is_active': isActive,
      'is_online': isOnline,
    };

    if (nameHindi != null && nameHindi!.trim().isNotEmpty) {
      map['name_hindi'] = nameHindi!.trim();
    }
    if (barcode != null && barcode!.trim().isNotEmpty) {
      map['barcode'] = barcode!.trim();
    }
    if (sku != null && sku!.trim().isNotEmpty) {
      map['sku'] = sku!.trim();
    }
    if (brand != null && brand!.trim().isNotEmpty) {
      map['brand'] = brand!.trim();
    }
    if (categoryId != null && categoryId!.isNotEmpty) {
      map['category_id'] = categoryId;
    }
    if (unitId != null && unitId!.isNotEmpty) {
      map['unit_id'] = unitId;
    }
    if (supplierId != null && supplierId!.isNotEmpty) {
      map['supplier_id'] = supplierId;
    }
    if (mrp != null && mrp! > 0) {
      map['mrp'] = mrp;
    }
    if (wholesalePrice != null && wholesalePrice! > 0) {
      map['wholesale_price'] = wholesalePrice;
      map['wholesale_min_qty'] = wholesaleMinQty ?? 12;
    }
    if (minimumSellingPrice != null && minimumSellingPrice! > 0) {
      map['minimum_selling_price'] = minimumSellingPrice;
    }
    if (imageUrl != null && imageUrl!.isNotEmpty) {
      map['image_url'] = imageUrl;
    }
    if (backImageUrl != null && backImageUrl!.isNotEmpty) {
      map['back_image_url'] = backImageUrl;
    }
    if (description != null && description!.trim().isNotEmpty) {
      map['description'] = description!.trim();
    }
    if (onlinePrice != null && onlinePrice! > 0) {
      map['online_price'] = onlinePrice;
    }

    return map;
  }

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    return ProductModel(
      id: json['id'] as String?,
      shopId: json['shop_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      nameHindi: json['name_hindi'] as String?,
      barcode: json['barcode'] as String?,
      sku: json['sku'] as String?,
      brand: json['brand'] as String?,
      categoryId: json['category_id'] as String?,
      unitId: json['unit_id'] as String?,
      supplierId: json['supplier_id'] as String?,
      purchasePrice: (json['purchase_price'] as num?)?.toDouble() ?? 0.0,
      mrp: (json['mrp'] as num?)?.toDouble(),
      sellingPrice: (json['selling_price'] as num?)?.toDouble() ?? 0.0,
      wholesalePrice: (json['wholesale_price'] as num?)?.toDouble(),
      wholesaleMinQty: (json['wholesale_min_qty'] as num?)?.toInt(),
      minimumSellingPrice: (json['minimum_selling_price'] as num?)?.toDouble(),
      currentStock: (json['current_stock'] as num?)?.toInt() ?? 0,
      minimumStock: (json['minimum_stock'] as num?)?.toInt() ?? 0,
      imageUrl: json['image_url'] as String?,
      backImageUrl: json['back_image_url'] as String?,
      description: json['description'] as String?,
      isOnline: json['is_online'] as bool? ?? true,
      onlinePrice: (json['online_price'] as num?)?.toDouble(),
      isActive: json['is_active'] as bool? ?? true,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
    );
  }
}
