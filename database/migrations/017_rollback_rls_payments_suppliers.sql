-- UNDO for 017_rls_payments_suppliers.sql. Run in Supabase SQL Editor if POS billing (payments)
-- or the Suppliers page misbehaves after enabling RLS. Switches protection off; data is untouched.

BEGIN;

DROP POLICY IF EXISTS tenant_isolation ON public.payments;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.suppliers;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;

COMMIT;
