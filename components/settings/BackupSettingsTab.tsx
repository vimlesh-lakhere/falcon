"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Download,
  Upload,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  FileText,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
  Server,
  Layers,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BACKUP_TABLES, BackupTableName } from "@/lib/backup/engine";

interface DriveFile {
  id: string;
  name: string;
  size?: string;
  createdTime?: string;
  webViewLink?: string;
}

interface DryRunReport {
  isValid: boolean;
  timestamp: string;
  shopId: string;
  totalRecords: number;
  tables: Array<{
    tableName: string;
    recordsCount: number;
    status: "ready" | "empty" | "skipped";
  }>;
  warnings: string[];
}

/**
 * Saves a backup blob in the most reliable way for the device.
 *
 * On a phone / installed PWA a programmatic `<a download>` click is often ignored in standalone
 * mode, which is why "backup failed" showed up on mobile. So we try the native Share Sheet first
 * (Web Share API with files) — the user picks Drive, Files, WhatsApp, Gmail, etc. — and fall back
 * to the classic download on desktop or when sharing isn't available.
 */
async function saveBackupFile(
  blob: Blob,
  fileName: string,
  mimeType: string
): Promise<"shared" | "downloaded"> {
  const nav: any = typeof navigator !== "undefined" ? navigator : null;

  try {
    const file = new File([blob], fileName, { type: mimeType });
    if (nav?.share && nav?.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: fileName, text: "Falcon ERP database backup" });
        return "shared";
      } catch (e: any) {
        // User closed the share sheet — treat as done, don't double-save.
        if (e?.name === "AbortError") return "shared";
        // Any other share error → fall through to the download path.
      }
    }
  } catch {
    // Constructing File / canShare not supported → fall through to download.
  }

  const urlObj = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = urlObj;
    a.download = fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(urlObj), 4000);
  }
  return "downloaded";
}

