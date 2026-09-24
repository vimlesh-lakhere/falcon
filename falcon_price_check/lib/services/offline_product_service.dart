import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/product.dart';

class SyncResult {
  final bool success;
  final int totalCount;
  final int addedCount;
  final int updatedCount;
  final String? errorMessage;

  SyncResult({
    required this.success,
    this.totalCount = 0,
    this.addedCount = 0,
    this.updatedCount = 0,
    this.errorMessage,
  });
}

class OfflineProductService extends ChangeNotifier {
  static final OfflineProductService instance = OfflineProductService._();
  OfflineProductService._();

  static const String _prefProductsKey = 'falcon_offline_products_v2';
  static const String _prefLastSyncKey = 'falcon_last_sync_time';

  // Falcon Supabase credentials
  static const String _supabaseUrl = 'https://knbabffighhuguxsdtzj.supabase.co';
  static const String _supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYmFiZmZpZ2hodWd1eHNkdHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NDI5NzYsImV4cCI6MjEwMjMxODk3Nn0.AEXQwmXuHcv2l4jQklvNe-U-jauTLD4AsTvVjWXlVPA';

  List<Product> _products = [];
  final Map<String, Product> _barcodeMap = {};
  DateTime? _lastSyncTime;
  bool _isSyncing = false;
  bool _isInitialized = false;

  List<Product> get products => _products;
  DateTime? get lastSyncTime => _lastSyncTime;
  bool get isSyncing => _isSyncing;
  bool get isInitialized => _isInitialized;
  int get productCount => _products.length;

  /// Initialize the local offline catalog
  Future<void> init() async {
    if (_isInitialized) return;

    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedJson = prefs.getString(_prefProductsKey);
      final lastSyncMillis = prefs.getInt(_prefLastSyncKey);

      if (lastSyncMillis != null) {
        _lastSyncTime = DateTime.fromMillisecondsSinceEpoch(lastSyncMillis);
      }

      if (cachedJson != null && cachedJson.trim().isNotEmpty) {
        _loadFromJsonString(cachedJson);
      } else {
        // First app launch: load bundled asset
        await _loadFromBundledAsset();
      }
    } catch (e) {
      debugPrint('Error initializing OfflineProductService: $e');
      // Fallback to bundled asset
      await _loadFromBundledAsset();
    }

