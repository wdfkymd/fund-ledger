"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PlusIcon, Trash2Icon, PencilIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Holding = {
  id: string
  shares: number
  costAmount: number
  marketValue: number
  profit: number
  profitRate: number
  estimateValue: number
  estimateProfit: number
  estimateProfitRate: number
  dayProfit: number | null
  dayProfitRate: number | null
  note: string | null
  fund: {
    code: string
    name: string
    nav: number | null
    estimateNav: number | null
    estimateChangePct: number | null
  }
}

const emptyAdd = { fundCode: "", fundName: "", shares: "", costPrice: "" }

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

function MiniMetric({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="min-w-0 overflow-hidden px-1.5 text-center sm:px-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 break-all text-[11px] font-medium leading-snug tabular-nums tracking-tight sm:text-xs",
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  )
}

function HoldingsPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Holding | null>(null)
  const [addForm, setAddForm] = useState(emptyAdd)
  const [editForm, setEditForm] = useState({
    shares: "",
    costPrice: "",
    note: "",
  })
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [prefillDone, setPrefillDone] = useState(false)

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

  useEffect(() => {
    fetchHoldings()
  }, [fetchHoldings])

  // 支持 /holdings?code=000001&name=xxx 预填并打开添加弹窗
  useEffect(() => {
    if (prefillDone) return
    const code = (searchParams.get("code") ?? "").trim()
    if (!/^\d{6}$/.test(code)) {
      setPrefillDone(true)
      return
    }
    const name = (searchParams.get("name") ?? "").trim()
    setAddForm({
      fundCode: code,
      fundName: name,
      shares: "",
      costPrice: "",
    })
    setAddOpen(true)
    setPrefillDone(true)
    router.replace("/holdings", { scroll: false })
  }, [searchParams, prefillDone, router])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      const r = await fetch("/api/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundCode: addForm.fundCode.trim(),
          fundName: addForm.fundName.trim() || undefined,
          shares: addForm.shares ? parseFloat(addForm.shares) : undefined,
          costPrice: addForm.costPrice
            ? parseFloat(addForm.costPrice)
            : undefined,
        }),
      })
      const d = await r.json()
      if (d.ok) {
        setAddOpen(false)
        setAddForm(emptyAdd)
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

  function openEdit(h: Holding) {
    setEditing(h)
    const costPrice = h.shares > 0 ? h.costAmount / h.shares : 0
    setEditForm({
      shares: String(h.shares),
      costPrice: costPrice ? costPrice.toFixed(4) : "",
      note: h.note ?? "",
    })
    setError("")
    setEditOpen(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setError("")
    setSubmitting(true)
    try {
      const r = await fetch(`/api/holdings/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shares: parseFloat(editForm.shares),
          costPrice: editForm.costPrice
            ? parseFloat(editForm.costPrice)
            : undefined,
          note: editForm.note.trim() ? editForm.note.trim() : null,
        }),
      })
      const d = await r.json()
      if (d.ok) {
        setEditOpen(false)
        setEditing(null)
        await fetchHoldings()
      } else {
        setError(d.error || "保存失败")
      }
    } catch {
      setError("网络错误")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除该持仓？相关交易记录也会删除。")) return
    const r = await fetch(`/api/holdings/${id}`, { method: "DELETE" })
    if (r.ok) {
      await fetchHoldings()
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">加载中…</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-xl px-5 py-8 sm:px-6 sm:py-10">
      {/* Header — same rhythm as watchlist */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold tracking-tight">持仓</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {holdings.length > 0
              ? `${holdings.length} 只基金`
              : "添加基金开始记账"}
          </p>
        </div>
        <Dialog
          open={addOpen}
          onOpenChange={(o) => {
            setAddOpen(o)
            if (!o) setError("")
          }}
        >
          <DialogTrigger render={<Button size="sm" />}>
            <PlusIcon className="mr-1 size-3.5" />
            添加
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
                  value={addForm.fundCode}
                  onChange={(e) =>
                    setAddForm({ ...addForm, fundCode: e.target.value })
                  }
                  required
                  maxLength={6}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">基金名称（可选）</label>
                <Input
                  placeholder="自动拉取失败时备用"
                  value={addForm.fundName}
                  onChange={(e) =>
                    setAddForm({ ...addForm, fundName: e.target.value })
                  }
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
                    value={addForm.shares}
                    onChange={(e) =>
                      setAddForm({ ...addForm, shares: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">成本价</label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="如 1.7987"
                    value={addForm.costPrice}
                    onChange={(e) =>
                      setAddForm({ ...addForm, costPrice: e.target.value })
                    }
                  />
                </div>
              </div>
              {addForm.shares && addForm.costPrice && (
                <p className="text-xs text-muted-foreground">
                  总成本 ≈ ¥
                  {(
                    parseFloat(addForm.shares) * parseFloat(addForm.costPrice) ||
                    0
                  ).toFixed(2)}
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

      {/* Edit dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o)
          if (!o) {
            setEditing(null)
            setError("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              编辑持仓
              {editing ? ` · ${editing.fund.name}` : ""}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">持仓份额</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.shares}
                  onChange={(e) =>
                    setEditForm({ ...editForm, shares: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">成本价</label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={editForm.costPrice}
                  onChange={(e) =>
                    setEditForm({ ...editForm, costPrice: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            {editForm.shares && editForm.costPrice && (
              <p className="text-xs text-muted-foreground">
                总成本 ≈ ¥
                {(
                  parseFloat(editForm.shares) * parseFloat(editForm.costPrice) ||
                  0
                ).toFixed(2)}
              </p>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">备注</label>
              <Input
                placeholder="可选"
                value={editForm.note}
                onChange={(e) =>
                  setEditForm({ ...editForm, note: e.target.value })
                }
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              保存
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* List */}
      {holdings.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">暂无持仓</p>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="mt-2 text-sm text-foreground/80 transition-colors hover:text-foreground"
          >
            添加第一只基金
          </button>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border">
          {holdings.map((h) => {
            const value = h.estimateValue || h.marketValue
            const profit = h.estimateProfit ?? h.profit
            const profitRate = h.estimateProfitRate ?? h.profitRate
            const dp = h.dayProfit
            const dpr = h.dayProfitRate
            const costPrice = h.shares > 0 ? h.costAmount / h.shares : 0

            return (
              <li key={h.id} className="px-4 py-4 sm:px-5">
                {/* Primary row — same as dashboard / watchlist */}
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
                      {fmt(value)}
                    </p>
                    <p className={cn("mt-1 text-xs tabular-nums", tone(dp))}>
                      {dp != null ? (
                        <>
                          {signedMoney(dp)}
                          {dpr != null && (
                            <span className="ml-1.5">{fmtPct(dpr)}</span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                </div>

                {/* Secondary metrics — same strip language as dashboard */}
                <div className="mt-3 grid grid-cols-3 items-start divide-x rounded-lg bg-muted/40 py-2.5">
                  <MiniMetric
                    label="成本"
                    value={
                      costPrice > 0
                        ? `${fmt(h.costAmount)}`
                        : fmt(h.costAmount)
                    }
                  />
                  <MiniMetric
                    label="累计"
                    value={signedMoney(profit)}
                    valueClassName={tone(profit)}
                  />
                  <MiniMetric
                    label="收益率"
                    value={fmtPct(profitRate)}
                    valueClassName={tone(profitRate)}
                  />
                </div>

                {/* Footer: note + actions, not competing with numbers */}
                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-xs text-muted-foreground">
                    {h.note ? (
                      h.note
                    ) : costPrice > 0 ? (
                      <>成本价 {costPrice.toFixed(4)}</>
                    ) : (
                      <span className="opacity-0">—</span>
                    )}
                  </p>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => openEdit(h)}
                      title="编辑"
                      className="text-muted-foreground"
                    >
                      <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDelete(h.id)}
                      title="删除"
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function HoldingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">加载中…</p>
        </div>
      }
    >
      <HoldingsPageInner />
    </Suspense>
  )
}
