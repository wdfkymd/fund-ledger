import { apiGet } from "@/lib/client-api"
import { refreshFundEstimates } from "@/lib/fund-refresh"
import type {
  DashboardSnapshot,
  HoldingsResponse,
  IndicesResponse,
  RecentTx,
  WatchlistResponse,
} from "@/components/dashboard/types"

/**
 * 首屏：持仓/自选/交易/指数并行，到齐再返回。
 * 指数失败降级为空数组，不挡整页。
 */
export async function fetchDashboardSnapshot(
  signal?: AbortSignal,
): Promise<DashboardSnapshot> {
  const [holdingsRes, watchlistRes, txsRes, indicesSettled] =
    await Promise.all([
      apiGet<HoldingsResponse>("/api/holdings", { signal }),
      apiGet<WatchlistResponse>("/api/watchlist", { signal }),
      apiGet<RecentTx[]>("/api/transactions?limit=5", { signal }),
      apiGet<IndicesResponse>("/api/market/indices", { signal }).then(
        (d) => ({ ok: true as const, data: d }),
        () => ({ ok: false as const }),
      ),
    ])

  return {
    holdings: holdingsRes.holdings ?? [],
    summary: holdingsRes.summary ?? null,
    watchlist: watchlistRes.items ?? [],
    recentTxs: Array.isArray(txsRes) ? txsRes : [],
    indices: indicesSettled.ok ? (indicesSettled.data.indices ?? []) : [],
  }
}

/**
 * 刷估值后重载快照（含指数）。force 见 fund-refresh。
 */
export async function refreshDashboardEstimates(
  signal?: AbortSignal,
  options?: { force?: boolean },
): Promise<DashboardSnapshot> {
  await refreshFundEstimates({
    signal,
    force: options?.force ?? false,
  })
  return fetchDashboardSnapshot(signal)
}
