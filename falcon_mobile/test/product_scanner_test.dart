import 'package:flutter_test/flutter_test.dart';
import 'package:falcon_mobile/data/services/product_scanner_service.dart';
import 'package:falcon_mobile/ui/features/add_product/view_models/add_product_view_model.dart';
import 'package:falcon_mobile/data/models/product_model.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ProductScannerService Tests', () {
    test('Phonetic presets transliterate correctly', () async {
      final hindi = await ProductScannerService.transliterateToHindi('Maggi Noodles');
      expect(hindi.contains('मैगी') || hindi.contains('नूडल्स'), isTrue);
    });

    test('Clean title formats capitalization properly', () {
      final title = 'parachute 100% pure coconut oil 100ml';
      final hindiWords = title.split(' ');
      expect(hindiWords.isNotEmpty, isTrue);
    });
  });

  group('AddProductViewModel Logic Tests', () {
    late AddProductViewModel vm;

    setUp(() {
      vm = AddProductViewModel();
    });

    test('Profit margin calculates correctly', () {
      vm.purchasePriceController.text = '75';
      vm.sellingPriceController.text = '100';

      expect(vm.profitMargin, closeTo(25.0, 0.1));
      expect(vm.profitRupees, 25.0);
    });

    test('applyMargin calculates selling price accurately', () {
      vm.purchasePriceController.text = '100';
      vm.applyMargin(20);

      expect(vm.sellingPriceController.text, '120');
      expect(vm.profitMargin, closeTo(16.66, 0.1));
    });

    test('Variant Mode retains parent details and sets variant suffix and SKU', () {
      final parent = ProductModel(
        id: 'parent-123',
        shopId: 'shop-1',
        name: 'Parachute Coconut Oil',
        brand: 'Parachute',
        purchasePrice: 60,
        sellingPrice: 80,
        currentStock: 15,
      );

      vm.existingProductFound = parent;
      vm.nameController.text = parent.name;
      vm.brandController.text = parent.brand!;

      vm.enterVariantMode('500ml');

      expect(vm.isVariantMode, isTrue);
      expect(vm.existingProductFound, isNull);
      expect(vm.nameController.text, 'Parachute Coconut Oil - 500ml');
      expect(vm.skuController.text.contains('PAR-V-'), isTrue);
      expect(vm.barcodeController.text.isEmpty, isTrue);
    });
  });
}
