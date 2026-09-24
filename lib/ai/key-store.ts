import { getAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * AI API keys (Gemini, remove.bg) are configured at runtime from the AI Center
 * UI. They used to be written to `.env.local`, which silently fails on Vercel's
 * read-only serverless filesystem, so keys never persisted across cold starts.
 *
 * They now live in the service-role-only `app_settings` table. `hydrateAiKeys()`
 * loads them into `process.env` once per warm instance (with a short TTL so a
 * freshly saved key propagates) — this lets every existing `process.env.GEMINI_API_KEY`
 * read site keep working with no change. An env var, if set, always wins.
 */
const MANAGED_KEYS = ["GEMINI_API_KEY", "REMOVE_BG_API_KEY"] as const;
const TTL_MS = 60_000;

let lastLoad = 0;
let inFlight: Promise<void> | null = null;

async function loadFromDb(): Promise<void> {
  try {
    const admin = getAdminSupabaseClient();
    const { data } = await admin
      .from("app_settings")
      .select("key, value")
      .in("key", MANAGED_KEYS as unknown as string[]);
    for (const row of data || []) {
      if (row?.value) process.env[row.key] = row.value as string;
    }
  } catch (err) {
    console.warn("hydrateAiKeys: could not load app_settings", err);
  } finally {
    lastLoad = Date.now();
  }
}

/** Ensure managed AI keys are present in process.env (from DB). Cheap after the first call. */
export async function hydrateAiKeys(): Promise<void> {
  if (Date.now() - lastLoad < TTL_MS) return;
  if (!inFlight) inFlight = loadFromDb().finally(() => (inFlight = null));
  await inFlight;
}

/** Persist a managed key to the DB and the current process. Pass "" to clear. */
export async function saveAiKey(key: (typeof MANAGED_KEYS)[number], value: string): Promise<void> {
  const admin = getAdminSupabaseClient();
  const clean = value.trim();
  await admin.from("app_settings").upsert({ key, value: clean, updated_at: new Date().toISOString() });
  if (clean) process.env[key] = clean;
  else delete process.env[key];
  lastLoad = 0; // force a refresh on next hydrate
}
