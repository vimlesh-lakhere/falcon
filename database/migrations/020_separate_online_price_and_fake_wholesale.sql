-- 020: Separate shop (POS) and online prices; remove fake wholesale rates.  (2026-09-25)
--
-- 1. online_price was a COPY of selling_price on every product saved from the Falcon Quick Add
--    app (it always sent online_price = selling_price). A copy freezes the online price: changing
--    the shop price later would not reach the store. NULL now means "online = shop price"; only a
--    genuinely different online price is stored. (All 21 copies were identical to selling_price.)
--
-- 2. wholesale_price >= selling_price is not a wholesale rate. These came from the app copying the
--    typed box price (or the selling price) into wholesale, e.g. Blue Heaven ₹15: selling 6.67/pc,
--    "wholesale" 240 (the box price); Spinz DeTAN: selling 8/pc, "wholesale" 80 (per ladi = 8/pc).
--    They showed a fake "Wholesale" tag on the online store. 11 active rows at time of writing:
--    Baal Choti, Blue Heaven ₹15, Chimti Patta ₹10, Emami F&H, Everyuth Peel-Off (Ladi 13),
--    Glow & Lovely (Lad 12), Guja, Purse Big, S G Blommer, Sheetal kajal, Spinz DeTAN.
--    (The app/web code also ignores such values now, so this is data hygiene, not a hard dependency.)

UPDATE public.products
SET online_price = NULL
WHERE online_price IS NOT NULL
  AND abs(online_price - selling_price) < 0.001;

UPDATE public.products
SET wholesale_price = NULL
WHERE wholesale_price IS NOT NULL
  AND wholesale_price > 0
  AND wholesale_price >= selling_price;
