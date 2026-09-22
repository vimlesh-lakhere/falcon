import crypto from "crypto";

/**
 * Lightweight Google Drive backup client.
 *
 * Talks to the Drive REST API directly with `fetch` and signs the service-account JWT with Node
 * `crypto` — deliberately NOT the `googleapis` SDK, which drags ~200 MB into every serverless
 * function bundle (and so into Vercel's Functions Storage on every deployment). Same env vars, same
 * behaviour, same exported functions.
 */

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

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

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

// Cache the short-lived access token across calls within a warm function instance.
let cachedToken: { value: string; expiresAt: number } | null = null;

function base64Url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/**
 * Returns a valid OAuth access token, using the OAuth2 refresh-token flow when client credentials
 * are present, otherwise a signed service-account JWT. Result is cached until ~1 min before expiry.
 */
async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  let body: URLSearchParams;

  if (clientId && clientSecret && refreshToken) {
    body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });
  } else {
    const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let saKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (!saEmail || !saKey) {
      throw new Error(
        "Google Drive credentials not configured. Provide GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN or GOOGLE_SERVICE_ACCOUNT_EMAIL/PRIVATE_KEY."
      );
    }

    // Env vars usually store the PEM with escaped newlines.
    if (saKey.includes("\\n")) saKey = saKey.replace(/\\n/g, "\n");

    const now = Math.floor(Date.now() / 1000);
    const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claim = base64Url(
      JSON.stringify({
        iss: saEmail,
        scope: DRIVE_SCOPE,
        aud: TOKEN_URL,
        iat: now,
        exp: now + 3600,
      })
    );
    const signingInput = `${header}.${claim}`;
    const signature = crypto
      .createSign("RSA-SHA256")
      .update(signingInput)
      .sign(saKey, "base64url");
    const assertion = `${signingInput}.${signature}`;

    body = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    });
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Google token request failed (HTTP ${res.status}): ${detail}`);
  }

  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("Google token response had no access_token.");

  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

/** Drive REST call with the bearer token attached; throws on non-2xx. */
async function driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Google Drive API error (HTTP ${res.status}): ${detail}`);
  }
  return res;
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

  // Search if the folder already exists.
  const q = `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed=false`;
  const searchUrl = `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent("files(id,name)")}&spaces=drive`;
  const searchRes = await driveFetch(searchUrl);
  const searchJson = (await searchRes.json()) as { files?: { id: string; name: string }[] };
  if (searchJson.files && searchJson.files.length > 0) {
    return searchJson.files[0].id;
  }

  // Create the folder.
  const createRes = await driveFetch(`${DRIVE_API}/files?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      description: "Automated & On-Demand Backups for Falcon AGS Store ERP",
    }),
  });
  const createJson = (await createRes.json()) as { id: string };
  return createJson.id;
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
  const targetFolderId = folderId || (await ensureBackupFolder());

  const metadata = {
    name: fileName,
    parents: targetFolderId ? [targetFolderId] : [],
  };

  // multipart/related upload: metadata part + media part.
  const boundary = `falcon${crypto.randomBytes(12).toString("hex")}`;
  const multipartBody =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;

  const fields = encodeURIComponent("id,name,webViewLink,size,createdTime");
  const uploadRes = await driveFetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=${fields}`,
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body: multipartBody,
    }
  );
  const file = (await uploadRes.json()) as {
    id: string;
    webViewLink?: string;
    size?: string;
  };

  // Make the backup file viewable via link (ignore if org policy forbids "anyone").
  try {
    await driveFetch(`${DRIVE_API}/files/${file.id}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    });
  } catch {
    // Ignore if restricted domain policy
  }

  return {
    fileId: file.id,
    webViewLink: file.webViewLink ?? null,
    size: file.size ?? null,
  };
}

/**
 * Lists all existing backup files from Google Drive.
 */
export async function listDriveBackups(limit = 20): Promise<DriveBackupFile[]> {
  const folderId = await ensureBackupFolder();
  const q = `'${folderId}' in parents and trashed=false`;
  const fields = encodeURIComponent("files(id,name,size,createdTime,webViewLink)");
  const url =
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}` +
    `&orderBy=${encodeURIComponent("createdTime desc")}&pageSize=${limit}&fields=${fields}&spaces=drive`;

  const res = await driveFetch(url);
  const json = (await res.json()) as { files?: DriveBackupFile[] };

  return (json.files || []).map((f) => ({
    id: f.id,
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
  const res = await driveFetch(`${DRIVE_API}/files/${fileId}?alt=media`);
  return await res.text();
}
