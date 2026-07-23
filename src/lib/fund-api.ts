export type EastMoneyFundInfo = {
  code: string;
  name: string;
  type?: string;
  /** 最新单位净值 dwjz / DWJZ */
  nav?: number;
  /** 单位净值日期 */
  navDate?: string;
  /** 最新公布净值日涨跌幅 %（JZZZL）—— 非盘中估值 */
  navChangePct?: number;
  /** 实时/盘中估值 gsz —— 仅估值接口 */
  estimateNav?: number;
  /** 盘中估算涨跌幅 % gszzl —— 仅估值接口 */
  estimateChangePct?: number;
  /** 估值时间 gztime */
  estimateTime?: string;
};

function looksLikeHtml(text: string): boolean {
  const head = text.trimStart().slice(0, 200).toLowerCase();
  return (
    head.startsWith("<!doctype") ||
    head.startsWith("<html") ||
    head.includes("<html") ||
    head.includes("页面未找到")
  );
}

function extractJsonp(text: string): unknown {
  if (!text?.trim()) {
    throw new Error("净值接口返回为空");
  }
  if (looksLikeHtml(text)) {
    throw new Error("净值接口返回了网页而非数据（可能被拦截或接口变更）");
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("净值接口返回格式异常");
  }
  const slice = text.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`净值 JSON 解析失败: ${msg}`);
  }
}

