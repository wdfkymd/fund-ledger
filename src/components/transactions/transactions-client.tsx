"use client"

import { useState, useCallback, useMemo } from "react"
import { motion } from "motion/react"
import { toast } from "sonner"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PlusIcon,
  Trash2Icon,
  PencilIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  RepeatIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { container as containerV, staggerItem } from "@/lib/motion-variants"
import type {
  HoldingOption,
  TransactionListItem,
} from "@/lib/transactions-data"


function todayInputDate() {
  // 与服务端 todayCST 对齐：UTC+8 日历日
  const ms = Date.now() + 8 * 60 * 60 * 1000
  const d = new Date(ms)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

type Transaction = TransactionListItem
type Holding = HoldingOption

const TYPE_META: Record<
  string,
  { label: string; cls: string; icon: React.ReactNode; amountTone: string }
> = {
  BUY: {
    label: "买入",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    icon: <ArrowDownLeftIcon className="size-3" />,
    amountTone: "text-emerald-600 dark:text-emerald-400",
  },
  SELL: {
    label: "卖出",
    cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
    icon: <ArrowUpRightIcon className="size-3" />,
    amountTone: "text-red-600 dark:text-red-400",
  },
  SIP: {
    label: "定投",
    cls: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
    icon: <RepeatIcon className="size-3" />,
    amountTone: "text-sky-600 dark:text-sky-400",
  },
}

const FILTERS = [
  { value: "ALL", label: "全部" },
  { value: "BUY", label: "买入" },
  { value: "SELL", label: "卖出" },
  { value: "SIP", label: "定投" },
] as const

const emptyForm = {
  holdingId: "",
  type: "BUY",
  amount: "",
  shares: "",
  nav: "",
  tradeDate: todayInputDate(),
  fee: "0",
  note: "",
}

function fmt(v: number) {
  return v.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function signedAmount(type: string, amount: number) {
  const sign = type === "SELL" ? "+" : "-"
  return `${sign}${fmt(amount)}`
}

function amountLabel(type: string) {
  if (type === "SELL") return "卖出金额"
  if (type === "SIP") return "定投金额"
  return "买入金额"
}

function TxFields({
  value,
  onChange,
  showHolding,
  holdings,
}: {
  value: typeof emptyForm
  onChange: (v: typeof emptyForm) => void
  showHolding: boolean
  holdings: Holding[]
}) {
  return (
    <>
      {showHolding && (
        <div className="space-y-2">
          <label className="text-sm font-medium">持仓基金</label>
          <Select
            value={value.holdingId || ""}
            onValueChange={(v) => onChange({ ...value, holdingId: v ?? "" })}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择基金" />
            </SelectTrigger>
            <SelectContent>
              {holdings.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.fund.name} ({h.fund.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <label className="text-sm font-medium">类型</label>
        <Select
          value={value.type}
          onValueChange={(v) => onChange({ ...value, type: v ?? "BUY" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BUY">买入</SelectItem>
            <SelectItem value="SELL">卖出</SelectItem>
            <SelectItem value="SIP">定投</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {amountLabel(value.type)}
          </label>
          <Input
            type="number"
            step="0.01"
            placeholder="金额"
            value={value.amount}
            onChange={(e) => onChange({ ...value, amount: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">份额</label>
          <Input
            type="number"
            step="0.01"
            placeholder="份额"
            value={value.shares}
            onChange={(e) => onChange({ ...value, shares: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">净值</label>
          <Input
            type="number"
            step="0.0001"
            placeholder="净值"
            value={value.nav}
            onChange={(e) => onChange({ ...value, nav: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">手续费</label>
          <Input
            type="number"
            step="0.01"
            placeholder="0"
            value={value.fee}
            onChange={(e) => onChange({ ...value, fee: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">交易日期</label>
        <Input
          type="date"
          value={value.tradeDate}
          onChange={(e) => onChange({ ...value, tradeDate: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">备注（可选）</label>
        <Input
          placeholder="备注"
          value={value.note}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
        />
      </div>
    </>
  )
}

export function TransactionsClient({
  initialTxs,
  initialHoldings,
}: {
  initialTxs: Transaction[]
  initialHoldings: Holding[]
}) {
  const [txs, setTxs] = useState<Transaction[]>(initialTxs)
  const [holdings, setHoldings] = useState<Holding[]>(initialHoldings)
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("ALL")
  const [form, setForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyForm)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    const [txR, hR] = await Promise.all([
      fetch("/api/transactions"),
      fetch("/api/holdings"),
    ])
    if (txR.ok) setTxs((await txR.json()).data)
    if (hR.ok) {
      const d = await hR.json()
      setHoldings(d.data.holdings)
    }
  }, [])

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      ALL: txs.length,
      BUY: 0,
      SELL: 0,
      SIP: 0,
    }
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
        setForm({
          ...emptyForm,
          tradeDate: todayInputDate(),
        })
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

  function openEdit(tx: Transaction) {
    setEditingId(tx.id)
    setEditForm({
      holdingId: tx.holdingId ?? "",
      type: tx.type,
      amount: String(tx.amount),
      shares: String(tx.shares),
      nav: String(tx.nav),
      tradeDate: tx.tradeDate.slice(0, 10),
      fee: String(tx.fee ?? 0),
      note: tx.note ?? "",
    })
    setError("")
    setEditOpen(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    setError("")
    setSubmitting(true)
    try {
      const r = await fetch(`/api/transactions/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editForm.type,
          amount: Number(editForm.amount),
          shares: Number(editForm.shares),
          nav: Number(editForm.nav),
          tradeDate: editForm.tradeDate,
          fee: Number(editForm.fee) || 0,
          note: editForm.note.trim() ? editForm.note.trim() : null,
        }),
      })
      const d = await r.json()
      if (d.ok) {
        setEditOpen(false)
        setEditingId(null)
        await fetchData()
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
    if (!confirm("确定删除该交易？持仓份额与成本会回滚。")) return
    const r = await fetch(`/api/transactions/${id}`, { method: "DELETE" })
    if (r.ok) {
      await fetchData()
    } else {
      const d = await r.json().catch(() => null)
      toast.error(d?.error || "删除失败")
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-5 py-8 sm:px-6 sm:py-10">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold tracking-tight">交易记录</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {txs.length > 0
              ? `${txs.length} 笔记录`
              : holdings.length === 0
                ? "先添加持仓再记交易"
                : "记录买入、卖出与定投"}
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o)
            if (!o) setError("")
          }}
        >
          <DialogTrigger
            render={
              <Button size="sm" disabled={holdings.length === 0} />
            }
          >
            <PlusIcon className="mr-1 size-3.5" />
            记一笔
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>记一笔交易</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <TxFields
                value={form}
                onChange={setForm}
                showHolding
                holdings={holdings}
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                提交
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
            setEditingId(null)
            setError("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑交易</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <TxFields
              value={editForm}
              onChange={setEditForm}
              showHolding={false}
              holdings={holdings}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              保存
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-1 rounded-xl border bg-muted/40 p-1 text-xs">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-lg px-2.5 py-1.5 font-medium transition-colors",
              filter === f.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
            <span className="ml-1 tabular-nums opacity-60">
              {counts[f.value]}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {txs.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">暂无交易记录</p>
          {holdings.length > 0 ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-2 text-sm text-foreground/80 transition-colors hover:text-foreground"
            >
              记第一笔
            </button>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              请先到「持仓」添加基金
            </p>
          )}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">该筛选下暂无交易</p>
        </div>
      ) : (
        <motion.div className="divide-y overflow-hidden rounded-xl border" {...containerV}>
          {visible.map((tx, i) => {
            const meta = TYPE_META[tx.type] ?? TYPE_META.BUY
            return (
              <motion.li key={tx.id} className="px-4 py-3.5 sm:px-5" {...staggerItem(i)}>
                {/* Primary row */}
                <div className="flex items-baseline justify-between gap-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium leading-snug">
                        {tx.holding.fund.name}
                      </p>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                          meta.cls,
                        )}
                      >
                        {meta.icon}
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      {tx.holding.fund.code}
                      <span className="mx-1.5 opacity-40">·</span>
                      {tx.tradeDate.slice(0, 10)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "text-sm font-medium tabular-nums tracking-tight",
                        meta.amountTone,
                      )}
                    >
                      {signedAmount(tx.type, tx.amount)}
                    </p>
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      {fmt(tx.shares)} 份
                    </p>
                  </div>
                </div>

                {/* Secondary detail strip */}
                <div className="mt-3 grid grid-cols-3 items-start divide-x rounded-lg bg-muted/40 py-2.5 text-center">
                  <div className="min-w-0 overflow-hidden px-1.5 sm:px-2">
                    <p className="text-[11px] text-muted-foreground">净值</p>
                    <p className="mt-1 break-all text-[11px] font-medium leading-snug tabular-nums tracking-tight sm:text-xs">
                      {tx.nav.toFixed(4)}
                    </p>
                  </div>
                  <div className="min-w-0 overflow-hidden px-1.5 sm:px-2">
                    <p className="text-[11px] text-muted-foreground">手续费</p>
                    <p className="mt-1 break-all text-[11px] font-medium leading-snug tabular-nums tracking-tight sm:text-xs">
                      {tx.fee > 0 ? fmt(tx.fee) : "—"}
                    </p>
                  </div>
                  <div className="min-w-0 overflow-hidden px-1.5 sm:px-2">
                    <p className="text-[11px] text-muted-foreground">类型</p>
                    <p className="mt-1 break-all text-[11px] font-medium leading-snug tracking-tight sm:text-xs">
                      {meta.label}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-xs text-muted-foreground">
                    {tx.note || <span className="opacity-0">—</span>}
                  </p>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => openEdit(tx)}
                      title="编辑"
                      className="text-muted-foreground"
                    >
                      <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDelete(tx.id)}
                      title="删除"
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.li>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
