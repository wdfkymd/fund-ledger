export type EastMoneyFundInfo = {
  code: string;
  name: string;
  type?: string;
  /** 最新单位净值 dwjz */
  nav?: number;
  /** 单位净值日期 jzrq */
  navDate?: string;
  /** 实时估值 gsz */
  estimateNav?: number;
  /** 估算涨跌幅 %，如 -3.43 */
  estimateChangePct?: number;
  /** 估值时间 gztime，如 2026-07-13 15:00 */
  estimateTime?: string;
};

function extractJsonp(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("净值接口返回格式异常");
  }
  return JSON.parse(text.slice(start, end + 1));
}

function toNum(raw: string | undefined): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export async function fetchFundFromEastMoney(
  code: string,
): Promise<EastMoneyFundInfo> {
  const normalized = code.trim();
  if (!/^\d{6}$/.test(normalized)) {
    throw new Error("基金代码应为 6 位数字");
  }

  const url = `https://fundgz.1234567.com.cn/js/${normalized}.js?rt=${Date.now()}`;
  const res = await fetch(url, {
    headers: {
      Referer: "https://fund.eastmoney.com/",
      "User-Agent": "Mozilla/5.0",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error("拉取基金净值失败");
  }

  const text = await res.text();
  if (!text || text.includes("jsonpgz();") || text.includes("jsonpgz()")) {
    throw new Error("未找到该基金");
  }

  const data = extractJsonp(text) as {
    fundcode?: string;
    name?: string;
    gsz?: string;
    dwjz?: string;
    gszzl?: string;
    jzrq?: string;
    gztime?: string;
  };

  // 单位净值与估值分开：不再用 gsz 覆盖 nav
  const nav = toNum(data.dwjz);
  const estimateNav = toNum(data.gsz);
  const estimateChangePct = toNum(data.gszzl);

  return {
    code: data.fundcode ?? normalized,
    name: data.name ?? normalized,
    nav,
    navDate: data.jzrq,
    estimateNav,
    estimateChangePct,
    estimateTime: data.gztime,
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
  const data = JSON.parse(text) as {
    Datas?: Array<{
      CODE?: string;
      NAME?: string;
      FundBaseInfo?: { FTYPE?: string };
    }>;
  };

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
 * 接口单页约 20 条，按页拉取直到凑够 targetCount 或无更多数据。
 * 返回按日期升序；失败抛错，由调用方决定是否回退本地 NavHistory。
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
  // 若超过目标，保留最近 want 条
  return points.length > want ? points.slice(points.length - want) : points;
}