function toNum(raw: string | undefined | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * 主路径：历史净值 lsjz（单位净值 + 日涨跌）+ fundsuggest（名称/类型）。
 * 不写入 estimate* 字段。
 */
async function fetchFundNavPrimary(code: string): Promise<EastMoneyFundInfo> {
  const normalized = code.trim();
  let name: string | undefined;
  let type: string | undefined;
  try {
    const hits = await searchFundsFromEastMoney(normalized);
    const exact = hits.find((h) => h.code === normalized) ?? hits[0];
    name = exact?.name;
    type = exact?.type;
  } catch {
    /* ignore */
  }

  const url =
    `https://api.fund.eastmoney.com/f10/lsjz` +
    `?callback=jQuery&fundCode=${normalized}` +
    `&pageIndex=1&pageSize=1&startDate=&endDate=`;
  const res = await fetch(url, {
    headers: {
      Referer: "https://fundf10.eastmoney.com/",
      "User-Agent": "Mozilla/5.0",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`历史净值接口失败: HTTP ${res.status}`);
  }
  const text = await res.text();
  if (looksLikeHtml(text)) {
    throw new Error("历史净值接口返回了网页");
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("历史净值接口格式异常");
  }
  let data: {
    Data?: {
      LSJZList?: Array<{ FSRQ?: string; DWJZ?: string; JZZZL?: string }>;
    };
  };
  try {
    data = JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`历史净值 JSON 解析失败: ${msg}`);
  }
  const row = data.Data?.LSJZList?.[0];
  const nav = toNum(row?.DWJZ);
  if (nav == null || nav <= 0) {
    throw new Error("未找到该基金净值");
  }
  return {
    code: normalized,
    name: name ?? normalized,
    type,
    nav,
    navDate: row?.FSRQ,
    navChangePct: toNum(row?.JZZZL),
  };
}

/**
 * 估值接口（fundgz）：只负责 gsz / gszzl / gztime。
 * 失败返回 null，绝不把日涨跌伪装成估值。
 */
async function fetchFundEstimate(
  code: string,
): Promise<{
  name?: string;
  nav?: number;
  navDate?: string;
  estimateNav?: number;
  estimateChangePct?: number;
  estimateTime?: string;
} | null> {
  const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;
  try {
    const res = await fetch(url, {
      headers: {
        Referer: "https://fund.eastmoney.com/",
        "User-Agent": "Mozilla/5.0",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || looksLikeHtml(text)) return null;
    if (text.includes("jsonpgz();") || text.includes("jsonpgz()")) return null;
    const data = extractJsonp(text) as {
      fundcode?: string;
      name?: string;
      gsz?: string;
      dwjz?: string;
      gszzl?: string;
      jzrq?: string;
      gztime?: string;
    };
    const estimateNav = toNum(data.gsz);
    const estimateChangePct = toNum(data.gszzl);
    // 没有估值字段则视为估值接口无效
    if (estimateNav == null && estimateChangePct == null) return null;
    return {
      name: data.name ?? undefined,
      nav: toNum(data.dwjz),
      navDate: data.jzrq,
      estimateNav,
      estimateChangePct,
      estimateTime: data.gztime,
    };
  } catch {
    return null;
  }
}

/**
 * 拉取单只基金：净值主路径 + 估值可选增强。
 * 字段语义严格分离：
 * - nav / navDate / navChangePct ← lsjz
 * - estimateNav / estimateChangePct / estimateTime ← fundgz only
 */
export async function fetchFundFromEastMoney(
  code: string,
): Promise<EastMoneyFundInfo> {
  const normalized = code.trim();
  if (!/^\d{6}$/.test(normalized)) {
    throw new Error("基金代码应为 6 位数字");
  }

  const base = await fetchFundNavPrimary(normalized);
  const est = await fetchFundEstimate(normalized);
  if (!est) return base;

  return {
    ...base,
    name: est.name || base.name,
    // 估值接口若带回当日单位净值，可更新（与 lsjz 同源）
    nav: est.nav && est.nav > 0 ? est.nav : base.nav,
    navDate: est.navDate || base.navDate,
    // 估值字段只来自估值接口
    estimateNav: est.estimateNav,
    estimateChangePct: est.estimateChangePct,
    estimateTime: est.estimateTime,
  };
}

export async function searchFundsFromEastMoney(keyword: string) {
  const q = keyword.trim();
  if (!q) {
    return [] as EastMoneyFundInfo[];
  }

  const url = `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: {
      Referer: "https://fund.eastmoney.com/",
      "User-Agent": "Mozilla/5.0",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`搜索基金失败: HTTP ${res.status}`);
  }

  const text = await res.text();
  if (looksLikeHtml(text)) {
    throw new Error("搜索接口返回了网页而非 JSON");
  }
  let data: {
    Datas?: Array<{
      CODE?: string;
      NAME?: string;
      FundBaseInfo?: { FTYPE?: string };
    }>;
  };
  try {
    data = JSON.parse(text);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`搜索接口 JSON 解析失败: ${msg}`);
  }

  return (data.Datas ?? [])
    .filter((item) => item.CODE && item.NAME)
    .slice(0, 20)
    .map((item) => ({
      code: item.CODE as string,
      name: item.NAME as string,
      type: item.FundBaseInfo?.FTYPE,
    }));
}

export type FundNavHistoryPoint = {
  /** YYYY-MM-DD */
  date: string;
  nav: number;
  /** 日涨跌幅 %，可能为空 */
  changePct?: number;
};

/**
 * 历史单位净值（天天基金 f10/lsjz）。
 */
export async function fetchFundNavHistoryFromEastMoney(
  code: string,
  targetCount = 90,
): Promise<FundNavHistoryPoint[]> {
  const normalized = code.trim();
  if (!/^\d{6}$/.test(normalized)) {
    throw new Error("基金代码应为 6 位数字");
  }

  const want = Math.min(Math.max(targetCount, 1), 200);
  const pageSize = 20;
  const maxPages = Math.ceil(want / pageSize) + 1;
  const byDate = new Map<string, FundNavHistoryPoint>();

  for (let page = 1; page <= maxPages; page++) {
    const url =
      `https://api.fund.eastmoney.com/f10/lsjz` +
      `?callback=jQuery&fundCode=${normalized}` +
      `&pageIndex=${page}&pageSize=${pageSize}&startDate=&endDate=`;

    const res = await fetch(url, {
      headers: {
        Referer: "https://fundf10.eastmoney.com/",
        "User-Agent": "Mozilla/5.0",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      if (byDate.size > 0) break;
      throw new Error("拉取历史净值失败");
    }

    const text = await res.text();
    if (looksLikeHtml(text)) {
      if (byDate.size > 0) break;
      throw new Error("历史净值返回了网页");
    }
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) {
      if (byDate.size > 0) break;
      throw new Error("历史净值返回格式异常");
    }

    const data = JSON.parse(text.slice(start, end + 1)) as {
      Data?: {
        LSJZList?: Array<{
          FSRQ?: string;
          DWJZ?: string;
          JZZZL?: string;
        }>;
      };
    };

    const list = data.Data?.LSJZList ?? [];
    if (list.length === 0) break;

    for (const row of list) {
      const date = row.FSRQ?.trim();
      const nav = toNum(row.DWJZ);
      if (!date || nav == null || nav <= 0) continue;
      const changePct = toNum(row.JZZZL);
      byDate.set(date, {
        date,
        nav,
        ...(changePct != null ? { changePct } : {}),
      });
    }

    if (byDate.size >= want || list.length < pageSize) break;
  }

  const points = Array.from(byDate.values()).sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
  return points.length > want ? points.slice(points.length - want) : points;
}
