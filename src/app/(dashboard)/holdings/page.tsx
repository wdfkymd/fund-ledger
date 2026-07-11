"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PlusIcon, Trash2Icon, SearchIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Holding = {
  id: string
  shares: number
  costAmount: number
  marketValue: number
  profit: number
  profitRate: number
  note: string | null
  fund: { code: string; name: string; nav: number | null }
}

export default function HoldingsPage() {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [fundCode, setFundCode] = useState("")
  const [fundName, setFundName] = useState("")
  const [shares, setShares] = useState("")
  const [costPrice, setCostPrice] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchHoldings = useCallback(async () => {
    try {
      const r = await fetch("/api/holdings")
      if (r.ok) {
        const d = await r.json()
        setHoldings(d.data.holdings)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchHoldings() }, [fetchHoldings])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      const r = await fetch("/api/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundCode: fundCode.trim(),
          fundName: fundName.trim() || undefined,
          shares: shares ? parseFloat(shares) : undefined,
          costPrice: costPrice ? parseFloat(costPrice) : undefined,
        }),
      })
      const d = await r.json()
      if (d.ok) {
        setOpen(false)
        setFundCode("")
        setFundName("")
        setShares("")
        setCostPrice("")
        await fetchHoldings()
      } else {
        setError(d.error || "添加失败")
      }
    } catch {
      setError("网络错误")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除该持仓？")) return
    const r = await fetch(`/api/holdings/${id}`, { method: "DELETE" })
    if (r.ok) {
      await fetchHoldings()
    }
  }

  if (loading) {
    return <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">加载中...</div>
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">持仓管理</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <PlusIcon className="mr-1 size-3.5" />
            添加持仓
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加基金持仓</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">基金代码</label>
                <Input
                  placeholder="6 位数字，如 000001"
                  value={fundCode}
                  onChange={(e) => setFundCode(e.target.value)}
                  required
                  maxLength={6}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">基金名称（可选）</label>
                <Input
                  placeholder="自动拉取失败时备用"
                  value={fundName}
                  onChange={(e) => setFundName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">持仓份额</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="如 198.64"
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">成本价</label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="如 1.7987"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                  />
                </div>
              </div>
              {shares && costPrice && (
                <p className="text-xs text-muted-foreground">
                  总成本 ≈ ¥{(parseFloat(shares) * parseFloat(costPrice) || 0).toFixed(2)}
                </p>
              )}
              {error && <p className="text-xs text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                添加
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {holdings.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <SearchIcon className="size-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">暂无持仓，点击「添加持仓」开始</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">基金</th>
                    <th className="px-4 py-3 text-right font-medium">份额</th>
                    <th className="px-4 py-3 text-right font-medium">净值</th>
                    <th className="px-4 py-3 text-right font-medium">成本</th>
                    <th className="px-4 py-3 text-right font-medium">市值</th>
                    <th className="px-4 py-3 text-right font-medium">盈亏</th>
                    <th className="px-4 py-3 text-right font-medium">收益率</th>
                    <th className="w-10" />
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
                      <td className="px-4 py-3 text-right tabular-nums">¥{h.costAmount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">¥{h.marketValue.toFixed(2)}</td>
                      <td className={cn("px-4 py-3 text-right tabular-nums font-medium", h.profit >= 0 ? "text-emerald-600" : "text-red-600")}>
                        {h.profit >= 0 ? "+" : ""}¥{h.profit.toFixed(2)}
                      </td>
                      <td className={cn("px-4 py-3 text-right tabular-nums font-medium", h.profitRate >= 0 ? "text-emerald-600" : "text-red-600")}>
                        {(h.profitRate * 100).toFixed(2)}%
                      </td>
                      <td className="px-2 py-3">
                        <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(h.id)}>
                          <Trash2Icon className="size-3.5 text-muted-foreground hover:text-red-500" />
                        </Button>
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
