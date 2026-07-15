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

/** 默认四指数：腾讯代码 + 展示名 + 代码 */
const DEFAULT_INDICES: { tencent: string; name: string; code: string }[] = [
  { tencent: "s_sh000001", name: "上证", code: "000001" },
  { tencent: "s_sz399001", name: "深成", code: "399001" },
  { tencent: "s_sz399006", name: "创业", code: "399006" },
  { tencent: "s_sh000300", name: "沪深300", code: "000300" },
]

function toNum(raw: unknown): number | null {
  if (raw == null || raw === "" || raw === "-") return null
  const n = typeof raw === "number" ? raw : Number(raw)
  return Number.isFinite(n) ? n : null
}

/**
 * 腾讯财经简要指数（qt.gtimg.cn），本机通常 <200ms。
 * 行格式：v_s_sh000001="市场~名称~代码~点位~涨跌~涨跌幅%~..."
 */
async function fetchFromTencent(
  list: typeof DEFAULT_INDICES,
): Promise<MarketIndexQuote[]> {
  const url = `https://qt.gtimg.cn/q=${list.map((i) => i.tencent).join(",")}`
  const res = await fetch(url, {
    headers: {
      Referer: "https://finance.qq.com/",
      "User-Agent": "Mozilla/5.0",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(2000),
  })
  if (!res.ok) throw new Error("腾讯指数接口失败")

  // 腾讯常为 gbk；Node fetch 默认 utf-8 会乱码名称，我们用自带短名
  const buf = await res.arrayBuffer()
  const text = new TextDecoder("utf-8").decode(buf)

  const byTencent = new Map<string, { price: number | null; change: number | null; changePct: number | null }>()

  for (const line of text.split("\n")) {
    const m = line.match(/^v_([^=]+)="([^"]*)"/)
    if (!m) continue
    const key = m[1]
    const parts = m[2].split("~")
    // 0 市场 1 名 2 代码 3 点位 4 涨跌 5 涨跌幅%
    byTencent.set(key, {
      price: toNum(parts[3]),
      change: toNum(parts[4]),
      changePct: toNum(parts[5]),
    })
  }

  const out = list.map((item) => {
    const row = byTencent.get(item.tencent)
    if (!row || row.price == null) {
      throw new Error(`腾讯指数缺数据: ${item.tencent}`)
    }
    return {
      name: item.name,
      code: item.code,
      price: row.price,
      changePct: row.changePct,
      change: row.change,
    }
  })

  return out
}

/**
 * 东财 push2delay 兜底（偶发慢/超时）。
 */
async function fetchFromEastMoney(
  list: typeof DEFAULT_INDICES,
): Promise<MarketIndexQuote[]> {
  const secidMap: Record<string, string> = {
    "000001": "1.000001",
    "399001": "0.399001",
    "399006": "0.399006",
    "000300": "1.000300",
  }
  const secids = list.map((i) => secidMap[i.code] ?? i.code).join(",")
  const url =
    `https://push2delay.eastmoney.com/api/qt/ulist.np/get` +
    `?fltt=2&fields=f2,f3,f4,f12,f14&secids=${encodeURIComponent(secids)}`

  const res = await fetch(url, {
    headers: {
      Referer: "https://quote.eastmoney.com/",
      "User-Agent": "Mozilla/5.0",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(2500),
  })
  if (!res.ok) throw new Error("东财指数接口失败")

  const data = (await res.json()) as {
    data?: {
      diff?: Array<{
        f2?: number | string
        f3?: number | string
        f4?: number | string
        f12?: string
      }>
    }
  }

  const rows = data.data?.diff ?? []
  const byCode = new Map<string, (typeof rows)[number]>()
  for (const row of rows) {
    if (row.f12) byCode.set(row.f12, row)
  }

  return list.map((item) => {
    const row = byCode.get(item.code)
    return {
      name: item.name,
      code: item.code,
      price: toNum(row?.f2),
      changePct: toNum(row?.f3),
      change: toNum(row?.f4),
    }
  })
}

/**
 * 大盘指数快照：优先腾讯（快），失败回退东财。
 */
export async function fetchMarketIndices(): Promise<MarketIndexQuote[]> {
  try {
    return await fetchFromTencent(DEFAULT_INDICES)
  } catch {
    return await fetchFromEastMoney(DEFAULT_INDICES)
  }
}
