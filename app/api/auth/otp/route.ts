import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_MAX_AGE_S,
  isSessionConfigured,
  readCustomerSession,
  signCustomerSession,
  verifyFirebasePhoneToken,
} from "@/lib/customer-session";
import { isUuid } from "@/lib/tenant";

/**
 * Store-customer login.
 *
 * The one-time code is sent and checked by Firebase Phone Auth (Google). The browser then sends the
 * resulting Firebase ID token here; we ask Google to validate it and only then trust that the
 * customer owns the mobile number. We never generate, log or hand out OTP codes ourselves, and
 * there is no WhatsApp OTP.
 *
 * After verification the browser gets a signed, httpOnly session cookie. Everything that changes a
 * customer's data requires that cookie.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const DEFAULT_SHOP_ID = process.env.DEFAULT_SHOP_ID || "a0000000-0000-0000-0000-000000000001";

const cleanDigits = (value: unknown) => (typeof value === "string" ? value.replace(/[^0-9]/g, "").slice(-10) : "");

function resolveShopId(req: NextRequest, body: Record<string, unknown>): string {
  const candidates = [
    req.headers.get("x-store-shop-id"), // set by middleware for <slug>.falcon360.in
    typeof body.shopId === "string" ? body.shopId : null,
    typeof body.shop_id === "string" ? body.shop_id : null,
    req.cookies.get("falcon_store_shop_id")?.value,
    req.cookies.get("falcon_active_store_id")?.value,
  ];
  return candidates.find((c): c is string => !!c && isUuid(c)) || DEFAULT_SHOP_ID;
}

type CustomerRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

function parseAddress(row: CustomerRow | null, phone: string, fallbackName?: string) {
  if (!row?.address || row.address === "Town / Local Area") return null;
  try {
    return JSON.parse(row.address);
  } catch {
    return {
      fullName: row.name || fallbackName,
      mobileNumber: phone,
      villageOrColony: row.address,
      tehsilOrTown: "Town Area",
      landmark: "",
      pincode: "483501",
    };
  }
}

function withSession(res: NextResponse, phone: string): NextResponse {
  const token = signCustomerSession(phone);
  if (token) {
    res.cookies.set(CUSTOMER_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: CUSTOMER_SESSION_MAX_AGE_S,
    });
  }
  // Old, unsigned cookie from earlier versions: never trusted, always removed.
  res.cookies.delete("falcon_customer_phone");
  res.cookies.delete("falcon_otp_challenge");
  return res;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = body.action;
    const cleanPhone = cleanDigits(body.phone ?? body.customerPhone);
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const shopId = resolveShopId(req, body);

    // --- Restore the logged-in customer from the signed session cookie ---
    if (action === "session") {
      const phone = readCustomerSession(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
      // Visitors who are simply not logged in are the normal case: answer 200 so no error shows up in the console.
      if (!phone) return NextResponse.json({ success: false });

      const { data } = await supabase
        .from("customers")
        .select("id, name, phone, email, address")
        .eq("phone", phone)
        .eq("shop_id", shopId)
        .maybeSingle();
      if (!data) return NextResponse.json({ success: false });

      return NextResponse.json({
        success: true,
        customer: {
          id: data.id,
          name: data.name,
          phone,
          address: parseAddress(data as CustomerRow, phone),
          isVerified: true,
          authProvider: "phone",
        },
      });
    }

    // --- Log out: drop the session cookie ---
    if (action === "logout") {
      const res = NextResponse.json({ success: true });
      res.cookies.delete(CUSTOMER_SESSION_COOKIE);
      res.cookies.delete("falcon_customer_phone");
      return res;
    }

    // --- Mobile-number verification: proof comes from Firebase (Google), never from the browser's word ---
    if (action === "verify_otp") {
      if (cleanPhone.length !== 10) {
        return NextResponse.json({ success: false, error: "Valid 10-digit mobile number is required." }, { status: 400 });
      }
      if (!isSessionConfigured()) {
        return NextResponse.json({ success: false, error: "Login is not available right now. Please try later." }, { status: 503 });
      }

      let verified = false;
      if (typeof body.firebaseIdToken === "string" && body.firebaseIdToken) {
        const tokenPhone = await verifyFirebasePhoneToken(body.firebaseIdToken);
        verified = tokenPhone === `+91${cleanPhone}`;
      } else if (process.env.NODE_ENV === "development" && String(body.otp ?? "") === "123456") {
        verified = true; // local development shortcut only, never in production
      }

      if (!verified) {
        return NextResponse.json(
          { success: false, error: "We could not verify this mobile number. Please request a new OTP." },
          { status: 401 }
        );
      }

      const name = typeof body.name === "string" ? body.name.trim() : "";
      let record: CustomerRow | null = null;
      try {
        const { data: existing } = await supabase
          .from("customers")
          .select("*")
          .eq("phone", cleanPhone)
          .eq("shop_id", shopId)
          .maybeSingle();

        if (existing) {
          record = existing as CustomerRow;
        } else {
          const { data: created } = await supabase
            .from("customers")
            .insert({
              shop_id: shopId,
              name: name || `Customer ${cleanPhone.slice(-4)}`,
              phone: cleanPhone,
              address: "Town / Local Area",
            })
            .select("*")
            .single();
          record = (created as CustomerRow | null) ?? null;
        }
      } catch (dbErr) {
        console.warn("Customer DB sync notice:", dbErr);
      }

      const address = parseAddress(record, cleanPhone, name);
      const isNewCustomer =
        !record || !record.name || record.name.startsWith("Customer ") || !address || !address.villageOrColony;

      return withSession(
        NextResponse.json({
          success: true,
          message: "Mobile Verified Successfully!",
          isNewCustomer,
          customer: {
            id: record?.id || undefined,
            name: record?.name || name || `Customer ${cleanPhone.slice(-4)}`,
            phone: cleanPhone,
            email: record?.email || "",
            address,
            isVerified: true,
            authProvider: "phone",
          },
        }),
        cleanPhone
      );
    }

    // --- Save profile & delivery address: only for the number this browser has verified ---
    if (action === "save_customer_profile") {
      const sessionPhone = readCustomerSession(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
      if (!cleanPhone || sessionPhone !== cleanPhone) {
        return NextResponse.json(
          { success: false, error: "Please sign in again with your mobile number to continue." },
          { status: 401 }
        );
      }

      const customerName = String(body.name ?? body.customerName ?? "").trim();
      const rawAddress = body.address ?? body.customerAddress;
      const addressString = typeof rawAddress === "object" && rawAddress ? JSON.stringify(rawAddress) : String(rawAddress ?? "");

      let updated: CustomerRow | null = null;
      try {
        const { data: existing } = await supabase
          .from("customers")
          .select("*")
          .eq("phone", cleanPhone)
          .eq("shop_id", shopId)
          .maybeSingle();

        if (existing) {
          const { data } = await supabase
            .from("customers")
            .update({ name: customerName || existing.name, address: addressString })
            .eq("id", existing.id)
            .select("*")
            .maybeSingle();
          updated = (data as CustomerRow | null) ?? (existing as CustomerRow);
        } else {
          const { data } = await supabase
            .from("customers")
            .insert({
              shop_id: shopId,
              name: customerName || `Customer ${cleanPhone.slice(-4)}`,
              phone: cleanPhone,
              address: addressString,
            })
            .select("*")
            .single();
          updated = (data as CustomerRow | null) ?? null;
        }
      } catch (dbErr) {
        console.warn("Save profile DB sync notice:", dbErr);
      }

      return NextResponse.json({
        success: true,
        message: "Profile and delivery location saved!",
        customer: {
          id: updated?.id,
          name: customerName || updated?.name || `Customer ${cleanPhone.slice(-4)}`,
          phone: cleanPhone,
          address: rawAddress,
          isVerified: true,
          authProvider: "phone",
        },
      });
    }

    // --- Changing the number needs BOTH a session for the old number AND Firebase proof of the new one ---
    if (action === "change_customer_phone" || action === "send_otp") {
      const oldPhone = cleanDigits(body.oldPhone);
      const newPhone = cleanDigits(body.newPhone);
      const sessionPhone = readCustomerSession(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);

      const proof =
        action === "change_customer_phone" && typeof body.firebaseIdToken === "string"
          ? await verifyFirebasePhoneToken(body.firebaseIdToken)
          : null;

      if (
        action === "change_customer_phone" &&
        oldPhone.length === 10 &&
        newPhone.length === 10 &&
        oldPhone !== newPhone &&
        sessionPhone === oldPhone &&
        proof === `+91${newPhone}`
      ) {
        const { data: updated, error: updErr } = await supabase
          .from("customers")
          .update({ phone: newPhone })
          .eq("phone", oldPhone)
          .eq("shop_id", shopId)
          .select("*")
          .maybeSingle();
        if (updErr) {
          return NextResponse.json({ success: false, error: "Failed to update phone number." }, { status: 500 });
        }
        return withSession(
          NextResponse.json({
            success: true,
            message: `Mobile number successfully changed to +91 ${newPhone}!`,
            customer: {
              id: updated?.id,
              name: updated?.name,
              phone: newPhone,
              address: parseAddress(updated as CustomerRow | null, newPhone),
              isVerified: true,
              authProvider: "phone",
            },
          }),
          newPhone
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Changing your mobile number online is temporarily unavailable. Please contact the store.",
        },
        { status: 501 }
      );
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("Customer login API error:", error);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
