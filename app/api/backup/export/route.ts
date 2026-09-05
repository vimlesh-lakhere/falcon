import { NextRequest, NextResponse } from "next/server";
import { exportDatabaseBackup, BACKUP_TABLES, BackupTableName } from "@/lib/backup/engine";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";
    const download = searchParams.get("download") === "true";
    const tablesParam = searchParams.get("tables");
    const shopId = searchParams.get("shopId") || undefined;

    let tablesToExport: BackupTableName[] = [...BACKUP_TABLES];
    if (tablesParam) {
      const requested = tablesParam.split(",") as BackupTableName[];
      tablesToExport = requested.filter((t) => BACKUP_TABLES.includes(t));
    }

    const backup = await exportDatabaseBackup(tablesToExport, shopId);
    const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `falcon_backup_${timestampStr}.${format}`;

    // Optionally log this backup to backup_logs
    try {
      const supabase = getAdminSupabaseClient();
      await supabase.from("backup_logs").insert({
        shop_id: backup.metadata.shopId,
        backup_type: tablesToExport.length === BACKUP_TABLES.length ? "full" : "selective",
        storage_destination: "local_download",
        file_name: fileName,
        file_size_bytes: JSON.stringify(backup).length,
        tables_included: tablesToExport,
        records_count: backup.metadata.totalRecords,
        status: "completed",
      });
    } catch {
      // Ignore if backup_logs table not yet created
    }

    if (download) {
      return new NextResponse(JSON.stringify(backup, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    return NextResponse.json(backup);
  } catch (error: any) {
    console.error("[API Backup Export Error]", error);
    return NextResponse.json(
      { error: "Failed to export backup", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const tablesToExport = (body.tables || [...BACKUP_TABLES]) as BackupTableName[];
    const shopId = body.shopId || undefined;

    const backup = await exportDatabaseBackup(tablesToExport, shopId);
    return NextResponse.json(backup);
  } catch (error: any) {
    console.error("[API Backup Export POST Error]", error);
    return NextResponse.json(
      { error: "Failed to export backup", details: error.message },
      { status: 500 }
    );
  }
}
