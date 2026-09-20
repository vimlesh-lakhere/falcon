-- PENDING — run in Supabase SQL Editor. Undo any time with 014_rollback_rls_sales.sql.
-- Prereq: SUPABASE_SERVICE_ROLE_KEY is already set in Vercel (done for migration 013).
--
-- Locks down sales + sale_items:
--   * Signed-in staff (authenticated) see/manage ONLY their own shop's sales.
--   * Anonymous storefront visitors get NOTHING directly. The storefront reads its own orders via
--     /api/store/orders (service role, session-gated) and creates orders via /api/store/checkout
--     (service role). POS billing (pos_checkout / edit invoice) runs as the signed-in staff and is
--     allowed by the shop-scoped policies below.
--
-- IMPORTANT: right after running this, make ONE POS bill to confirm pos_checkout still works, and
-- open "My Orders" on the storefront. If anything fails, run 014_rollback_rls_sales.sql.

BEGIN;

-- sales: carries shop_id directly.
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.sales;
CREATE POLICY tenant_isolation ON public.sales
  FOR ALL
  TO authenticated
  USING (shop_id = (SELECT public.my_store_id()))
  WITH CHECK (shop_id = (SELECT public.my_store_id()));

-- sale_items: no shop_id of its own — scope via the parent sale.
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.sale_items;
CREATE POLICY tenant_isolation ON public.sale_items
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sales s
                 WHERE s.id = sale_items.sale_id AND s.shop_id = (SELECT public.my_store_id())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sales s
                 WHERE s.id = sale_items.sale_id AND s.shop_id = (SELECT public.my_store_id())));

COMMIT;
