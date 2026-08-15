import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Let Next.js handle all requests and static assets natively
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
