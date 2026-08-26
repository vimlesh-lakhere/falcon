import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { UserRole } from "@/types/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const ERP_ROLES: UserRole[] = [
  "Owner",
  "Admin",
  "Manager",
  "Cashier",
  "Inventory Staff",
  "Accountant",
  "Sales Staff",
];

export interface StaffContext {
  userId: string;
  shopId: string;
  role: UserRole;
  supabase: ReturnType<typeof createServerClient>;
}

function createRequestClient(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase server configuration is missing.");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      // Route handlers only read the session. Session refreshes are handled by middleware.
      setAll() {},
    },
  });
}

/**
 * Validates the Supabase session and derives the tenant from the authenticated
 * profile. Never accept a tenant/shop ID from an API request body.
 */
export async function requireStaff(
  request: NextRequest,
  allowedRoles: UserRole[] = ERP_ROLES
): Promise<StaffContext | NextResponse> {
  try {
    const supabase = createRequestClient(request);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("store_id, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile?.is_active || !profile.store_id) {
      return NextResponse.json({ error: "An active store profile is required." }, { status: 403 });
    }

    const role = profile.role as UserRole;
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 });
    }

    return { userId: user.id, shopId: profile.store_id, role, supabase };
  } catch (error) {
    console.error("API authorization failed", error);
    return NextResponse.json({ error: "Unable to verify authorization." }, { status: 500 });
  }
}
