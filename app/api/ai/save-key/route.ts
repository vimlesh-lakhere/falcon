import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

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

    // Set in runtime process.env
    if (trimmedGemini) {
      process.env.GEMINI_API_KEY = trimmedGemini;
      process.env.NEXT_PUBLIC_GEMINI_API_KEY = trimmedGemini;
    }
    if (trimmedRbg) {
      process.env.REMOVE_BG_API_KEY = trimmedRbg;
    }

    // Persist to .env.local
    try {
      const envPath = path.join(process.cwd(), ".env.local");
      let envContent = "";
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf8");
      }

      if (trimmedGemini) {
        if (envContent.includes("GEMINI_API_KEY=")) {
          envContent = envContent.replace(
            /GEMINI_API_KEY=.*/g,
            `GEMINI_API_KEY="${trimmedGemini}"`
          );
        } else {
          envContent += `\nGEMINI_API_KEY="${trimmedGemini}"`;
        }

        if (envContent.includes("NEXT_PUBLIC_GEMINI_API_KEY=")) {
          envContent = envContent.replace(
            /NEXT_PUBLIC_GEMINI_API_KEY=.*/g,
            `NEXT_PUBLIC_GEMINI_API_KEY="${trimmedGemini}"`
          );
        } else {
          envContent += `\nNEXT_PUBLIC_GEMINI_API_KEY="${trimmedGemini}"`;
        }
      }

      if (trimmedRbg) {
        if (envContent.includes("REMOVE_BG_API_KEY=")) {
          envContent = envContent.replace(
            /REMOVE_BG_API_KEY=.*/g,
            `REMOVE_BG_API_KEY="${trimmedRbg}"`
          );
        } else {
          envContent += `\nREMOVE_BG_API_KEY="${trimmedRbg}"`;
        }
      }

      fs.writeFileSync(envPath, envContent.trim() + "\n", "utf8");
    } catch (fsErr) {
      console.warn("Notice: Could not write key to .env.local (keys active in memory):", fsErr);
    }

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

  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  const removeBgKey = process.env.REMOVE_BG_API_KEY || "";

  return NextResponse.json({
    success: true,
    hasGeminiKey: Boolean(geminiKey),
    hasRemoveBgKey: Boolean(removeBgKey),
    // Masked keys for display
    maskedGeminiKey: geminiKey ? `${geminiKey.slice(0, 6)}...${geminiKey.slice(-4)}` : "",
  });
}
