#!/usr/bin/env node

/**
 * =============================================================================
 * FALCON AGS STORE ERP — CLI RESTORE SCRIPT
 * Run: `node scripts/restore-from-backup.js path/to/falcon_backup_YYYY-MM-DD.json`
 * =============================================================================
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const RESTORE_ORDER = [
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

async function upsertSupabaseRows(table, rows) {
  if (!rows || rows.length === 0) return 0;

  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    const body = JSON.stringify(rows);

    const onConflict =
      table === "customer_prices"
        ? "customer_id,product_id"
        : "id";

    const options = {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: `resolution=merge-duplicates,return=minimal`,
      },
    };

    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(rows.length);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.write(body);
    req.end();
  });
}

async function runRestore() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("❌ Usage: node scripts/restore-from-backup.js <path-to-backup.json>");
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  console.log("=======================================================");
  console.log("⚡ Starting Falcon ERP Disaster Recovery Restore Engine");
  console.log(`📁 Target File: ${filePath}`);
  console.log("=======================================================\n");

  const raw = fs.readFileSync(filePath, "utf-8");
  const backup = JSON.parse(raw);

  if (!backup.tables) {
    console.error("❌ Invalid backup file: missing 'tables' object.");
    process.exit(1);
  }

  let grandTotal = 0;

  for (const table of RESTORE_ORDER) {
    const rows = backup.tables[table];
    if (rows && rows.length > 0) {
      process.stdout.write(`⏳ Restoring [${table}] (${rows.length} rows)... `);
      try {
        await upsertSupabaseRows(table, rows);
        grandTotal += rows.length;
        console.log("✅ Success");
      } catch (err) {
        console.log(`⚠️ Partial/Error: ${err.message}`);
      }
    }
  }

  console.log("\n=======================================================");
  console.log(`🎉 Full Restore Finished! Restored ${grandTotal} total records.`);
  console.log("=======================================================");
}

runRestore().catch((err) => {
  console.error("Fatal restore error:", err);
  process.exit(1);
});
