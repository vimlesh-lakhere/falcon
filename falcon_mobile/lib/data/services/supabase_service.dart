import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../config/constants.dart';
import '../models/product_model.dart';
import '../models/catalog_models.dart';

class SupabaseService {
  final SupabaseClient? _clientInstance;

  SupabaseService({SupabaseClient? client}) : _clientInstance = client;

  SupabaseClient get _client => _clientInstance ?? Supabase.instance.client;
  SupabaseClient get client => _client;

  // 1. Fetch Categories
  Future<List<CategoryModel>> getCategories({String shopId = AppConstants.defaultShopId}) async {
    try {
      final res = await _client
          .from('categories')
          .select()
          .eq('shop_id', shopId)
          .eq('is_active', true)
          .order('name', ascending: true);

      return (res as List)
          .map((item) => CategoryModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      // Fallback: return empty list on network delay
      return [];
    }
  }

  // 2. Fetch Units
  Future<List<UnitModel>> getUnits({String shopId = AppConstants.defaultShopId}) async {
    try {
      final res = await _client
          .from('units')
          .select()
          .eq('shop_id', shopId)
          .order('name', ascending: true);

      return (res as List)
          .map((item) => UnitModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  // 2b. Create New Unit
  Future<UnitModel> createUnit({
    required String name,
    double conversionFactor = 1.0,
    String shopId = AppConstants.defaultShopId,
  }) async {
    final cleanName = name.trim();
    final res = await _client
        .from('units')
        .insert({
          'shop_id': shopId,
          'name': cleanName,
          'conversion_factor': conversionFactor > 0 ? conversionFactor : 1.0,
        })
        .select()
        .single();

    return UnitModel.fromJson(res);
  }

  // 3. Fetch Suppliers
  Future<List<SupplierModel>> getSuppliers({String shopId = AppConstants.defaultShopId}) async {
    try {
      final res = await _client
          .from('suppliers')
          .select()
          .eq('shop_id', shopId)
          .eq('is_active', true)
          .order('name', ascending: true);

      return (res as List)
          .map((item) => SupplierModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  // 3b. Create New Supplier
  Future<SupplierModel> createSupplier({
    required String name,
    String? phone,
    String? address,
    String shopId = AppConstants.defaultShopId,
  }) async {
    final cleanName = name.trim();
    final cleanPhone = phone?.trim();
    final cleanAddress = address?.trim();

    final payload = <String, dynamic>{
      'shop_id': shopId,
      'name': cleanName,
      'is_active': true,
    };
    if (cleanPhone != null && cleanPhone.isNotEmpty) {
      payload['phone'] = cleanPhone;
    }
    if (cleanAddress != null && cleanAddress.isNotEmpty) {
      payload['address'] = cleanAddress;
    }

    final res = await _client
        .from('suppliers')
        .insert(payload)
        .select()
        .single();

    return SupplierModel.fromJson(res);
  }


  // 4. Quick Barcode Lookup
  Future<ProductModel?> findProductByBarcode(String barcode, {String shopId = AppConstants.defaultShopId}) async {
    try {
      final cleanBarcode = barcode.trim();
      if (cleanBarcode.isEmpty) return null;

      final res = await _client
          .from('products')
          .select()
          .eq('shop_id', shopId)
          .eq('barcode', cleanBarcode)
          .maybeSingle();

      if (res != null) {
        return ProductModel.fromJson(res);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // 4b. Search Products by Name, Hindi Name or Brand (Live Auto-Suggest)
  Future<List<ProductModel>> searchProductsByName(
    String query, {
    String shopId = AppConstants.defaultShopId,
    int limit = 8,
  }) async {
    try {
      final clean = query.trim();
      if (clean.length < 2) return [];

      final res = await _client
          .from('products')
          .select()
          .eq('shop_id', shopId)
          .or('name.ilike.%$clean%,name_hindi.ilike.%$clean%,brand.ilike.%$clean%')
          .order('name', ascending: true)
          .limit(limit);

      return (res as List)
          .map((item) => ProductModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('[SupabaseService] Search by name error: $e');
      return [];
    }
  }

  // 5. Upload Compressed Product Image directly to 'products' Storage Bucket
  Future<String?> uploadProductImage({
    required Uint8List bytes,
    String? extension = 'jpg',
    String? prefix = 'prod_mobile',
  }) async {
    try {
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final rand = Random().nextInt(999999).toString().padLeft(6, '0');
      final fileName = '${prefix}_${timestamp}_$rand.$extension';
      final mimeType = extension == 'webp' ? 'image/webp' : 'image/jpeg';

      await _client.storage
          .from(AppConstants.productsStorageBucket)
          .uploadBinary(
            fileName,
            bytes,
            fileOptions: FileOptions(
              contentType: mimeType,
              upsert: true,
              cacheControl: '31536000',
            ),
          );

      final publicUrl = _client.storage
          .from(AppConstants.productsStorageBucket)
          .getPublicUrl(fileName);

      return publicUrl;
    } catch (e) {
      // Return null if upload failed
      return null;
    }
  }

  // 6. Insert Product with Fallback handling
  Future<ProductModel> addProduct(ProductModel product) async {
    final payload = product.toInsertJson();

    try {
      final res = await _client
          .from('products')
          .insert(payload)
          .select()
          .single();

      return ProductModel.fromJson(res);
    } catch (err) {
      final errMsg = err.toString();
      // Handle schema differences if is_online, online_price or back_image_url do not exist
      if (errMsg.contains('is_online') || errMsg.contains('online_price') || errMsg.contains('back_image_url')) {
        payload.remove('is_online');
        payload.remove('online_price');
        payload.remove('back_image_url');

        final fallbackRes = await _client
            .from('products')
            .insert(payload)
            .select()
            .single();

        return ProductModel.fromJson(fallbackRes);
      }
      rethrow;
    }
  }

  // 7. Update Existing Product with Schema Fallback
  Future<ProductModel> updateProduct(String id, Map<String, dynamic> updates) async {
    final payload = Map<String, dynamic>.from(updates);

    try {
      final res = await _client
          .from('products')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

      return ProductModel.fromJson(res);
    } catch (err) {
      final errMsg = err.toString();
      // Handle schema differences if is_online, online_price or back_image_url do not exist
      if (errMsg.contains('is_online') || errMsg.contains('online_price') || errMsg.contains('back_image_url')) {
        payload.remove('is_online');
        payload.remove('online_price');
        payload.remove('back_image_url');

        final fallbackRes = await _client
            .from('products')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        return ProductModel.fromJson(fallbackRes);
      }
      rethrow;
    }
  }

  // 8. Fetch Recent Added Products
  Future<List<ProductModel>> getRecentProducts({
    String shopId = AppConstants.defaultShopId,
    int limit = 10,
  }) async {
    try {
      final res = await _client
          .from('products')
          .select()
          .eq('shop_id', shopId)
          .order('created_at', ascending: false)
          .limit(limit);
      return (res as List)
          .map((item) => ProductModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  // 9. Quick Add Stock to an existing product
  Future<ProductModel> quickAddStock(String id, int currentStock, int addQuantity) async {
    final newStock = currentStock + addQuantity;
    return await updateProduct(id, {'current_stock': newStock});
  }

  // 10. Update Product Image URL
  Future<ProductModel> updateProductImage(String id, String imageUrl) async {
    return await updateProduct(id, {'image_url': imageUrl});
  }
}

