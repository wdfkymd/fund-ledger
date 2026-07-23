import { cn } from "@/lib/utils"

/** A 股习惯：红涨绿跌 */
export function toneCn(v: number | null | undefined): string {
  if (v == null || v === 0) return "text-muted-foreground"
  return v > 0
    ? "text-red-600 dark:text-red-400"
    : "text-emerald-600 dark:text-emerald-400"
}

export function fmtMoney(v: number) {
  return v.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function signedMoney(amount: number | null | undefined) {
  if (amount == null) return "—"
  const sign = amount > 0 ? "+" : ""
  return `${sign}${fmtMoney(amount)}`
}

/** rate 为小数，如 0.0194 → +1.94% */
export function fmtPct(rate: number | null | undefined) {
  if (rate == null) return "—"
  const sign = rate > 0 ? "+" : ""
  return `${sign}${(rate * 100).toFixed(2)}%`
}

/** 涨跌幅已是百分数，如 -1.94 → -1.94% */
export function fmtChg(pct: number | null | undefined) {
  if (pct == null) return "—"
  const sign = pct > 0 ? "+" : ""
  return `${sign}${pct.toFixed(2)}%`
}

export function fmtNav(v: number | null | undefined) {
  if (v == null) return "—"
  return v.toFixed(4)
}

/**
 * 估 / 实 角标文案
 * - 估：盘中估值或日涨跌估算（isEstimate / 无当日确认净值）
 * - 实：已确认单位净值市值
 */
export function settledTag(isEstimate: boolean | null | undefined): "估" | "实" {
  return isEstimate ? "估" : "实"
}

export function settledLabel(
  isEstimate: boolean | null | undefined,
  kind: "今日" | "市值" | "盈亏" | "涨跌" = "今日",
): string {
  const tag = settledTag(isEstimate)
  if (kind === "今日") return tag === "估" ? "今日·估" : "今日·实"
  if (kind === "市值") return tag === "估" ? "估值市值" : "市值·实"
  if (kind === "盈亏") return tag === "估" ? "盈亏·估" : "盈亏·实"
  return tag === "估" ? "涨跌·估" : "涨跌·实"
}

/** 角标 pill class */
export function tagPillClass(isEstimate: boolean | null | undefined): string {
  return cn(
    "inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium leading-none tabular-nums",
    isEstimate
      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  )
}

/** 涨跌来源：盘中估算 vs 净值日涨跌 */
export function changeSourceLabel(
  estimateChangePct: number | null | undefined,
  navChangePct: number | null | undefined,
): { pct: number | null; label: string; isEstimate: boolean } {
  if (estimateChangePct != null) {
    return { pct: estimateChangePct, label: "估", isEstimate: true }
  }
  if (navChangePct != null) {
    return { pct: navChangePct, label: "实", isEstimate: false }
  }
  return { pct: null, label: "—", isEstimate: false }
}
