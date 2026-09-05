import { google } from "googleapis";
import { Readable } from "stream";

export interface GoogleDriveConfig {
  serviceAccountEmail?: string;
  privateKey?: string;
  folderId?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

export interface DriveBackupFile {
  id: string;
  name: string;
  size?: string;
  createdTime?: string;
  webViewLink?: string;
}

/**
 * Checks if Google Drive credentials are configured in environment variables.
 */
export function isGoogleDriveConfigured(): boolean {
  const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const saKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;

  return Boolean((saEmail && saKey) || (refreshToken && clientId));
}

/**
 * Initializes Google Drive v3 client using Service Account or OAuth2 Refresh Token.
 */
export function getGoogleDriveClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: "v3", auth: oauth2Client });
  }

  const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let saKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (saEmail && saKey) {
    // Handle escaped newlines commonly found in environment variables
    if (saKey.includes("\\n")) {
      saKey = saKey.replace(/\\n/g, "\n");
    }

    const auth = new google.auth.JWT({
      email: saEmail,
      key: saKey,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    return google.drive({ version: "v3", auth });
  }

  throw new Error(
    "Google Drive credentials not configured. Please provide GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in .env.local"
  );
}

/**
 * Ensures the target backup folder exists in Google Drive.
 * If GOOGLE_DRIVE_FOLDER_ID is set in env, it uses that.
 * Otherwise, it searches for a folder named "Falcon_ERP_Backups" or creates it.
 */
export async function ensureBackupFolder(
  folderName = "Falcon_ERP_Backups"
): Promise<string> {
  const customFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (customFolderId && customFolderId.trim() !== "") {
    return customFolderId.trim();
  }

  const drive = getGoogleDriveClient();

  // Search if folder already exists
  const res = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // Create folder
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      description: "Automated & On-Demand Backups for Falcon AGS Store ERP",
    },
    fields: "id",
  });

  return folder.data.id!;
}

/**
 * Uploads a backup string (JSON or SQL) to Google Drive.
 */
export async function uploadBackupToDrive({
  fileName,
  content,
  mimeType = "application/json",
  folderId,
}: {
  fileName: string;
  content: string;
  mimeType?: string;
  folderId?: string;
}): Promise<{
  fileId: string;
  webViewLink?: string | null;
  size?: string | null;
}> {
  const drive = getGoogleDriveClient();
  const targetFolderId = folderId || (await ensureBackupFolder());

  const fileStream = Readable.from([content]);

  const fileMetadata = {
    name: fileName,
    parents: targetFolderId ? [targetFolderId] : [],
  };

  const media = {
    mimeType,
    body: fileStream,
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, name, webViewLink, size, createdTime",
  });

  // Make the backup file viewable via link
  try {
    await drive.permissions.create({
      fileId: file.data.id!,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });
  } catch {
    // Ignore if restricted domain policy
  }

  return {
    fileId: file.data.id!,
    webViewLink: file.data.webViewLink,
    size: file.data.size,
  };
}

/**
 * Lists all existing backup files from Google Drive.
 */
export async function listDriveBackups(
  limit = 20
): Promise<DriveBackupFile[]> {
  const drive = getGoogleDriveClient();
  const folderId = await ensureBackupFolder();

  const query = `'${folderId}' in parents and trashed=false`;

  const res = await drive.files.list({
    q: query,
    orderBy: "createdTime desc",
    pageSize: limit,
    fields: "files(id, name, size, createdTime, webViewLink)",
  });

  return (res.data.files || []).map((f) => ({
    id: f.id!,
    name: f.name || "unnamed_backup",
    size: f.size || "0",
    createdTime: f.createdTime || new Date().toISOString(),
    webViewLink: f.webViewLink || undefined,
  }));
}

/**
 * Downloads a backup file content from Google Drive by its file ID.
 */
export async function downloadDriveBackup(fileId: string): Promise<string> {
  const drive = getGoogleDriveClient();

  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "text" }
  );

  return typeof res.data === "string" ? res.data : JSON.stringify(res.data);
}
