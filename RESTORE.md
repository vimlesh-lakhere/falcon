# Falcon 360 — Disaster Recovery (bring everything back fast)

If Vercel and/or Supabase are lost, this is how to rebuild the whole system. With the backups in
place (below), a full rebuild takes ~15–20 minutes.

---

## The 3 things you MUST keep safe (outside Vercel & Supabase)

Everything else can be rebuilt from these. Keep them in **two** places (e.g. your PC **and** Google
Drive / a password manager):

1. **The code** → already on GitHub: `github.com/vimlesh-lakhere/falcon`. Nothing to do — just keep
   access to the GitHub account. This is the whole app.
2. **The secrets** → your `.env.local` / `.env.production` files (they are NOT in GitHub on purpose).
   Save a copy somewhere safe. Full list of keys is at the bottom of this file.
3. **A recent database backup** → export it from the app: **Settings → Backup → Export** (downloads a
   `falcon_backup_*.json`). Do this **weekly**, or turn on the Google Drive auto-backup so it happens
   by itself. This file is all your products, sales, customers, khata, etc.

> Also keep a copy of the **schema** (the database structure). Best way: run `supabase db dump`
> (see step 2B). If you can't, the repo files rebuild it — see step 2A.

---

## Recovery steps

### 1. Bring back the website (Vercel) — ~3 min
1. Log in to (or create) a Vercel account → **Add New → Project → Import** `vimlesh-lakhere/falcon`
   from GitHub.
2. Before the first deploy, open **Settings → Environment Variables** and paste in all the keys from
   your saved `.env` (see the checklist at the bottom). At minimum the app needs the **Supabase** and
   **domain** keys to boot.
3. Deploy. You now have a working site on a `*.vercel.app` URL.

### 2. Bring back the database (Supabase)

**First create a new Supabase project** (free tier is fine), note its **Project URL**, **anon key**,
and **service_role key** (Dashboard → Settings → API) — you'll put these into Vercel env vars.

