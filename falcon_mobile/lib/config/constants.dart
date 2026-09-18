class AppConstants {
  static const String appName = 'Falcon Quick Add';
  
  // Falcon Production Supabase Configuration
  static const String supabaseUrl = 'https://knbabffighhuguxsdtzj.supabase.co';
  static const String supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYmFiZmZpZ2hodWd1eHNkdHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NDI5NzYsImV4cCI6MjEwMjMxODk3Nn0.AEXQwmXuHcv2l4jQklvNe-U-jauTLD4AsTvVjWXlVPA';
      
  static const String defaultShopId = 'a0000000-0000-0000-0000-000000000001';
  static const String productsStorageBucket = 'products';

  // Local PC Rembg microservice (danielgatis/rembg U2Net) for Wi-Fi studio cutouts
  static const String defaultRembgHost = '10.55.21.30';
  static const int defaultRembgPort = 7000;
  static const String prefKeyRembgHost = 'falcon_rembg_host';
  static const String prefKeyRembgEnabled = 'falcon_rembg_enabled';

  // Google Gemini AI Configuration
  static const String prefKeyGeminiApiKey = 'falcon_gemini_api_key';
  static const List<String> geminiFallbackModels = [
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro',
  ];

  // OpenFoodFacts Indian FMCG barcode lookup endpoint
  static const String openFoodFactsApiUrl = 'https://world.openfoodfacts.org/api/v2/product';
}

