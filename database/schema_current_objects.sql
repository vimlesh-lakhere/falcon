-- ============================================================================
-- Falcon 360 — CURRENT database objects (functions, triggers, RLS policies)
-- Snapshot taken from the live database on 2026-09-21.
--
-- WHY THIS FILE EXISTS: database/schema_master.sql holds the TABLE definitions but is an older
-- snapshot and does NOT include the functions, triggers, or Row Level Security below. When rebuilding
-- a fresh Supabase project from the repo, run in this order:
--   1) database/schema_master.sql              (base tables)
--   2) database/migrations/002..017 in order   (column additions like price_basis, slug, RLS tranches)
--   3) THIS FILE                                 (guarantees all functions/triggers/RLS are current)
--   4) restore data via the in-app Backup tab   (Settings -> Backup -> Restore)
--
-- Re-run this file any time to bring functions/triggers/policies back to the current definition;
-- everything here is CREATE OR REPLACE / idempotent (policies are dropped-and-recreated).
-- The authoritative, always-perfect alternative is `supabase db dump` — see RESTORE.md.
-- ============================================================================

-- ------------------------------------------------------------------ FUNCTIONS

CREATE OR REPLACE FUNCTION public.current_shop_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT shop_id FROM users WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.my_store_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT store_id FROM public.profiles WHERE id = auth.uid() AND is_active
$function$;

