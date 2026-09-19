-- ALREADY APPLIED to the production "falcon" Supabase project (2026-09-19).
-- Kept here for the record / for rebuilding the database.

-- 1. Trigger functions must not be callable through /rest/v1/rpc by anon/authenticated.
--    Triggers keep firing normally (EXECUTE is only checked when a trigger is created).
REVOKE EXECUTE ON FUNCTION public.auto_confirm_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_customer_totals() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_product_stock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_supplier_balance_on_payment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_email_identity_on_password_set() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_email_provider_on_password_set() FROM PUBLIC, anon, authenticated;

-- 2. Pin search_path so SECURITY DEFINER functions cannot be hijacked via a shadow schema.
ALTER FUNCTION public.auto_confirm_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.current_shop_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.has_permission(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.recompute_customer_totals() SET search_path = public, pg_temp;
ALTER FUNCTION public.recompute_product_stock() SET search_path = public, pg_temp;
ALTER FUNCTION public.recompute_supplier_balance_on_payment() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_email_identity_on_password_set() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_email_provider_on_password_set() SET search_path = public, pg_temp;

-- 3. View must run with the caller's permissions, not the creator's.
ALTER VIEW public.products_for_cashier SET (security_invoker = true);
