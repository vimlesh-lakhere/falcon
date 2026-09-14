import { NextRequest, NextResponse } from "next/server";
import { PHONETIC_PRESETS, TRANSLITERATION_CACHE } from "@/lib/transliterate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function transliterateSingleToken(token: string): Promise<string> {
  const clean = token.trim();
  if (!clean) return token;

  // Whitespace or punctuation
  if (/^[\s/\\+()\-.,]+$/.test(clean)) {
    return clean;
  }
  if (clean === "&") {
    return " एंड ";
  }

  const lower = clean.toLowerCase();

  // 1. Check presets
  if (PHONETIC_PRESETS[lower]) {
    return PHONETIC_PRESETS[lower];
  }

  // 2. Check numbers & volume/weight units (keep intact e.g. "100ml", "1kg", "50g", "100%", "₹50")
  if (/^[₹$€]?[\d.,/%-]+(ml|g|gm|kg|l|ltr|oz|pc|pcs|pk|pack|s|m|l|xl|xxl)?$/i.test(clean)) {
    return clean;
  }

  // 3. Check memory cache
  if (TRANSLITERATION_CACHE.has(lower)) {
    return TRANSLITERATION_CACHE.get(lower)!;
  }

  // 4. Query Google Phonetic Input Tools API (no CORS on server)
  try {
    const url = `https://inputtools.google.com/request?text=${encodeURIComponent(
      clean
    )}&itc=hi-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Falcon/1.0",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0] === "SUCCESS" && Array.isArray(data[1])) {
        const matches = data[1][0]?.[1];
        if (Array.isArray(matches) && matches.length > 0) {
          const hi = matches[0];
          TRANSLITERATION_CACHE.set(lower, hi);
          return hi;
        }
      }
    }
  } catch (err) {
    console.warn("Input tools fetch error for:", clean, err);
  }

  return clean;
}

async function transliterateSentence(text: string): Promise<string> {
  const clean = text.trim();
  if (!clean) return "";

  const lower = clean.toLowerCase();
  if (TRANSLITERATION_CACHE.has(lower)) {
    return TRANSLITERATION_CACHE.get(lower)!;
  }

  // Split tokens while preserving units and special separators
  const tokens = clean.split(/(\s+|[-/&+,()])/).filter(Boolean);

  const results = await Promise.all(
    tokens.map((token) => transliterateSingleToken(token))
  );

  const finalStr = results.join("").replace(/\s+/g, " ").trim();
  if (finalStr) {
    TRANSLITERATION_CACHE.set(lower, finalStr);
  }
  return finalStr;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ success: true, hindi: "" });
    }

    const hindi = await transliterateSentence(text);
    return NextResponse.json({ success: true, original: text, hindi });
  } catch (e: any) {
    console.error("Transliteration route error:", e);
    return NextResponse.json(
      { error: e.message || "Transliteration failed" },
      { status: 500 }
    );
  }
}
