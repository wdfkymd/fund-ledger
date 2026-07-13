"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { RefreshCwIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Holding = {
  id: string
  shares: number
  costAmount: number
  estimateValue: number
  estimateProfit: number
  estimateProfitRate: number
  dayProfit: number | null
  dayProfitRate: number | null
  fund: {
    code: string
    name: string
    nav: number | null
    estimateNav: number | null
    estimateChangePct: number | null
    estimateTime: string | null
  }
}

type WatchItem = {
  id: string
  note: string | null
  isHeld: boolean
  fund: {
    code: string
    name: string
    nav: number | null
    estimateNav: number | null
    estimateChangePct: number | null
    estimateTime: string | null
  }
}

type Summary = {
  totalCost: number
  totalEstimateValue: number
  totalEstimateProfit: number
  totalEstimateProfitRate: number
  totalDayProfit: number | null
  totalDayProfitRate: number | null
}

type ListTab = "holdings" | "watchlist"

type MarketIndex = {
  name: string
  code: string
  price: number | null
  changePct: number | null
  change: number | null
}

type RecentTx = {
  id: string
  type: string
  amount: number
  shares: number
  tradeDate: string
  holding: { fund: { name: string; code: string } }
}

const TX_LABEL: Record<string, string> = {
  BUY: "买入",
  SELL: "卖出",
  SIP: "定投",
}

