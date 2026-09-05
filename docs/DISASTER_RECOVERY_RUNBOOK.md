# 🚨 Falcon ERP — 360° Disaster Recovery & Complete Revival Runbook (Zero Data Loss)

> **उद्देश्य (Objective):** अगर Supabase database delete हो जाए, Vercel account ban/lock हो जाए, या पूरा infrastructure crash हो जाए, तो **10 से 15 मिनट के अंदर पूरे Falcon Store ERP को 0 से 100% फिर से live restart करना**।

---

## 📋 Emergency Revival Checklist (10-Minute Timeline)

| Step | Action | Time Taken | Target |
|---|---|---|---|
| **Step 1** | New Supabase / Postgres Instance Creation | 2 Minutes | New Database URL & Keys |
| **Step 2** | Execute Master Schema DDL (`schema_master.sql`) | 1 Minute | All Tables, Triggers & Views recreated |
| **Step 3** | Fetch Latest Backup from Google Drive | 2 Minutes | Latest JSON Snapshot |
| **Step 4** | Run Restore Engine (UI or Script) | 2 Minutes | All products, customers, sales restored |
| **Step 5** | Reconnect App & Update Environment Variables | 3 Minutes | Vercel / Next.js Live & Operational |

---

## 🛠️ Step-by-Step Restoration Guide

### Phase 1: New Database Setup (Supabase)
1. Login to [Supabase Dashboard](https://supabase.com/dashboard) (using any Google account).
2. Click **"New Project"**.
   - Project Name: `falcon-erp`
   - Database Password: Create a strong password (save it safely).
   - Region: `ap-south-1 (Mumbai, India)` for lowest latency.
3. Once the database is provisioned (approx 90 seconds), go to **Project Settings** → **API**.
4. Copy:
   - `Project URL`
   - `anon public key`
   - `service_role secret key`

---

### Phase 2: Schema & Architecture Initialization
1. In Supabase Dashboard, open the **SQL Editor** on the left menu.
2. Click **"New Query"**.
3. Open [`database/schema_master.sql`](file:///e:/Falcon/database/schema_master.sql) from this repository, copy the entire content, and paste it into the SQL Editor.
4. Click **Run (Ctrl + Enter)**.
5. ✅ **Result**: 
   - 22+ tables (`shops`, `products`, `categories`, `suppliers`, `customers`, `sales`, `sale_items`, `payments`, `stock_movements`, etc.)
   - Stock auto-calculation triggers (`trg_stock_movement_recompute`)
   - Customer total triggers (`trg_sale_customer_totals`)
   - Cashier view (`products_for_cashier`)
   - Default Store Seed (`a0000000-0000-0000-0000-000000000001`) will all be created instantly in ~15 seconds.

---

### Phase 3: Data Restoration from Google Drive
Aapke paas data restore karne ke **3 aasan tareeqe** hain:

#### Option A: In-App UI Restore (Sabse Aasan)
1. App open karein aur navigate karein: **Settings** → **💾 Backup & Disaster Recovery** tab.
2. **"Restore Database"** section me jayein.
3. Google Drive se download ki hui latest `.json` file (`falcon_backup_YYYY-MM-DD.json`) drag & drop karein.
4. **"🔍 Analyze & Dry Run"** par click karein. Ye check karega ki kitne products, sales, aur customers file me hain.
5. **"⚡ Execute Live Restore"** button click karein. System sabhi records ko automatically foreign key sequence me restore kar dega.

#### Option B: Automated Script Restore
Terminal ya Command Prompt me run karein:
```bash
node scripts/restore-from-backup.js path/to/falcon_backup_YYYY-MM-DD.json
```

#### Option C: Direct API Endpoint
```bash
curl -X POST http://localhost:3000/api/backup/restore \
  -H "Content-Type: application/json" \
  -d '{"backupData": <JSON_CONTENT>, "dryRun": false, "mode": "upsert"}'
```

---

### Phase 4: Vercel / Hosting Deployment Reconnection
Agar Vercel par dikkat aayi hai:
1. **GitHub Repository**: Code hamesha aapke GitHub repo par surakshit rehta hai.
2. Naya Vercel project create karein ya existing project ke **Settings** → **Environment Variables** me jayein.
3. Update karein:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<your-new-project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-new-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-new-service-role-key>
   DEFAULT_SHOP_ID=a0000000-0000-0000-0000-000000000001
   ```
4. Click **Redeploy**.

---

### Phase 5: Google Drive Automated Backup Configuration
Future automatic backups ke liye Google Service Account setup:
1. [Google Cloud Console](https://console.cloud.google.com/) me ek Service Account banayein (`falcon-backup-sa`).
2. Google Drive API enable karein.
3. Service Account Key (JSON) generate karein.
4. Google Drive me ek folder banayein (`Falcon_ERP_Backups`) aur us folder ko Service Account ki email ke saath **Editor** permissions dekar share karein.
5. `.env.local` / Vercel Environment Variables me add karein:
   ```env
   GOOGLE_SERVICE_ACCOUNT_EMAIL=falcon-backup-sa@project.iam.gserviceaccount.com
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_DRIVE_FOLDER_ID=<folder-id-from-url>
   ```

---

## 🛡️ Daily Operational Best Practices
- **Daily Automated Cloud Backup**: GitHub Action har raat 02:00 AM IST par Google Drive me snapshot sync karega.
- **Weekly Manual Export**: Sunday ko ek baar Settings page se "Download Full Backup" par click karke apne PC/pen-drive me copy rakh sakte hain.
- **Pre-Update Backup**: Kisi bhi bade bulk catalog upload ya price change se pehle Settings page se 1-click snapshot lein.
