import { prisma } from "@/lib/db";
import { fail, ok, withApi } from "@/lib/api";
import {
  fetchFundFromEastMoney,
  searchFundsFromEastMoney,
} from "@/lib/fund-api";

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

  const fundMap = new Map<
    string,
    {
      fundId: string;
      code: string;
      name: string;
      nav: number | null;
      navDate: Date | null;
    }
  >();
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

  const results = [];
  for (const entry of fundMap.values()) {
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

      results.push({ fundId: entry.fundId, ok: true, fund: updated });
    } catch (error) {
      results.push({
        fundId: entry.fundId,
        ok: false,
        error: error instanceof Error ? error.message : "更新失败",
      });
    }
  }

  return ok(results);
});
