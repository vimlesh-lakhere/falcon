import { NextRequest, NextResponse } from "next/server";
import { dryRunBackup, restoreDatabaseFromBackup } from "@/lib/backup/engine";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || !body.backupData) {
      return NextResponse.json(
        { error: "No backup data provided in request body." },
        { status: 400 }
      );
    }

    const { backupData, dryRun = true, mode = "upsert" } = body;

    // 1. Dry Run / Validation Mode
    if (dryRun) {
      const report = dryRunBackup(backupData);
      return NextResponse.json({
        mode: "dry_run",
        report,
      });
    }

    // 2. Live Restore Mode
    const result = await restoreDatabaseFromBackup(backupData, mode);

    // Record in audit_logs / backup_logs
    try {
      const supabase = getAdminSupabaseClient();
      await supabase.from("backup_logs").insert({
        shop_id: backupData.metadata?.shopId || "a0000000-0000-0000-0000-000000000001",
        backup_type: "restore_execution",
        storage_destination: "local_upload",
        file_name: `restore_${new Date().toISOString()}`,
        records_count: result.totalRestored,
        status: result.success ? "completed" : "failed",
        error_message: result.errors.join("; ").slice(0, 500),
      });
    } catch {
      // Ignore if backup_logs table not yet created
    }

    return NextResponse.json({
      mode: "live_restore",
      result,
    });
  } catch (error: any) {
    console.error("[API Backup Restore Error]", error);
    return NextResponse.json(
      { error: "Failed to execute restore process", details: error.message },
      { status: 500 }
    );
  }
}
