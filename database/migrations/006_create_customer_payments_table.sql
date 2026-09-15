-- =============================================================================
-- FALCON AGS STORE ERP — CUSTOMER PAYMENTS & KHATA LEDGER MIGRATION
-- Migration 006: Create customer_payments table and add opening_balance to customers
-- =============================================================================

-- 1. Add opening_balance to customers if not exists
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS opening_balance NUMERIC NOT NULL DEFAULT 0;

-- 2. Create customer_payments table
CREATE TABLE IF NOT EXISTS public.customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'cash', -- 'cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other'
  reference_no TEXT,
  notes TEXT,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_payments_shop_id ON public.customer_payments(shop_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_customer_id ON public.customer_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_date ON public.customer_payments(payment_date DESC);

-- 4. Grant permissions for PostgREST & Supabase roles
GRANT ALL ON TABLE public.customer_payments TO postgres, anon, authenticated, service_role;

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
