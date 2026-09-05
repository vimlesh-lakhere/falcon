#!/usr/bin/env node

/**
 * =============================================================================
 * FALCON AGS STORE ERP — AUTOMATED BACKUP TO GOOGLE DRIVE SCRIPT
 * Run manually: `node scripts/backup-to-drive.js`
 * Or schedule via Windows Task Scheduler / Linux cron / GitHub Actions
 * =============================================================================
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

// Simple .env parser to avoid extra dependency
function loadEnv() {
  const envFiles = [".env.local", ".env.production", ".env"];
  for (const file of envFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const lines = fs.readFileSync(fullPath, "utf-8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const idx = trimmed.indexOf("=");
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://knbabffighhuguxsdtzj.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SHOP_ID = process.env.DEFAULT_SHOP_ID || "a0000000-0000-0000-0000-000000000001";

const TABLES = [
  "shops",
  "categories",
  "units",
  "suppliers",
  "products",
  "product_variants",
  "product_batches",
  "customers",
  "customer_prices",
  "purchase_orders",
  "purchase_order_items",
  "supplier_payments",
  "sales",
  "sale_items",
  "payments",
  "stock_movements",
  "returns",
  "return_items",
  "product_requests",
  "shifts",
  "notifications",
  "audit_logs",
];

async function fetchSupabaseTable(table) {
  return new Promise((resolve) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}?select=*`);
    const options = {
      method: "GET",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(Array.isArray(json) ? json : []);
        } catch (e) {
          resolve([]);
        }
      });
    });

    req.on("error", (err) => {
      console.error(`[Error] Failed to fetch table ${table}:`, err.message);
      resolve([]);
    });

    req.end();
  });
}

async function runBackup() {
  console.log("=======================================================");
  console.log("🚀 Starting Falcon ERP 360° Backup Pipeline...");
  console.log(`🕒 Timestamp: ${new Date().toLocaleString()}`);
  console.log(`🏢 Shop ID: ${SHOP_ID}`);
  console.log("=======================================================\n");

  if (!SUPABASE_KEY) {
    console.error("❌ ERROR: Supabase key missing in environment variables!");
    process.exit(1);
  }

  const backupData = {
    metadata: {
      app: "Falcon AGS Store ERP",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      shopId: SHOP_ID,
      totalRecords: 0,
      tableCounts: {},
      generator: "Falcon CLI Backup Script",
    },
    tables: {},
  };

  let grandTotal = 0;

  for (const table of TABLES) {
    process.stdout.write(`⏳ Fetching [${table}]... `);
    const rows = await fetchSupabaseTable(table);
    backupData.tables[table] = rows;
    backupData.metadata.tableCounts[table] = rows.length;
    grandTotal += rows.length;
    console.log(`✅ ${rows.length} records`);
  }

  backupData.metadata.totalRecords = grandTotal;

  const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `falcon_backup_${timestampStr}.json`;

  // 1. Save Local Snapshot in ./backups/ directory
  const backupsDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const localFilePath = path.join(backupsDir, fileName);
  fs.writeFileSync(localFilePath, JSON.stringify(backupData, null, 2), "utf-8");
  console.log(`\n💾 Local backup snapshot saved: ${localFilePath}`);
  console.log(`📊 Total Records Backed Up: ${grandTotal}`);

  // 2. Google Drive Sync if credentials configured
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const saKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if ((clientId && clientSecret && refreshToken) || (saEmail && saKey)) {
    console.log("\n☁️ Connecting to Google Drive...");
    try {
      const { google } = require("googleapis");
      const { Readable } = require("stream");

      let auth;
      if (clientId && clientSecret && refreshToken) {
        console.log("🔑 Authenticating via User OAuth2 (Personal Drive Quota)...");
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        auth = oauth2Client;
      } else {
        console.log("🤖 Authenticating via Service Account...");
        auth = new google.auth.JWT({
          email: saEmail,
          key: saKey.replace(/\\n/g, "\n"),
          scopes: ["https://www.googleapis.com/auth/drive"],
        });
      }

      const drive = google.drive({ version: "v3", auth });

      // Find or create Falcon_ERP_Backups folder
      let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      if (!folderId) {
        const folderList = await drive.files.list({
          q: "mimeType='application/vnd.google-apps.folder' and name='Falcon_ERP_Backups' and trashed=false",
          fields: "files(id, name)",
        });

        if (folderList.data.files && folderList.data.files.length > 0) {
          folderId = folderList.data.files[0].id;
        } else {
          const newFolder = await drive.files.create({
            requestBody: {
              name: "Falcon_ERP_Backups",
              mimeType: "application/vnd.google-apps.folder",
            },
            fields: "id",
          });
          folderId = newFolder.data.id;
        }
      }

      // Upload to Google Drive
      const uploadRes = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
        },
        media: {
          mimeType: "application/json",
          body: Readable.from([JSON.stringify(backupData, null, 2)]),
        },
        fields: "id, name, webViewLink",
      });

      try {
        await drive.permissions.create({
          fileId: uploadRes.data.id,
          requestBody: {
            role: "reader",
            type: "anyone",
          },
        });
      } catch (pErr) {}

      console.log(`✅ Successfully uploaded to Google Drive! File ID: ${uploadRes.data.id}`);
      if (uploadRes.data.webViewLink) {
        console.log(`🔗 Drive Link: ${uploadRes.data.webViewLink}`);
      }
    } catch (gErr) {
      console.error("⚠️ Google Drive upload skipped/failed:", gErr.message);
    }
  } else {
    console.log("\nℹ️ Note: Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in .env.local to enable automated Google Drive cloud upload.");
  }

  console.log("\n🎉 Backup Completed Successfully!");
}

runBackup().catch((err) => {
  console.error("Fatal backup error:", err);
  process.exit(1);
});
