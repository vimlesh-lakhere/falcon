-- PENDING — DO NOT RUN YET. Run only AFTER:
--   1) SUPABASE_SERVICE_ROLE_KEY is set in Vercel (and the app redeployed), and
--   2) you have tested storefront login, checkout and "My Orders" on the new build.
-- Undo any time with 013_rollback_rls_customers.sql (data is never touched).
--
-- Locks down the customers table:
--   * Signed-in staff (authenticated) can see/manage ONLY their own shop's customers.
--   * Anonymous storefront visitors get NOTHING directly. All storefront customer operations now
--     go through server routes (checkout / auth-otp / store-orders) that use the service role,
--     which bypasses RLS — so the store keeps working while the public API can no longer be used
--     to dump every customer, phone and address.

BEGIN;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.customers;
CREATE POLICY tenant_isolation ON public.customers
  FOR ALL
  TO authenticated
  USING (shop_id = (SELECT public.my_store_id()))
  WITH CHECK (shop_id = (SELECT public.my_store_id()));

COMMIT;

-- Verify afterwards:
--   select relrowsecurity from pg_class where oid='public.customers'::regclass;  -- expect t
--   -- as anon (should return 0 rows once RLS is on):
--   -- set local role anon; select count(*) from customers;
