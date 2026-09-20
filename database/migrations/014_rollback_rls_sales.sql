-- UNDO for 014_rls_sales.sql. Run in Supabase SQL Editor if POS billing or the storefront's
-- orders misbehave after enabling RLS. Switches protection off again; data is untouched.

BEGIN;

DROP POLICY IF EXISTS tenant_isolation ON public.sale_items;
ALTER TABLE public.sale_items DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.sales;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;

COMMIT;
