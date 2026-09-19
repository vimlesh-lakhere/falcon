-- UNDO for 010_rls_tranche1_staff_only_tables.sql.
-- Run this in Supabase SQL Editor if any ERP page shows empty data or errors after step 1.
-- It switches protection off for those 12 tables again (data is untouched).

BEGIN;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'audit_log','customer_payments','product_requests','purchase_orders',
    'returns','shifts','supplier_payments',
    'purchase_order_items','return_items','price_history','product_batches','customer_prices'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

COMMIT;
