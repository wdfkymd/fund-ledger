type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

/**
 * 进程内固定窗口限流（单实例够用）。
 * @returns remaining；超限返回 null
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true; remaining: number } | { ok: false; retryAfterSec: number } {
  const now = Date.now()
  const cur = buckets.get(key)
  if (!cur || cur.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1 }
  }
  if (cur.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((cur.resetAt - now) / 1000)),
    }
  }
  cur.count += 1
  return { ok: true, remaining: limit - cur.count }
}

export function clientKey(req: Request, prefix: string): string {
  const xf = req.headers.get("x-forwarded-for")
  const ip =
    xf?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  return `${prefix}:${ip}`
}
