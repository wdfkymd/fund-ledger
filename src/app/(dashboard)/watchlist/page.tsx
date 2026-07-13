"use client"

import { useEffect, useState, useCallback } from "react"
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
} from "lucide-react"
import { cn } from "@/lib/utils"

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

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefreshed, setAutoRefreshed] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState(emptyAdd)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchItems = useCallback(async () => {
    try {
      const r = await fetch("/api/watchlist")
      if (r.ok) {
        const d = await r.json()
        setItems(d.data.items)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const handleRefresh = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true)
      try {
        await fetch("/api/funds", { method: "POST" })
        await fetchItems()
      } finally {
        if (!silent) setRefreshing(false)
      }
    },
    [fetchItems],
  )

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  useEffect(() => {
    if (loading || autoRefreshed) return
    if (items.length === 0) {
      setAutoRefreshed(true)
      return
    }
    setAutoRefreshed(true)
    void handleRefresh(true)
  }, [loading, items.length, autoRefreshed, handleRefresh])

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
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">加载中…</p>
      </div>
    )
  }

  const estimateTime = items.find((i) => i.fund.estimateTime)?.fund
    .estimateTime

  return (
    <div className="mx-auto w-full max-w-xl px-5 py-8 sm:px-6 sm:py-10">
      {/* Header */}
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

      {/* List */}
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
        <ul className="divide-y overflow-hidden rounded-xl border">
          {items.map((item) => {
            const chg = item.fund.estimateChangePct
            const est = item.fund.estimateNav
            const nav = item.fund.nav
            return (
              <li key={item.id} className="px-4 py-3.5 sm:px-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium leading-snug">
                        {item.fund.name}
                      </p>
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
                      <Link
                        href="/holdings"
                        className="text-foreground/70 transition-colors hover:text-foreground"
                      >
                        去建仓
                      </Link>
                    </>
                  )}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
