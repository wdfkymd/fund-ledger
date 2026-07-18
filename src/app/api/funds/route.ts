import { prisma } from "@/lib/db";
import { fail, ok, withApi } from "@/lib/api";
import {
  fetchFundFromEastMoney,
  searchFundsFromEastMoney,
} from "@/lib/fund-api";

/** 单批并发数：eastmoney 对高频请求会限流，串行太慢、全并发易被封，取折中 */
const REFRESH_CONCURRENCY = 4;

export const GET = withApi(async ({ req }) => {
  const url = new URL(req.url);
  const keyword = url.searchParams.get("q") ?? "";
  const code = url.searchParams.get("code") ?? "";

  if (code) {
    const info = await fetchFundFromEastMoney(code);
    return ok(info);
  }

  if (keyword) {
    const list = await searchFundsFromEastMoney(keyword);
    return ok(list);
  }

  return fail("请提供 q 或 code 参数");
});

export const POST = withApi(async ({ user }) => {
  // 刷新持仓 + 自选相关基金（去重）
  const [holdings, watchlist] = await Promise.all([
    prisma.holding.findMany({
      where: { userId: user.id },
      include: { fund: true },
    }),
    prisma.watchlistItem.findMany({
      where: { userId: user.id },
      include: { fund: true },
    }),
  ]);

  type FundEntry = {
    fundId: string;
    code: string;
    name: string;
    nav: number | null;
    navDate: Date | null;
  };
  const fundMap = new Map<string, FundEntry>();
  for (const h of holdings) {
    fundMap.set(h.fundId, {
      fundId: h.fundId,
      code: h.fund.code,
      name: h.fund.name,
      nav: h.fund.nav,
      navDate: h.fund.navDate,
    });
  }
  for (const w of watchlist) {
    if (!fundMap.has(w.fundId)) {
      fundMap.set(w.fundId, {
        fundId: w.fundId,
        code: w.fund.code,
        name: w.fund.name,
        nav: w.fund.nav,
        navDate: w.fund.navDate,
      });
    }
  }

  const refreshOne = async (entry: FundEntry) => {
    try {
      const info = await fetchFundFromEastMoney(entry.code);
      const updated = await prisma.fund.update({
        where: { id: entry.fundId },
        data: {
          name: info.name || entry.name,
          // 单位净值：仅用 dwjz；勿用估值覆盖
          nav: info.nav ?? entry.nav,
          navDate: info.navDate ? new Date(info.navDate) : entry.navDate,
          estimateNav: info.estimateNav ?? null,
          estimateChangePct: info.estimateChangePct ?? null,
          estimateTime: info.estimateTime ?? null,
        },
      });

      // 历史只记单位净值，不记盘中估值
      if (info.nav && info.navDate) {
        await prisma.navHistory.upsert({
          where: {
            fundId_date: {
              fundId: entry.fundId,
              date: new Date(info.navDate),
            },
          },
          create: {
            fundId: entry.fundId,
            nav: info.nav,
            date: new Date(info.navDate),
          },
          update: { nav: info.nav },
        });
      }

      return { fundId: entry.fundId, ok: true as const, fund: updated };
    } catch (error) {
      return {
        fundId: entry.fundId,
        ok: false as const,
        error: error instanceof Error ? error.message : "更新失败",
      };
    }
  };

  // 分批并发刷新：批内 allSettled 互不阻塞，批间串行避免触发 eastmoney 限流
  const entries = Array.from(fundMap.values());
  const results: Awaited<ReturnType<typeof refreshOne>>[] = [];
  for (let i = 0; i < entries.length; i += REFRESH_CONCURRENCY) {
    const batch = entries.slice(i, i + REFRESH_CONCURRENCY);
    const settled = await Promise.allSettled(batch.map(refreshOne));
    for (const s of settled) {
      // refreshOne 内部已捕获异常，rejected 仅为兜底防御
      results.push(
        s.status === "fulfilled"
          ? s.value
          : { fundId: "", ok: false as const, error: "更新失败" },
      );
    }
  }

  return ok(results);
});
