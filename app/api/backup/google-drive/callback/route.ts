import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/settings?error=no_code_provided", request.url)
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL("/settings?error=missing_oauth_credentials", request.url)
      );
    }

    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const host = request.headers.get("host") || "localhost:3000";
    const redirectUri = `${protocol}://${host}/api/backup/google-drive/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokens = (await tokenRes.json()) as { refresh_token?: string; error?: string };
    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokens.error || tokenRes.status}`);
    }

    if (tokens.refresh_token) {
      // Append or update GOOGLE_REFRESH_TOKEN in .env.local
      const envPath = path.join(process.cwd(), ".env.local");
      if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, "utf-8");
        if (content.includes("GOOGLE_REFRESH_TOKEN=")) {
          content = content.replace(
            /GOOGLE_REFRESH_TOKEN="?[^"\n]*"?/g,
            `GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`
          );
        } else {
          content += `\nGOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"\n`;
        }
        fs.writeFileSync(envPath, content, "utf-8");
      }
      process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;
    }

    return NextResponse.redirect(
      new URL("/settings?tab=backup&success=drive_connected", request.url)
    );
  } catch (error: any) {
    console.error("[Google Drive OAuth Callback Error]", error);
    return NextResponse.redirect(
      new URL(
        `/settings?tab=backup&error=${encodeURIComponent(error.message)}`,
        request.url
      )
    );
  }
}
