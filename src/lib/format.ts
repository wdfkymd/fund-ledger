import { cn } from "@/lib/utils"

export function fmt(v: number) {
  return v.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function fmtPct(rate: number | null | undefined) {
  if (rate == null) return "—"
  const sign = rate > 0 ? "+" : ""
  return `${sign}${(rate * 100).toFixed(2)}%`
}

export function fmtNav(v: number | null | undefined) {
  if (v == null) return "—"
  return v.toFixed(4)
}

export function fmtChg(pct: number | null | undefined) {
  if (pct == null) return "—"
  const sign = pct > 0 ? "+" : ""
  return `${sign}${pct.toFixed(2)}%`
}

export function fmtIndexPrice(v: number | null) {
  if (v == null) return "—"
  return v.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function tone(v: number | null | undefined) {
  if (v == null || v === 0) return "text-muted-foreground"
  return v > 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400"
}

export function signedMoney(amount: number | null) {
  if (amount == null) return "—"
  const sign = amount > 0 ? "+" : ""
  return `${sign}${fmt(amount)}`
}

export function toneClass(v: number | null | undefined, base?: string) {
  return cn(base, tone(v))
}

export const TX_LABEL: Record<string, string> = {
  BUY: "买入",
  SELL: "卖出",
  SIP: "定投",
}
