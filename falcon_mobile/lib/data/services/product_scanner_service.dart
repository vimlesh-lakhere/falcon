import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../config/constants.dart';

class ScannedProductInfo {
  final String nameEnglish;
  final String nameHindi;
  final String? brand;
  final double? mrp;
  final double? purchasePrice;
  final double? sellingPrice;
  final double? wholesalePrice;
  final String? categoryName;
  final String? netWeight;
  final String? barcode;
  final String? description;
  final String source; // "gemini" | "openfoodfacts" | "mlkit"

  ScannedProductInfo({
    required this.nameEnglish,
    required this.nameHindi,
    this.brand,
    this.mrp,
    this.purchasePrice,
    this.sellingPrice,
    this.wholesalePrice,
    this.categoryName,
    this.netWeight,
    this.barcode,
    this.description,
    this.source = 'gemini',
  });
}

class ProductScannerService {
  static final TextRecognizer _textRecognizer =
      TextRecognizer(script: TextRecognitionScript.latin);

  // ───────────────────────────────────────────────────────────────────────────
  // 1. GEMINI KEY STORAGE & VALIDATION
  // ───────────────────────────────────────────────────────────────────────────

  /// Retrieve saved Google Gemini API Key from SharedPreferences
  static Future<String> getSavedGeminiKey() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(AppConstants.prefKeyGeminiApiKey)?.trim() ?? '';
    } catch (_) {
      return '';
    }
  }

  /// Save Google Gemini API Key to SharedPreferences
  static Future<void> saveGeminiKey(String key) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(AppConstants.prefKeyGeminiApiKey, key.trim());
    } catch (_) {}
  }

  /// Ping Google Gemini API to test if the provided key is valid
  static Future<bool> testGeminiKey(String key) async {
    final cleanKey = key.trim();
    if (cleanKey.isEmpty) return false;

    for (final model in AppConstants.geminiFallbackModels) {
      try {
        final url = Uri.parse(
          'https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$cleanKey',
        );
        final response = await http
            .post(
              url,
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode({
                'contents': [
                  {
                    'parts': [
                      {'text': 'ping'}
                    ]
                  }
                ]
              }),
            )
            .timeout(const Duration(seconds: 5));

        if (response.statusCode == 200) {
          return true;
        } else if (response.statusCode == 400 || response.statusCode == 403) {
          final err = jsonDecode(response.body);
          final msg = err['error']?['message'] ?? '';
          if (msg.contains('API key not valid') || msg.contains('API_KEY_INVALID')) {
            return false;
          }
        }
      } catch (_) {
        // Try next model fallback
      }
    }
    return false;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. MULTI-IMAGE GEMINI VISION SCAN (FRONT + OPTIONAL BACK)
  // ───────────────────────────────────────────────────────────────────────────

  /// Scans product packaging with Google Gemini Vision AI using Front and Back photos
  static Future<ScannedProductInfo?> scanWithGeminiVision({
    required Uint8List frontBytes,
    Uint8List? backBytes,
    String? overrideKey,
  }) async {
    final apiKey = (overrideKey != null && overrideKey.trim().isNotEmpty)
        ? overrideKey.trim()
        : await getSavedGeminiKey();

    if (apiKey.isEmpty) {
      debugPrint('[ProductScannerService] No Gemini API Key configured.');
      return null;
    }

    final frontBase64 = base64Encode(frontBytes);
    final String? backBase64 = backBytes != null ? base64Encode(backBytes) : null;

    final parts = <Map<String, dynamic>>[];

    // System instruction & prompt
    parts.add({
      'text': '''
You are an expert Indian Retail & E-commerce Product Catalog Specialist.
Analyze the attached product packaging photo(s).
${backBase64 != null ? "Image 1 is the FRONT hero shot (brand, product title). Image 2 is the BACK label (MRP stamp, net weight/volume, ingredients, description, manufacturer, barcode)." : "The image shows the product packaging."}

Extract all details accurately:
1. "product_name": Full accurate product title including brand and size/weight (e.g. "Boro Neem Prickly Heat Powder 150g", "Parachute 100% Pure Coconut Oil 100ml", "Dettol Original Soap 75g").
2. "hindi_name": Accurately translate/transliterate product title into Hindi (e.g. "बोरो नीम प्रिकली हीट पाउडर 150g", "पैराशूट कोकोनट ऑयल 100ml").
3. "brand": Brand or manufacturer name (e.g. "Boro Neem", "Parachute", "Dettol", "Amul", "Patanjali", "Tata").
4. "category_name": Best match from: "Personal Care", "Skin Care", "Hair Care", "Oral Care", "Groceries", "Beverages", "Snacks", "Health & Wellness", "Household", "General".
5. "net_weight": Weight or volume with unit (e.g. "150g", "100ml", "1kg", "500ml").
6. "mrp": Numeric MRP printed on packaging (search near neck, cap, bottom rim, back label or price stamp). If not visible, estimate typical Indian retail MRP.
7. "suggested_purchase_price": Approximate retailer cost price (~72% to 75% of MRP).
8. "suggested_retail_price": Selling price (same as MRP or slight discount).
9. "suggested_wholesale_price": Wholesale price (~85% to 88% of MRP).
10. "short_description": 1-2 sentence clean description highlighting key ingredients, formulation or benefits from the back label.
11. "barcode": 13-digit EAN barcode if visible on packaging, else null.

Return ONLY a valid raw JSON object (without markdown code blocks, backticks, or extra text):
{
  "product_name": "...",
  "hindi_name": "...",
  "brand": "...",
  "category_name": "...",
  "net_weight": "...",
  "mrp": 100,
  "suggested_purchase_price": 75,
  "suggested_retail_price": 100,
  "suggested_wholesale_price": 88,
  "short_description": "...",
  "barcode": null
}
'''
    });

    // Front image
    parts.add({
      'inline_data': {
        'mime_type': 'image/jpeg',
        'data': frontBase64,
      }
    });

    // Optional back image
    if (backBase64 != null) {
      parts.add({
        'inline_data': {
          'mime_type': 'image/jpeg',
          'data': backBase64,
        }
      });
    }

    // Try models with fallback
    for (final model in AppConstants.geminiFallbackModels) {
      try {
        final url = Uri.parse(
          'https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey',
        );

        final response = await http
            .post(
              url,
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode({
                'contents': [
                  {'parts': parts}
                ],
                'generationConfig': {
                  'temperature': 0.15,
                  'response_mime_type': 'application/json',
                },
              }),
            )
            .timeout(const Duration(seconds: 15));

        if (response.statusCode == 200) {
          final resJson = jsonDecode(response.body);
          final candidates = resJson['candidates'] as List?;
          if (candidates != null && candidates.isNotEmpty) {
            final contentParts =
                candidates[0]['content']?['parts'] as List?;
            if (contentParts != null && contentParts.isNotEmpty) {
              final rawText = contentParts[0]['text']?.toString() ?? '';
              final cleanText = rawText
                  .replaceAll('```json', '')
                  .replaceAll('```', '')
                  .trim();

              final data = jsonDecode(cleanText) as Map<String, dynamic>;

              final nameEn = (data['product_name'] ?? '').toString().trim();
              if (nameEn.isNotEmpty) {
                final mrpVal = (data['mrp'] as num?)?.toDouble();
                final purchasePrice = (data['suggested_purchase_price'] as num?)?.toDouble();
                final sellingPrice = (data['suggested_retail_price'] as num?)?.toDouble() ?? mrpVal;
                final wholesalePrice = (data['suggested_wholesale_price'] as num?)?.toDouble();

                return ScannedProductInfo(
                  nameEnglish: _cleanTitle(nameEn),
                  nameHindi: (data['hindi_name'] ?? '').toString().trim(),
                  brand: (data['brand'] ?? '').toString().trim().isNotEmpty
                      ? _cleanTitle(data['brand'].toString().trim())
                      : null,
                  mrp: mrpVal,
                  purchasePrice: purchasePrice,
                  sellingPrice: sellingPrice,
                  wholesalePrice: wholesalePrice,
                  categoryName: (data['category_name'] ?? '').toString().trim(),
                  netWeight: (data['net_weight'] ?? '').toString().trim(),
                  barcode: (data['barcode'] ?? '').toString().trim().isNotEmpty
                      ? data['barcode'].toString().trim()
                      : null,
                  description: (data['short_description'] ?? '').toString().trim(),
                  source: 'gemini',
                );
              }
            }
          }
        }
      } catch (e) {
        debugPrint('[ProductScannerService] Gemini $model failed: $e');
      }
    }

    return null;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. OPEN FOOD FACTS REVERSE LOOKUP (FREE INDIAN BARCODE DATABASE)
  // ───────────────────────────────────────────────────────────────────────────

  /// Fast reverse lookup by barcode from OpenFoodFacts
  static Future<ScannedProductInfo?> lookupOpenFoodFacts(String barcode) async {
    final clean = barcode.trim();
    if (clean.length < 8) return null;

    try {
      final url = Uri.parse('${AppConstants.openFoodFactsApiUrl}/$clean.json');
      final res = await http.get(url).timeout(const Duration(milliseconds: 2500));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['status'] == 1 && data['product'] != null) {
          final p = data['product'];
          final name = (p['product_name'] ?? p['product_name_en'] ?? '').toString().trim();
          final brand = (p['brands'] ?? '').toString().trim();
          final weight = (p['quantity'] ?? '').toString().trim();

          if (name.isNotEmpty) {
            String fullTitle = brand.isNotEmpty && !name.toLowerCase().contains(brand.toLowerCase())
                ? '$brand $name'
                : name;
            if (weight.isNotEmpty && !fullTitle.toLowerCase().contains(weight.toLowerCase())) {
              fullTitle = '$fullTitle $weight';
            }

            final hindiName = await transliterateToHindi(fullTitle);

            return ScannedProductInfo(
              nameEnglish: _cleanTitle(fullTitle),
              nameHindi: hindiName,
              brand: brand.isNotEmpty ? _cleanTitle(brand) : null,
              barcode: clean,
              netWeight: weight.isNotEmpty ? weight : null,
              source: 'openfoodfacts',
            );
          }
        }
      }
    } catch (e) {
      debugPrint('[ProductScannerService] OpenFoodFacts lookup notice: $e');
    }
    return null;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. ON-DEVICE GOOGLE ML KIT (OFFLINE FALLBACK)
  // ───────────────────────────────────────────────────────────────────────────

  // FMCG & Retail Hindi Transliteration Presets
  static const Map<String, String> _phoneticPresets = {
    'maggi': 'मैगी',
    'noodles': 'नूडल्स',
    'parachute': 'पैराशूट',
    'oil': 'ऑयल',
    'coconut': 'कोकोनट',
    'tel': 'तेल',
    'dettol': 'डेटॉल',
    'soap': 'साबुन',
    'cream': 'क्रीम',
    'shampoo': 'शैम्पू',
    'powder': 'पाउडर',
    'toothpaste': 'टूथपेस्ट',
    'colgate': 'कोलगेट',
    'patanjali': 'पतंजलि',
    'dant': 'दंत',
    'kanti': 'कांति',
    'pepsodent': 'पेप्सोडेंट',
    'close': 'क्लोज',
    'closeup': 'क्लोजअप',
    'dove': 'डव',
    'lux': 'लक्स',
    'lifebuoy': 'लाइफबॉय',
    'cinthol': 'सिंथोल',
    'santoor': 'संतूर',
    'himalaya': 'हिमालय',
    'ponds': 'पॉन्ड्स',
    'nivea': 'निविया',
    'vaseline': 'वेसलीन',
    'amul': 'अमुल',
    'butter': 'बटर',
    'ghee': 'घी',
    'milk': 'दूध',
    'paneer': 'पनीर',
    'britannia': 'ब्रिटानिया',
    'good': 'गुड',
    'day': 'डे',
    'biscuit': 'बिस्कुट',
    'marie': 'मैरी',
    'gold': 'गोल्ड',
    'parle': 'पारले',
    'parle-g': 'पारले-जी',
    'lays': 'लेज',
    'chips': 'चिप्स',
    'kurkure': 'कुरकुरे',
    'fortune': 'फॉर्च्यून',
    'sunflower': 'सनफ्लावर',
    'mustard': 'सरसों',
    'tata': 'टाटा',
    'salt': 'नमक',
    'tea': 'चाय',
    'chai': 'चाय',
    'surf': 'सर्फ',
    'excel': 'एक्सेल',
    'tide': 'टाइड',
    'ariel': 'एरियल',
    'wheel': 'व्हील',
    'rin': 'रिन',
    'vim': 'विम',
    'bar': 'बार',
    'harpic': 'हार्पिक',
    'lizol': 'लाइसोल',
    'colin': 'कोलिन',
    'allout': 'ऑलआउट',
    'goodknight': 'गुडनाइट',
    'hit': 'हिट',
    'moov': 'मूव',
    'iodex': 'आयोडिक्स',
    'vicks': 'विकस',
    'eno': 'ईनो',
    'hajmola': 'हाजमोला',
    'frooti': 'फ्रूटी',
    'maaza': 'माज़ा',
    'slice': 'स्लाइस',
    'thums': 'थम्स',
    'up': 'अप',
    'coke': 'कोक',
    'pepsi': 'पेप्सी',
    'sprite': 'स्प्राइट',
    'haldiram': 'हल्दीराम',
    'bhujia': 'भुजिया',
    'sev': 'सेव',
    'namkeen': 'नमकीन',
  };

  /// Scans packaging photo using Google ML Kit on-device in ~50ms
  static Future<ScannedProductInfo?> scanPackagingPhoto(String imagePath) async {
    try {
      final inputImage = InputImage.fromFilePath(imagePath);
      final RecognizedText recognizedText = await _textRecognizer.processImage(inputImage);

      final blocks = recognizedText.blocks;
      if (blocks.isEmpty) return null;

      final List<String> lines = [];
      for (final block in blocks) {
        for (final line in block.lines) {
          final txt = line.text.trim();
          if (txt.length >= 2) {
            lines.add(txt);
          }
        }
      }

      if (lines.isEmpty) return null;

      // 1. Identify Brand
      String? detectedBrand;
      for (final line in lines) {
        final lower = line.toLowerCase();
        for (final b in _phoneticPresets.keys) {
          if (lower.contains(b)) {
            detectedBrand = _capitalize(b);
            break;
          }
        }
        if (detectedBrand != null) break;
      }

      // 2. Identify MRP
      double? detectedMrp;
      final mrpRegex = RegExp(r'(?:mrp|m\.r\.p|rs|inr|₹)\.?\s*[:=]?\s*([0-9]+(?:\.[0-9]{1,2})?)', caseSensitive: false);
      for (final line in lines) {
        final match = mrpRegex.firstMatch(line);
        if (match != null) {
          detectedMrp = double.tryParse(match.group(1) ?? '');
          if (detectedMrp != null && detectedMrp > 0) break;
        }
      }

      // 3. Construct clean Product Title
      final candidateLines = lines.where((l) {
        final lower = l.toLowerCase();
        return !lower.contains('mfg') &&
            !lower.contains('batch') &&
            !lower.contains('best before') &&
            !lower.contains('lic') &&
            !lower.contains('regd') &&
            !lower.contains('fssai') &&
            !lower.contains('customer care') &&
            !lower.contains('email') &&
            !lower.contains('tel:') &&
            !lower.contains('ingredients');
      }).toList();

      String englishName = '';
      if (candidateLines.isNotEmpty) {
        englishName = candidateLines.take(2).join(' ').replaceAll(RegExp(r'\s+'), ' ').trim();
      } else {
        englishName = lines.first;
      }

      // If weight or volume is in lines, append it if not already present
      final weightRegex = RegExp(r'([0-9]+\s*(?:g|gm|kg|ml|l|ltr|pcs|pack))\b', caseSensitive: false);
      for (final line in lines) {
        final match = weightRegex.firstMatch(line);
        if (match != null) {
          final w = match.group(1)!;
          if (!englishName.toLowerCase().contains(w.toLowerCase())) {
            englishName = '$englishName $w';
          }
          break;
        }
      }

      // 4. Auto-generate accurate Hindi Name
      final hindiName = await transliterateToHindi(englishName);

      return ScannedProductInfo(
        nameEnglish: _cleanTitle(englishName),
        nameHindi: hindiName,
        brand: detectedBrand,
        mrp: detectedMrp,
        purchasePrice: detectedMrp != null ? detectedMrp * 0.75 : null,
        sellingPrice: detectedMrp,
        source: 'mlkit',
      );
    } catch (e) {
      debugPrint('Text recognition scan notice: $e');
      return null;
    }
  }

  /// Phonetically transliterates English title to Hindi
  static Future<String> transliterateToHindi(String text) async {
    if (text.trim().isEmpty) return '';

    final words = text.split(RegExp(r'\s+'));
    final List<String> resultWords = [];

    for (final word in words) {
      final clean = word.replaceAll(RegExp(r'[^a-zA-Z0-9-]'), '');
      final lower = clean.toLowerCase();

      // Pass numbers & units directly
      if (RegExp(r'^[0-9]+(g|gm|kg|ml|l|ltr|pc|pcs)?$', caseSensitive: false).hasMatch(word)) {
        resultWords.add(word);
        continue;
      }

      // Check presets
      if (_phoneticPresets.containsKey(lower)) {
        resultWords.add(_phoneticPresets[lower]!);
        continue;
      }

      // Query Google Input Tools
      try {
        final url = Uri.parse(
          'https://inputtools.google.com/request?text=${Uri.encodeComponent(clean)}&itc=hi-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8',
        );
        final res = await http.get(url).timeout(const Duration(milliseconds: 1200));
        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          if (data is List && data.isNotEmpty && data[0] == 'SUCCESS' && data[1] is List) {
            final matches = data[1][0][1];
            if (matches is List && matches.isNotEmpty) {
              resultWords.add(matches[0].toString());
              continue;
            }
          }
        }
      } catch (_) {}

      // Fallback: keep original word
      resultWords.add(word);
    }

    return resultWords.join(' ').trim();
  }

  static String _cleanTitle(String text) {
    return text
        .split(' ')
        .map((w) => w.isNotEmpty ? _capitalize(w) : '')
        .join(' ')
        .trim();
  }

  static String _capitalize(String s) {
    if (s.isEmpty) return s;
    return s[0].toUpperCase() + s.substring(1);
  }
}
