import { apiPost } from "@/lib/client-api"

/** Default skip window for auto/background estimate pulls */
export const ESTIMATE_TTL_MS = 60_000

let inflight: Promise<void> | null = null
let lastSuccessAt = 0

/**
 * Single entry for POST /api/funds (East Money estimate refresh).
 * - Concurrent callers share one in-flight request
 * - Non-force calls within TTL are no-ops (avoids dashboard + watchlist double-hit)
 * - Manual refresh should pass force: true
 */
export async function refreshFundEstimates(options?: {
  signal?: AbortSignal
  force?: boolean
  ttlMs?: number
}): Promise<{ skipped: boolean }> {
  const force = options?.force ?? false
  const ttl = options?.ttlMs ?? ESTIMATE_TTL_MS

  if (!force && lastSuccessAt > 0 && Date.now() - lastSuccessAt < ttl) {
    return { skipped: true }
  }

  if (inflight) {
    await inflight
    return { skipped: false }
  }

  inflight = (async () => {
    try {
      await apiPost("/api/funds", { signal: options?.signal })
      lastSuccessAt = Date.now()
    } finally {
      inflight = null
    }
  })()

  await inflight
  return { skipped: false }
}

/** Test/helper: clear coalesce state (not used in UI). */
export function resetFundRefreshState() {
  inflight = null
  lastSuccessAt = 0
}
