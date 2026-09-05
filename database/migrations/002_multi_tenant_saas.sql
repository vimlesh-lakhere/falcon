-- =============================================================================
-- FALCON AGS STORE ERP — MIGRATION 002: MULTI-TENANT SAAS ARCHITECTURE
-- Adds dynamic shop slugs, business categories, and subscription plans
-- =============================================================================

-- 1. Add multi-tenant columns to shops table
ALTER TABLE IF EXISTS shops ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE IF EXISTS shops ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'general';
ALTER TABLE IF EXISTS shops ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'trial';
ALTER TABLE IF EXISTS shops ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '14 days');

-- 2. Ensure Default AGS Store has a valid slug and category
UPDATE shops 
SET slug = 'ags-store',
    business_type = 'cosmetics',
    plan = 'pro'
WHERE id = 'a0000000-0000-0000-0000-000000000001' AND (slug IS NULL OR slug = '');

-- 3. Create index on slug for fast storefront resolution
CREATE INDEX IF NOT EXISTS idx_shops_slug ON shops(slug);

-- 4. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
