import { NextResponse } from "next/server";

export interface ApiResponse<T = any> {
  data: T | null;
  error: {
    code: string;
    message: string;
    field_errors?: Record<string, string>;
  } | null;
  meta: {
    page?: number;
    page_size?: number;
    total_count?: number;
    total_pages?: number;
    unread_count?: number;
    [key: string]: any;
  } | null;
}

export function apiSuccess<T>(data: T, meta: ApiResponse["meta"] = null, status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    {
      data,
      error: null,
      meta,
    },
    { status }
  );
}

export function apiError(message: string, code = "INTERNAL_ERROR", status = 500, field_errors?: Record<string, string>) {
  return NextResponse.json<ApiResponse>(
    {
      data: null,
      error: {
        code,
        message,
        field_errors,
      },
      meta: null,
    },
    { status }
  );
}
