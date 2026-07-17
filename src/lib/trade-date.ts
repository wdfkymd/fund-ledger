const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** 仅接受 YYYY-MM-DD，按 UTC 正午存储，避免时区把日期挪一天 */
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
