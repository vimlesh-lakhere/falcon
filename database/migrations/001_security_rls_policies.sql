-- =============================================================================
-- FALCON AGS STORE ERP — COMPREHENSIVE ROW LEVEL SECURITY (RLS) POLICIES
-- Multi-Tenant Data Isolation, Staff Authorization & Public Storefront Security
-- =============================================================================

-- 1. Helper Function: Get Authenticated Staff Member's Active Shop ID
CREATE OR REPLACE FUNCTION get_auth_shop_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT store_id 
  FROM profiles 
  WHERE id = auth.uid() 
    AND is_active = true 
  LIMIT 1;
$$;

-- 2. Helper Function: Check If Authenticated User Has Specific ERP Role
CREATE OR REPLACE FUNCTION has_erp_role(required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
      AND is_active = true 
      AND role = ANY(required_roles)
  );
$$;

-- =============================================================================
-- TABLE 1: PROFILES (User accounts, roles, and shop assignment)
-- =============================================================================
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self_read" ON profiles;
CREATE POLICY "profiles_self_read" ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR store_id = get_auth_shop_id());

DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =============================================================================
-- TABLE 2: SHOPS
-- =============================================================================
ALTER TABLE IF EXISTS shops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shops_staff_isolation" ON shops;
CREATE POLICY "shops_staff_isolation" ON shops
  FOR ALL
  TO authenticated
  USING (id = get_auth_shop_id());

DROP POLICY IF EXISTS "shops_public_read" ON shops;
CREATE POLICY "shops_public_read" ON shops
  FOR SELECT
  TO anon
  USING (is_active = true);

-- =============================================================================
-- TABLE 3: PRODUCTS (Catalog, Pricing, Barcodes)
-- =============================================================================
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;

-- Staff full access within their assigned store
DROP POLICY IF EXISTS "products_staff_isolation" ON products;
CREATE POLICY "products_staff_isolation" ON products
  FOR ALL
  TO authenticated
  USING (shop_id = get_auth_shop_id())
  WITH CHECK (shop_id = get_auth_shop_id());

-- Public storefront customers can view active products
DROP POLICY IF EXISTS "products_public_view" ON products;
CREATE POLICY "products_public_view" ON products
  FOR SELECT
  TO anon
  USING (is_active = true);

-- =============================================================================
-- TABLE 4: CATEGORIES & UNITS
-- =============================================================================
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_staff_isolation" ON categories;
CREATE POLICY "categories_staff_isolation" ON categories
  FOR ALL
  TO authenticated
  USING (shop_id = get_auth_shop_id())
  WITH CHECK (shop_id = get_auth_shop_id());

DROP POLICY IF EXISTS "categories_public_view" ON categories;
CREATE POLICY "categories_public_view" ON categories
  FOR SELECT
  TO anon
  USING (is_active = true);

ALTER TABLE IF EXISTS units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "units_staff_isolation" ON units;
CREATE POLICY "units_staff_isolation" ON units
  FOR ALL
  TO authenticated
  USING (shop_id = get_auth_shop_id())
  WITH CHECK (shop_id = get_auth_shop_id());

-- =============================================================================
-- TABLE 5: CUSTOMERS
-- =============================================================================
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_staff_isolation" ON customers;
CREATE POLICY "customers_staff_isolation" ON customers
  FOR ALL
  TO authenticated
  USING (shop_id = get_auth_shop_id())
  WITH CHECK (shop_id = get_auth_shop_id());

-- Online storefront checkout customer creation
DROP POLICY IF EXISTS "customers_storefront_insert" ON customers;
CREATE POLICY "customers_storefront_insert" ON customers
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "customers_storefront_select" ON customers;
CREATE POLICY "customers_storefront_select" ON customers
  FOR SELECT
  TO anon
  USING (true);

-- =============================================================================
-- TABLE 6: SALES & INVOICES
-- =============================================================================
ALTER TABLE IF EXISTS sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_staff_isolation" ON sales;
CREATE POLICY "sales_staff_isolation" ON sales
  FOR ALL
  TO authenticated
  USING (shop_id = get_auth_shop_id())
  WITH CHECK (shop_id = get_auth_shop_id());

-- Public storefront checkout order creation
DROP POLICY IF EXISTS "sales_storefront_insert" ON sales;
CREATE POLICY "sales_storefront_insert" ON sales
  FOR INSERT
  TO anon
  WITH CHECK (status = 'received');

DROP POLICY IF EXISTS "sales_storefront_select_own" ON sales;
CREATE POLICY "sales_storefront_select_own" ON sales
  FOR SELECT
  TO anon
  USING (status IN ('received', 'pending', 'confirmed', 'packing', 'out_for_delivery', 'delivered'));

-- =============================================================================
-- TABLE 7: SALE ITEMS
-- =============================================================================
ALTER TABLE IF EXISTS sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sale_items_staff_isolation" ON sale_items;
CREATE POLICY "sale_items_staff_isolation" ON sale_items
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.shop_id = get_auth_shop_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.shop_id = get_auth_shop_id()));

DROP POLICY IF EXISTS "sale_items_storefront_insert" ON sale_items;
CREATE POLICY "sale_items_storefront_insert" ON sale_items
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- =============================================================================
-- TABLE 8: STOCK MOVEMENTS & AUDIT LOGS
-- =============================================================================
ALTER TABLE IF EXISTS stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_movements_staff_isolation" ON stock_movements;
CREATE POLICY "stock_movements_staff_isolation" ON stock_movements
  FOR ALL
  TO authenticated
  USING (shop_id = get_auth_shop_id())
  WITH CHECK (shop_id = get_auth_shop_id());

-- =============================================================================
-- TABLE 9: SUPPLIERS & PURCHASES
-- =============================================================================
ALTER TABLE IF EXISTS suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "suppliers_staff_isolation" ON suppliers;
CREATE POLICY "suppliers_staff_isolation" ON suppliers
  FOR ALL
  TO authenticated
  USING (shop_id = get_auth_shop_id())
  WITH CHECK (shop_id = get_auth_shop_id());

ALTER TABLE IF EXISTS purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "purchase_orders_staff_isolation" ON purchase_orders;
CREATE POLICY "purchase_orders_staff_isolation" ON purchase_orders
  FOR ALL
  TO authenticated
  USING (shop_id = get_auth_shop_id())
  WITH CHECK (shop_id = get_auth_shop_id());

ALTER TABLE IF EXISTS purchase_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "purchase_order_items_staff_isolation" ON purchase_order_items;
CREATE POLICY "purchase_order_items_staff_isolation" ON purchase_order_items
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM purchase_orders WHERE purchase_orders.id = purchase_order_items.purchase_order_id AND purchase_orders.shop_id = get_auth_shop_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM purchase_orders WHERE purchase_orders.id = purchase_order_items.purchase_order_id AND purchase_orders.shop_id = get_auth_shop_id()));

-- =============================================================================
-- TABLE 10: PRODUCT REQUESTS
-- =============================================================================
ALTER TABLE IF EXISTS product_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_requests_staff_isolation" ON product_requests;
CREATE POLICY "product_requests_staff_isolation" ON product_requests
  FOR ALL
  TO authenticated
  USING (shop_id = get_auth_shop_id())
  WITH CHECK (shop_id = get_auth_shop_id());
