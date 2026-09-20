-- PENDING: run in Supabase Dashboard > SQL Editor (safe to run more than once).
--
-- Makes a POS sale ONE atomic transaction instead of ~6 separate calls from the browser:
-- sale header + sale_items + payments + stock_movements + customer udhaar balance, all-or-nothing.
--
-- Why:
--   * Correctness: today, if the stock_movements insert fails the sale still saves, so stock is
--     never deducted (silent inventory desync). And if any step fails midway you get an orphan
--     sale. This function rolls everything back on any error.
--   * Usage/speed (free tier): 1 round-trip to Supabase per bill instead of ~6.
--
-- The app (repositories/pos.repo.ts) calls this via supabase.rpc('pos_checkout', { payload }).
-- Until this runs, the app automatically uses the old multi-call path, so nothing breaks.
--
-- The two existing triggers still fire inside the transaction, exactly as before:
--   * trg_stock_movement_recompute  -> deducts products.current_stock (and variant stock)
--   * trg_sale_customer_totals      -> adds total_amount to customers.total_spend on completed sales

CREATE OR REPLACE FUNCTION public.pos_checkout(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path = public, pg_temp
AS $$
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
$$;

-- POS is staff-only: allow signed-in users, never anonymous storefront visitors.
REVOKE EXECUTE ON FUNCTION public.pos_checkout(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pos_checkout(jsonb) TO authenticated;
