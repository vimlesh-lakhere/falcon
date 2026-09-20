import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../config/constants.dart';

/// Holds the signed-in shop owner/staff session and, crucially, the shop id to write to.
///
/// Before this, the app used the anon key with a hard-coded AGS shop id — so it only worked for
/// AGS, let anyone with the APK write to the database, and would break once `products` gets RLS.
/// Now the app signs in as the shop owner, reads their `profiles.store_id`, and every write goes to
/// that shop as the authenticated user (RLS-ready + multi-tenant + secure).
class SessionService extends ChangeNotifier {
  SessionService._();
  static final SessionService instance = SessionService._();

  SupabaseClient get _client => Supabase.instance.client;

  bool _ready = false;
  bool get isReady => _ready; // startup session-restore finished

  // Falls back to AGS only until a profile is loaded; real writes use the signed-in shop.
  String _shopId = AppConstants.defaultShopId;
  String get shopId => _shopId;

  bool _hasShop = false;
  bool get hasShop => _hasShop;

  String? _fullName;
  String? get fullName => _fullName;
  String? _role;
  String? get role => _role;

  bool get isLoggedIn => _client.auth.currentUser != null && _hasShop;

  /// Call once at startup. supabase_flutter persists the session across restarts, so if the owner
  /// already logged in we just reload their shop.
  Future<void> restore() async {
    try {
      if (_client.auth.currentUser != null) {
        await _loadProfile();
      }
    } catch (_) {}
    _ready = true;
    notifyListeners();
  }

  /// Returns null on success, or a human-readable error message.
  Future<String?> signIn(String email, String password) async {
    try {
      final res = await _client.auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );
      if (res.user == null) return 'Login failed. Please try again.';

      final ok = await _loadProfile();
      if (!ok) {
        await _client.auth.signOut();
        return 'This account is not linked to a shop. Please use your Falcon store owner/staff login.';
      }
      notifyListeners();
      return null;
    } on AuthException catch (e) {
      return e.message;
    } catch (_) {
      return 'Could not sign in. Please check your internet and try again.';
    }
  }

  Future<bool> _loadProfile() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return false;

    final row = await _client
        .from('profiles')
        .select('store_id, full_name, role, is_active')
        .eq('id', uid)
        .maybeSingle();

    if (row == null) return false;
    final storeId = row['store_id'] as String?;
    final active = (row['is_active'] as bool?) ?? true;
    if (storeId == null || storeId.isEmpty || !active) return false;

    _shopId = storeId;
    _fullName = row['full_name'] as String?;
    _role = row['role'] as String?;
    _hasShop = true;
    return true;
  }

  Future<void> signOut() async {
    try {
      await _client.auth.signOut();
    } catch (_) {}
    _shopId = AppConstants.defaultShopId;
    _fullName = null;
    _role = null;
    _hasShop = false;
    notifyListeners();
  }
}