function fmt(v: number) {
  return v.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function fmtPct(rate: number | null | undefined) {
  if (rate == null) return "—"
  const sign = rate > 0 ? "+" : ""
  return `${sign}${(rate * 100).toFixed(2)}%`
}

function fmtNav(v: number | null | undefined) {
  if (v == null) return "—"
  return v.toFixed(4)
}

function fmtChg(pct: number | null | undefined) {
  if (pct == null) return "—"
  const sign = pct > 0 ? "+" : ""
  return `${sign}${pct.toFixed(2)}%`
}

function tone(v: number | null | undefined) {
  if (v == null || v === 0) return "text-muted-foreground"
  return v > 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400"
}

function signedMoney(amount: number | null) {
  if (amount == null) return "—"
  const sign = amount > 0 ? "+" : ""
  return `${sign}${fmt(amount)}`
}

function MetricCell({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="min-w-0 overflow-hidden px-2 text-center sm:px-3">
      <p className="text-[11px] text-muted-foreground sm:text-xs">{label}</p>
      <p
        className={cn(
          "mt-1.5 break-all text-xs font-medium leading-snug tabular-nums tracking-tight sm:text-sm",
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  )
}

function fmtIndexPrice(v: number | null) {
  if (v == null) return "—"
  return v.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function DashboardClient() {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [watchlist, setWatchlist] = useState<WatchItem[]>([])
  const [recentTxs, setRecentTxs] = useState<RecentTx[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [indices, setIndices] = useState<MarketIndex[]>([])
  const [tab, setTab] = useState<ListTab>("holdings")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefreshed, setAutoRefreshed] = useState(false)

  const fetchIndices = useCallback(async () => {
    try {
      const r = await fetch("/api/market/indices")
      if (r.ok) {
        const d = await r.json()
        setIndices(d.data.indices ?? [])
      }
    } catch {
      // 指数失败不挡主流程
    }
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const [hR, wR, tR] = await Promise.all([
        fetch("/api/holdings"),
        fetch("/api/watchlist"),
        fetch("/api/transactions?limit=5"),
      ])
      if (hR.ok) {
        const d = await hR.json()
        setHoldings(d.data.holdings)
        setSummary(d.data.summary)
      }
      if (wR.ok) {
        const d = await wR.json()
        setWatchlist(d.data.items)
      }
      if (tR.ok) {
        const d = await tR.json()
        setRecentTxs(Array.isArray(d.data) ? d.data : [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const handleRefresh = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true)
      try {
        await Promise.all([
          fetch("/api/funds", { method: "POST" }),
          fetchIndices(),
        ])
        await fetchData()
      } finally {
        if (!silent) setRefreshing(false)
      }
    },
    [fetchData, fetchIndices],
  )

  useEffect(() => {
    void fetchData()
    void fetchIndices()
  }, [fetchData, fetchIndices])

  useEffect(() => {
    if (loading || autoRefreshed) return
    if (holdings.length === 0 && watchlist.length === 0) {
      setAutoRefreshed(true)
      return
    }
    setAutoRefreshed(true)
    void handleRefresh(true)
  }, [
    loading,
    holdings.length,
    watchlist.length,
    autoRefreshed,
    handleRefresh,
  ])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">加载中…</p>
      </div>
    )
  }

  const assets = summary?.totalEstimateValue ?? 0
  const day = summary?.totalDayProfit ?? null
  const dayRate = summary?.totalDayProfitRate ?? null
  const profit = summary?.totalEstimateProfit ?? 0
  const profitRate = summary?.totalEstimateProfitRate ?? 0
  const cost = summary?.totalCost ?? 0

  const estimateTime =
    holdings.find((h) => h.fund.estimateTime)?.fund.estimateTime ??
    watchlist.find((w) => w.fund.estimateTime)?.fund.estimateTime

  const manageHref = tab === "holdings" ? "/holdings" : "/watchlist"
  const manageLabel = tab === "holdings" ? "管理持仓" : "管理自选"

  return (
    <div className="mx-auto w-full max-w-xl px-5 py-8 sm:px-6 sm:py-10">
      {/* Market index strip — slim horizontal scroll */}
      {indices.length > 0 && (
        <div className="mb-6 -mx-1">
          <div
            className="flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {indices.map((idx) => (
              <div
                key={idx.code}
                className="flex shrink-0 items-center gap-2 rounded-full border bg-muted/30 px-3 py-1.5"
              >
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {idx.name}
                </span>
                <span className="text-[11px] font-medium tabular-nums tracking-tight whitespace-nowrap">
                  {fmtIndexPrice(idx.price)}
                </span>
                <span
                  className={cn(
                    "text-[11px] tabular-nums whitespace-nowrap",
                    tone(idx.changePct),
                  )}
                >
                  {fmtChg(idx.changePct)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hero — always holdings summary (assets) */}
      <section className="relative mb-8 text-center">
        <div className="absolute right-0 top-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handleRefresh(false)}
            disabled={refreshing}
            title="刷新估值与指数"
            className="text-muted-foreground"
          >
            <RefreshCwIcon
              className={cn("size-4", refreshing && "animate-spin")}
            />
          </Button>
        </div>

        <p className="text-xs tracking-wide text-muted-foreground">总资产</p>
        <p className="mt-3 text-[2.25rem] font-semibold leading-none tracking-tight tabular-nums sm:text-[2.75rem]">
          {fmt(assets)}
        </p>

        <div className="mt-4 space-y-1">
          <p className={cn("text-sm font-medium tabular-nums", tone(day))}>
            {day == null ? (
              "今日 —"
            ) : (
              <>
                今日 {signedMoney(day)}
                {dayRate != null && (
                  <span className="ml-1.5 font-normal">{fmtPct(dayRate)}</span>
                )}
              </>
            )}
          </p>
          {estimateTime && (
            <p className="text-xs text-muted-foreground/80">
              估值 {estimateTime}
            </p>
          )}
        </div>

        <div className="mt-8 grid grid-cols-3 items-start divide-x rounded-xl border bg-muted/40 py-3.5 sm:py-4">
          <MetricCell label="总成本" value={fmt(cost)} />
          <MetricCell
            label="累计盈亏"
            value={signedMoney(profit)}
            valueClassName={tone(profit)}
          />
          <MetricCell
            label="收益率"
            value={fmtPct(profitRate)}
            valueClassName={tone(profitRate)}
          />
        </div>
      </section>

      {/* List with 持仓 / 自选 toggle */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-xl border bg-muted/40 p-1 text-xs">
            <button
              type="button"
              onClick={() => setTab("holdings")}
              className={cn(
                "rounded-lg px-2.5 py-1.5 font-medium transition-colors",
                tab === "holdings"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              持仓
              <span className="ml-1 tabular-nums opacity-60">
                {holdings.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab("watchlist")}
              className={cn(
                "rounded-lg px-2.5 py-1.5 font-medium transition-colors",
                tab === "watchlist"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              自选
              <span className="ml-1 tabular-nums opacity-60">
                {watchlist.length}
              </span>
            </button>
          </div>
          <Link
            href={manageHref}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {manageLabel}
          </Link>
        </div>

        {tab === "holdings" ? (
          holdings.length === 0 ? (
            <div className="rounded-xl border border-dashed py-12 text-center">
              <p className="text-sm text-muted-foreground">暂无持仓</p>
              <Link
                href="/holdings"
                className="mt-2 inline-block text-sm text-foreground/80 transition-colors hover:text-foreground"
              >
                去添加
              </Link>
            </div>
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border">
              {holdings.map((h) => {
                const dp = h.dayProfit
                const dpr = h.dayProfitRate
                const chg = h.fund.estimateChangePct
                return (
                  <li key={h.id} className="px-4 py-3.5 sm:px-5">
                    <div className="flex items-baseline justify-between gap-6">
                      <div className="min-w-0">
                        <Link
                          href={`/funds/${h.fund.code}`}
                          className="block truncate text-sm font-medium leading-snug transition-colors hover:text-foreground/80"
                        >
                          {h.fund.name}
                        </Link>
                        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                          {h.fund.code}
                          <span className="mx-1.5 opacity-40">·</span>
                          {fmt(h.shares)} 份
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-medium tabular-nums tracking-tight">
                          {fmt(h.estimateValue)}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-xs tabular-nums",
                            tone(dp ?? chg),
                          )}
                        >
                          {dp != null ? (
                            <>
                              {signedMoney(dp)}
                              {dpr != null && (
                                <span className="ml-1.5">{fmtPct(dpr)}</span>
                              )}
                            </>
                          ) : chg != null ? (
                            fmtChg(chg)
                          ) : (
                            "—"
                          )}
                        </p>
                      </div>
                    </div>

                    <p className="mt-2.5 text-xs tabular-nums text-muted-foreground">
                      <span>
                        成本{" "}
                        <span className="text-foreground/70">
                          {fmt(h.costAmount)}
                        </span>
                      </span>
                      <span className="mx-2 opacity-30">|</span>
                      <span>
                        累计{" "}
                        <span className={tone(h.estimateProfit)}>
                          {signedMoney(h.estimateProfit)}
                        </span>
                      </span>
                      <span className="mx-2 opacity-30">|</span>
                      <span>
                        收益{" "}
                        <span className={tone(h.estimateProfitRate)}>
                          {fmtPct(h.estimateProfitRate)}
                        </span>
                      </span>
                    </p>
                  </li>
                )
              })}
            </ul>
          )
        ) : watchlist.length === 0 ? (
          <div className="rounded-xl border border-dashed py-12 text-center">
            <p className="text-sm text-muted-foreground">暂无自选</p>
            <Link
              href="/watchlist"
              className="mt-2 inline-block text-sm text-foreground/80 transition-colors hover:text-foreground"
            >
              去添加
            </Link>
          </div>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border">
            {watchlist.map((item) => {
              const chg = item.fund.estimateChangePct
              const est = item.fund.estimateNav
              const nav = item.fund.nav
              return (
                <li key={item.id} className="px-4 py-3.5 sm:px-5">
                  <div className="flex items-baseline justify-between gap-6">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/funds/${item.fund.code}`}
                          className="block truncate text-sm font-medium leading-snug transition-colors hover:text-foreground/80"
                        >
                          {item.fund.name}
                        </Link>
                        {item.isHeld && (
                          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            已持有
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                        {item.fund.code}
                        {item.note && (
                          <>
                            <span className="mx-1.5 opacity-40">·</span>
                            <span>{item.note}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium tabular-nums tracking-tight">
                        {fmtNav(est ?? nav)}
                      </p>
                      <p className={cn("mt-1 text-xs tabular-nums", tone(chg))}>
                        {fmtChg(chg)}
                      </p>
                    </div>
                  </div>

                  <p className="mt-2.5 text-xs tabular-nums text-muted-foreground">
                    <span>
                      单位净值{" "}
                      <span className="text-foreground/70">{fmtNav(nav)}</span>
                    </span>
                    {est != null && (
                      <>
                        <span className="mx-2 opacity-30">|</span>
                        <span>
                          估值{" "}
                          <span className="text-foreground/70">
                            {fmtNav(est)}
                          </span>
                        </span>
                      </>
                    )}
                    {!item.isHeld && (
                      <>
                        <span className="mx-2 opacity-30">|</span>
                        <Link
                          href={`/holdings?code=${item.fund.code}&name=${encodeURIComponent(item.fund.name)}`}
                          className="text-foreground/70 transition-colors hover:text-foreground"
                        >
                          建仓
                        </Link>
                      </>
                    )}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Recent transactions */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">最近交易</h2>
          <Link
            href="/transactions"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            全部记录
          </Link>
        </div>
        {recentTxs.length === 0 ? (
          <div className="rounded-xl border border-dashed py-8 text-center">
            <p className="text-sm text-muted-foreground">暂无交易</p>
            <Link
              href="/transactions"
              className="mt-2 inline-block text-sm text-foreground/80 transition-colors hover:text-foreground"
            >
              去记一笔
            </Link>
          </div>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border">
            {recentTxs.map((tx) => {
              const label = TX_LABEL[tx.type] ?? tx.type
              const isSell = tx.type === "SELL"
              return (
                <li key={tx.id} className="px-4 py-3 sm:px-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                            isSell
                              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                              : tx.type === "SIP"
                                ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
                          )}
                        >
                          {label}
                        </span>
                        <p className="truncate text-sm font-medium leading-snug">
                          {tx.holding.fund.name}
                        </p>
                      </div>
                      <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                        {tx.tradeDate.slice(0, 10)}
                        <span className="mx-1.5 opacity-40">·</span>
                        {tx.holding.fund.code}
                        <span className="mx-1.5 opacity-40">·</span>
                        {fmt(tx.shares)} 份
                      </p>
                    </div>
                    <p
                      className={cn(
                        "shrink-0 text-sm font-medium tabular-nums tracking-tight",
                        isSell
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground",
                      )}
                    >
                      {isSell ? "+" : "−"}
                      {fmt(tx.amount)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
