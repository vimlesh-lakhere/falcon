-- =============================================================================
-- 020 — PERFORMANCE: cover foreign keys with indexes
-- =============================================================================
-- The Supabase performance advisor flagged 61 foreign keys with no covering
-- index. Every tenant-scoped query filters on shop_id / store_id, and every
-- embedded select joins on a parent FK, so these were doing sequential scans.
-- Adding the indexes is non-breaking and is the single biggest free-tier win
-- (less CPU + I/O per query = fewer resources on the free Postgres instance).
--
-- Safe & idempotent: CREATE INDEX IF NOT EXISTS. On a small DB the brief write
-- lock is negligible.
-- =============================================================================

BEGIN;

-- Tenant scope (shop_id / store_id) — used by almost every query --------------
CREATE INDEX IF NOT EXISTS idx_audit_log_shop_id           ON public.audit_log(shop_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id          ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_categories_shop_id          ON public.categories(shop_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent           ON public.categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_notifications_shop_id        ON public.notifications(shop_id);
CREATE INDEX IF NOT EXISTS idx_product_requests_shop_id     ON public.product_requests(shop_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_shop_id      ON public.purchase_orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_returns_shop_id              ON public.returns(shop_id);
CREATE INDEX IF NOT EXISTS idx_roles_shop_id                ON public.roles(shop_id);
CREATE INDEX IF NOT EXISTS idx_shifts_shop_id               ON public.shifts(shop_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_shop_id    ON public.supplier_payments(shop_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_shop_id            ON public.suppliers(shop_id);
CREATE INDEX IF NOT EXISTS idx_units_shop_id                ON public.units(shop_id);
CREATE INDEX IF NOT EXISTS idx_users_shop_id                ON public.users(shop_id);
CREATE INDEX IF NOT EXISTS idx_branches_store_id            ON public.branches(store_id);
CREATE INDEX IF NOT EXISTS idx_leads_store_id               ON public.leads(store_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_store_id       ON public.user_sessions(store_id);
CREATE INDEX IF NOT EXISTS idx_profiles_store_id            ON public.profiles(store_id);
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id           ON public.profiles(branch_id);

-- Catalog & pricing -----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_category_id         ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id         ON public.products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_unit_id             ON public.products(unit_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id  ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_product_id     ON public.price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_changed_by     ON public.price_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_product_batches_product_id   ON public.product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_customer_prices_product_id   ON public.customer_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_units_base_unit_id           ON public.units(base_unit_id);

-- Sales & returns -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sales_customer_id            ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_cashier_id             ON public.sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id        ON public.sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_variant_id        ON public.sale_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_overridden_by     ON public.sale_items(overridden_by);
CREATE INDEX IF NOT EXISTS idx_returns_sale_id              ON public.returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_returns_processed_by         ON public.returns(processed_by);
CREATE INDEX IF NOT EXISTS idx_return_items_return_id       ON public.return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_sale_item_id    ON public.return_items(sale_item_id);

-- Online storefront orders ----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_shop_id               ON public.orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id           ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id         ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id       ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id       ON public.order_items(variant_id);

-- Purchasing ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id  ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by   ON public.purchase_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_po_items_purchase_order_id   ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_product_id          ON public.purchase_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_po_id      ON public.supplier_payments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier   ON public.supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_demand_notes_supplier_id     ON public.demand_notes(supplier_id);

-- Stock movements -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id   ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant_id   ON public.stock_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch_id     ON public.stock_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by   ON public.stock_movements(created_by);

-- Product requests & shifts ---------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_product_requests_customer    ON public.product_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_product_requests_product     ON public.product_requests(product_id);
CREATE INDEX IF NOT EXISTS idx_product_requests_po_item     ON public.product_requests(purchase_order_item_id);
CREATE INDEX IF NOT EXISTS idx_shifts_opened_by             ON public.shifts(opened_by);
CREATE INDEX IF NOT EXISTS idx_login_history_user_id        ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id           ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id        ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_perm_key    ON public.role_permissions(permission_key);

COMMIT;
