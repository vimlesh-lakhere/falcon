import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import 'package:falcon_mobile/data/services/white_background_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('WhiteBackgroundService produces pure #FFFFFF 1080x1080 canvas', () async {
    // 1. Create a dummy test image with a circular product and transparent background
    final testPng = img.Image(width: 400, height: 400, numChannels: 4);
    img.fill(testPng, color: img.ColorRgba8(0, 0, 0, 0)); // transparent background
    img.fillCircle(testPng, x: 200, y: 200, radius: 150, color: img.ColorRgba8(220, 50, 50, 255)); // red circular product

    final pngBytes = Uint8List.fromList(img.encodePng(testPng));

    // 2. Process through WhiteBackgroundService
    final whiteJpgBytes = await WhiteBackgroundService.makeBackgroundPureWhite(
      inputBytes: pngBytes,
    );

    expect(whiteJpgBytes, isNotNull);
    expect(whiteJpgBytes.isNotEmpty, isTrue);

    // 3. Decode and verify dimensions and pure white background
    final outputImg = img.decodeImage(whiteJpgBytes);
    expect(outputImg, isNotNull);
    expect(outputImg!.width, 1080);
    expect(outputImg.height, 1080);

    // Verify corners are pure #FFFFFF (within JPEG compression tolerance 250-255)
    final cornerTopLeft = outputImg.getPixel(10, 10);
    expect(cornerTopLeft.r, greaterThanOrEqualTo(250));
    expect(cornerTopLeft.g, greaterThanOrEqualTo(250));
    expect(cornerTopLeft.b, greaterThanOrEqualTo(250));

    final cornerTopRight = outputImg.getPixel(1070, 10);
    expect(cornerTopRight.r, greaterThanOrEqualTo(250));
    expect(cornerTopRight.g, greaterThanOrEqualTo(250));
    expect(cornerTopRight.b, greaterThanOrEqualTo(250));
  });
}
