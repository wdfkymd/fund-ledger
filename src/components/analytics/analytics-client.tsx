"use client"

import { useMemo } from "react"
import { motion } from "motion/react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  toneCn as tone,
  signedMoney,
  fmtPct,
  fmtChg,
  fmtNav,
  settledLabel,
  settledTag,
  tagPillClass,
  changeSourceLabel,
  fmtMoney,
} from "@/lib/format-cn"

const fmt = fmtMoney
import { container as fadeSlideUp } from "@/lib/motion-variants"
import type { AnalyticsPayload } from "@/lib/analytics-data"

const MonthlyFlowChart = dynamic(
  () =>
    import("@/components/charts/monthly-flow-chart").then(
      (m) => m.MonthlyFlowChart,
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

type AnalyticsData = AnalyticsPayload





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

export function AnalyticsClient({ initial }: { initial: AnalyticsData }) {
  const data = initial

  const chartData = useMemo(() => {
    return data.monthly.map((m) => ({
      ...m,
      label: m.month.slice(5), // MM
    }))
  }, [data])

  const hasFlow = useMemo(() => {
    return data.monthly.some((m) => m.invest > 0 || m.redeem > 0)
  }, [data])

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
            ? `${settledLabel(summary.isEstimate)} —`
            : `${settledLabel(summary.isEstimate)} ${signedMoney(summary.totalDayProfit)}${
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
          <motion.section
            {...fadeSlideUp}
            transition={{ ...fadeSlideUp.transition, delay: 0.05 }}
          >
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
          </motion.section>

          {/* Monthly chart */}
          <motion.section
            {...fadeSlideUp}
            transition={{ ...fadeSlideUp.transition, delay: 0.1 }}
          >
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
              <MonthlyFlowChart data={chartData} />
            )}
          </motion.section>

          {/* Allocation */}
          <motion.section
            {...fadeSlideUp}
            transition={{ ...fadeSlideUp.transition, delay: 0.15 }}
          >
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
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1">
                      <Link
                        href={`/funds/${item.fundCode}`}
                        className="min-w-0 truncate text-sm font-medium leading-5 transition-colors hover:text-foreground/80"
                      >
                        {item.fundName}
                      </Link>
                      <p className="text-right text-sm font-medium leading-5 tabular-nums tracking-tight">
                        {fmt(item.isEstimate ? item.estimateValue : item.marketValue)}
                      </p>
                      <p className="col-span-2 text-xs leading-4 tabular-nums text-muted-foreground">
                        {item.fundCode}
                        <span className="mx-1.5 opacity-40">·</span>
                        {(item.weight * 100).toFixed(1)}%
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
          </motion.section>

          {/* Profit ranking */}
          <motion.section
            {...fadeSlideUp}
            transition={{ ...fadeSlideUp.transition, delay: 0.2 }}
          >
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
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1">
                      <span className="pt-0.5 text-xs leading-5 tabular-nums text-muted-foreground">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/funds/${item.fundCode}`}
                          className="block truncate text-sm font-medium leading-5 transition-colors hover:text-foreground/80"
                        >
                          {item.fundName}
                        </Link>
                        <p className="mt-1 text-xs leading-4 tabular-nums text-muted-foreground">
                          成本 {fmt(item.costAmount)}
                          <span className="mx-1.5 opacity-40">·</span>
                          {item.isEstimate ? "市值·估" : "市值·实"} {fmt(item.isEstimate ? item.estimateValue : item.marketValue)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "text-sm font-medium leading-5 tabular-nums tracking-tight",
                            tone(item.isEstimate ? item.estimateProfit : item.profit),
                          )}
                        >
                          {signedMoney(item.isEstimate ? item.estimateProfit : item.profit)}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-xs leading-4 tabular-nums",
                            tone(item.isEstimate ? item.estimateProfitRate : item.profitRate),
                          )}
                        >
                          {fmtPct(item.isEstimate ? item.estimateProfitRate : item.profitRate)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.section>
        </div>
      )}
    </div>
  )
}
