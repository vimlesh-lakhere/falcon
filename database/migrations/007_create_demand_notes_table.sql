-- Migration 007: Create demand_notes table for Demand Pad cross-device sync
CREATE TABLE IF NOT EXISTS demand_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  quantity TEXT,
  group_name TEXT DEFAULT 'General',
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_phone TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'fulfilled')),
  is_done BOOLEAN NOT NULL DEFAULT false,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_demand_notes_shop_id ON demand_notes(shop_id);
CREATE INDEX IF NOT EXISTS idx_demand_notes_status ON demand_notes(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_demand_notes_created_at ON demand_notes(shop_id, created_at DESC);
ALTER TABLE demand_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "shop_demand_notes_all" ON demand_notes FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON demand_notes TO authenticated, anon, service_role;
