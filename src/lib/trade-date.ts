const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** 北京时间 (UTC+8) 下的「今天」YYYY-MM-DD */
export function todayCST(now: Date = new Date()): string {
  // 用 UTC+8 日历，不依赖服务器本地时区
  const cstMs = now.getTime() + 8 * 60 * 60 * 1000
  const cst = new Date(cstMs)
  const y = cst.getUTCFullYear()
  const m = String(cst.getUTCMonth() + 1).padStart(2, "0")
  const d = String(cst.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** 任意 Date/字符串 → 日历日 YYYY-MM-DD（按 UTC 组件，配合 UTC 正午存储） */
export function toDateStringUTC(value: Date | string): string {
  if (typeof value === "string") {
    const s = value.trim()
    if (DATE_RE.test(s.slice(0, 10))) return s.slice(0, 10)
    const d = new Date(s)
    if (!Number.isFinite(d.getTime())) return s.slice(0, 10)
    return d.toISOString().slice(0, 10)
  }
  return value.toISOString().slice(0, 10)
}

/**
 * 仅接受 YYYY-MM-DD，按 UTC 正午存储，避免时区把日期挪一天。
 */
export function parseTradeDate(value: string): Date {
  const m = DATE_RE.exec(value.trim())
  if (!m) {
    throw new Error("交易日期格式应为 YYYY-MM-DD")
  }
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) {
    throw new Error("交易日期无效")
  }
  const dt = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0))
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    throw new Error("交易日期无效")
  }
  return dt
}

export function isTradeDateString(value: string): boolean {
  try {
    parseTradeDate(value)
    return true
  } catch {
    return false
  }
}
