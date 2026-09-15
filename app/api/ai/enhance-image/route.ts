import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/server";
import {
  validateImageBuffer,
  runEnhancePipeline,
  type EnhancePipelineOptions,
} from "@/lib/ai/image-enhance-pipeline";
import type { BackgroundPreset } from "@/lib/ai/sharp-cropper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory rate limiting (per-user, resets on server restart)
// For production at scale, swap this for Redis or Supabase-based counters.
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_RATE_LIMIT = 20;
const MAX_FILE_SIZE_MB = 10;
const MAX_DIMENSION = 6000;

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const maxPerHour = parseInt(process.env.AI_ENHANCE_RATE_LIMIT_PER_HOUR || "", 10) || DEFAULT_RATE_LIMIT;
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return { allowed: true, remaining: maxPerHour - 1 };
  }

  if (entry.count >= maxPerHour) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: maxPerHour - entry.count };
}

/**
 * POST /api/ai/enhance-image
 *
 * AI-powered product image enhancement endpoint.
 * Accepts a base64-encoded image and returns enhanced versions in WebP + PNG + thumbnail.
 *
 * Body: {
 *   image: string          — base64 data URL or raw base64 string
 *   backgroundPreset?: BackgroundPreset — "transparent" | "white" | "light_grey" | "soft_gradient"
 *   skipBgRemoval?: boolean
 *   skipCleanup?: boolean
 *   skipLightCorrection?: boolean
 *   targetSize?: number    — output square size (default: 1080)
 *   removeBgApiKey?: string
 *   hfToken?: string
 * }
 *
 * Response: EnhancePipelineResult
 */
export async function POST(req: NextRequest) {
  // ── Feature flag check ─────────────────────────────────────────────────
  const featureEnabled = process.env.ENABLE_AI_IMAGE_ENHANCE !== "false";
  if (!featureEnabled) {
    return NextResponse.json(
      { error: "AI image enhancement is currently disabled.", success: false },
      { status: 503 }
    );
  }

  // ── Auth ────────────────────────────────────────────────────────────────
  const auth = await requireStaff(req);
  if (auth instanceof NextResponse) {
    // In development, allow unauthenticated requests for testing
    if (process.env.NODE_ENV !== "development") {
      return auth;
    }
  }

  const userId = auth instanceof NextResponse ? "dev-user" : auth.userId;

  // ── Rate limiting ──────────────────────────────────────────────────────
  const rateCheck = checkRateLimit(userId);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Maximum 20 image enhancements per hour. Please try again later.",
        success: false,
      },
      {
        status: 429,
        headers: { "Retry-After": "3600" },
      }
    );
  }

  try {
    const body = await req.json();
    const {
      image,
      backgroundPreset = "white",
      skipBgRemoval = false,
      skipCleanup = false,
      skipLightCorrection = false,
      targetSize = 1080,
      removeBgApiKey,
      hfToken,
    } = body;

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { error: "Image is required. Provide a base64 data URL.", success: false },
        { status: 400 }
      );
    }

    // ── Extract buffer from base64 data URL ─────────────────────────────
    const base64Data = image.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
    let imageBuffer: Buffer;
    try {
      imageBuffer = Buffer.from(base64Data, "base64");
    } catch {
      return NextResponse.json(
        { error: "Invalid base64 image data.", success: false },
        { status: 400 }
      );
    }

    // ── Validate image ──────────────────────────────────────────────────
    const maxSize = parseInt(process.env.AI_ENHANCE_MAX_FILE_SIZE_MB || "", 10) || MAX_FILE_SIZE_MB;
    const validationError = await validateImageBuffer(imageBuffer, maxSize, MAX_DIMENSION);
    if (validationError) {
      return NextResponse.json(
        { error: validationError, success: false },
        { status: 400 }
      );
    }

    // ── Validate background preset ──────────────────────────────────────
    const validPresets: BackgroundPreset[] = ["transparent", "white", "light_grey", "soft_gradient"];
    const preset: BackgroundPreset = validPresets.includes(backgroundPreset)
      ? backgroundPreset
      : "white";

    // ── Run enhancement pipeline ────────────────────────────────────────
    const pipelineOptions: EnhancePipelineOptions = {
      targetSize: Math.min(Math.max(targetSize, 256), 2048),
      backgroundPreset: preset,
      skipBgRemoval,
      skipCleanup,
      skipLightCorrection,
      thumbnailSize: 200,
      removeBgApiKey: removeBgApiKey || undefined,
      hfToken: hfToken || undefined,
    };

    const result = await runEnhancePipeline(imageBuffer, pipelineOptions);

    return NextResponse.json(result, {
      headers: {
        "X-RateLimit-Remaining": String(rateCheck.remaining),
      },
    });
  } catch (error: any) {
    console.error("AI image enhancement API error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to enhance image. The original image is preserved.",
        success: false,
      },
      { status: 500 }
    );
  }
}
