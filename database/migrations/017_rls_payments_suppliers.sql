-- PENDING — run in Supabase SQL Editor. Undo any time with 017_rollback_rls_payments_suppliers.sql.
-- Prereq: SUPABASE_SERVICE_ROLE_KEY is already set in Vercel (done for migrations 013/014).
--
-- Locks down payments + suppliers (both currently readable/writable by the anon key):
--   * payments has NO shop_id of its own — scope it via its parent sale (same as sale_items).
--     Signed-in staff see/manage only their own shop's payments; the storefront checkout writes
--     payments through /api/store/checkout (service role, bypasses RLS), so it is unaffected. POS
--     billing runs as the signed-in staff and is allowed because the parent sale is their shop's.
--   * suppliers carries shop_id directly — staff-only tenant isolation (same as customers/sales).
--     The storefront never touches suppliers.
--
-- IMPORTANT: right after running this, make ONE POS bill that tenders a payment (cash/UPI) to
-- confirm billing still works, and open the Suppliers page + add a test supplier. If anything
-- fails, run 017_rollback_rls_payments_suppliers.sql.

BEGIN;

-- payments: no shop_id — scope via the parent sale.
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.payments;
CREATE POLICY tenant_isolation ON public.payments
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sales s
                 WHERE s.id = payments.sale_id AND s.shop_id = (SELECT public.my_store_id())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sales s
                 WHERE s.id = payments.sale_id AND s.shop_id = (SELECT public.my_store_id())));

-- suppliers: carries shop_id directly.
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.suppliers;
CREATE POLICY tenant_isolation ON public.suppliers
  FOR ALL
  TO authenticated
  USING (shop_id = (SELECT public.my_store_id()))
  WITH CHECK (shop_id = (SELECT public.my_store_id()));

COMMIT;

-- Check (run separately): both should be true
--   select relrowsecurity from pg_class where relname = 'payments';
--   select relrowsecurity from pg_class where relname = 'suppliers';
