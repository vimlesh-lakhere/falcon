-- =============================================================================
-- FALCON 360 SAAS TRIALS, DATA RETENTION & LEADS SCHEMA MIGRATION (003)
-- 14-Day Free Trial, Auto-Deactivation, 30-Day Data Retention & Purge Policy,
-- and Lead Inquiries & Deal Management System
-- =============================================================================

-- 1. Extend shops table with SaaS trial lifecycle and data retention columns
ALTER TABLE IF EXISTS shops ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'trial';
ALTER TABLE IF EXISTS shops ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '14 days');
ALTER TABLE IF EXISTS shops ADD COLUMN IF NOT EXISTS data_retention_until TIMESTAMPTZ DEFAULT (now() + interval '30 days');
ALTER TABLE IF EXISTS shops ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE IF EXISTS shops ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'trial_active';
ALTER TABLE IF EXISTS shops ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE IF EXISTS shops ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE IF EXISTS shops ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'erp';

-- 2. Ensure Flagship Store (AGS Store) is permanently Pro and active
UPDATE shops 
SET plan = 'pro', 
    is_active = true, 
    status = 'active',
    trial_ends_at = NULL,
    data_retention_until = NULL
WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- 3. Create leads / service_inquiries table for tracking incoming inquiries and trial customers
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  business_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  service TEXT NOT NULL DEFAULT 'all', -- 'all', 'erp', 'pos', 'custom-web'
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- 'new', 'trial_active', 'contacted', 'negotiating', 'won', 'lost', 'expired'
  store_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  data_retention_until TIMESTAMPTZ,
  deal_value NUMERIC DEFAULT 0,
  admin_notes TEXT,
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing for quick querying
CREATE INDEX IF NOT EXISTS idx_shops_status ON shops(status);
CREATE INDEX IF NOT EXISTS idx_shops_trial_ends_at ON shops(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_shops_retention ON shops(data_retention_until);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
