import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { hydrateAiKeys, saveAiKey } from "@/lib/ai/key-store";

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
  if (auth instanceof NextResponse && !isDev) {
    return auth;
  }

  try {
    const { geminiKey, removeBgKey } = await req.json();

    const trimmedGemini = typeof geminiKey === "string" ? geminiKey.trim() : "";
    const trimmedRbg = typeof removeBgKey === "string" ? removeBgKey.trim() : "";

    // If Gemini key is provided, test it with a quick model ping
    if (trimmedGemini) {
      try {
        const genAI = new GoogleGenerativeAI(trimmedGemini);
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          await model.generateContent("ping");
        } catch {
          const model2 = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
          await model2.generateContent("ping");
        }
      } catch (geminiTestErr: any) {
        console.warn("Gemini key verification warning:", geminiTestErr.message);
        // If it's an explicit invalid key error, notify client
        if (
          geminiTestErr.message?.includes("API_KEY_INVALID") ||
          geminiTestErr.message?.includes("API key not valid")
        ) {
          return NextResponse.json(
            {
              success: false,
              error: "The provided Google Gemini API Key is invalid. Please double check the key from Google AI Studio.",
            },
            { status: 400 }
          );
        }
      }
    }

    // Persist to the service-role-only app_settings table (durable on Vercel,
    // unlike the old .env.local write which is a no-op on read-only serverless FS).
    // NOTE: we intentionally do NOT store a NEXT_PUBLIC_ copy — that would ship
    // the secret to the browser bundle.
    if (trimmedGemini) await saveAiKey("GEMINI_API_KEY", trimmedGemini);
    if (trimmedRbg) await saveAiKey("REMOVE_BG_API_KEY", trimmedRbg);

    return NextResponse.json({
      success: true,
      message: "AI keys saved and activated successfully!",
      hasGeminiKey: Boolean(trimmedGemini || process.env.GEMINI_API_KEY),
      hasRemoveBgKey: Boolean(trimmedRbg || process.env.REMOVE_BG_API_KEY),
    });
  } catch (error: any) {
    console.error("Save AI key error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save AI key" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireStaff(req);
  const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
  if (auth instanceof NextResponse && !isDev) {
    return auth;
  }

  await hydrateAiKeys();
  const geminiKey = process.env.GEMINI_API_KEY || "";
  const removeBgKey = process.env.REMOVE_BG_API_KEY || "";

  return NextResponse.json({
    success: true,
    hasGeminiKey: Boolean(geminiKey),
    hasRemoveBgKey: Boolean(removeBgKey),
    // Masked key for display only
    maskedGeminiKey: geminiKey ? `${geminiKey.slice(0, 6)}...${geminiKey.slice(-4)}` : "",
  });
}