    _isInitialized = true;
    notifyListeners();
  }

  /// Load initial database from assets/data/products.json
  Future<void> _loadFromBundledAsset() async {
    try {
      final jsonString =
          await rootBundle.loadString('assets/data/products.json');
      _loadFromJsonString(jsonString);

      // Persist to local preferences for offline persistence
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefProductsKey, jsonString);
      _lastSyncTime = DateTime.now();
      await prefs.setInt(
          _prefLastSyncKey, _lastSyncTime!.millisecondsSinceEpoch);
    } catch (e) {
      debugPrint('Error loading bundled products: $e');
    }
  }

  void _loadFromJsonString(String jsonString) {
    try {
      final dynamic decoded = jsonDecode(jsonString);
      if (decoded is List) {
        _products = decoded
            .map((item) => Product.fromJson(item as Map<String, dynamic>))
            .where((p) => p.isActive)
            .toList();
        _rebuildBarcodeIndex();
      }
    } catch (e) {
      debugPrint('Error parsing products JSON: $e');
    }
  }

  void _rebuildBarcodeIndex() {
    _barcodeMap.clear();
    for (final product in _products) {
      if (product.barcode != null && product.barcode!.trim().isNotEmpty) {
        final cleanBarcode = product.barcode!.trim().toLowerCase();
        _barcodeMap[cleanBarcode] = product;
      }
    }
  }

  /// Find product by barcode in O(1) time
  Product? findByBarcode(String rawBarcode) {
    final barcode = rawBarcode.trim().toLowerCase();
    if (barcode.isEmpty) return null;

    // Direct match
    if (_barcodeMap.containsKey(barcode)) {
      return _barcodeMap[barcode];
    }

    // Try without leading zeros
    final trimmedZeros = barcode.replaceFirst(RegExp(r'^0+'), '');
    if (trimmedZeros.isNotEmpty && _barcodeMap.containsKey(trimmedZeros)) {
      return _barcodeMap[trimmedZeros];
    }

    // Fallback: search in list
    for (final p in _products) {
      if (p.barcode != null && p.barcode!.trim().toLowerCase() == barcode) {
        return p;
      }
    }

    return null;
  }

  /// Search products by query
  List<Product> search(String query, {int limit = 50}) {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) {
      return _products.take(limit).toList();
    }

    final exactMatches = <Product>[];
    final containsMatches = <Product>[];

    for (final product in _products) {
      if (product.barcode != null && product.barcode!.toLowerCase() == q) {
        exactMatches.add(product);
      } else if (product.name.toLowerCase().startsWith(q) ||
          (product.nameHindi != null &&
              product.nameHindi!.toLowerCase().startsWith(q))) {
        exactMatches.add(product);
      } else if (product.matches(q)) {
        containsMatches.add(product);
      }
    }

    final results = [...exactMatches, ...containsMatches];
    return results.take(limit).toList();
  }

  /// Sync with Supabase cloud database
  Future<SyncResult> syncWithCloud() async {
    if (_isSyncing) {
      return SyncResult(
        success: false,
        errorMessage: 'Sync is already in progress',
      );
    }

    _isSyncing = true;
    notifyListeners();

    try {
      final endpoint = Uri.parse(
        '$_supabaseUrl/rest/v1/products?select=id,name,name_hindi,barcode,brand,selling_price,wholesale_price,wholesale_min_qty,mrp,purchase_price,image_url,current_stock,price_basis,is_active,created_at&limit=1000&order=name.asc',
      );

      final response = await http.get(
        endpoint,
        headers: {
          'apikey': _supabaseAnonKey,
          'Authorization': 'Bearer $_supabaseAnonKey',
        },
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final List<dynamic> remoteList = jsonDecode(response.body) as List;
        final existingMap = {for (var p in _products) p.id: p};

        int added = 0;
        int updated = 0;

        final List<Product> mergedProducts = [];

        for (final item in remoteList) {
          final newProduct = Product.fromJson(item as Map<String, dynamic>);
          if (!newProduct.isActive) continue;

          if (!existingMap.containsKey(newProduct.id)) {
            added++;
          } else {
            final old = existingMap[newProduct.id]!;
            if (old.sellingPrice != newProduct.sellingPrice ||
                old.wholesalePrice != newProduct.wholesalePrice ||
                old.name != newProduct.name ||
                old.barcode != newProduct.barcode ||
                old.imageUrl != newProduct.imageUrl) {
              updated++;
            }
          }
          mergedProducts.add(newProduct);
        }

        _products = mergedProducts;
        _rebuildBarcodeIndex();

        // Save to SharedPreferences for permanent offline storage
        final prefs = await SharedPreferences.getInstance();
        final jsonToSave =
            jsonEncode(_products.map((p) => p.toJson()).toList());
        await prefs.setString(_prefProductsKey, jsonToSave);

        _lastSyncTime = DateTime.now();
        await prefs.setInt(
            _prefLastSyncKey, _lastSyncTime!.millisecondsSinceEpoch);

        _isSyncing = false;
        notifyListeners();

        return SyncResult(
          success: true,
          totalCount: _products.length,
          addedCount: added,
          updatedCount: updated,
        );
      } else {
        _isSyncing = false;
        notifyListeners();
        return SyncResult(
          success: false,
          errorMessage: 'Server responded with code ${response.statusCode}',
        );
      }
    } catch (e) {
      _isSyncing = false;
      notifyListeners();
      return SyncResult(
        success: false,
        errorMessage: 'Network error: Please check your internet connection',
      );
    }
  }
}
