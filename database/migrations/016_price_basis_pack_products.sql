-- Run in Supabase SQL Editor (safe to run more than once).
--
-- Marks the products whose selling_price is a PER-PACK (box/ladi) price, not per piece. Everything
-- else stays 'piece' (the default). The website + APK both read price_basis, so after this each of
-- these shows one correct price in both places:
--   Glow & Lovely serum  -> ₹8.33/pc, ₹100/ladi (12)
--   Lakme sun cream       -> ₹8/pc,    ₹96/box (12)
--   Kaveri Mehendi Cone   -> ₹4.50/pc, ₹54/box (12)
--   Emami Fair & Handsome -> ₹8.33/pc, ₹100/box (12)
--
-- NOTE: the current (old) code ignores price_basis, so running this changes nothing on the live
-- site by itself. It only takes effect once the new pricing code is deployed.

update public.products set price_basis = 'pack'
where id in (
  '5b7edccf-d23b-4ef3-83d0-0b150c80d32e',  -- Glow & Lovely Re-New Bright Serum Sachet
  'e173eb47-ca3f-4d0c-b0ba-3e7b861c626a',  -- Lakme sun cream ₹10
  '5250921f-a0d7-41d6-b7f8-8257e1cae5a0',  -- Kaveri Mehendi Cone
  '26c562d4-7272-4fd5-acb1-fa48a761ef82'   -- Emami Fair And Handsome 10g
);

-- Emami's base selling_price (₹10) was a leftover per-piece value while its online/wholesale price
-- (₹100) is the per-box price. Align the base price to the per-box value so the row is internally
-- consistent as 'pack' (the online ₹100 already drives the shown price either way).
update public.products set selling_price = 100
where id = '26c562d4-7272-4fd5-acb1-fa48a761ef82' and selling_price < 100;

-- Check:
--   select name, price_basis, selling_price from public.products where price_basis = 'pack';
