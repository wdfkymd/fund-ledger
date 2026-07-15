"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { animate } from "animejs"
import { Button } from "@/components/ui/button"
import { RefreshCwIcon } from "lucide-react"
import { useCountUp } from "@/hooks/use-count-up"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { usePageEnter } from "@/hooks/use-page-enter"
import { cn } from "@/lib/utils"
import { DashboardSkeleton } from "./dashboard-skeleton"
import {
  fmt,
  fmtChg,
  fmtIndexPrice,
  fmtNav,
  fmtPct,
  signedMoney,
  tone,
  TX_LABEL,
} from "@/lib/format"
import type { ListTab } from "./types"

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

/** 刷新完成后：总资产轻弹一下（克制反馈） */
function pulseRefreshDone(targets: Array<Element | null>) {
  if (prefersReducedMotion()) return
  const els = targets.filter(Boolean) as Element[]
  if (els.length === 0) return
  animate(els, {
    scale: [
      { to: 1.04, duration: 120, ease: "out(2)" },
      { to: 1, duration: 220, ease: "out(3)" },
    ],
  })
}

const INDEX_SLOT_COUNT = 4

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

export function DashboardClient() {
  const { status, data, error, refreshing, reload, refreshEstimates } =
    useDashboardData()
  const [tab, setTab] = useState<ListTab>("holdings")

  const ready = status === "ready"
  const rootRef = usePageEnter(ready)
  const assetsValue = data.summary?.totalEstimateValue ?? 0
  const assetsRef = useCountUp<HTMLParagraphElement>(assetsValue, {
    digits: 2,
    duration: 480,
    enabled: ready,
  })
  const dayValue = data.summary?.totalDayProfit ?? 0
  const dayRef = useCountUp<HTMLSpanElement>(dayValue, {
    digits: 2,
    duration: 420,
    enabled: ready && data.summary?.totalDayProfit != null,
    format: (n) => `今日 ${signedMoney(n)}`,
  })
  const refreshBtnRef = useRef<HTMLButtonElement | null>(null)
  const wasRefreshing = useRef(false)

  // 手动刷新结束：总资产 + 按钮轻 scale 反馈
  useEffect(() => {
    if (wasRefreshing.current && !refreshing && ready) {
      pulseRefreshDone([assetsRef.current, refreshBtnRef.current])
    }
    wasRefreshing.current = refreshing
  }, [refreshing, ready, assetsRef])

  if (status === "loading") {
    return <DashboardSkeleton />
  }

  if (status === "error") {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-3 px-5 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          {error ?? "加载失败"}
        </p>
        <Button variant="outline" size="sm" onClick={() => void reload()}>
          重试
        </Button>
      </div>
    )
  }

  const { holdings, watchlist, recentTxs, summary, indices } = data
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
    <div
      ref={rootRef}
      className="mx-auto w-full max-w-xl px-5 py-8 sm:px-6 sm:py-10"
    >
      <div className="anime-enter mb-6 -mx-1 min-h-[34px]">
        <div
          className="flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {indices.length > 0
            ? indices.map((idx) => (
                <div
                  key={idx.code}
                  className="flex h-7 shrink-0 items-center gap-2 rounded-full border bg-muted/30 px-3"
                >
                  <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                    {idx.name}
                  </span>
                  <span className="whitespace-nowrap text-[11px] font-medium tabular-nums tracking-tight">
                    {fmtIndexPrice(idx.price)}
                  </span>
                  <span
                    className={cn(
                      "whitespace-nowrap text-[11px] tabular-nums",
                      tone(idx.changePct),
                    )}
                  >
                    {fmtChg(idx.changePct)}
                  </span>
                </div>
              ))
            : Array.from({ length: INDEX_SLOT_COUNT }).map((_, i) => (
                <div
                  key={i}
                  className="h-7 w-[5.5rem] shrink-0 rounded-full border border-dashed bg-muted/20"
                  aria-hidden
                />
              ))}
        </div>
      </div>

      <section className="anime-enter relative mb-8 text-center">
        <div className="absolute right-0 top-0">
          <Button
            ref={refreshBtnRef}
            variant="ghost"
            size="icon-sm"
            onClick={() => void refreshEstimates(true)}
            disabled={refreshing}
            title="刷新估值与指数"
            className="text-muted-foreground"
          >
            <RefreshCwIcon
              className={cn("size-4", refreshing && "animate-spin")}
            />
          </Button>
        </div>

        <p className="text-xs tracking-wide text-muted-foreground">
          总资产
          {refreshing && (
            <span className="ml-1.5 font-normal text-muted-foreground/70">
              更新中
            </span>
          )}
        </p>
        <p
          ref={assetsRef}
          className="mt-3 origin-center text-[2.25rem] font-semibold leading-none tracking-tight tabular-nums sm:text-[2.75rem]"
        >
          {fmt(assetsValue)}
        </p>

        <div className="mt-4 space-y-1">
          {day == null ? (
            <p className="text-sm font-medium tabular-nums text-muted-foreground">
              今日 —
            </p>
          ) : (
            <p
              className={cn(
                "text-sm font-medium tabular-nums",
                tone(day),
              )}
            >
              <span ref={dayRef}>今日 {signedMoney(day)}</span>
              {dayRate != null && (
                <span className="ml-1.5 font-normal">{fmtPct(dayRate)}</span>
              )}
            </p>
          )}
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

      <section className="anime-enter">
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
                  <li
                    key={h.id}
                    className="anime-list-item px-4 py-3.5 sm:px-5"
                  >
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
                <li
                  key={item.id}
                  className="anime-list-item px-4 py-3.5 sm:px-5"
                >
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

      <section className="anime-enter mt-8">
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
                <li key={tx.id} className="anime-list-item px-4 py-3 sm:px-5">
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