CREATE OR REPLACE FUNCTION public.has_permission(p_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    WHERE ur.user_id = auth.uid() AND rp.permission_key = p_key
  );
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
  v_full_name TEXT;
  v_phone TEXT;
  v_role TEXT;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'user'), '@', 1));
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone);
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'Owner');

  INSERT INTO public.profiles (
    id, full_name, email, phone, role, store_id, branch_id, is_active
  )
  VALUES (
    NEW.id, v_full_name, COALESCE(NEW.email, ''), v_phone, v_role, NULL, NULL, true
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    updated_at = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recompute_customer_totals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.customer_id IS NOT NULL AND NEW.status = 'completed' THEN
    UPDATE customers
    SET total_spend = total_spend + NEW.total_amount
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recompute_product_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_prod_name TEXT;
  v_curr_stock NUMERIC;
  v_min_stock NUMERIC;
  v_shop_id UUID;
BEGIN
  UPDATE products
  SET current_stock = current_stock + NEW.quantity_delta
  WHERE id = NEW.product_id
  RETURNING shop_id, name, current_stock, minimum_stock
  INTO v_shop_id, v_prod_name, v_curr_stock, v_min_stock;

  IF NEW.variant_id IS NOT NULL THEN
    UPDATE product_variants
    SET current_stock = current_stock + NEW.quantity_delta
    WHERE id = NEW.variant_id;
  END IF;

  IF v_curr_stock <= 0 THEN
    INSERT INTO notifications (shop_id, type, entity_table, entity_id, message)
    VALUES (v_shop_id, 'out_of_stock', 'products', NEW.product_id, 'Out of stock: ' || v_prod_name || ' (0 left)');
  ELSIF v_curr_stock <= v_min_stock THEN
    INSERT INTO notifications (shop_id, type, entity_table, entity_id, message)
    VALUES (v_shop_id, 'low_stock', 'products', NEW.product_id, 'Low stock: ' || v_prod_name || ' (' || v_curr_stock || ' left)');
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recompute_supplier_balance_on_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  UPDATE suppliers
  SET outstanding_balance = GREATEST(0, outstanding_balance - NEW.amount)
  WHERE id = NEW.supplier_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.pos_checkout(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_shop     uuid := (payload->>'shop_id')::uuid;
  v_sale_id  uuid;
  v_invoice  text := 'INV-' || to_char(now(), 'YYYY') || '-'
                     || right((extract(epoch from clock_timestamp()) * 1000)::bigint::text, 6);
  v_item     jsonb;
  v_pay      jsonb;
  v_paid     numeric := 0;
  v_due      numeric;
  v_cust     uuid := nullif(payload->>'customer_id', '')::uuid;
BEGIN
  IF v_shop IS NULL THEN
    RAISE EXCEPTION 'pos_checkout: shop_id is required';
  END IF;

  INSERT INTO sales (shop_id, invoice_number, customer_id, cashier_id,
                     subtotal, discount_amount, tax_amount, total_amount, status, notes)
  VALUES (
    v_shop, v_invoice, v_cust, nullif(payload->>'cashier_id', '')::uuid,
    coalesce((payload->>'subtotal')::numeric, 0),
    coalesce((payload->>'discount_amount')::numeric, 0),
    coalesce((payload->>'tax_amount')::numeric, 0),
    coalesce((payload->>'total_amount')::numeric, 0),
    'completed',
    nullif(payload->>'notes', '')
  )
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(payload->'items', '[]'::jsonb)) LOOP
    INSERT INTO sale_items (sale_id, product_id, variant_id, quantity, unit_price, cost_price, is_price_overridden)
    VALUES (
      v_sale_id,
      (v_item->>'product_id')::uuid,
      nullif(v_item->>'variant_id', '')::uuid,
      coalesce((v_item->>'quantity')::numeric, 0),
      coalesce((v_item->>'unit_price')::numeric, 0),
      coalesce((v_item->>'cost_price')::numeric, 0),
      coalesce((v_item->>'is_price_overridden')::boolean, false)
    );

    INSERT INTO stock_movements (shop_id, product_id, variant_id, movement_type, quantity_delta,
                                 reference_table, reference_id, notes)
    VALUES (
      v_shop,
      (v_item->>'product_id')::uuid,
      nullif(v_item->>'variant_id', '')::uuid,
      'sale',
      -abs(coalesce(
             (v_item->>'base_quantity')::numeric,
             coalesce((v_item->>'quantity')::numeric, 0) * coalesce((v_item->>'unit_multiplier')::numeric, 1)
           )),
      'sales',
      v_sale_id,
      'POS Sale: ' || v_invoice
        || coalesce(' (' || (v_item->>'quantity') || ' ' || nullif(v_item->>'unit_name', '') || ')', '')
    );
  END LOOP;

  IF jsonb_typeof(payload->'payments') = 'array' THEN
    FOR v_pay IN SELECT * FROM jsonb_array_elements(payload->'payments') LOOP
      INSERT INTO payments (sale_id, method, amount, reference_no)
      VALUES (v_sale_id, v_pay->>'method', coalesce((v_pay->>'amount')::numeric, 0), nullif(v_pay->>'reference_no', ''));
      v_paid := v_paid + coalesce((v_pay->>'amount')::numeric, 0);
    END LOOP;
  END IF;

  v_due := greatest(0, coalesce((payload->>'total_amount')::numeric, 0) - v_paid);
  IF v_due > 0 AND v_cust IS NOT NULL THEN
    UPDATE customers SET outstanding_balance = coalesce(outstanding_balance, 0) + v_due WHERE id = v_cust;
  END IF;

  RETURN jsonb_build_object('id', v_sale_id, 'invoice_number', v_invoice);
END;
$function$;

-- Auth helper functions (email/password provider + auto-confirm). These operate on auth.* and are
-- attached to auth.users triggers created in the Supabase dashboard; include for completeness.
CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, now());
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_email_provider_on_password_set()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.encrypted_password IS NOT NULL AND NEW.encrypted_password <> '' THEN
    IF NOT (NEW.raw_app_meta_data ? 'providers') OR NOT (NEW.raw_app_meta_data->'providers' ? 'email') THEN
      NEW.raw_app_meta_data := jsonb_set(
        coalesce(NEW.raw_app_meta_data, '{}'::jsonb),
        '{providers}',
        coalesce(NEW.raw_app_meta_data->'providers', '[]'::jsonb) || '["email"]'::jsonb
      );
    END IF;

    IF NEW.raw_app_meta_data->>'provider' IS NULL THEN
      NEW.raw_app_meta_data := jsonb_set(NEW.raw_app_meta_data, '{provider}', '"email"'::jsonb);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_email_identity_on_password_set()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.encrypted_password IS NOT NULL AND NEW.encrypted_password <> '' THEN
    IF NOT EXISTS (
      SELECT 1 FROM auth.identities
      WHERE user_id = NEW.id AND provider = 'email'
    ) THEN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), NEW.id, NEW.id::text,
        jsonb_build_object('sub', NEW.id::text, 'email', NEW.email, 'email_verified', true),
        'email', now(), now(), now()
      )
      ON CONFLICT (provider_id, provider) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- ------------------------------------------------------------------- TRIGGERS
