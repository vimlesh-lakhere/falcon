import { NextRequest, NextResponse } from "next/server";
import {
  isGoogleDriveConfigured,
  listDriveBackups,
  uploadBackupToDrive,
  downloadDriveBackup,
} from "@/lib/backup/google-drive";
import { exportDatabaseBackup } from "@/lib/backup/engine";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const isConfigured = isGoogleDriveConfigured();

    if (!isConfigured) {
      return NextResponse.json({
        configured: false,
        message:
          "Google Drive credentials are not yet set. Add GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY to .env.local to enable automatic cloud backup.",
        files: [],
      });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const fileId = searchParams.get("fileId");

    // Action: Download specific file from Google Drive
    if (action === "download" && fileId) {
      const fileContent = await downloadDriveBackup(fileId);
      return new NextResponse(fileContent, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="falcon_drive_backup_${fileId}.json"`,
        },
      });
    }

    // Default: List recent backups
    const files = await listDriveBackups(20);

    return NextResponse.json({
      configured: true,
      files,
    });
  } catch (error: any) {
    console.error("[Google Drive GET Error]", error);
    return NextResponse.json(
      {
        configured: false,
        error: "Failed to connect or fetch from Google Drive",
        details: error.message,
        files: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isGoogleDriveConfigured()) {
      return NextResponse.json(
        {
          error:
            "Google Drive is not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in your environment variables.",
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const shopId = body.shopId || undefined;

    // 1. Generate full database export
    const backup = await exportDatabaseBackup(undefined, shopId);
    const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `falcon_backup_${timestampStr}.json`;
    const jsonString = JSON.stringify(backup, null, 2);

    // 2. Upload to Google Drive
    const uploadResult = await uploadBackupToDrive({
      fileName,
      content: jsonString,
      mimeType: "application/json",
    });

    // 3. Record in backup_logs
    try {
      const supabase = getAdminSupabaseClient();
      await supabase.from("backup_logs").insert({
        shop_id: backup.metadata.shopId,
        backup_type: "full",
        storage_destination: "google_drive",
        file_name: fileName,
        drive_file_id: uploadResult.fileId,
        drive_web_link: uploadResult.webViewLink,
        file_size_bytes: jsonString.length,
        tables_included: Object.keys(backup.tables),
        records_count: backup.metadata.totalRecords,
        status: "completed",
      });
    } catch {
      // Ignore if backup_logs table not yet created
    }

    return NextResponse.json({
      success: true,
      message: "Successfully backed up to Google Drive!",
      fileName,
      fileId: uploadResult.fileId,
      webViewLink: uploadResult.webViewLink,
      fileSizeBytes: jsonString.length,
      recordsCount: backup.metadata.totalRecords,
      timestamp: backup.metadata.timestamp,
    });
  } catch (error: any) {
    console.error("[Google Drive POST Upload Error]", error);
    return NextResponse.json(
      {
        error: "Failed to upload backup to Google Drive",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
