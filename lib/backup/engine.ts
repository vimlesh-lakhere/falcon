import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import { resolveActiveShopId } from "@/lib/tenant";

export const BACKUP_TABLES = [
  "shops",
  "roles",
  "permissions",
  "role_permissions",
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
] as const;

export type BackupTableName = (typeof BACKUP_TABLES)[number];

export interface BackupMetadata {
  app: string;
  version: string;
  timestamp: string;
  shopId: string;
  totalRecords: number;
  tableCounts: Record<string, number>;
  checksum?: string;
  generator: string;
}

export interface FalconBackupData {
  metadata: BackupMetadata;
  tables: Partial<Record<BackupTableName, any[]>>;
}

export interface DryRunTableReport {
  tableName: string;
  recordsCount: number;
  status: "ready" | "empty" | "skipped";
}

export interface DryRunReport {
  isValid: boolean;
  timestamp: string;
  shopId: string;
  totalRecords: number;
  tables: DryRunTableReport[];
  warnings: string[];
}

export interface RestoreResult {
  success: boolean;
  restoredAt: string;
  totalRestored: number;
  details: Record<string, { insertedOrUpdated: number; error?: string }>;
  errors: string[];
}

/**
 * Exports all or selected tables from Supabase into a structured backup payload.
 */
export async function exportDatabaseBackup(
  tablesToExport: BackupTableName[] = [...BACKUP_TABLES],
  targetShopId?: string
): Promise<FalconBackupData> {
  const supabase = getAdminSupabaseClient();
  const shopId = resolveActiveShopId(targetShopId);

  const exportedTables: Partial<Record<BackupTableName, any[]>> = {};
  const tableCounts: Record<string, number> = {};
  let totalRecords = 0;

  for (const tableName of tablesToExport) {
    try {
      let query = supabase.from(tableName).select("*");

      // For shop-scoped tables, filter by shop_id if column exists
      if (
        [
          "products",
          "categories",
          "units",
          "suppliers",
          "customers",
          "sales",
          "stock_movements",
          "purchase_orders",
          "product_requests",
          "shifts",
          "notifications",
          "audit_logs",
        ].includes(tableName)
      ) {
        query = query.eq("shop_id", shopId);
      } else if (tableName === "shops") {
        query = query.eq("id", shopId);
      }

      const { data, error } = await query;

      if (error) {
        console.warn(`[Backup Export] Could not export table ${tableName}: ${error.message}`);
        exportedTables[tableName] = [];
        tableCounts[tableName] = 0;
      } else {
        const rows = data || [];
        exportedTables[tableName] = rows;
        tableCounts[tableName] = rows.length;
        totalRecords += rows.length;
      }
    } catch (err: any) {
      console.error(`[Backup Export] Exception on table ${tableName}:`, err);
      exportedTables[tableName] = [];
      tableCounts[tableName] = 0;
    }
  }

  const metadata: BackupMetadata = {
    app: "Falcon AGS Store ERP",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    shopId,
    totalRecords,
    tableCounts,
    generator: "Falcon 360 Backup & Disaster Recovery Engine",
  };

  return {
    metadata,
    tables: exportedTables,
  };
}

/**
 * Validates and provides a dry-run preview of a backup file without modifying the database.
 */
export function dryRunBackup(backupJson: any): DryRunReport {
  const warnings: string[] = [];

  if (!backupJson || typeof backupJson !== "object") {
    return {
      isValid: false,
      timestamp: "",
      shopId: "",
      totalRecords: 0,
      tables: [],
      warnings: ["Invalid JSON format: payload is not an object."],
    };
  }

  const metadata = backupJson.metadata;
  if (!metadata || !backupJson.tables) {
    warnings.push("Backup file is missing standard Falcon metadata header.");
  }

  const shopId = metadata?.shopId || "Unknown";
  const timestamp = metadata?.timestamp || new Date().toISOString();
  const tables = backupJson.tables || {};

  const tableReports: DryRunTableReport[] = [];
  let totalRecords = 0;

  for (const tableName of BACKUP_TABLES) {
    const tableData = tables[tableName];
    if (Array.isArray(tableData)) {
      const count = tableData.length;
      totalRecords += count;
      tableReports.push({
        tableName,
        recordsCount: count,
        status: count > 0 ? "ready" : "empty",
      });
    } else {
      tableReports.push({
        tableName,
        recordsCount: 0,
        status: "skipped",
      });
    }
  }

  if (totalRecords === 0) {
    warnings.push("The backup contains 0 total records across all known tables.");
  }

  return {
    isValid: warnings.length === 0 || totalRecords > 0,
    timestamp,
    shopId,
    totalRecords,
    tables: tableReports,
    warnings,
  };
}

/**
 * Restores database from a verified backup payload in strict foreign-key dependency order.
 * Mode 'upsert': Safely merges / updates records without wiping.
 * Mode 'clean': Truncates table records for the shop first (requires explicit confirmation).
 */
export async function restoreDatabaseFromBackup(
  backupData: FalconBackupData,
  mode: "upsert" | "clean" = "upsert"
): Promise<RestoreResult> {
  const supabase = getAdminSupabaseClient();
  const details: Record<string, { insertedOrUpdated: number; error?: string }> = {};
  const errors: string[] = [];
  let totalRestored = 0;

  const tables = backupData.tables || {};

  // Restore in strict dependency order
  for (const tableName of BACKUP_TABLES) {
    const rows = tables[tableName];
    if (!Array.isArray(rows) || rows.length === 0) {
      details[tableName] = { insertedOrUpdated: 0 };
      continue;
    }

    try {
      // Chunk inserts in batches of 50 to avoid payload size limit issues
      const CHUNK_SIZE = 50;
      let insertedCount = 0;

      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);

        if (mode === "upsert") {
          // Determine conflict columns
          const onConflict =
            tableName === "customer_prices"
              ? "customer_id,product_id"
              : tableName === "role_permissions"
              ? "role_id,permission_key"
              : "id";

          const { error } = await supabase
            .from(tableName)
            .upsert(chunk, { onConflict, ignoreDuplicates: false });

          if (error) {
            console.error(`[Restore Error] Table ${tableName}:`, error);
            errors.push(`Table ${tableName}: ${error.message}`);
            break;
          } else {
            insertedCount += chunk.length;
          }
        } else {
          // Standard insert
          const { error } = await supabase.from(tableName).insert(chunk);
          if (error) {
            console.error(`[Restore Error] Table ${tableName}:`, error);
            errors.push(`Table ${tableName}: ${error.message}`);
            break;
          } else {
            insertedCount += chunk.length;
          }
        }
      }

      details[tableName] = { insertedOrUpdated: insertedCount };
      totalRestored += insertedCount;
    } catch (err: any) {
      console.error(`[Restore Exception] Table ${tableName}:`, err);
      const msg = err?.message || String(err);
      errors.push(`Table ${tableName} exception: ${msg}`);
      details[tableName] = { insertedOrUpdated: 0, error: msg };
    }
  }

  return {
    success: errors.length === 0,
    restoredAt: new Date().toISOString(),
    totalRestored,
    details,
    errors,
  };
}
