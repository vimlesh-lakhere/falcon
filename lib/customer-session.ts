import crypto from "crypto";
import { firebaseConfig } from "@/lib/firebase-config";

/** httpOnly, signed cookie proving that this browser verified ownership of a mobile number. */
export const CUSTOMER_SESSION_COOKIE = "falcon_customer_session";
export const CUSTOMER_SESSION_MAX_AGE_S = 30 * 24 * 60 * 60; // 30 days

/**
 * HMAC key for customer session cookies.
 * Prefer CUSTOMER_SESSION_SECRET. Until that is set, derive a key from the (server-only)
 * Razorpay secret so login keeps working. There is no hard-coded fallback: with no secret at
 * all, sessions cannot be issued or read (except in local development).
 */
function sessionKey(): string | null {
  if (process.env.CUSTOMER_SESSION_SECRET) return process.env.CUSTOMER_SESSION_SECRET;
  if (process.env.RAZORPAY_KEY_SECRET) {
    return crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update("falcon-customer-session-v1")
      .digest("hex");
  }
  return process.env.NODE_ENV === "development" ? "local-development-only-key" : null;
}

export function isSessionConfigured(): boolean {
  return sessionKey() !== null;
}

function sign(phone: string, expiresAt: number, key: string): string {
  return crypto.createHmac("sha256", key).update(`v1:${phone}:${expiresAt}`).digest("hex");
}

export function signCustomerSession(phone: string): string | null {
  const key = sessionKey();
  if (!key) return null;
  const expiresAt = Math.floor(Date.now() / 1000) + CUSTOMER_SESSION_MAX_AGE_S;
  return `${phone}.${expiresAt}.${sign(phone, expiresAt, key)}`;
}

/** Returns the verified 10-digit phone from a session cookie value, or null. */
export function readCustomerSession(value: string | undefined): string | null {
  const key = sessionKey();
  if (!key || !value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [phone, expStr, mac] = parts;
  const expiresAt = parseInt(expStr, 10);
  if (!/^\d{10}$/.test(phone) || !Number.isFinite(expiresAt) || expiresAt < Date.now() / 1000) return null;
  const expected = sign(phone, expiresAt, key);
  try {
    return crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected)) ? phone : null;
  } catch {
    return null;
  }
}

/**
 * Asks Google to validate a Firebase ID token (signature, expiry, project) and returns the phone
 * number it belongs to, e.g. "+919876543210". Returns null if the token is invalid or has no phone.
 */
export async function verifyFirebasePhoneToken(idToken: string): Promise<string | null> {
  if (!idToken || typeof idToken !== "string") return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: { phoneNumber?: string }[] };
    const phone = data.users?.[0]?.phoneNumber;
    return typeof phone === "string" ? phone : null;
  } catch {
    return null;
  }
}
