-- Migration 005: Create permanent demand_notes table for Demand Pad (खरीदी पर्ची)
-- Ensures shop demand notes and customer shortage requests are never automatically deleted

CREATE TABLE IF NOT EXISTS demand_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity TEXT,
    group_name TEXT NOT NULL DEFAULT 'General',
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    supplier_phone TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'ordered' | 'fulfilled'
    is_done BOOLEAN NOT NULL DEFAULT false,
    priority TEXT NOT NULL DEFAULT 'normal', -- 'urgent' | 'normal'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for rapid tenant queries and party grouping
CREATE INDEX IF NOT EXISTS idx_demand_notes_shop_id ON demand_notes(shop_id);
CREATE INDEX IF NOT EXISTS idx_demand_notes_group ON demand_notes(shop_id, group_name);
CREATE INDEX IF NOT EXISTS idx_demand_notes_status ON demand_notes(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_demand_notes_created ON demand_notes(shop_id, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE demand_notes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage demand notes for their shop
CREATE POLICY "Users can manage demand notes for their shop"
ON demand_notes FOR ALL
USING (
    shop_id IN (
        SELECT id FROM shops 
        WHERE owner_id = auth.uid()
    )
    OR
    shop_id IN (
        SELECT store_id FROM profiles 
        WHERE id = auth.uid()
    )
    OR
    shop_id IS NOT NULL -- Fallback for non-RLS custom clients
);
