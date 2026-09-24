-- =============================================================================
-- 021 — SECURITY: enable RLS on the tables that currently have none
-- =============================================================================
-- ⚠️  REVIEW + TEST BEFORE PRODUCTION. Enabling RLS changes what the PUBLIC anon
--     key (shipped in the browser bundle) can see. Get the anon storefront
--     policies wrong and the public store goes blank. Roll out in a staging /
--     Supabase branch first, click through the storefront AND the ERP, then apply
--     to prod during a quiet window. Rollback is at the bottom.
--
-- WHY THIS EXISTS
--   The Supabase security advisor reports RLS DISABLED on 15 public tables:
--     users, categories, roles, role_permissions, permissions, user_roles, units,
--     shops, product_variants, products, stock_movements, notifications, orders,
--     order_items, leads
--   With RLS off, anyone holding the public anon key can read AND write every
--   tenant's rows in those tables (a cross-tenant data breach + tampering hole,
--   and the reason the unauthenticated cron could actually delete data).
--
-- DESIGN
--   * Core tenant tables get proper isolation: authenticated users only touch
--     rows for THEIR shop (shop_id = my_store_id()); the storefront anon role
--     gets read-only access to active catalog rows it genuinely needs.
--   * Legacy / RBAC tables get a minimal "block the public anon key" policy
--     (authenticated-only) so the breach is closed without changing signed-in
--     behavior. Tighten these once their access paths are confirmed.
--   * my_store_id() (from migration 010) returns the caller's shop_id.
-- =============================================================================

BEGIN;

-- Ensure the helper exists (idempotent; mirrors migration 010) -----------------
CREATE OR REPLACE FUNCTION public.my_store_id()
  RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$ SELECT store_id FROM public.profiles WHERE id = auth.uid() AND is_active $$;

-- ============================ CORE TENANT TABLES =============================

-- PRODUCTS: staff own their shop; storefront reads active products -------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS products_tenant   ON public.products;
DROP POLICY IF EXISTS products_public    ON public.products;
CREATE POLICY products_tenant ON public.products FOR ALL TO authenticated
  USING (shop_id = (SELECT public.my_store_id())) WITH CHECK (shop_id = (SELECT public.my_store_id()));
CREATE POLICY products_public ON public.products FOR SELECT TO anon
  USING (is_active = true);

-- CATEGORIES -------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS categories_tenant ON public.categories;
DROP POLICY IF EXISTS categories_public ON public.categories;
CREATE POLICY categories_tenant ON public.categories FOR ALL TO authenticated
  USING (shop_id = (SELECT public.my_store_id())) WITH CHECK (shop_id = (SELECT public.my_store_id()));
CREATE POLICY categories_public ON public.categories FOR SELECT TO anon
  USING (COALESCE(is_active, true) = true);

-- UNITS (not sensitive; storefront joins them for pricing) ---------------------
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS units_tenant ON public.units;
DROP POLICY IF EXISTS units_public ON public.units;
CREATE POLICY units_tenant ON public.units FOR ALL TO authenticated
  USING (shop_id = (SELECT public.my_store_id())) WITH CHECK (shop_id = (SELECT public.my_store_id()));
CREATE POLICY units_public ON public.units FOR SELECT TO anon USING (true);

-- SHOPS: staff see their own; storefront reads active shop name/phone ----------
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shops_tenant ON public.shops;
DROP POLICY IF EXISTS shops_public ON public.shops;
CREATE POLICY shops_tenant ON public.shops FOR ALL TO authenticated
  USING (id = (SELECT public.my_store_id())) WITH CHECK (id = (SELECT public.my_store_id()));
CREATE POLICY shops_public ON public.shops FOR SELECT TO anon
  USING (is_active = true);

-- PRODUCT_VARIANTS: reached via their parent product ---------------------------
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_variants_tenant ON public.product_variants;
DROP POLICY IF EXISTS product_variants_public ON public.product_variants;
CREATE POLICY product_variants_tenant ON public.product_variants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.shop_id = (SELECT public.my_store_id())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.shop_id = (SELECT public.my_store_id())));
CREATE POLICY product_variants_public ON public.product_variants FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.is_active = true));

-- STOCK_MOVEMENTS: staff only, no anon ----------------------------------------
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stock_movements_tenant ON public.stock_movements;
CREATE POLICY stock_movements_tenant ON public.stock_movements FOR ALL TO authenticated
  USING (shop_id = (SELECT public.my_store_id())) WITH CHECK (shop_id = (SELECT public.my_store_id()));

-- NOTIFICATIONS: staff only, no anon ------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_tenant ON public.notifications;
CREATE POLICY notifications_tenant ON public.notifications FOR ALL TO authenticated
  USING (shop_id = (SELECT public.my_store_id())) WITH CHECK (shop_id = (SELECT public.my_store_id()));

-- ORDERS / ORDER_ITEMS: enable isolation (legacy — app writes to sales/sale_items)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orders_tenant ON public.orders;
CREATE POLICY orders_tenant ON public.orders FOR ALL TO authenticated
  USING (shop_id = (SELECT public.my_store_id())) WITH CHECK (shop_id = (SELECT public.my_store_id()));
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS order_items_tenant ON public.order_items;
CREATE POLICY order_items_tenant ON public.order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.shop_id = (SELECT public.my_store_id())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.shop_id = (SELECT public.my_store_id())));

-- LEADS: public sign-up form inserts; only the platform (master) shop reads ----
-- NOTE: /api/leads currently inserts with the anon key. Keep that working via an
--       anon INSERT policy. If you move that route to the service-role client,
--       drop leads_anon_insert.
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leads_anon_insert ON public.leads;
DROP POLICY IF EXISTS leads_master_read ON public.leads;
CREATE POLICY leads_anon_insert ON public.leads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY leads_master_read ON public.leads FOR ALL TO authenticated
  USING ((SELECT public.my_store_id()) = 'a0000000-0000-0000-0000-000000000001')
  WITH CHECK ((SELECT public.my_store_id()) = 'a0000000-0000-0000-0000-000000000001');

-- ==================== LEGACY / RBAC TABLES (breach close) ====================
-- These just need the public anon key locked out. Signed-in behavior is
-- unchanged (authenticated USING(true)). Tighten later once usage is confirmed.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','roles','permissions','role_permissions','user_roles'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_authenticated', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
                   t || '_authenticated', t);
  END LOOP;
END $$;

COMMIT;

-- =============================================================================
-- ROLLBACK (run if the storefront or ERP breaks):
-- =============================================================================
-- BEGIN;
--   ALTER TABLE public.products         DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.categories       DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.units            DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.shops            DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.product_variants DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.stock_movements  DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.notifications    DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.orders           DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.order_items      DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.leads            DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.users            DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.roles            DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.permissions      DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.user_roles       DISABLE ROW LEVEL SECURITY;
-- COMMIT;