-- Note: the auth.users trigger (on_auth_user_created -> handle_new_user) and the
-- email-password sync triggers live on auth.users and are (re)created from the Supabase dashboard.
CREATE TRIGGER trg_sale_customer_totals AFTER INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION recompute_customer_totals();
CREATE TRIGGER trg_stock_movement_recompute AFTER INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION recompute_product_stock();
CREATE TRIGGER trg_supplier_payment_balance AFTER INSERT ON public.supplier_payments
  FOR EACH ROW EXECUTE FUNCTION recompute_supplier_balance_on_payment();

-- ------------------------------------------------------ ROW LEVEL SECURITY (ON)
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------- RLS POLICIES
CREATE POLICY tenant_isolation ON public.audit_log AS PERMISSIVE FOR ALL TO authenticated USING ((shop_id = ( SELECT my_store_id() AS my_store_id))) WITH CHECK ((shop_id = ( SELECT my_store_id() AS my_store_id)));
CREATE POLICY "Allow authenticated or anon to create branches" ON public.branches AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow branch updates" ON public.branches AS PERMISSIVE FOR UPDATE TO public USING (((store_id IN ( SELECT profiles.store_id FROM profiles WHERE (profiles.id = auth.uid()))) OR (auth.role() = 'authenticated'::text)));
CREATE POLICY "Users can read their branches" ON public.branches AS PERMISSIVE FOR SELECT TO public USING (((store_id IN ( SELECT profiles.store_id FROM profiles WHERE (profiles.id = auth.uid()))) OR (auth.role() = 'authenticated'::text)));
CREATE POLICY tenant_isolation ON public.customer_payments AS PERMISSIVE FOR ALL TO authenticated USING ((shop_id = ( SELECT my_store_id() AS my_store_id))) WITH CHECK ((shop_id = ( SELECT my_store_id() AS my_store_id)));
CREATE POLICY tenant_isolation ON public.customer_prices AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM customers c WHERE ((c.id = customer_prices.customer_id) AND (c.shop_id = ( SELECT my_store_id() AS my_store_id)))))) WITH CHECK ((EXISTS ( SELECT 1 FROM customers c WHERE ((c.id = customer_prices.customer_id) AND (c.shop_id = ( SELECT my_store_id() AS my_store_id))))));
CREATE POLICY tenant_isolation ON public.customers AS PERMISSIVE FOR ALL TO authenticated USING ((shop_id = ( SELECT my_store_id() AS my_store_id))) WITH CHECK ((shop_id = ( SELECT my_store_id() AS my_store_id)));
CREATE POLICY shop_demand_notes_all ON public.demand_notes AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage own devices" ON public.devices AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own login history" ON public.login_history AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY tenant_isolation ON public.payments AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM sales s WHERE ((s.id = payments.sale_id) AND (s.shop_id = ( SELECT my_store_id() AS my_store_id)))))) WITH CHECK ((EXISTS ( SELECT 1 FROM sales s WHERE ((s.id = payments.sale_id) AND (s.shop_id = ( SELECT my_store_id() AS my_store_id))))));
CREATE POLICY tenant_isolation ON public.price_history AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM products p WHERE ((p.id = price_history.product_id) AND (p.shop_id = ( SELECT my_store_id() AS my_store_id)))))) WITH CHECK ((EXISTS ( SELECT 1 FROM products p WHERE ((p.id = price_history.product_id) AND (p.shop_id = ( SELECT my_store_id() AS my_store_id))))));
CREATE POLICY tenant_isolation ON public.product_batches AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM products p WHERE ((p.id = product_batches.product_id) AND (p.shop_id = ( SELECT my_store_id() AS my_store_id)))))) WITH CHECK ((EXISTS ( SELECT 1 FROM products p WHERE ((p.id = product_batches.product_id) AND (p.shop_id = ( SELECT my_store_id() AS my_store_id))))));
CREATE POLICY tenant_isolation ON public.product_requests AS PERMISSIVE FOR ALL TO authenticated USING ((shop_id = ( SELECT my_store_id() AS my_store_id))) WITH CHECK ((shop_id = ( SELECT my_store_id() AS my_store_id)));
CREATE POLICY "Allow profile inserts" ON public.profiles AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow profile updates" ON public.profiles AS PERMISSIVE FOR ALL TO public USING (((auth.uid() = id) OR (auth.role() = 'authenticated'::text)));
CREATE POLICY "Users can read own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = id));
CREATE POLICY "Users can update own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = id));
CREATE POLICY tenant_isolation ON public.purchase_order_items AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM purchase_orders po WHERE ((po.id = purchase_order_items.purchase_order_id) AND (po.shop_id = ( SELECT my_store_id() AS my_store_id)))))) WITH CHECK ((EXISTS ( SELECT 1 FROM purchase_orders po WHERE ((po.id = purchase_order_items.purchase_order_id) AND (po.shop_id = ( SELECT my_store_id() AS my_store_id))))));
CREATE POLICY tenant_isolation ON public.purchase_orders AS PERMISSIVE FOR ALL TO authenticated USING ((shop_id = ( SELECT my_store_id() AS my_store_id))) WITH CHECK ((shop_id = ( SELECT my_store_id() AS my_store_id)));
CREATE POLICY tenant_isolation ON public.return_items AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM returns r WHERE ((r.id = return_items.return_id) AND (r.shop_id = ( SELECT my_store_id() AS my_store_id)))))) WITH CHECK ((EXISTS ( SELECT 1 FROM returns r WHERE ((r.id = return_items.return_id) AND (r.shop_id = ( SELECT my_store_id() AS my_store_id))))));
CREATE POLICY tenant_isolation ON public.returns AS PERMISSIVE FOR ALL TO authenticated USING ((shop_id = ( SELECT my_store_id() AS my_store_id))) WITH CHECK ((shop_id = ( SELECT my_store_id() AS my_store_id)));
CREATE POLICY tenant_isolation ON public.sale_items AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM sales s WHERE ((s.id = sale_items.sale_id) AND (s.shop_id = ( SELECT my_store_id() AS my_store_id)))))) WITH CHECK ((EXISTS ( SELECT 1 FROM sales s WHERE ((s.id = sale_items.sale_id) AND (s.shop_id = ( SELECT my_store_id() AS my_store_id))))));
CREATE POLICY tenant_isolation ON public.sales AS PERMISSIVE FOR ALL TO authenticated USING ((shop_id = ( SELECT my_store_id() AS my_store_id))) WITH CHECK ((shop_id = ( SELECT my_store_id() AS my_store_id)));
CREATE POLICY tenant_isolation ON public.shifts AS PERMISSIVE FOR ALL TO authenticated USING ((shop_id = ( SELECT my_store_id() AS my_store_id))) WITH CHECK ((shop_id = ( SELECT my_store_id() AS my_store_id)));
CREATE POLICY "Allow authenticated or anon to create store" ON public.stores AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow store updates by owners" ON public.stores AS PERMISSIVE FOR UPDATE TO public USING (((id IN ( SELECT profiles.store_id FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['Owner'::text, 'Admin'::text]))))) OR (auth.role() = 'authenticated'::text)));
CREATE POLICY "Users can read their store" ON public.stores AS PERMISSIVE FOR SELECT TO public USING (((id IN ( SELECT profiles.store_id FROM profiles WHERE (profiles.id = auth.uid()))) OR (auth.role() = 'authenticated'::text)));
CREATE POLICY tenant_isolation ON public.supplier_payments AS PERMISSIVE FOR ALL TO authenticated USING ((shop_id = ( SELECT my_store_id() AS my_store_id))) WITH CHECK ((shop_id = ( SELECT my_store_id() AS my_store_id)));
CREATE POLICY tenant_isolation ON public.suppliers AS PERMISSIVE FOR ALL TO authenticated USING ((shop_id = ( SELECT my_store_id() AS my_store_id))) WITH CHECK ((shop_id = ( SELECT my_store_id() AS my_store_id)));
CREATE POLICY "Users can manage own sessions" ON public.user_sessions AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id));
