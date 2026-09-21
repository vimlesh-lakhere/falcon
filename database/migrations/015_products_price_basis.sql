-- Run in Supabase SQL Editor (safe to run more than once).
--
-- Adds an explicit marker to every product: are its prices (selling_price, mrp, purchase_price,
-- wholesale_price) entered PER PIECE or PER PACK (ladi/box)? Until now this was guessed differently
-- by the website and the APK, so the same product showed different prices.
--
-- Default is 'piece' — how most products were entered — so adding this column changes NOTHING yet.
-- Later we flip the few genuine pack products (e.g. Glow & Lovely) to 'pack', and both the website
-- and the app read this flag to compute identical, correct prices.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_basis text NOT NULL DEFAULT 'piece';

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_price_basis_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_price_basis_check CHECK (price_basis IN ('piece', 'pack'));

-- Check:
--   select price_basis, count(*) from public.products group by price_basis;
