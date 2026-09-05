-- =============================================================================
-- FALCON AGS STORE ERP — MASTER DATABASE SCHEMA & DDL SPECIFICATION
-- Complete, self-contained, 100% idempotent disaster recovery schema.
-- Run this in any Supabase SQL Editor or fresh PostgreSQL database to restore
-- the full system architecture in under 30 seconds.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. TENANCY & SHOPS
-- =============================================================================
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  gst_number TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure Default Shop Exists
INSERT INTO shops (id, name, address, phone, currency, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'AGS Store',
  'Main Market, Wholesale & Retail Hub',
  '+91 98765 43210',
  'INR',
  true
)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name;

-- =============================================================================
-- 2. USERS & PROFILES
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'Cashier',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  key TEXT PRIMARY KEY,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_key)
);

-- Seed System Permissions
INSERT INTO permissions (key, description) VALUES
  ('view_cost_price', 'Allows staff to see product cost/purchase price'),
  ('edit_selling_price', 'Allows staff to modify selling prices on products'),
  ('apply_discount', 'Allows manual cart or line-item discounts'),
  ('override_price', 'Allows overriding rates during checkout'),
  ('process_refund', 'Allows processing returns and refunds'),
  ('view_reports', 'Access financial, sales and margin reports'),
  ('manage_users', 'Add and edit staff roles and permissions'),
  ('database_backup', 'Create and download full database backups'),
  ('database_restore', 'Restore database from backup snapshots')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 3. CATEGORIES & UNITS
-- =============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  parent_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_hindi TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  conversion_factor NUMERIC DEFAULT 1
);

-- =============================================================================
-- 4. SUPPLIERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  gst_number TEXT,
  outstanding_balance NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 5. PRODUCTS, VARIANTS, BATCHES
-- =============================================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_hindi TEXT,
  sku TEXT,
  barcode TEXT,
  brand TEXT,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  purchase_price NUMERIC NOT NULL DEFAULT 0,
  mrp NUMERIC(10, 2),
  selling_price NUMERIC NOT NULL DEFAULT 0,
  wholesale_price NUMERIC,
  wholesale_min_qty NUMERIC(10, 2) DEFAULT 12,
  minimum_selling_price NUMERIC,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  minimum_stock NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_name TEXT NOT NULL,
  attribute_value TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  price_delta NUMERIC NOT NULL DEFAULT 0,
  current_stock NUMERIC NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_no TEXT,
  expiry_date DATE,
  quantity NUMERIC NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  changed_by UUID,
  old_price NUMERIC,
  new_price NUMERIC,
  price_type TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 6. INVENTORY & STOCK MOVEMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL, -- 'sale', 'purchase_receipt', 'adjustment', 'damage', 'return_in', 'return_out'
  quantity_delta NUMERIC NOT NULL,
  reference_table TEXT,
  reference_id UUID,
  batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_prod ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_shop ON stock_movements(shop_id);

-- =============================================================================
-- 7. PURCHASES & SUPPLIER PAYMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_ordered NUMERIC NOT NULL,
  quantity_received NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL,
  reference_no TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 8. CUSTOMERS & CUSTOMER PRICING
-- =============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  total_spend NUMERIC NOT NULL DEFAULT 0,
  outstanding_balance NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_prices (
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  PRIMARY KEY (customer_id, product_id)
);

CREATE TABLE IF NOT EXISTS product_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  requested_product_name TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  expected_price NUMERIC,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'requested',
  purchase_order_item_id UUID REFERENCES purchase_order_items(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 9. SALES, INVOICES, PAYMENTS, RETURNS
-- =============================================================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  cashier_id UUID,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shop_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_shop_id ON sales(shop_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);

CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  is_price_overridden BOOLEAN NOT NULL DEFAULT false,
  overridden_by UUID
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  method TEXT NOT NULL, -- 'cash', 'upi', 'card', 'other'
  amount NUMERIC NOT NULL,
  reference_no TEXT
);

CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  processed_by UUID,
  reason TEXT,
  refund_method TEXT,
  total_refund NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  sale_item_id UUID NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  refund_amount NUMERIC NOT NULL DEFAULT 0
);

-- =============================================================================
-- 10. SHIFTS, NOTIFICATIONS, AUDIT & BACKUP LOGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  opened_by UUID,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opening_float NUMERIC NOT NULL DEFAULT 0,
  closed_at TIMESTAMPTZ,
  expected_cash NUMERIC,
  counted_cash NUMERIC,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  entity_table TEXT,
  entity_id UUID,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  actor_id UUID,
  action TEXT NOT NULL,
  entity_table TEXT NOT NULL,
  entity_id UUID NOT NULL,
  before_value JSONB,
  after_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backup Tracking Log
CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  backup_type TEXT NOT NULL DEFAULT 'full',
  storage_destination TEXT NOT NULL DEFAULT 'google_drive',
  file_name TEXT NOT NULL,
  drive_file_id TEXT,
  drive_web_link TEXT,
  file_size_bytes BIGINT,
  tables_included JSONB,
  records_count INTEGER,
  status TEXT NOT NULL DEFAULT 'completed',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 11. DERIVED VALUE FUNCTIONS & TRIGGERS
-- =============================================================================

-- Auto-recompute product stock on stock movements
CREATE OR REPLACE FUNCTION recompute_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET current_stock = current_stock + NEW.quantity_delta
  WHERE id = NEW.product_id;

  -- Low stock notification trigger
  INSERT INTO notifications (shop_id, type, entity_table, entity_id, message)
  SELECT p.shop_id, 'low_stock', 'products', p.id,
         'Low stock warning: ' || p.name || ' (' || p.current_stock || ' remaining)'
  FROM products p
  WHERE p.id = NEW.product_id AND p.current_stock <= p.minimum_stock;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_movement_recompute ON stock_movements;
CREATE TRIGGER trg_stock_movement_recompute
  AFTER INSERT ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION recompute_product_stock();

-- Auto-recompute customer spend total upon sale completion
CREATE OR REPLACE FUNCTION recompute_customer_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL AND NEW.status = 'completed' THEN
    UPDATE customers
    SET total_spend = total_spend + NEW.total_amount
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sale_customer_totals ON sales;
CREATE TRIGGER trg_sale_customer_totals
  AFTER INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION recompute_customer_totals();

-- =============================================================================
-- 12. VIEWS (Cashier restricted scope)
-- =============================================================================
CREATE OR REPLACE VIEW products_for_cashier AS
SELECT 
  id, 
  shop_id, 
  category_id,
  name, 
  name_hindi,
  sku, 
  barcode, 
  brand,
  mrp,
  selling_price, 
  wholesale_price,
  wholesale_min_qty,
  current_stock, 
  image_url,
  is_active
FROM products
WHERE is_active = true;

-- =============================================================================
-- 13. AUTOMATIC AUTH PROFILE SYNC & PERMISSIONS (Zero Setup Disaster Recovery)
-- Automatically creates Owner/Admin profile whenever a new user signs up in Supabase Auth
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, store_id, shop_id, full_name, email, role, is_active)
  VALUES (
    NEW.id,
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'Owner',
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET role = 'Owner',
      store_id = 'a0000000-0000-0000-0000-000000000001',
      shop_id = 'a0000000-0000-0000-0000-000000000001',
      is_active = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant full schema permissions for Supabase PostgREST, anon and authenticated roles
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- Reload schema notification for PostgREST
NOTIFY pgrst, 'reload schema';
