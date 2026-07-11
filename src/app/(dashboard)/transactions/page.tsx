"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlusIcon, Trash2Icon, ArrowDownLeftIcon, ArrowUpRightIcon, RepeatIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Transaction = {
  id: string
  type: string
  amount: number
  shares: number
  nav: number
  fee: number
  tradeDate: string
  note: string | null
  holding: { fund: { name: string; code: string } }
}

type Holding = {
  id: string
  shares: number
  fund: { name: string; code: string }
}

const TYPE_META: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  BUY: {
    label: "买入",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    icon: <ArrowDownLeftIcon className="size-3" />,
  },
  SELL: {
    label: "卖出",
    cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
    icon: <ArrowUpRightIcon className="size-3" />,
  },
  SIP: {
    label: "定投",
    cls: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
    icon: <RepeatIcon className="size-3" />,
  },
}

const FILTERS = [
  { value: "ALL", label: "全部" },
  { value: "BUY", label: "买入" },
  { value: "SELL", label: "卖出" },
  { value: "SIP", label: "定投" },
] as const

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Transaction[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("ALL")

  const [form, setForm] = useState({
    holdingId: "",
    type: "BUY",
    amount: "",
    shares: "",
    nav: "",
    tradeDate: new Date().toISOString().slice(0, 10),
    fee: "0",
    note: "",
  })
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [txR, hR] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/holdings"),
      ])
      if (txR.ok) setTxs((await txR.json()).data)
      if (hR.ok) {
        const d = await hR.json()
        setHoldings(d.data.holdings)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: txs.length, BUY: 0, SELL: 0, SIP: 0 }
    for (const t of txs) c[t.type] = (c[t.type] ?? 0) + 1
    return c
  }, [txs])

  const visible = useMemo(
    () => (filter === "ALL" ? txs : txs.filter((t) => t.type === filter)),
    [txs, filter],
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      const r = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdingId: form.holdingId,
          type: form.type,
          amount: Number(form.amount),
          shares: Number(form.shares),
          nav: Number(form.nav),
          tradeDate: form.tradeDate,
          fee: Number(form.fee) || 0,
          note: form.note || undefined,
        }),
      })
      const d = await r.json()
      if (d.ok) {
        setOpen(false)
        setForm({ holdingId: "", type: "BUY", amount: "", shares: "", nav: "", tradeDate: new Date().toISOString().slice(0, 10), fee: "0", note: "" })
        await fetchData()
      } else {
        setError(d.error || "提交失败")
      }
    } catch {
      setError("网络错误")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除该交易？")) return
    const r = await fetch(`/api/transactions/${id}`, { method: "DELETE" })
    if (r.ok) await fetchData()
  }

  if (loading) {
    return <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">加载中...</div>
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">交易记录</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" disabled={holdings.length === 0} />}>
            <PlusIcon className="mr-1 size-3.5" />
            记一笔
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>记一笔交易</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">持仓基金</label>
                <Select value={form.holdingId || ""} onValueChange={(v) => setForm({ ...form, holdingId: v ?? "" })}>
                  <SelectTrigger><SelectValue placeholder="选择基金" /></SelectTrigger>
                  <SelectContent>
                    {holdings.map((h) => (
                      <SelectItem key={h.id} value={h.id}>{h.fund.name} ({h.fund.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">类型</label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v ?? "BUY" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">买入</SelectItem>
                    <SelectItem value="SELL">卖出</SelectItem>
                    <SelectItem value="SIP">定投</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{form.type === "SELL" ? "卖出金额" : form.type === "SIP" ? "定投金额" : "买入金额"}</label>
                  <Input type="number" step="0.01" placeholder="金额" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">份额</label>
                  <Input type="number" step="0.01" placeholder="份额" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">净值</label>
                  <Input type="number" step="0.0001" placeholder="净值" value={form.nav} onChange={(e) => setForm({ ...form, nav: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">手续费</label>
                  <Input type="number" step="0.01" placeholder="0" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">交易日期</label>
                <Input type="date" value={form.tradeDate} onChange={(e) => setForm({ ...form, tradeDate: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">备注（可选）</label>
                <Input placeholder="备注" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>提交</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1 text-sm">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-md px-3 py-1 font-medium transition-colors",
              filter === f.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
            <span className="ml-1 text-xs opacity-60">{counts[f.value]}</span>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {txs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <PlusIcon className="size-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">暂无交易记录，点击右上角「记一笔」开始</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <p className="text-sm text-muted-foreground">该筛选条件下暂无交易</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">基金</th>
                    <th className="px-4 py-3 text-left font-medium">类型</th>
                    <th className="px-4 py-3 text-right font-medium">金额</th>
                    <th className="px-4 py-3 text-right font-medium">份额</th>
                    <th className="px-4 py-3 text-right font-medium">净值</th>
                    <th className="px-4 py-3 text-right font-medium">手续费</th>
                    <th className="px-4 py-3 text-right font-medium">日期</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((tx) => {
                    const meta = TYPE_META[tx.type] ?? TYPE_META.BUY
                    return (
                      <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{tx.holding.fund.name}</p>
                          <p className="text-xs text-muted-foreground">{tx.holding.fund.code}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium", meta.cls)}>
                            {meta.icon}
                            {meta.label}
                          </span>
                        </td>
                        <td className={cn("px-4 py-3 text-right tabular-nums", tx.type === "SELL" ? "text-red-600" : "text-emerald-600")}>
                          {tx.type === "SELL" ? "+" : "-"}{tx.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{tx.shares.toFixed(4)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{tx.nav.toFixed(4)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{tx.fee > 0 ? `¥${tx.fee.toFixed(2)}` : "-"}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{tx.tradeDate.slice(0, 10)}</td>
                        <td className="px-2 py-3">
                          <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(tx.id)}>
                            <Trash2Icon className="size-3.5 text-muted-foreground hover:text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
