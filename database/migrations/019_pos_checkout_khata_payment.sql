-- Run in Supabase SQL Editor.
-- Lets a POS bill also collect EXTRA cash toward the customer's PREVIOUS balance in the same bill.
--
-- New optional payload fields:
--   khata_payment : amount (₹) the customer paid beyond this bill, applied to their old dues.
--   khata_method  : 'cash' | 'upi' | 'card' for that extra amount (defaults to cash).
--
-- The bill's own payments still settle the bill (v_due). The extra is recorded as a normal
-- customer_payments row and netted off the running balance — one atomic write, so it also works
-- for offline bills (they replay through this same function on sync). Balance never goes below 0.

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
  v_khata    numeric := greatest(0, coalesce((payload->>'khata_payment')::numeric, 0));
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

  -- Extra cash paid toward the customer's PREVIOUS balance (beyond this bill): record it as a
  -- customer payment. Only meaningful when a customer is attached.
  IF v_cust IS NOT NULL AND v_khata > 0 THEN
    INSERT INTO customer_payments (shop_id, customer_id, amount, payment_method, reference_no, notes, payment_date)
    VALUES (
      v_shop, v_cust, v_khata,
      lower(coalesce(nullif(payload->>'khata_method', ''), 'cash')),
      nullif(payload->>'khata_reference', ''),
      'POS ' || v_invoice || ' — extra toward previous balance',
      now()
    );
  END IF;

  -- Net effect on the running balance: this bill's udhaar (adds) minus the extra paid (reduces).
  IF v_cust IS NOT NULL AND (v_due <> 0 OR v_khata <> 0) THEN
    UPDATE customers
       SET outstanding_balance = greatest(0, coalesce(outstanding_balance, 0) + v_due - v_khata)
     WHERE id = v_cust;
  END IF;

  RETURN jsonb_build_object('id', v_sale_id, 'invoice_number', v_invoice);
END;
$function$;
