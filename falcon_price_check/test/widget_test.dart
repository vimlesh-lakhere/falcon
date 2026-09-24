import 'package:flutter_test/flutter_test.dart';
import 'package:falcon_price_check/models/product.dart';

void main() {
  test('Product model offline barcode and price formatting test', () {
    final product = Product(
      id: 'test-1',
      name: 'Vicco Turmeric Skin Cream 50g',
      nameHindi: 'विक्को टर्मेरिक स्किन क्रीम',
      barcode: '8901246101637',
      sellingPrice: 80.0,
      wholesalePrice: 72.0,
      wholesaleMinQty: 12.0,
      mrp: 100.0,
    );

    expect(product.matches('8901246101637'), isTrue);
    expect(product.matches('vicco'), isTrue);
    expect(product.matches('विक्को'), isTrue);
    expect(product.formattedSellingPrice, '₹80');
    expect(product.formattedWholesalePrice, '₹72');
    expect(product.wholesaleQtyText, 'Min 12 Pcs');
    expect(product.savingsAmount, 20.0);
  });
}
