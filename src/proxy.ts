// 本文件是 Next.js 16 的 Proxy 约定（原 middleware.ts 改名而来），
// src/proxy.ts + 具名导出 proxy() 会被框架自动挂载，勿改名/勿删除。
// 构建产物路由表末尾的 "ƒ Proxy (Middleware)" 可佐证其生效。
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { SESSION_COOKIE_NAME } from "@/lib/session"

const PROTECTED = [
  "/dashboard",
  "/holdings",
  "/watchlist",
  "/transactions",
  "/analytics",
  "/settings",
  "/funds",
]

function isProtected(pathname: string) {
  return PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

/** 边缘仅做 cookie 存在性提示；真鉴权在 RSC/API */
function hasSessionHint(req: NextRequest) {
  return Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value)
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const authed = hasSessionHint(req)

  if (pathname === "/") {
    if (!authed) {
      return NextResponse.redirect(new URL("/sign-in", req.url))
    }
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  if (isProtected(pathname) && !authed) {
    const url = new URL("/sign-in", req.url)
    url.searchParams.set("from", pathname)
    return NextResponse.redirect(url)
  }

  // 不在此处拦截 sign-in/sign-up，交给 RSC 自己判断。
  // 否则 AUTH_SECRET 轮换后旧 cookie 还在但 JWT 失效会无限循环。
  // 见 sign-in/page.tsx 内的已登录检测。

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/holdings/:path*",
    "/watchlist/:path*",
    "/transactions/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/funds/:path*",
    "/sign-in",
    "/sign-up",
  ],
}
