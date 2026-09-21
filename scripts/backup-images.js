#!/usr/bin/env node

/**
 * =============================================================================
 * FALCON AGS STORE ERP — PRODUCT IMAGE BUCKET BACKUP / RESTORE
 *
 *   node scripts/backup-images.js            Download every product image to
 *                                            ./backups/products-images/  (copy that folder to
 *                                            Google Drive / a USB to keep it safe)
 *
 *   node scripts/backup-images.js --restore  Upload that folder back into the Supabase `products`
 *                                            bucket (needs SUPABASE_SERVICE_ROLE_KEY)
 *
 * Images live only in Supabase Storage; the database stores just their URLs. Run the backup weekly
 * (or before/after big product changes) so photos survive a total Supabase loss. See RESTORE.md.
 * =============================================================================
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

// Simple .env parser to avoid an extra dependency (same approach as backup-to-drive.js).
function loadEnv() {
  const envFiles = [".env.local", ".env.production", ".env"];
  for (const file of envFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (!fs.existsSync(fullPath)) continue;
    for (const line of fs.readFileSync(fullPath, "utf-8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}
loadEnv();

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://knbabffighhuguxsdtzj.supabase.co").replace(/\/$/, "");
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SHOP_ID = process.env.DEFAULT_SHOP_ID || process.env.NEXT_PUBLIC_SHOP_ID || "a0000000-0000-0000-0000-000000000001";
const BUCKET = "products";
const OUT_DIR = path.join(process.cwd(), "backups", "products-images");
const PUBLIC_PREFIX = `/storage/v1/object/public/${BUCKET}/`;

function getJson(url, key) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "GET", headers: { apikey: key, Authorization: `Bearer ${key}` } }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Bad JSON from ${url}: ${data.slice(0, 120)}`));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function downloadTo(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 5) {
          res.resume();
          return resolve(downloadTo(res.headers.location, dest, redirects + 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve()));
        file.on("error", reject);
      })
      .on("error", reject);
  });
}

function uploadFile(objectPath, buf) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`);
    const ext = path.extname(objectPath).toLowerCase();
    const type = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/webp";
    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          apikey: SERVICE,
          Authorization: `Bearer ${SERVICE}`,
          "Content-Type": type,
          "x-upsert": "true",
          "Content-Length": buf.length,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => (res.statusCode < 300 ? resolve() : reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 120)}`))));
      }
    );
    req.on("error", reject);
    req.end(buf);
  });
}

async function backup() {
  const key = SERVICE || ANON;
  if (!key) {
    console.error("❌ No Supabase key found in .env.local (need NEXT_PUBLIC_SUPABASE_ANON_KEY).");
    process.exit(1);
  }
  console.log("🖼️  Falcon product-image backup");
  console.log(`   shop: ${SHOP_ID}`);

  const rows = await getJson(
    `${SUPABASE_URL}/rest/v1/products?select=image_url,back_image_url&shop_id=eq.${SHOP_ID}`,
    key
  );
  if (!Array.isArray(rows)) {
    console.error("❌ Could not read products:", JSON.stringify(rows).slice(0, 200));
    process.exit(1);
  }

  const objects = new Set();
  for (const r of rows) {
    for (const field of [r.image_url, r.back_image_url]) {
      if (!field) continue;
      for (const part of String(field).split("|||")) {
        const u = part.trim();
        const at = u.indexOf(PUBLIC_PREFIX);
        if (u.startsWith("http") && at !== -1) {
          objects.add(u.slice(at + PUBLIC_PREFIX.length).split("?")[0]);
        }
      }
    }
  }

  console.log(`   ${rows.length} products → ${objects.size} unique image files`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let ok = 0;
  let fail = 0;
  for (const obj of objects) {
    const dest = path.join(OUT_DIR, obj);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      ok++;
      continue; // already downloaded (resume-friendly)
    }
    const url = `${SUPABASE_URL}${PUBLIC_PREFIX}${encodeURI(obj)}`;
    try {
      await downloadTo(url, dest);
      ok++;
      process.stdout.write(`\r   downloaded ${ok}/${objects.size}   `);
    } catch (e) {
      fail++;
      console.warn(`\n   ⚠️  ${obj}: ${e.message}`);
    }
  }
  console.log(`\n✅ Done. Saved ${ok} images to ${OUT_DIR}${fail ? ` (${fail} failed)` : ""}`);
  console.log("   👉 Copy the 'backups/products-images' folder to Google Drive / USB to keep it safe.");
}

function walk(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

async function restore() {
  if (!SERVICE) {
    console.error("❌ Restore needs SUPABASE_SERVICE_ROLE_KEY in .env.local (upload permission).");
    process.exit(1);
  }
  if (!fs.existsSync(OUT_DIR)) {
    console.error(`❌ No backup folder found at ${OUT_DIR}. Run the backup first (or copy it here).`);
    process.exit(1);
  }
  const files = walk(OUT_DIR);
  console.log(`♻️  Restoring ${files.length} images into the '${BUCKET}' bucket...`);
  let ok = 0;
  let fail = 0;
  for (const rel of files) {
    try {
      await uploadFile(rel, fs.readFileSync(path.join(OUT_DIR, rel)));
      ok++;
      process.stdout.write(`\r   uploaded ${ok}/${files.length}   `);
    } catch (e) {
      fail++;
      console.warn(`\n   ⚠️  ${rel}: ${e.message}`);
    }
  }
  console.log(`\n✅ Restore done. Uploaded ${ok} images${fail ? ` (${fail} failed)` : ""}.`);
}

const isRestore = process.argv.includes("--restore");
(isRestore ? restore() : backup()).catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
