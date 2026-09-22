-- Run in Supabase SQL Editor. ONE-TIME cleanup: delete every store EXCEPT AGS Store
-- (a0000000-0000-0000-0000-000000000001 = vimlesh.lakhere@gmail.com's store, which has all the data).
--
-- Verified before writing: the 5 non-AGS shops are ALL EMPTY (0 products / 0 sales / 0 customers) —
-- they are just junk 14-day trial stores. FK cascade removes each shop's data automatically, and
-- deleting the matching `stores` row cascades its profile/branches/sessions. AGS is never touched.
--
-- IRREVERSIBLE. Take a data backup first (Settings -> Backup -> Export) if you want a safety copy.

BEGIN;

-- 1. Every shop except AGS (CASCADE drops each shop's products/sales/customers/etc — all empty here).
DELETE FROM public.shops
WHERE id <> 'a0000000-0000-0000-0000-000000000001';

-- 2. Every store except AGS (CASCADE drops the linked trial-user profiles / branches / sessions).
DELETE FROM public.stores
WHERE id <> 'a0000000-0000-0000-0000-000000000001';

COMMIT;

-- Check (should each return exactly 1 row = AGS Store):
--   select id, name from public.shops;
--   select id, name from public.stores;
