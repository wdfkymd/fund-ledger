"use client"

import { useCallback, useMemo, useState } from "react"
import { motion } from "motion/react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { RefreshCwIcon, ArrowLeftIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { container as containerV, staggerItem, fadeSlideUp } from "@/lib/motion-variants"
import type { FundDetailPayload } from "@/lib/fund-detail-data"

const NavHistoryChart = dynamic(
  () =>
    import("@/components/charts/nav-history-chart").then(
      (m) => m.NavHistoryChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-[16/9] items-center justify-center rounded-xl border text-sm text-muted-foreground">
        图表加载中…
      </div>
    ),
  },
)

type FundDetail = FundDetailPayload

const TYPE_LABEL: Record<string, string> = {
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

function fmtNav(v: number | null | undefined) {
  if (v == null) return "—"
  return v.toFixed(4)
}

function fmtPct(rate: number | null | undefined) {
  if (rate == null) return "—"
  const sign = rate > 0 ? "+" : ""
  return `${sign}${(rate * 100).toFixed(2)}%`
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

export function FundDetailClient({
  code,
  initial,
}: {
  code: string
  initial: FundDetail
}) {
  const [data, setData] = useState<FundDetail>(initial)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(
    async (refresh = false) => {
      if (!/^\d{6}$/.test(code)) return
      if (refresh) setRefreshing(true)
      try {
        const q = refresh ? "?refresh=1&days=90" : "?days=90"
        const r = await fetch(`/api/funds/${code}${q}`)
        const d = await r.json()
        if (d.ok) {
          setData(d.data)
        }
      } finally {
        setRefreshing(false)
      }
    },
    [code],
  )

  const chartData = useMemo(() => {
    if (!data?.history?.length) return []
    const list = data.history
    const tickEvery = Math.max(1, Math.ceil(list.length / 5))
    return list.map((p, i) => ({
      ...p,
      label:
        i === 0 || i === list.length - 1 || i % tickEvery === 0
          ? p.date.slice(5)
          : "",
    }))
  }, [data])

  const { fund, holding } = data
  const chg = fund.estimateChangePct

  return (
    <div className="mx-auto w-full max-w-xl px-5 py-8 sm:px-6 sm:py-10">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/dashboard"
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5" />
            返回
          </Link>
          <h1 className="truncate text-base font-semibold tracking-tight">
            {fund.name}
          </h1>
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {fund.code}
            {fund.type && (
              <>
                <span className="mx-1.5 opacity-40">·</span>
                {fund.type}
              </>
            )}
            {holding && (
              <>
                <span className="mx-1.5 opacity-40">·</span>
                <span>已持有</span>
              </>
            )}
            {data.isWatched && !holding && (
              <>
                <span className="mx-1.5 opacity-40">·</span>
                <span>自选中</span>
              </>
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => load(true)}
          disabled={refreshing}
          title="刷新"
          className="text-muted-foreground"
        >
          <RefreshCwIcon
            className={cn("size-4", refreshing && "animate-spin")}
          />
        </Button>
      </div>

      {/* Quote hero */}
      <motion.section className="mb-8 text-center" {...fadeSlideUp}>
        <p className="text-xs tracking-wide text-muted-foreground">
          {fund.estimateNav != null ? "估值" : "单位净值"}
        </p>
        <p className="mt-3 text-[2.25rem] font-semibold leading-none tracking-tight tabular-nums sm:text-[2.75rem]">
          {fmtNav(fund.estimateNav ?? fund.nav)}
        </p>
        <p className={cn("mt-4 text-sm font-medium tabular-nums", tone(chg))}>
          {chg == null ? "涨跌 —" : `估算 ${fmtChg(chg)}`}
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          单位净值 {fmtNav(fund.nav)}
          {fund.navDate && (
            <>
              <span className="mx-1.5 opacity-40">·</span>
              {String(fund.navDate).slice(0, 10)}
            </>
          )}
          {fund.estimateTime && (
            <>
              <span className="mx-1.5 opacity-40">·</span>
              估值 {fund.estimateTime}
            </>
          )}
        </p>

        {holding && (
          <div className="mt-8 grid grid-cols-3 items-start divide-x rounded-xl border bg-muted/40 py-3.5 sm:py-4">
            <MetricCell
              label={holding.isEstimate ? "持仓估值" : "持仓市值"}
              value={fmt(holding.isEstimate ? holding.estimateValue : holding.marketValue)}
            />
            <MetricCell
              label={holding.isEstimate ? "预估盈亏" : "累计盈亏"}
              value={signedMoney(holding.isEstimate ? holding.estimateProfit : holding.profit)}
              valueClassName={tone(holding.isEstimate ? holding.estimateProfit : holding.profit)}
            />
            <MetricCell
              label="今日"
              value={
                holding.dayProfit == null
                  ? "—"
                  : signedMoney(holding.dayProfit)
              }
              valueClassName={tone(holding.dayProfit)}
            />
          </div>
        )}

        {!holding && (
          <div className="mt-6 flex justify-center gap-3 text-xs">
            <Link
              href="/holdings"
              className="text-foreground/80 underline-offset-4 hover:underline"
            >
              去建仓
            </Link>
            {!data.isWatched && (
              <Link
                href="/watchlist"
                className="text-muted-foreground underline-offset-4 hover:underline"
              >
                去加自选
              </Link>
            )}
          </div>
        )}
      </motion.section>

      {/* Nav chart */}
      <motion.section
        className="mb-8"
        {...fadeSlideUp}
        transition={{ ...fadeSlideUp.transition, delay: 0.05 }}
      >
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <h2 className="text-xs tracking-wide text-muted-foreground">
            净值走势
          </h2>
          <span className="text-[11px] text-muted-foreground">
            {data.historySource === "remote" ? "近 90 日" : "本地记录"}
          </span>
        </div>
        {chartData.length < 2 ? (
          <div className="rounded-xl border border-dashed py-12 text-center">
            <p className="text-sm text-muted-foreground">
              历史净值不足，点右上角刷新试试
            </p>
          </div>
        ) : (
          <NavHistoryChart data={chartData} />
        )}
      </motion.section>

      {/* Holding extras */}
      {holding && (
        <motion.section
          className="mb-8"
          {...fadeSlideUp}
          transition={{ ...fadeSlideUp.transition, delay: 0.1 }}
        >
          <div className="mb-2.5 px-0.5">
            <h2 className="text-xs tracking-wide text-muted-foreground">
              我的持仓
            </h2>
          </div>
          <div className="rounded-xl border px-4 py-3.5 text-xs tabular-nums text-muted-foreground sm:px-5">
            <p>
              份额{" "}
              <span className="text-foreground/80">{fmt(holding.shares)}</span>
              <span className="mx-2 opacity-30">|</span>
              成本{" "}
              <span className="text-foreground/80">
                {fmt(holding.costAmount)}
              </span>
              <span className="mx-2 opacity-30">|</span>
              收益率{" "}
              <span className={tone(holding.estimateProfitRate)}>
                {fmtPct(holding.estimateProfitRate)}
              </span>
            </p>
            {holding.note && (
              <p className="mt-2 text-muted-foreground">备注 {holding.note}</p>
            )}
            <div className="mt-3">
              <Link
                href="/holdings"
                className="text-foreground/80 transition-colors hover:text-foreground"
              >
                管理持仓 →
              </Link>
            </div>
          </div>
        </motion.section>
      )}

      {/* Transactions for this fund */}
      <motion.section
        {...fadeSlideUp}
        transition={{ ...fadeSlideUp.transition, delay: 0.15 }}
      >
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <h2 className="text-xs tracking-wide text-muted-foreground">
            相关交易
            {data.transactions.length > 0
              ? ` · ${data.transactions.length}`
              : ""}
          </h2>
          {holding && (
            <Link
              href="/transactions"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              全部
            </Link>
          )}
        </div>
        {!holding ? (
          <div className="rounded-xl border border-dashed py-10 text-center">
            <p className="text-sm text-muted-foreground">
              未持有该基金，暂无交易
            </p>
          </div>
        ) : data.transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed py-10 text-center">
            <p className="text-sm text-muted-foreground">暂无交易记录</p>
            <Link
              href="/transactions"
              className="mt-2 inline-block text-sm text-foreground/80 hover:text-foreground"
            >
              去记一笔
            </Link>
          </div>
        ) : (
          <motion.div className="divide-y overflow-hidden rounded-xl border" {...containerV}>
            {data.transactions.map((tx, i) => {
              const isSell = tx.type === "SELL"
              return (
                <motion.li key={tx.id} className="px-4 py-3.5 sm:px-5" {...staggerItem(i)}>
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {TYPE_LABEL[tx.type] ?? tx.type}
                        <span className="ml-2 text-xs font-normal tabular-nums text-muted-foreground">
                          {tx.tradeDate.slice(0, 10)}
                        </span>
                      </p>
                      <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                        {fmt(tx.shares)} 份
                        <span className="mx-1.5 opacity-40">·</span>
                        净值 {tx.nav.toFixed(4)}
                        {tx.fee > 0 && (
                          <>
                            <span className="mx-1.5 opacity-40">·</span>
                            费 {fmt(tx.fee)}
                          </>
                        )}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "shrink-0 text-sm font-medium tabular-nums",
                        isSell
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400",
                      )}
                    >
                      {isSell ? "+" : "-"}
                      {fmt(tx.amount)}
                    </p>
                  </div>
                </motion.li>
              )
            })}
          </motion.div>
        )}
      </motion.section>

      {data.liveError && (
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          行情提示：{data.liveError}
        </p>
      )}
    </div>
  )
}
