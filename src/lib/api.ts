import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function unauthorized(message = "请先登录") {
  return fail(message, 401);
}

export function toErrorMessage(error: unknown, fallback = "服务器错误") {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return "请先登录";
    }
    return error.message || fallback;
  }
  return fallback;
}
