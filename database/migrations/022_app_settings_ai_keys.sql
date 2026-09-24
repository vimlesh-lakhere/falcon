-- =============================================================================
-- 022 — app_settings: durable, server-only store for runtime AI keys
-- =============================================================================
-- The AI Center lets the owner paste a Gemini / remove.bg key. The old code
-- wrote these to `.env.local`, which is a NO-OP on Vercel (read-only serverless
-- filesystem) — so keys never survived a cold start and AI features silently
-- stopped working in production.
--
-- They now persist here. RLS is enabled with NO policies, so only the
-- service-role key (server routes) can read/write; anon and authenticated
-- users cannot see the keys. Applied live.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  key         text PRIMARY KEY,
  value       text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
-- (intentionally no policies: service-role only)
