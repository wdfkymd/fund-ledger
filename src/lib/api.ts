import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export type ApiOk<T> = { ok: true; data: T };
export type ApiFail = {
  ok: false;
  error: string;
  code?: string;
  details?: unknown;
};
export type ApiResult<T> = ApiOk<T> | ApiFail;

export class AppError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(
    message: string,
    status = 400,
    code?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data } satisfies ApiOk<T>, init);
}

export function fail(
  message: string,
  status = 400,
  details?: unknown,
  code?: string,
) {
  return NextResponse.json(
    { ok: false, error: message, details, code } satisfies ApiFail,
    { status },
  );
}

export function unauthorized(message = "请先登录") {
  return fail(message, 401, undefined, "UNAUTHORIZED");
}

export function toErrorMessage(error: unknown, fallback = "服务器错误") {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return "请先登录";
    }
    if (error instanceof AppError) {
      return error.message;
    }
  }
  return fallback;
}

type AuthedUser = Awaited<ReturnType<typeof requireUser>>;

export type ApiCtx<R = unknown> = {
  user: AuthedUser;
  req: Request;
  routeCtx?: R;
};

/**
 * API Route 统一包装：鉴权、AppError、UNAUTHORIZED、未知错误。
 * 动态路由的第二参通过 routeCtx 透传。
 */
export function withApi<R = unknown>(
  fn: (ctx: ApiCtx<R>) => Promise<Response>,
) {
  return async (req: Request, routeCtx?: R) => {
    try {
      const user = await requireUser();
      return await fn({ user, req, routeCtx: routeCtx ?? ({} as R) });
    } catch (error) {
      if (error instanceof AppError) {
        return fail(error.message, error.status, error.details, error.code);
      }
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        return unauthorized();
      }
      console.error(error);
      return fail("服务器错误", 500, undefined, "INTERNAL");
    }
  };
}
