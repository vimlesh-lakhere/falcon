import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'config/constants.dart';
import 'data/services/white_background_service.dart';
import 'ui/core/app_theme.dart';
import 'ui/features/add_product/view_models/add_product_view_model.dart';
import 'ui/features/add_product/views/add_product_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Falcon Supabase Cloud Instance
  await Supabase.initialize(
    url: AppConstants.supabaseUrl,
    publishableKey: AppConstants.supabaseAnonKey,
  );

  // Warm up on-device ML Kit subject segmentation model silently in background
  unawaited(WhiteBackgroundService.warmUp());

  runApp(const FalconMobileApp());
}

class FalconMobileApp extends StatelessWidget {
  const FalconMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => AddProductViewModel()..init(),
        ),
      ],
      child: MaterialApp(
        title: AppConstants.appName,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const AddProductScreen(),
      ),
    );
  }
}
