import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error:
            "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing. Please add OAuth credentials to .env.local",
        },
        { status: 400 }
      );
    }

    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const host = request.headers.get("host") || "localhost:3000";
    const redirectUri = `${protocol}://${host}/api/backup/google-drive/callback`;

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive",
      ],
    });

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("[Google Drive OAuth Auth Error]", error);
    return NextResponse.json(
      { error: "Failed to initialize Google OAuth", details: error.message },
      { status: 500 }
    );
  }
}
