export type MarketIndexQuote = {
  /** 展示用短名 */
  name: string
  /** 指数代码，如 000001 */
  code: string
  /** 最新点位 */
  price: number | null
  /** 涨跌幅 % */
  changePct: number | null
  /** 涨跌点数 */
  change: number | null
}

/** 总览默认展示的大盘指数（东财 secid） */
const DEFAULT_INDICES: { secid: string; name: string }[] = [
  { secid: "1.000001", name: "上证" },
  { secid: "0.399001", name: "深成" },
  { secid: "0.399006", name: "创业" },
  { secid: "1.000300", name: "沪深300" },
]

function toNum(raw: unknown): number | null {
  if (raw == null || raw === "" || raw === "-") return null
  const n = typeof raw === "number" ? raw : Number(raw)
  return Number.isFinite(n) ? n : null
}

/**
 * 拉取大盘指数快照（东财 push2delay 公开接口，盘后/延迟均可）。
 * 失败抛错，由调用方决定展示 —。
 */
export async function fetchMarketIndices(
  list: { secid: string; name: string }[] = DEFAULT_INDICES,
): Promise<MarketIndexQuote[]> {
  if (list.length === 0) return []

  const secids = list.map((i) => i.secid).join(",")
  const url =
    `https://push2delay.eastmoney.com/api/qt/ulist.np/get` +
    `?fltt=2&fields=f2,f3,f4,f12,f14&secids=${encodeURIComponent(secids)}`

  const res = await fetch(url, {
    headers: {
      Referer: "https://quote.eastmoney.com/",
      "User-Agent": "Mozilla/5.0",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) {
    throw new Error("拉取指数行情失败")
  }

  const data = (await res.json()) as {
    data?: {
      diff?: Array<{
        f2?: number | string
        f3?: number | string
        f4?: number | string
        f12?: string
        f14?: string
      }>
    }
  }

  const rows = data.data?.diff ?? []
  const byCode = new Map<string, (typeof rows)[number]>()
  for (const row of rows) {
    if (row.f12) byCode.set(row.f12, row)
  }

  return list.map((item) => {
    const code = item.secid.split(".")[1] ?? item.secid
    const row = byCode.get(code)
    return {
      name: item.name,
      code,
      price: toNum(row?.f2),
      changePct: toNum(row?.f3),
      change: toNum(row?.f4),
    }
  })
}
