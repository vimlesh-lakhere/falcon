import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
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

class GeminiKeyTestResult {
  final bool isValid;
  final String message;
  final List<String> availableModels;

  const GeminiKeyTestResult({
    required this.isValid,
    required this.message,
    this.availableModels = const [],
  });
}

class ProductScannerService {
  static final TextRecognizer _textRecognizer =
      TextRecognizer(script: TextRecognitionScript.latin);

  /// Stores last error message returned by Google Gemini API for UI feedback
  static String? lastScanError;

  // ───────────────────────────────────────────────────────────────────────────
  // 1. GEMINI KEY STORAGE & VALIDATION
  // ───────────────────────────────────────────────────────────────────────────

  /// Sanitize Gemini API Key by removing whitespace, quotes, and invisible characters
  static String cleanGeminiKey(String raw) {
    var k = raw.trim();
    if ((k.startsWith('"') && k.endsWith('"')) ||
        (k.startsWith("'") && k.endsWith("'"))) {
      k = k.substring(1, k.length - 1).trim();
    }
    // Remove invisible unicode characters, zero-width spaces, and all whitespaces
    k = k.replaceAll(RegExp(r'[\s\u00A0\u200B-\u200D\uFEFF]'), '');
    return k;
  }

  /// Retrieve saved Google Gemini API Key from SharedPreferences
  static Future<String> getSavedGeminiKey() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(AppConstants.prefKeyGeminiApiKey) ?? '';
      return cleanGeminiKey(raw);
    } catch (_) {
      return '';
    }
  }

  /// Save Google Gemini API Key to SharedPreferences
  static Future<void> saveGeminiKey(String key) async {
    try {
      final clean = cleanGeminiKey(key);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(AppConstants.prefKeyGeminiApiKey, clean);
    } catch (_) {}
  }

  /// Comprehensive test of Google Gemini API Key with detailed error feedback
  static Future<GeminiKeyTestResult> testGeminiKeyDetailed(String key) async {
    final cleanKey = cleanGeminiKey(key);
    if (cleanKey.isEmpty) {
      return const GeminiKeyTestResult(
        isValid: false,
        message: 'API Key is empty. Please paste your key from Google AI Studio.',
      );
    }

    // Step 1: Query Google's official models listing endpoint (fast, authoritative, tests the key itself)
    try {
      final modelsUrl = Uri.parse(
        'https://generativelanguage.googleapis.com/v1beta/models?key=$cleanKey',
      );
      final response = await http.get(modelsUrl).timeout(const Duration(seconds: 12));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        final rawModels = body['models'] as List?;
        final validModels = <String>[];
        if (rawModels != null) {
          for (final m in rawModels) {
            final methods = m['supportedGenerationMethods'] as List?;
            if (methods != null && methods.contains('generateContent')) {
              final name = (m['name'] as String? ?? '').replaceFirst('models/', '');
              if (name.isNotEmpty) validModels.add(name);
            }
          }
        }

        // Key is 100% valid! Auto-save to SharedPreferences
        await saveGeminiKey(cleanKey);

        return GeminiKeyTestResult(
          isValid: true,
          message: '✓ Gemini Key is active & verified! (${validModels.length} models accessible)',
          availableModels: validModels,
        );
      } else if (response.statusCode == 400 || response.statusCode == 403) {
        try {
          final errJson = jsonDecode(response.body);
          final errMsg = errJson['error']?['message']?.toString() ?? '';
          if (errMsg.contains('API key not valid') || errMsg.contains('API_KEY_INVALID')) {
            return const GeminiKeyTestResult(
              isValid: false,
              message: 'Invalid API key. Please copy a fresh key from aistudio.google.com',
            );
          } else if (errMsg.contains('API key expired')) {
            return const GeminiKeyTestResult(
              isValid: false,
              message: 'API key has expired. Please generate a new key.',
            );
          } else if (errMsg.isNotEmpty) {
            return GeminiKeyTestResult(isValid: false, message: 'Google error: $errMsg');
          }
        } catch (_) {}
      }
    } catch (e) {
      debugPrint('[ProductScannerService] Models list check notice: $e');
    }

    // Step 2: Fallback direct ping test using primary model
    for (final model in AppConstants.geminiFallbackModels) {
      try {
        final pingUrl = Uri.parse(
          'https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$cleanKey',
        );
        final response = await http
            .post(
              pingUrl,
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode({
                'contents': [
                  {
                    'parts': [
                      {'text': 'hi'}
                    ]
                  }
                ]
              }),
            )
            .timeout(const Duration(seconds: 10));

        if (response.statusCode == 200) {
          await saveGeminiKey(cleanKey);
          return GeminiKeyTestResult(
            isValid: true,
            message: '✓ Key is active & connected to $model!',
            availableModels: [model],
          );
        } else if (response.statusCode == 400 || response.statusCode == 403) {
          try {
            final err = jsonDecode(response.body);
            final msg = err['error']?['message']?.toString() ?? '';
            if (msg.contains('API key not valid') || msg.contains('API_KEY_INVALID')) {
              return const GeminiKeyTestResult(
                isValid: false,
                message: 'Invalid API key. Please copy a fresh key from aistudio.google.com',
              );
            }
          } catch (_) {}
        }
      } catch (_) {}
    }

    return const GeminiKeyTestResult(
      isValid: false,
      message: 'Could not connect to Google Gemini API. Please check internet connection or key.',
    );
  }

  /// Backward-compatible boolean check
  static Future<bool> testGeminiKey(String key) async {
    final res = await testGeminiKeyDetailed(key);
    return res.isValid;
  }

  /// Optimizes an image byte array to max ~800px / 75 quality (<100KB) for ultra-fast Gemini Vision upload
  static Future<Uint8List> _optimizeImageForAi(Uint8List original) async {
    try {
      if (original.lengthInBytes <= 120 * 1024) return original;
      final compressed = await FlutterImageCompress.compressWithList(
        original,
        minWidth: 800,
        minHeight: 800,
        quality: 75,
        format: CompressFormat.jpeg,
      );
      if (compressed.isNotEmpty && compressed.lengthInBytes < original.lengthInBytes) {
        return compressed;
      }
    } catch (_) {
      // Fallback if platform channels are unavailable
    }
    return original;
  }

  /// Scans product packaging with Google Gemini Vision AI using Front and Back photos
  static Future<ScannedProductInfo?> scanWithGeminiVision({
    required Uint8List frontBytes,
    Uint8List? backBytes,
    String? overrideKey,
  }) async {
    lastScanError = null;

    final rawKey = (overrideKey != null && overrideKey.trim().isNotEmpty)
        ? overrideKey.trim()
        : await getSavedGeminiKey();
    final apiKey = cleanGeminiKey(rawKey);

    if (apiKey.isEmpty) {
      lastScanError = 'No Gemini API Key saved. Please configure in settings.';
      debugPrint('[ProductScannerService] $lastScanError');
      return null;
    }

    // 1. Optimize images for ultra-fast mobile upload (< 100KB each)
    final fastFrontBytes = await _optimizeImageForAi(frontBytes);
    final fastBackBytes = backBytes != null ? await _optimizeImageForAi(backBytes) : null;

    final frontBase64 = base64Encode(fastFrontBytes);
    final String? backBase64 = fastBackBytes != null ? base64Encode(fastBackBytes) : null;

    final parts = <Map<String, dynamic>>[];

    // System prompt tailored for Indian retail packaging
    parts.add({
      'text': '''
You are an expert Indian Retail & E-commerce Product Catalog Specialist.
Analyze the attached product packaging photo(s).
${backBase64 != null ? "Image 1 is FRONT hero shot (brand, product title). Image 2 is BACK label (MRP stamp, net weight/volume, ingredients, description, manufacturer, barcode)." : "The image shows the product packaging."}

Extract all details accurately:
1. "product_name": Full accurate product title including brand and size/weight (e.g. "Get Real 100% Pure Coconut Oil 500ml", "Parachute 100% Pure Coconut Oil 100ml", "Dettol Original Soap 75g").
2. "hindi_name": Accurately translate/transliterate product title into Hindi (e.g. "गेट रियल 100% प्योर कोकोनट ऑयल 500ml", "पैराशूट कोकोनट ऑयल 100ml").
3. "brand": Exact brand name (e.g. "Get Real", "Parachute", "Dettol", "Amul", "Patanjali", "Tata"). Do NOT use product types like "Oil" or "Soap" as brand.
4. "category_name": Best match from: "Hair Care", "Skin Care", "Personal Care", "Oral Care", "Groceries", "Beverages", "Snacks", "Health & Wellness", "Household", "General".
5. "net_weight": Weight or volume with unit (e.g. "500ml", "150g", "100ml", "1kg").
6. "mrp": Numeric MRP printed on packaging (search neck, cap, bottom rim, back label or price stamp). If not visible, estimate typical Indian retail MRP.
7. "suggested_purchase_price": Approximate retailer cost price (~72% to 75% of MRP).
8. "suggested_retail_price": Selling price (same as MRP or slight discount).
9. "suggested_wholesale_price": Wholesale price (~85% to 88% of MRP).
10. "short_description": 1-2 sentence clean description highlighting key ingredients, formulation or benefits from packaging.
11. "barcode": 13-digit EAN barcode if visible on packaging, else null.

Return ONLY a valid raw JSON object:
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

    parts.add({
      'inlineData': {
        'mimeType': 'image/jpeg',
        'data': frontBase64,
      }
    });

    if (backBase64 != null) {
      parts.add({
        'inlineData': {
          'mimeType': 'image/jpeg',
          'data': backBase64,
        }
      });
    }

    final requestPayload = jsonEncode({
      'contents': [
        {
          'role': 'user',
          'parts': parts,
        }
      ],
      'generationConfig': {
        'temperature': 0.15,
        'responseMimeType': 'application/json',
      },
    });

    // Try primary models with fail-fast on auth/format errors
    for (final model in AppConstants.geminiFallbackModels) {
      try {
        final url = Uri.parse(
          'https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey',
        );

        final response = await http
            .post(
              url,
              headers: {'Content-Type': 'application/json'},
              body: requestPayload,
            )
            .timeout(const Duration(seconds: 12));

        if (response.statusCode == 200) {
          final resJson = jsonDecode(response.body);
          final candidates = resJson['candidates'] as List?;
          if (candidates != null && candidates.isNotEmpty) {
            final contentParts = candidates[0]['content']?['parts'] as List?;
            if (contentParts != null && contentParts.isNotEmpty) {
              final rawText = contentParts[0]['text']?.toString() ?? '';
              debugPrint('[ProductScannerService] Gemini $model succeeded! Response: $rawText');

              // Robust JSON substring extraction between first '{' and last '}'
              final startIdx = rawText.indexOf('{');
              final endIdx = rawText.lastIndexOf('}');
              if (startIdx != -1 && endIdx != -1 && endIdx > startIdx) {
                final cleanJson = rawText.substring(startIdx, endIdx + 1);
                final data = jsonDecode(cleanJson) as Map<String, dynamic>;

                final nameEn = (data['product_name'] ?? '').toString().trim();
                if (nameEn.isNotEmpty) {
                  final mrpVal = (data['mrp'] as num?)?.toDouble();
                  final purchasePrice = (data['suggested_purchase_price'] as num?)?.toDouble();
                  final sellingPrice = (data['suggested_retail_price'] as num?)?.toDouble() ?? mrpVal;
                  final wholesalePrice = (data['suggested_wholesale_price'] as num?)?.toDouble();

                  lastScanError = null;
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
        } else {
          final errorBody = response.body;
          debugPrint('[ProductScannerService] Gemini $model HTTP ${response.statusCode}: $errorBody');

          String? errMsg;
          try {
            final errObj = jsonDecode(errorBody);
            errMsg = errObj['error']?['message']?.toString();
          } catch (_) {}

          lastScanError = errMsg ?? 'Google API error HTTP ${response.statusCode}';

          // If invalid key, quota exhaustion, or invalid argument, STOP retrying immediately
          if (response.statusCode == 400 || response.statusCode == 401 || response.statusCode == 403) {
            final lower = (errMsg ?? '').toLowerCase();
            if (lower.contains('api_key_invalid') ||
                lower.contains('api key not valid') ||
                lower.contains('permission_denied') ||
                lower.contains('quota') ||
                lower.contains('resource_exhausted')) {
              break;
            }
          }
        }
      } catch (e) {
        debugPrint('[ProductScannerService] Gemini $model attempt failed: $e');
        lastScanError = e.toString();
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

  /// Verified Indian FMCG Brands (only genuine brands, NOT category nouns like oil, soap, powder)
  static const Set<String> _knownBrands = {
    'get real',
    'parachute',
    'dettol',
    'patanjali',
    'colgate',
    'pepsodent',
    'closeup',
    'dove',
    'lux',
    'lifebuoy',
    'cinthol',
    'santoor',
    'himalaya',
    'ponds',
    'nivea',
    'vaseline',
    'amul',
    'britannia',
    'parle',
    'lays',
    'kurkure',
    'fortune',
    'tata',
    'surf excel',
    'surf',
    'tide',
    'ariel',
    'wheel',
    'rin',
    'vim',
    'harpic',
    'lizol',
    'colin',
    'allout',
    'goodknight',
    'hit',
    'moov',
    'iodex',
    'vicks',
    'eno',
    'hajmola',
    'frooti',
    'maaza',
    'slice',
    'thums up',
    'coke',
    'pepsi',
    'sprite',
    'haldiram',
    'dabur',
    'emami',
    'godrej',
    'marico',
    'itc',
    'nestle',
    'cadbury',
    'horlicks',
    'bournvita',
    'complan',
    'everest',
    'mdh',
    'catch',
    'aashirvaad',
    'saffola',
    'maggi',
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

      // 1. Identify Brand (only genuine FMCG brands, NEVER generic category nouns like oil, soap, etc.)
      String? detectedBrand;
      for (final line in lines) {
        final lower = line.toLowerCase();
        for (final b in _knownBrands) {
          if (lower.contains(b)) {
            detectedBrand = _cleanTitle(b);
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
