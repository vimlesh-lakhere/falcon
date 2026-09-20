import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'config/constants.dart';
import 'data/services/white_background_service.dart';
import 'data/services/session_service.dart';
import 'ui/core/app_theme.dart';
import 'ui/features/add_product/view_models/add_product_view_model.dart';
import 'ui/features/add_product/views/add_product_screen.dart';
import 'ui/features/auth/login_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Falcon Supabase Cloud Instance
  await Supabase.initialize(
    url: AppConstants.supabaseUrl,
    publishableKey: AppConstants.supabaseAnonKey,
  );

  // Restore a persisted owner session (and their shop) before the first frame.
  await SessionService.instance.restore();

  // Warm up on-device ML Kit subject segmentation model silently in background
  unawaited(WhiteBackgroundService.warmUp());

  runApp(const FalconMobileApp());
}

class FalconMobileApp extends StatelessWidget {
  const FalconMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<SessionService>.value(
      value: SessionService.instance,
      child: MaterialApp(
        title: AppConstants.appName,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const _AuthGate(),
      ),
    );
  }
}

/// Shows the login screen until the owner signs in, then the add-product screen for their shop.
class _AuthGate extends StatelessWidget {
  const _AuthGate();

  @override
  Widget build(BuildContext context) {
    final session = context.watch<SessionService>();

    if (!session.isReady) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (!session.isLoggedIn) {
      return const LoginScreen();
    }

    // Create the add-product view model only after login, keyed by shop so a different
    // login rebuilds it with the right catalog.
    return ChangeNotifierProvider(
      key: ValueKey(session.shopId),
      create: (_) => AddProductViewModel()..init(),
      child: const AddProductScreen(),
    );
  }
}