**2A. Rebuild the structure from the repo (no tools needed).** In the new project's **SQL Editor**,
run these files from the repo, in order:
   1. `database/schema_master.sql` — base tables
   2. `database/migrations/0XX_*.sql` — run each **in number order** (002 → 017), skipping the
      `*_rollback_*` files. These add later columns (e.g. `price_basis`, store `slug`) and turn on
      security.
   3. `database/schema_current_objects.sql` — guarantees all functions, triggers and Row Level
      Security match the live setup (safe to run last; it's the source of truth for those objects).

**2B. (Recommended, more reliable) Keep a real schema dump.** Instead of 2A, keep a fresh
`supabase db dump` and just paste it back. To make one now and after any DB change:
```bash
# one-time: install the Supabase CLI, then log in
npx supabase login
# schema only (structure): get the DB URL from Dashboard → Settings → Database → Connection string
npx supabase db dump --db-url "postgresql://postgres:[PASSWORD]@db.<ref>.supabase.co:5432/postgres" -f schema.sql
```
Save `schema.sql` next to your other backups. To restore: create the new project, open SQL Editor,
paste `schema.sql`, run.

**2C. Restore your data.** In the rebuilt app, sign up the owner account again (same email), then go
to **Settings → Backup → Restore** and upload your latest `falcon_backup_*.json`. It re-inserts every
table in the correct order.

**2D. Re-create the images bucket.** In Supabase → **Storage**, create a public bucket named
**`products`**. (Product image files themselves are only recoverable if you kept a copy of the bucket
— see "Images" below. Missing images just show a placeholder; everything else works.)

### 3. Point the domain back — ~2 min
In your domain registrar's DNS for `falcon360.in`, point it at the new Vercel project (Vercel shows
the exact A/CNAME records under the project's **Domains** tab). Add `www`, `ags`, and any shop
subdomains the same way. DNS can take a few minutes to go live.

### 4. Re-check the secrets in Vercel
Update `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to
the **new** Supabase project's values, then redeploy. Done.

---

## Images (product photos)

Photos live in Supabase Storage (`products` bucket), not in the database — the database only stores
their URLs. If the Supabase project is deleted, the image files are gone unless you kept a copy.

**Back them up (run weekly, one command):**
```bash
npm run backup:images
```
This downloads every product photo into `backups/products-images/`. Copy that folder to Google Drive
or a USB — that's your image backup. (The folder is git-ignored, so it never goes to GitHub.) The
script is resume-friendly: re-running only fetches new images.

**Restore them** into a fresh Supabase (after re-creating the public `products` bucket, and with
`SUPABASE_SERVICE_ROLE_KEY` in `.env.local`):
```bash
npm run backup:images:restore
```
Losing images is not fatal — the store still works and you can re-upload photos later.

---

## Environment variables checklist

Copy these from your saved `.env` into the new Vercel project. **Must-have** = the app won't run
without them. **Optional** = extra features (AI images, cloud backup) that degrade gracefully if absent.

**Must-have — core**
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `DEFAULT_SHOP_ID`, `NEXT_PUBLIC_SHOP_ID` (the AGS shop id)
- `NEXT_PUBLIC_ROOT_DOMAIN` (e.g. `falcon360.in`), `NEXT_PUBLIC_SHOP_WHATSAPP`
- `CUSTOMER_SESSION_SECRET` (any long random string — signs the storefront login cookie)

**Must-have — payments (Razorpay)**
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`

**Must-have — customer OTP (Firebase)**
- `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`,
  `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`,
  `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

**Optional — WhatsApp order messages**
- `WHATSAPP_API_TOKEN`, `WHATSAPP_GATEWAY_URL`

**Optional — Google Drive auto-backup**
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_DRIVE_FOLDER_ID`
  (or `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN`)

**Optional — AI image tools** (product photo enhance / background removal)
- `GEMINI_API_KEY` / `NEXT_PUBLIC_GEMINI_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`,
  `CLIPDROP_API_KEY`, `REMOVE_BG_API_KEY` / `NEXT_PUBLIC_REMOVE_BG_API_KEY`,
  `HF_TOKEN` / `HUGGINGFACE_API_KEY`, `REMBG_SERVICE_URL` / `NEXT_PUBLIC_REMBG_SERVICE_URL`,
  `REMBG_MODEL`, `ENABLE_AI_IMAGE_ENHANCE`, `AI_ENHANCE_MAX_FILE_SIZE_MB`,
  `AI_ENHANCE_RATE_LIMIT_PER_HOUR`, `GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

> `NODE_ENV`, `VERCEL`, `VERCEL_ENV` are set by Vercel automatically — do not add them yourself.

---

## Automatic weekly backup (already set up)

A Windows Task Scheduler job named **"Falcon Weekly Backup"** runs every **Sunday 7:00 PM** (and
catches up if the PC was off). It runs `scripts/weekly-backup.bat`, which:
- exports the full data backup (`backups/falcon_backup_*.json`),
- downloads all product images (`backups/products-images/`),
- **mirrors the whole `backups` folder to `OneDrive\Falcon_Backups`** — so it goes off this PC to
  the cloud automatically (OneDrive syncs it).

Manage it:
- **Run now:** open *Task Scheduler* → find *Falcon Weekly Backup* → Run. (Or the app's Settings → Backup.)
- **Change day/time:** Task Scheduler → the task → Triggers → Edit.
- **Check it ran:** see `backups\backup-log.txt`, or Task Scheduler's *Last Run Result* (0 = success).
- The cloud copy lives in your OneDrive at **Falcon_Backups** — that is your off-site backup.

> Still keep your `.env` secrets saved separately (OneDrive/password manager) — the auto-backup covers
> data + images, not the secrets.

## Keep-it-safe checklist
- **Data + images:** automatic weekly (above). ✅
- **After any database change** (running a migration): refresh your `schema.sql` (step 2B).
- **Whenever you change a secret in Vercel:** update your saved `.env` copy too.
- Keep the GitHub account, the domain registrar login, and the backup files each in two places.
