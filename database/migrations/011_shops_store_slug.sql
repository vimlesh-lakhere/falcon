-- PENDING: run in Supabase Dashboard > SQL Editor (safe to run more than once).
--
-- Gives every shop its own store address:  <slug>.falcon360.in
--   ags.falcon360.in           -> AGS Store (the platform owner's own shop)
--   demo-retail-store.falcon360.in -> "Demo Retail Store", and so on for every customer shop
--
-- The app (middleware.ts) looks the sub-domain up in shops.slug. Until this runs, only
-- ags.falcon360.in works; other sub-domains show "This store isn't available".
--
-- After this migration, new shops get their slug automatically at sign-up
-- (lib/store-slug.ts). NOTE for the later row-level-security step: the storefront must
-- keep read access to shops (id, name, slug, phone, address, logo_url) for anonymous visitors.

BEGIN;

ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS slug text;

-- 1) The AGS store is fixed to "ags".
UPDATE public.shops
   SET slug = 'ags'
 WHERE id = 'a0000000-0000-0000-0000-000000000001' AND slug IS NULL;

-- 2) Every other shop: a readable slug from its name, made unique with part of its id when needed.
WITH cleaned AS (
  SELECT id,
         regexp_replace(
           left(
             regexp_replace(
               regexp_replace(lower(replace(replace(name, '''', ''), chr(8217), '')), '[^a-z0-9]+', '-', 'g'),
               '(^-+)|(-+$)', '', 'g'),
             30),
           '-+$', '') AS b
    FROM public.shops
   WHERE slug IS NULL
), ranked AS (
  SELECT id, b, row_number() OVER (PARTITION BY b ORDER BY id) AS rn FROM cleaned
)
UPDATE public.shops s
   SET slug = CASE
                WHEN length(r.b) >= 3
                 AND r.rn = 1
                 AND r.b NOT IN ('www','app','api','admin','mail','email','ftp','smtp','ns1','ns2','cdn','static',
                                 'assets','status','support','blog','help','docs','store','shop','pay','login',
                                 'register','dashboard','pos')
                 AND NOT EXISTS (SELECT 1 FROM public.shops o WHERE o.slug = r.b)
                THEN r.b
                ELSE coalesce(nullif(r.b, ''), 'store') || '-' || substr(replace(s.id::text, '-', ''), 1, 4)
              END
  FROM ranked r
 WHERE s.id = r.id;

-- 3) Rules going forward: 3-40 chars, a-z 0-9 and dashes, not a reserved name, unique.
ALTER TABLE public.shops DROP CONSTRAINT IF EXISTS shops_slug_format;
ALTER TABLE public.shops ADD CONSTRAINT shops_slug_format CHECK (
  slug IS NULL OR (
    slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'
    AND slug <> ALL (ARRAY['www','app','api','admin','mail','email','ftp','smtp','ns1','ns2','cdn','static',
                           'assets','status','support','blog','help','docs','store','shop','pay','login',
                           'register','dashboard','pos'])
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS shops_slug_key ON public.shops (slug);

COMMIT;

-- Check the result:
--   select name, slug from public.shops order by created_at;