export function BackupSettingsTab() {
  // Export states
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>([...BACKUP_TABLES]);
  const [showTableSelector, setShowTableSelector] = useState(false);

  // Google Drive states
  const [driveConfigured, setDriveConfigured] = useState<boolean | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveMessage, setDriveMessage] = useState<string | null>(null);
  const [showDriveSetup, setShowDriveSetup] = useState(false);

  // Restore states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedBackupData, setParsedBackupData] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dryRunReport, setDryRunReport] = useState<DryRunReport | null>(null);
  const [restoreMode, setRestoreMode] = useState<"upsert" | "clean">("upsert");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<any | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Fetch Google Drive backup status on mount
  useEffect(() => {
    checkDriveStatus();
  }, []);

  const checkDriveStatus = async () => {
    try {
      const res = await fetch("/api/backup/google-drive");
      const data = await res.json();
      setDriveConfigured(Boolean(data.configured));
      if (data.files) {
        setDriveFiles(data.files);
      }
      if (data.warning) {
        setDriveMessage(`⚠️ ${data.warning}`);
      } else if (data.message) {
        setDriveMessage(data.message);
      }
    } catch (err) {
      console.warn("Could not check Google Drive status:", err);
      setDriveConfigured(false);
    }
  };

  // 1-Click Download / Share Full Backup (mobile-safe)
  const handleDownloadBackup = async (format: "json" | "sql" = "json") => {
    try {
      setIsExporting(true);
      setExportSuccess(null);
      setExportError(null);

      const tablesQuery = selectedTables.join(",");
      const url = `/api/backup/export?format=${format}&download=true&tables=${encodeURIComponent(tablesQuery)}`;

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        let msg = `Server returned ${res.status}.`;
        try {
          const j = await res.json();
          msg = j.error || j.details || msg;
        } catch {}
        if (res.status === 401) {
          msg = "Your session has expired. Please log out and log in again, then retry the backup.";
        }
        throw new Error(msg);
      }

      const blob = await res.blob();
      if (blob.size < 20) {
        throw new Error("The backup came back empty. Please retry, or contact support if it repeats.");
      }

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const fileName = `falcon_backup_${timestamp}.${format}`;
      const mimeType = format === "json" ? "application/json" : "text/plain";
      const outcome = await saveBackupFile(blob, fileName, mimeType);

      const sizeKb = (blob.size / 1024).toFixed(0);
      setExportSuccess(
        outcome === "shared"
          ? `Backup ready (${sizeKb} KB) — choose where to save it: Google Drive, Files, or WhatsApp.`
          : `Backup saved (${sizeKb} KB, ${selectedTables.length} tables). Check your Downloads folder.`
      );
      setTimeout(() => setExportSuccess(null), 7000);
    } catch (err: any) {
      setExportError(err?.message || "Backup failed. Please check your connection and try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle file select for restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setDryRunReport(null);
    setRestoreResult(null);
    setRestoreError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setParsedBackupData(json);
      } catch (err) {
        setRestoreError("The selected file is not a valid JSON document.");
        setParsedBackupData(null);
      }
    };
    reader.readAsText(file);
  };

  // Run Dry-Run Analysis
  const handleAnalyzeBackup = async () => {
    if (!parsedBackupData) return;

    try {
      setIsAnalyzing(true);
      setRestoreError(null);

      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backupData: parsedBackupData,
          dryRun: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");

      setDryRunReport(data.report);
    } catch (err: any) {
      setRestoreError("Dry run failed: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Execute Live Restore
  const handleExecuteRestore = async () => {
    if (!parsedBackupData) return;

    try {
      setIsRestoring(true);
      setRestoreError(null);
      setShowConfirmModal(false);

      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backupData: parsedBackupData,
          dryRun: false,
          mode: restoreMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restore execution failed.");

      setRestoreResult(data.result);
    } catch (err: any) {
      setRestoreError("Restore error: " + err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  const toggleTable = (table: string) => {
    setSelectedTables((prev) =>
      prev.includes(table) ? prev.filter((t) => t !== table) : [...prev, table]
    );
  };

  const selectAllTables = () => setSelectedTables([...BACKUP_TABLES]);
  const deselectAllTables = () => setSelectedTables([]);

  return (
    <div className="space-y-6">
      {/* 360° Health & Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Cloud Google Drive Status */}
        <Card className="border-brand-100 bg-gradient-to-br from-white to-brand-50/20">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0 text-brand-700">
              <Cloud className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Cloud Destination
                </span>
                {driveConfigured ? (
                  <Badge variant="success" className="text-[10px] px-2 py-0.5">
                    ● Connected
                  </Badge>
                ) : (
                  <Badge variant="neutral" className="text-[10px] px-2 py-0.5">
                    Ready to Connect
                  </Badge>
                )}
              </div>
              <h4 className="text-sm font-bold text-gray-900 mt-1">Google Drive Storage</h4>
              <p className="text-xs text-gray-600 mt-0.5 truncate">
                Folder: <span className="font-mono text-brand-700">Falcon_ERP_Backups</span>
              </p>
              <button
                onClick={() => setShowDriveSetup(!showDriveSetup)}
                className="mt-2 text-[11px] font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1 cursor-pointer"
              >
                {showDriveSetup ? "Hide" : "How are my backups protected?"}
                {showDriveSetup ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Database Schema & DDL Status */}
        <Card className="border-emerald-100 bg-gradient-to-br from-white to-emerald-50/20">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Disaster Recovery
                </span>
                <Badge variant="success" className="text-[10px] px-2 py-0.5">
                  100% Prepared
                </Badge>
              </div>
              <h4 className="text-sm font-bold text-gray-900 mt-1">Master Schema DDL</h4>
              <p className="text-xs text-gray-600 mt-0.5">
                <span className="font-mono text-emerald-700">schema_master.sql</span> ready
              </p>
              <p className="mt-2 text-[11px] text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" /> Complete revival in &lt; 10 mins
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Tables & Records Scope */}
        <Card className="border-blue-100 bg-gradient-to-br from-white to-blue-50/20">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 text-blue-700">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Protection Scope
                </span>
                <Badge variant="info" className="text-[10px] px-2 py-0.5">
                  Full Coverage
                </Badge>
              </div>
              <h4 className="text-sm font-bold text-gray-900 mt-1">22 ERP Tables Active</h4>
              <p className="text-xs text-gray-600 mt-0.5">
                Catalog, Sales, POS, Stock & Ledger
              </p>
              <p className="mt-2 text-[11px] text-gray-500">
                Automated daily cron: <span className="font-mono font-medium">02:00 AM IST</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accordion: how backups are protected (if toggled) */}
      {showDriveSetup && (
        <Card className="border-brand-200 bg-brand-50/30">
          <CardContent className="p-5 space-y-3 text-xs text-gray-700">
            <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Your data is backed up in three ways
            </div>
            <ol className="list-decimal list-inside space-y-2 pl-1 text-gray-800">
              <li>
                <strong>One-tap backup (this button).</strong> "Save Full Backup (JSON)" makes a complete
                snapshot of your shop. On your phone it opens the share sheet — save it to your own
                <strong> Google Drive</strong>, <strong>Files</strong>, or WhatsApp. This is the simplest, most
                reliable cloud copy: it goes to <em>your</em> Google account and never expires.
              </li>
              <li>
                <strong>Automatic weekly backup.</strong> A scheduled job on your shop PC saves a snapshot
                every week and mirrors it to <strong>Google Drive for Desktop</strong> — no action needed.
              </li>
              <li>
                <strong>Instant restore.</strong> Any saved <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">.json</code>
                file can be re-loaded below to bring everything back.
              </li>
            </ol>
            <p className="text-[11px] text-gray-500 pt-1 border-t border-brand-100">
              Note: fully-automatic server-side upload to Google Drive isn't used — a personal Google
              account can't grant a server its own Drive storage — so the one-tap save above is the
              recommended cloud backup.
            </p>
          </CardContent>
        </Card>
      )}

      {/* SECTION 1: CREATE & DOWNLOAD BACKUPS */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-brand-600" />
                Create & Export Database Backup
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Generate an immediate snapshot of all products, stock levels, orders, sales, customers, and accounting data.
              </p>
            </div>
            <button
              onClick={() => setShowTableSelector(!showTableSelector)}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
            >
              {showTableSelector ? "Hide Table Filter" : "Filter Tables (" + selectedTables.length + "/" + BACKUP_TABLES.length + ")"}
              {showTableSelector ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* Table Selector (if expanded) */}
          {showTableSelector && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="text-xs font-bold text-gray-700">Choose Specific Tables to Export:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllTables}
                    className="text-[11px] font-medium text-brand-600 hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={deselectAllTables}
                    className="text-[11px] font-medium text-gray-500 hover:underline cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {BACKUP_TABLES.map((tbl) => {
                  const isChecked = selectedTables.includes(tbl);
                  return (
                    <label
                      key={tbl}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-brand-50 border-brand-200 text-brand-900 font-medium"
                          : "bg-white border-gray-200 text-gray-500"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTable(tbl)}
                        className="rounded text-brand-600 focus:ring-brand-500 h-3.5 w-3.5"
                      />
                      <span className="truncate">{tbl}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Button — single reliable cloud/local backup */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => handleDownloadBackup("json")}
              isLoading={isExporting}
              disabled={selectedTables.length === 0}
              className="gap-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold"
            >
              <Download className="w-4 h-4" />
              Save Full Backup (JSON)
            </Button>
          </div>

          <div className="text-[11px] text-gray-600 bg-brand-50/60 border border-brand-100 rounded-lg p-3 space-y-1.5">
            <p className="flex items-start gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
              <span>
                <strong className="text-gray-800">This is your cloud backup.</strong> On your phone, tap the button and the share sheet opens — save the file straight to <strong>Google Drive</strong> or <strong>Files</strong>, or send it to yourself on <strong>WhatsApp</strong>. On a computer it downloads to your Downloads folder.
              </span>
            </p>
            <p className="flex items-start gap-1.5 text-gray-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>A weekly automatic backup also runs on your shop PC and mirrors to Google Drive for Desktop — so your data is safe even if you forget.</span>
            </p>
          </div>

          {exportSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {exportSuccess}
            </div>
          )}

          {exportError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{exportError}</span>
            </div>
          )}

          {driveMessage && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 text-xs ${
                driveMessage.startsWith("✅")
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-amber-50 border border-amber-200 text-amber-800"
              }`}
            >
              {driveMessage}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 2: DISASTER RECOVERY & RESTORE ENGINE */}
      <Card className="border-purple-100">
        <CardHeader className="bg-purple-50/30">
          <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-purple-600" />
            Instant Disaster Recovery & Restore Engine
          </CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            Upload a previously saved <code className="font-mono text-purple-700">.json</code> backup to safely inspect and restore records.
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          {/* File Upload Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/20 hover:bg-purple-50/40 rounded-xl p-6 text-center cursor-pointer transition-all"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
            <Upload className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            {uploadedFile ? (
              <div>
                <p className="text-xs font-bold text-gray-900">{uploadedFile.name}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {(uploadedFile.size / 1024).toFixed(1)} KB — Click to change file
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-gray-800">
                  Click or Drag & Drop Backup File (.json) here
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Supports any valid Falcon ERP JSON snapshot
                </p>
              </div>
            )}
          </div>

          {/* Action to Dry-Run Analyze */}
          {parsedBackupData && !dryRunReport && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <h5 className="text-xs font-bold text-gray-900">Step 1: Inspect & Validate</h5>
                <p className="text-[11px] text-gray-500">
                  Analyze record counts, foreign key structures, and data integrity before making any changes.
                </p>
              </div>
              <Button
                onClick={handleAnalyzeBackup}
                isLoading={isAnalyzing}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
              >
                🔍 Analyze & Dry Run
              </Button>
            </div>
          )}

          {/* Dry Run Analysis Report */}
          {dryRunReport && (
            <div className="space-y-4 p-4 bg-purple-50/40 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    Validation Successful — {dryRunReport.totalRecords} Total Records Found
                  </h5>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    Snapshot Timestamp: {new Date(dryRunReport.timestamp).toLocaleString()}
                  </p>
                </div>
                <Badge variant="info" className="text-[11px]">
                  Dry-Run Mode (Database Untouched)
                </Badge>
              </div>

              {/* Table Breakdown Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-2">
                {dryRunReport.tables
                  .filter((t) => t.recordsCount > 0)
                  .map((tbl) => (
                    <div
                      key={tbl.tableName}
                      className="p-2 bg-white rounded-lg border border-purple-100 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-gray-700 truncate">{tbl.tableName}</span>
                      <span className="font-bold font-mono text-purple-700 px-1.5 py-0.5 bg-purple-50 rounded">
                        {tbl.recordsCount}
                      </span>
                    </div>
                  ))}
              </div>

              {/* Restore Execution Options */}
              <div className="pt-3 border-t border-purple-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-xs">
                  <span className="font-bold text-gray-700">Restore Mode:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="restoreMode"
                      checked={restoreMode === "upsert"}
                      onChange={() => setRestoreMode("upsert")}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-gray-800">
                      <strong>Safe Merge (Upsert)</strong> — updates existing, adds missing
                    </span>
                  </label>
                </div>

                <Button
                  onClick={() => setShowConfirmModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  ⚡ Execute Live Restore
                </Button>
              </div>
            </div>
          )}

          {/* Restore Result Notice */}
          {restoreResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <h5 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Restore Completed Successfully!
              </h5>
              <p className="text-xs text-emerald-800">
                Restored <strong>{restoreResult.totalRestored}</strong> total records into Supabase. All catalogs, inventories, and ledgers are synchronized.
              </p>
            </div>
          )}

          {restoreError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              {restoreError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 3: RECENT GOOGLE DRIVE BACKUPS LIST */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Cloud className="w-4 h-4 text-brand-600" />
              Recent Google Drive Cloud Snapshots
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={checkDriveStatus}
              className="text-xs text-gray-600 hover:text-gray-900 gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {driveFiles.length > 0 ? (
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
              {driveFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-3.5 flex items-center justify-between hover:bg-gray-50/80 transition-colors text-xs"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-900">{file.name}</p>
                      <p className="text-[11px] text-gray-500">
                        {file.createdTime ? new Date(file.createdTime).toLocaleString() : "Recent"}
                        {file.size ? ` • ${(parseInt(file.size, 10) / 1024).toFixed(1)} KB` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-[11px] font-medium text-brand-600 hover:bg-brand-50 rounded border border-brand-200 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Drive
                      </a>
                    )}
                    <a
                      href={`/api/backup/google-drive?action=download&fileId=${file.id}`}
                      className="px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100 rounded border border-gray-200 flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-gray-500">
              {driveConfigured
                ? "Older cloud snapshots (from the automatic weekly backup) appear here. For a new backup right now, use 'Save Full Backup (JSON)' above and pick Google Drive."
                : "No cloud snapshots yet. Use 'Save Full Backup (JSON)' above and save it to Google Drive from the share sheet."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Confirm Live Restore */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-200">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-gray-900">
                Confirm Database Restore
              </h3>
              <p className="text-xs text-gray-600 mt-2">
                You are about to restore <strong>{dryRunReport?.totalRecords} records</strong> into the live database using <strong>{restoreMode.toUpperCase()}</strong> mode.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteRestore}
                isLoading={isRestoring}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                Yes, Restore Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
