"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCwIcon, TrendingUpIcon, TrendingDownIcon, WalletIcon, PieChartIcon, ArrowLeftRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Holding = {
  id: string
  shares: number
  costAmount: number
  marketValue: number
  profit: number
  profitRate: number
  note: string | null
  fund: { code: string; name: string; nav: number | null; navDate: string | null }
}

type Summary = {
  totalCost: number
  totalMarketValue: number
  totalProfit: number
  totalProfitRate: number
}

function fmt(v: number) { return v.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function pct(v: number) { return (v * 100).toFixed(2) + "%" }

export function DashboardClient() {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch("/api/holdings")
      if (r.ok) {
        const d = await r.json()
        setHoldings(d.data.holdings)
        setSummary(d.data.summary)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetch("/api/funds", { method: "POST" })
      await fetchData()
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">基金总览</h1>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCwIcon className={cn("mr-1 size-3.5", refreshing && "animate-spin")} />
          刷新净值
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <WalletIcon className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">总投入</p>
                <p className="text-lg font-bold tabular-nums">¥{fmt(summary.totalCost)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
                <PieChartIcon className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">总市值</p>
                <p className="text-lg font-bold tabular-nums">¥{fmt(summary.totalMarketValue)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className={cn(
                "flex size-10 items-center justify-center rounded-full",
                summary.totalProfit >= 0 ? "bg-emerald-100 dark:bg-emerald-950" : "bg-red-100 dark:bg-red-950"
              )}>
                {summary.totalProfit >= 0
                  ? <TrendingUpIcon className="size-5 text-emerald-600 dark:text-emerald-400" />
                  : <TrendingDownIcon className="size-5 text-red-600 dark:text-red-400" />
                }
              </div>
              <div>
                <p className="text-xs text-muted-foreground">总收益</p>
                <p className={cn("text-lg font-bold tabular-nums", summary.totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                  {summary.totalProfit >= 0 ? "+" : ""}¥{fmt(summary.totalProfit)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className={cn(
                "flex size-10 items-center justify-center rounded-full",
                summary.totalProfitRate >= 0 ? "bg-emerald-100 dark:bg-emerald-950" : "bg-red-100 dark:bg-red-950"
              )}>
                <ArrowLeftRightIcon className={cn(
                  "size-5",
                  summary.totalProfitRate >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                )} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">总收益率</p>
                <p className={cn("text-lg font-bold tabular-nums", summary.totalProfitRate >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                  {summary.totalProfitRate >= 0 ? "+" : ""}{pct(summary.totalProfitRate)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Holdings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">持仓明细</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {holdings.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">暂无持仓，去「持仓」页面添加基金。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">基金名称</th>
                    <th className="px-4 py-3 text-right font-medium">持有份额</th>
                    <th className="px-4 py-3 text-right font-medium">最新净值</th>
                    <th className="px-4 py-3 text-right font-medium">投入成本</th>
                    <th className="px-4 py-3 text-right font-medium">市值</th>
                    <th className="px-4 py-3 text-right font-medium">盈亏</th>
                    <th className="px-4 py-3 text-right font-medium">收益率</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => (
                    <tr key={h.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{h.fund.name}</p>
                        <p className="text-xs text-muted-foreground">{h.fund.code}</p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{h.shares.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{h.fund.nav?.toFixed(4) ?? "-"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">¥{fmt(h.costAmount)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">¥{fmt(h.marketValue)}</td>
                      <td className={cn(
                        "px-4 py-3 text-right tabular-nums font-medium",
                        h.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {h.profit >= 0 ? "+" : ""}¥{fmt(h.profit)}
                      </td>
                      <td className={cn(
                        "px-4 py-3 text-right tabular-nums font-medium",
                        h.profitRate >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {h.profitRate >= 0 ? "+" : ""}{pct(h.profitRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
