"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  PlusIcon,
  Trash2Icon,
  RefreshCwIcon,
  StarIcon,
  BriefcaseIcon,
} from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { container as containerV, staggerItem } from "@/lib/motion-variants"
import { useRouter } from "next/navigation"
import type { WatchlistItem } from "@/lib/watchlist-data"

type WatchItem = WatchlistItem

const emptyAdd = { fundCode: "", fundName: "", note: "" }

function fmtNav(v: number | null | undefined) {
  if (v == null) return "—"
  return v.toFixed(4)
}

function tone(v: number | null | undefined) {
  if (v == null || v === 0) return "text-muted-foreground"
  return v > 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400"
}

function fmtChg(pct: number | null | undefined) {
  if (pct == null) return "—"
  const sign = pct > 0 ? "+" : ""
  return `${sign}${pct.toFixed(2)}%`
}

const emptyHold = { shares: "", costPrice: "" }

export function WatchlistClient({ initial }: { initial: WatchItem[] }) {
  const router = useRouter()
  const [items, setItems] = useState<WatchItem[]>(initial)
  const [refreshing, setRefreshing] = useState(false)
  const autoRefreshed = useRef(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState(emptyAdd)
  const [holdOpen, setHoldOpen] = useState(false)
  const [holdTarget, setHoldTarget] = useState<WatchItem | null>(null)
  const [holdForm, setHoldForm] = useState(emptyHold)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchItems = useCallback(async () => {
    const r = await fetch("/api/watchlist")
    if (r.ok) {
      const d = await r.json()
      setItems(d.data.items)
    }
  }, [])

  const handleRefresh = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true)
      try {
        const r = await fetch("/api/funds", { method: "POST" })
        const d = await r.json().catch(() => null)
        await fetchItems()
        // 静默刷新（进入页面自动触发）不弹 toast，避免打扰
        if (!silent) {
          if (d?.ok) {
            const { total, success, fail } = d.data as {
              total: number
              success: number
              fail: number
            }
            if (fail > 0) {
              toast.warning(`刷新完成：${success} 只成功，${fail} 只失败`)
            } else if (total > 0) {
              toast.success(`刷新完成：${total} 只基金净值已更新`)
            }
          } else {
            toast.error(d?.error ?? "刷新失败，请稍后再试")
          }
        }
      } finally {
        if (!silent) setRefreshing(false)
      }
    },
    [fetchItems],
  )

  useEffect(() => {
    if (autoRefreshed.current) return
    autoRefreshed.current = true
    if (items.length === 0) return
    // 异步调度，避免 effect 内同步 setState 级联
    const t = window.setTimeout(() => {
      void handleRefresh(true)
    }, 0)
    return () => window.clearTimeout(t)
  }, [items.length, handleRefresh])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      const r = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundCode: addForm.fundCode.trim(),
          fundName: addForm.fundName.trim() || undefined,
          note: addForm.note.trim() || undefined,
        }),
      })
      const d = await r.json()
      if (d.ok) {
        setAddOpen(false)
        setAddForm(emptyAdd)
        await fetchItems()
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
    if (!confirm("从自选中移除？不影响持仓。")) return
    const r = await fetch(`/api/watchlist/${id}`, { method: "DELETE" })
    if (r.ok) {
      await fetchItems()
    } else {
      const d = await r.json().catch(() => null)
      toast.error(d?.error || "删除失败")
    }
  }

  function openHold(item: WatchItem) {
    setHoldTarget(item)
    const nav = item.fund.nav ?? item.fund.estimateNav
    setHoldForm({
      shares: "",
      costPrice: nav != null ? nav.toFixed(4) : "",
    })
    setError("")
    setHoldOpen(true)
  }

  async function handleHold(e: React.FormEvent) {
    e.preventDefault()
    if (!holdTarget) return
    setError("")
    setSubmitting(true)
    try {
      const r = await fetch("/api/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundCode: holdTarget.fund.code,
          fundName: holdTarget.fund.name,
          shares: holdForm.shares ? parseFloat(holdForm.shares) : undefined,
          costPrice: holdForm.costPrice
            ? parseFloat(holdForm.costPrice)
            : undefined,
        }),
      })
      const d = await r.json()
      if (d.ok) {
        setHoldOpen(false)
        setHoldTarget(null)
        setHoldForm(emptyHold)
        await fetchItems()
        router.push("/holdings")
      } else {
        setError(d.error || "建仓失败")
      }
    } catch {
      setError("网络错误")
    } finally {
      setSubmitting(false)
    }
  }

  const estimateTime = items.find((i) => i.fund.estimateTime)?.fund
    .estimateTime

  return (
    <div className="mx-auto w-full max-w-xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold tracking-tight">自选</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {items.length > 0
              ? `${items.length} 只 · 仅关注行情，不计入资产`
              : "关注感兴趣的基金，不计入资产"}
          </p>
          {estimateTime && (
            <p className="mt-1 text-xs text-muted-foreground/80">
              估值 {estimateTime}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handleRefresh(false)}
            disabled={refreshing || items.length === 0}
            title="刷新估值"
            className="text-muted-foreground"
          >
            <RefreshCwIcon
              className={cn("size-4", refreshing && "animate-spin")}
            />
          </Button>
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
                <DialogTitle>添加自选</DialogTitle>
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
                  <label className="text-sm font-medium">
                    基金名称（可选）
                  </label>
                  <Input
                    placeholder="自动拉取失败时备用"
                    value={addForm.fundName}
                    onChange={(e) =>
                      setAddForm({ ...addForm, fundName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">备注（可选）</label>
                  <Input
                    placeholder="如：看好、等回调"
                    value={addForm.note}
                    onChange={(e) =>
                      setAddForm({ ...addForm, note: e.target.value })
                    }
                  />
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={submitting}>
                  加入自选
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <StarIcon className="mx-auto size-8 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">暂无自选</p>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="mt-2 text-sm text-foreground/80 transition-colors hover:text-foreground"
          >
            添加第一只基金
          </button>
        </div>
      ) : (
        <motion.div className="divide-y overflow-hidden rounded-xl border" {...containerV}>
          {items.map((item, i) => {
            const chg = item.fund.estimateChangePct
            const est = item.fund.estimateNav
            const nav = item.fund.nav
            return (
              <motion.li key={item.id} className="px-4 py-3.5 sm:px-5" {...staggerItem(i)}>
                <div className="flex items-start justify-between gap-4">
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
                  <div className="flex shrink-0 items-start gap-1">
                    <div className="mr-1 text-right">
                      <p className="text-sm font-medium tabular-nums tracking-tight">
                        {fmtNav(est ?? nav)}
                      </p>
                      <p className={cn("mt-1 text-xs tabular-nums", tone(chg))}>
                        {fmtChg(chg)}
                      </p>
                    </div>
                    {!item.isHeld && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openHold(item)}
                        title="建仓"
                        className="mt-0.5 text-muted-foreground hover:text-foreground"
                      >
                        <BriefcaseIcon className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDelete(item.id)}
                      title="移除自选"
                      className="mt-0.5 text-muted-foreground hover:text-red-500"
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
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
                      <button
                        type="button"
                        onClick={() => openHold(item)}
                        className="text-foreground/70 transition-colors hover:text-foreground"
                      >
                        建仓
                      </button>
                    </>
                  )}
                </p>
              </motion.li>
            )
          })}
        </motion.div>
      )}

      <Dialog
        open={holdOpen}
        onOpenChange={(o) => {
          setHoldOpen(o)
          if (!o) {
            setHoldTarget(null)
            setHoldForm(emptyHold)
            setError("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              建仓
              {holdTarget ? ` · ${holdTarget.fund.name}` : ""}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleHold} className="space-y-4">
            <p className="text-xs tabular-nums text-muted-foreground">
              {holdTarget?.fund.code}
              {holdTarget?.fund.nav != null && (
                <>
                  <span className="mx-1.5 opacity-40">·</span>
                  单位净值 {fmtNav(holdTarget.fund.nav)}
                </>
              )}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">持仓份额</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="如 100"
                  value={holdForm.shares}
                  onChange={(e) =>
                    setHoldForm({ ...holdForm, shares: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">成本价</label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  placeholder="如 1.2345"
                  value={holdForm.costPrice}
                  onChange={(e) =>
                    setHoldForm({ ...holdForm, costPrice: e.target.value })
                  }
                />
              </div>
            </div>
            {holdForm.shares && holdForm.costPrice && (
              <p className="text-xs text-muted-foreground">
                总成本 ≈ ¥
                {(
                  parseFloat(holdForm.shares) * parseFloat(holdForm.costPrice) ||
                  0
                ).toFixed(2)}
              </p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              确认建仓
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
