export type EastMoneyFundInfo = {
  code: string;
  name: string;
  type?: string;
  nav?: number;
  navDate?: string;
};

function extractJsonp(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("净值接口返回格式异常");
  }
  return JSON.parse(text.slice(start, end + 1));
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
    jzrq?: string;
  };

  const navRaw = data.gsz || data.dwjz;
  const nav = navRaw ? Number(navRaw) : undefined;

  return {
    code: data.fundcode ?? normalized,
    name: data.name ?? normalized,
    nav: Number.isFinite(nav) ? nav : undefined,
    navDate: data.jzrq,
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
    Datas?: Array<{ CODE?: string; NAME?: string; FundBaseInfo?: { FTYPE?: string } }>;
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
