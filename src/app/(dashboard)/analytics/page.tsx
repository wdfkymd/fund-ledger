"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"

type FundItem = {
  holdingId: string
  fundCode: string
  fundName: string
  shares: number
  costAmount: number
  estimateValue: number
  estimateProfit: number
  estimateProfitRate: number
  dayProfit: number | null
  weight: number
}

type AnalyticsData = {
  summary: {
    totalCost: number
    totalEstimateValue: number
    totalEstimateProfit: number
    totalEstimateProfitRate: number
    totalDayProfit: number | null
    totalDayProfitRate: number | null
    holdingCount: number
    transactionCount: number
  }
  flow: {
    buyAmount: number
    sellAmount: number
    sipAmount: number
    buyCount: number
    sellCount: number
    sipCount: number
    feeTotal: number
    netInvested: number
  }
  byWeight: FundItem[]
  byProfit: FundItem[]
  monthly: {
    month: string
    invest: number
    redeem: number
    net: number
    count: number
  }[]
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

const chartConfig = {
  invest: { label: "投入", color: "hsl(142 60% 40%)" },
  redeem: { label: "赎回", color: "hsl(0 65% 55%)" },
} satisfies ChartConfig

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch("/api/analytics")
      if (r.ok) {
        const d = await r.json()
        setData(d.data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const chartData = useMemo(() => {
    if (!data) return []
    return data.monthly.map((m) => ({
      ...m,
      label: m.month.slice(5), // MM
    }))
  }, [data])

  const hasFlow = useMemo(() => {
    if (!data) return false
    return data.monthly.some((m) => m.invest > 0 || m.redeem > 0)
  }, [data])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">加载中…</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">加载失败，请刷新重试</p>
      </div>
    )
  }

  const { summary, flow, byWeight, byProfit } = data
  const empty = summary.holdingCount === 0 && summary.transactionCount === 0

  return (
    <div className="mx-auto w-full max-w-xl px-5 py-8 sm:px-6 sm:py-10">
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="text-xs tracking-wide text-muted-foreground">累计盈亏</p>
        <p
          className={cn(
            "mt-3 text-[2.25rem] font-semibold leading-none tracking-tight tabular-nums sm:text-[2.75rem]",
            tone(summary.totalEstimateProfit),
          )}
        >
          {signedMoney(summary.totalEstimateProfit)}
        </p>
        <p
          className={cn(
            "mt-4 text-sm font-medium tabular-nums",
            tone(summary.totalEstimateProfitRate),
          )}
        >
          收益率 {fmtPct(summary.totalEstimateProfitRate)}
        </p>
        <p className={cn("mt-1.5 text-xs tabular-nums", tone(summary.totalDayProfit))}>
          {summary.totalDayProfit == null
            ? "今日 —"
            : `今日 ${signedMoney(summary.totalDayProfit)}${
                summary.totalDayProfitRate != null
                  ? `  ${fmtPct(summary.totalDayProfitRate)}`
                  : ""
              }`}
        </p>

        <div className="mt-8 grid grid-cols-3 items-start divide-x rounded-xl border bg-muted/40 py-3.5 sm:py-4">
          <MetricCell label="总成本" value={fmt(summary.totalCost)} />
          <MetricCell
            label="总资产"
            value={fmt(summary.totalEstimateValue)}
          />
          <MetricCell
            label="持仓数"
            value={String(summary.holdingCount)}
          />
        </div>
      </div>

      {empty ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">暂无数据可分析</p>
          <Link
            href="/holdings"
            className="mt-2 inline-block text-sm text-foreground/80 transition-colors hover:text-foreground"
          >
            先添加持仓
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Cash flow summary */}
          <section>
            <div className="mb-2.5 flex items-center justify-between px-0.5">
              <h2 className="text-xs tracking-wide text-muted-foreground">
                资金流水
              </h2>
              <Link
                href="/transactions"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                交易记录
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
              {[
                {
                  label: "买入",
                  value: fmt(flow.buyAmount),
                  sub: `${flow.buyCount} 笔`,
                },
                {
                  label: "定投",
                  value: fmt(flow.sipAmount),
                  sub: `${flow.sipCount} 笔`,
                },
                {
                  label: "卖出",
                  value: fmt(flow.sellAmount),
                  sub: `${flow.sellCount} 笔`,
                },
                {
                  label: "净投入",
                  value: fmt(flow.netInvested),
                  sub:
                    flow.feeTotal > 0
                      ? `手续费 ${fmt(flow.feeTotal)}`
                      : `${flow.buyCount + flow.sipCount + flow.sellCount} 笔合计`,
                },
              ].map((cell) => (
                <div
                  key={cell.label}
                  className="min-w-0 overflow-hidden bg-background px-2.5 py-3 text-center sm:px-3"
                >
                  <p className="text-[11px] text-muted-foreground">
                    {cell.label}
                  </p>
                  <p className="mt-1 break-all text-xs font-medium leading-snug tabular-nums tracking-tight sm:text-sm">
                    {cell.value}
                  </p>
                  <p className="mt-0.5 break-all text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
                    {cell.sub}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-2 px-0.5 text-[11px] text-muted-foreground">
              净投入 ≈ 买入 + 定投 − 卖出（金额字段，不含持仓浮盈）
            </p>
          </section>

          {/* Monthly chart */}
          <section>
            <div className="mb-2.5 px-0.5">
              <h2 className="text-xs tracking-wide text-muted-foreground">
                近 12 个月流水
              </h2>
            </div>
            {!hasFlow ? (
              <div className="rounded-xl border border-dashed py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  暂无按月流水（记几笔交易后会显示）
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border px-2 pb-2 pt-4">
                <ChartContainer
                  config={chartConfig}
                  className="aspect-[16/9] w-full overflow-hidden"
                >
                  <BarChart
                    data={chartData}
                    margin={{ left: 4, right: 8, top: 8, bottom: 4 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      fontSize={10}
                      interval={0}
                      minTickGap={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={36}
                      fontSize={10}
                      tickCount={4}
                      tickFormatter={(v) =>
                        Math.abs(v) >= 1000
                          ? `${(v / 1000).toFixed(0)}k`
                          : String(v)
                      }
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(_, payload) => {
                            const p = payload?.[0]?.payload as
                              | { month?: string }
                              | undefined
                            return p?.month ?? ""
                          }}
                        />
                      }
                    />
                    <Bar
                      dataKey="invest"
                      fill="var(--color-invest)"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={18}
                    />
                    <Bar
                      dataKey="redeem"
                      fill="var(--color-redeem)"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={18}
                    />
                  </BarChart>
                </ChartContainer>
                <div className="flex justify-center gap-4 pb-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-sm bg-[hsl(142_60%_40%)]" />
                    投入
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-sm bg-[hsl(0_65%_55%)]" />
                    赎回
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Allocation */}
          <section>
            <div className="mb-2.5 flex items-center justify-between px-0.5">
              <h2 className="text-xs tracking-wide text-muted-foreground">
                持仓占比
              </h2>
              <Link
                href="/holdings"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                持仓
              </Link>
            </div>
            {byWeight.length === 0 ? (
              <div className="rounded-xl border border-dashed py-10 text-center">
                <p className="text-sm text-muted-foreground">暂无持仓</p>
              </div>
            ) : (
              <ul className="divide-y overflow-hidden rounded-xl border">
                {byWeight.map((item) => (
                  <li key={item.holdingId} className="px-4 py-3.5 sm:px-5">
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="min-w-0">
                        <Link
                          href={`/funds/${item.fundCode}`}
                          className="truncate text-sm font-medium leading-snug transition-colors hover:text-foreground/80"
                        >
                          {item.fundName}
                        </Link>
                        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                          {item.fundCode}
                          <span className="mx-1.5 opacity-40">·</span>
                          {(item.weight * 100).toFixed(1)}%
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-medium tabular-nums tracking-tight">
                        {fmt(item.estimateValue)}
                      </p>
                    </div>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-foreground/70"
                        style={{
                          width: `${Math.min(100, Math.max(0, item.weight * 100))}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Profit ranking */}
          <section>
            <div className="mb-2.5 px-0.5">
              <h2 className="text-xs tracking-wide text-muted-foreground">
                盈亏排行
              </h2>
            </div>
            {byProfit.length === 0 ? (
              <div className="rounded-xl border border-dashed py-10 text-center">
                <p className="text-sm text-muted-foreground">暂无持仓</p>
              </div>
            ) : (
              <ul className="divide-y overflow-hidden rounded-xl border">
                {byProfit.map((item, idx) => (
                  <li key={item.holdingId} className="px-4 py-3.5 sm:px-5">
                    <div className="flex items-baseline justify-between gap-6">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium leading-snug">
                          <span className="mr-2 text-xs tabular-nums text-muted-foreground">
                            {idx + 1}
                          </span>
                          <Link
                            href={`/funds/${item.fundCode}`}
                            className="transition-colors hover:text-foreground/80"
                          >
                            {item.fundName}
                          </Link>
                        </p>
                        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                          成本 {fmt(item.costAmount)}
                          <span className="mx-1.5 opacity-40">·</span>
                          估值 {fmt(item.estimateValue)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={cn(
                            "text-sm font-medium tabular-nums tracking-tight",
                            tone(item.estimateProfit),
                          )}
                        >
                          {signedMoney(item.estimateProfit)}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-xs tabular-nums",
                            tone(item.estimateProfitRate),
                          )}
                        >
                          {fmtPct(item.estimateProfitRate)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
