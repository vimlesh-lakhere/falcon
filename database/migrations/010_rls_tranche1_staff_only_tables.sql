-- PENDING: run in Supabase Dashboard > SQL Editor. Undo with 010_rollback_rls_tranche1.sql.
--
-- Row-level security, step 1 of several. Covers ONLY tables that are used exclusively by
-- logged-in staff (through the ERP pages). The public storefront, checkout, POS payments
-- and the cron/purge jobs do NOT touch these tables, so they are unaffected.
--
-- Rule: a logged-in user can only see/change rows whose shop_id equals THEIR shop
-- (profiles.store_id). Anonymous visitors get nothing.
--
-- Tables (direct shop_id): audit_log, customer_payments, product_requests, purchase_orders,
--   returns, shifts, supplier_payments
-- Tables (through their parent): purchase_order_items, return_items, price_history,
--   product_batches, customer_prices

BEGIN;

-- Helper: the shop of the current logged-in user (NULL when not logged in / no store).
CREATE OR REPLACE FUNCTION public.my_store_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public, pg_temp
AS $$
  SELECT store_id FROM public.profiles WHERE id = auth.uid() AND is_active
$$;

REVOKE EXECUTE ON FUNCTION public.my_store_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_store_id() TO authenticated;

-- Tables that carry shop_id themselves.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'audit_log','customer_payments','product_requests','purchase_orders',
    'returns','shifts','supplier_payments'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I FOR ALL TO authenticated
         USING (shop_id = (SELECT public.my_store_id()))
         WITH CHECK (shop_id = (SELECT public.my_store_id()))', t);
  END LOOP;
END $$;

-- Child tables: allowed only when the parent row belongs to the user's shop.
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.purchase_order_items;
CREATE POLICY tenant_isolation ON public.purchase_order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.purchase_orders po
                 WHERE po.id = purchase_order_items.purchase_order_id
                   AND po.shop_id = (SELECT public.my_store_id())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.purchase_orders po
                 WHERE po.id = purchase_order_items.purchase_order_id
                   AND po.shop_id = (SELECT public.my_store_id())));

ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.return_items;
CREATE POLICY tenant_isolation ON public.return_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.returns r
                 WHERE r.id = return_items.return_id
                   AND r.shop_id = (SELECT public.my_store_id())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.returns r
                 WHERE r.id = return_items.return_id
                   AND r.shop_id = (SELECT public.my_store_id())));

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.price_history;
CREATE POLICY tenant_isolation ON public.price_history FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p
                 WHERE p.id = price_history.product_id
                   AND p.shop_id = (SELECT public.my_store_id())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p
                 WHERE p.id = price_history.product_id
                   AND p.shop_id = (SELECT public.my_store_id())));

ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.product_batches;
CREATE POLICY tenant_isolation ON public.product_batches FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p
                 WHERE p.id = product_batches.product_id
                   AND p.shop_id = (SELECT public.my_store_id())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p
                 WHERE p.id = product_batches.product_id
                   AND p.shop_id = (SELECT public.my_store_id())));

ALTER TABLE public.customer_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.customer_prices;
CREATE POLICY tenant_isolation ON public.customer_prices FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c
                 WHERE c.id = customer_prices.customer_id
                   AND c.shop_id = (SELECT public.my_store_id())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.customers c
                 WHERE c.id = customer_prices.customer_id
                   AND c.shop_id = (SELECT public.my_store_id())));

COMMIT;
