class CategoryModel {
  final String id;
  final String shopId;
  final String name;
  final String? imageUrl;
  final bool isActive;

  CategoryModel({
    required this.id,
    required this.shopId,
    required this.name,
    this.imageUrl,
    this.isActive = true,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['id'] as String,
      shopId: json['shop_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      imageUrl: json['image_url'] as String?,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}

class UnitModel {
  final String id;
  final String shopId;
  final String name;
  final double conversionFactor;

  UnitModel({
    required this.id,
    required this.shopId,
    required this.name,
    this.conversionFactor = 1.0,
  });

  factory UnitModel.fromJson(Map<String, dynamic> json) {
    return UnitModel(
      id: json['id'] as String,
      shopId: json['shop_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      conversionFactor: (json['conversion_factor'] as num?)?.toDouble() ?? 1.0,
    );
  }
}

class SupplierModel {
  final String id;
  final String shopId;
  final String name;
  final String? phone;
  final String? address;

  SupplierModel({
    required this.id,
    required this.shopId,
    required this.name,
    this.phone,
    this.address,
  });

  factory SupplierModel.fromJson(Map<String, dynamic> json) {
    return SupplierModel(
      id: json['id'] as String,
      shopId: json['shop_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      phone: json['phone'] as String?,
      address: json['address'] as String?,
    );
  }
}

