import 'package:flutter_test/flutter_test.dart';
import 'package:falcon_mobile/data/models/product_model.dart';

void main() {
  test('ProductModel serialization test', () {
    final product = ProductModel(
      shopId: 'shop-123',
      name: 'Test Product',
      purchasePrice: 40.0,
      sellingPrice: 50.0,
      currentStock: 25,
      barcode: '8901234567890',
    );

    final json = product.toInsertJson();

    expect(json['name'], 'Test Product');
    expect(json['purchase_price'], 40.0);
    expect(json['selling_price'], 50.0);
    expect(json['current_stock'], 25);
    expect(json['barcode'], '8901234567890');
    expect(json['shop_id'], 'shop-123');
  });
}
