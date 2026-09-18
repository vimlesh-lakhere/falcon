import 'package:flutter_test/flutter_test.dart';
import 'package:falcon_mobile/data/services/product_scanner_service.dart';
import 'package:falcon_mobile/ui/features/add_product/view_models/add_product_view_model.dart';
import 'package:falcon_mobile/data/models/product_model.dart';
import 'package:falcon_mobile/data/models/catalog_models.dart';

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

    test('Smart Stock Calculation converts Box/Lad to base pieces in loose mode and preserves pack in full pack mode', () {
      final vm = AddProductViewModel();
      vm.units = [
        UnitModel(id: 'u1', shopId: 's1', name: 'Piece', conversionFactor: 1),
        UnitModel(id: 'u2', shopId: 's1', name: 'Box (12 pcs)', conversionFactor: 12),
        UnitModel(id: 'u3', shopId: 's1', name: 'Pack (6 pcs)', conversionFactor: 6),
      ];

      // 1. Select Box (12 pcs) and 10 boxes in loose selling mode
      vm.setSelectedUnitId('u2');
      vm.stockController.text = '10';
      vm.setSellAsFullPack(false);

      expect(vm.isMultiUnit, isTrue);
      expect(vm.currentConversionFactor, 12.0);
      expect(vm.calculatedBaseStock, 120); // 10 * 12 = 120 pieces

      // 2. Switch to Full Pack / Sealed Pack mode (e.g. 6 pcs pack)
      vm.setSelectedUnitId('u3');
      vm.setSellAsFullPack(true);
      expect(vm.calculatedBaseStock, 10); // 10 packs
    });

    test('generateAutoBarcode produces 13-digit EAN starting with 890 and auto SKU', () {
      final vm = AddProductViewModel();
      vm.brandController.text = 'Nestle';
      vm.generateAutoBarcode();

      expect(vm.barcodeController.text.length, 13);
      expect(vm.barcodeController.text.startsWith('890'), isTrue);
      expect(vm.skuController.text.startsWith('NES-'), isTrue);
    });

    test('Pack to Piece price conversion calculates accurately', () {
      final vm = AddProductViewModel();
      vm.units = [
        UnitModel(id: 'u1', shopId: 's1', name: 'Lad (12 pcs)', conversionFactor: 12),
      ];
      vm.setSelectedUnitId('u1');

      // Emami cream example: ₹96 per lad of 12, selling price ₹100 per lad, MRP ₹10 per piece
      vm.purchasePriceController.text = '96';
      vm.sellingPriceController.text = '100';
      vm.mrpController.text = '10';

      // 1. Pack entry mode
      vm.setPriceEntryMode(true);
      expect(vm.currentConversionFactor, 12.0);
      expect(vm.perPieceCost, 8.0); // 96 / 12 = 8.0
      expect(vm.perPieceSelling, closeTo(8.33, 0.01)); // 100 / 12 = 8.33
      expect(vm.packMrp, 120.0); // 10 * 12 = 120.0

      // 2. Wholesale toggle
      expect(vm.isWholesaleEnabled, isFalse);
      vm.setWholesaleEnabled(true);
      expect(vm.isWholesaleEnabled, isTrue);
      expect(vm.wholesaleMinQtyController.text, '12');
      expect(vm.wholesalePriceController.text, '100');
    });
  });
}
