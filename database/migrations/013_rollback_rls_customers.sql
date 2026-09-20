-- UNDO for 013_rls_customers.sql. Run in Supabase SQL Editor if the storefront or ERP customer
-- pages misbehave after enabling RLS. Switches protection off again; data is untouched.

BEGIN;

DROP POLICY IF EXISTS tenant_isolation ON public.customers;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;

COMMIT;
