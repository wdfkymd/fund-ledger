import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, ok, toErrorMessage, unauthorized } from "@/lib/api";
import {
  fetchFundFromEastMoney,
  searchFundsFromEastMoney,
} from "@/lib/fund-api";
import { mapPool } from "@/lib/async-pool";

/** Cap concurrent East Money pulls (外网慢时并发过高只会一起卡死). */
const ESTIMATE_CONCURRENCY = 3;
/** 估值仍新鲜则跳过外网（毫秒） */
const ESTIMATE_FRESH_MS = 2 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const keyword = req.nextUrl.searchParams.get("q") ?? "";
    const code = req.nextUrl.searchParams.get("code") ?? "";

    if (code) {
      const info = await fetchFundFromEastMoney(code);
      return ok(info);
    }

    if (keyword) {
      const list = await searchFundsFromEastMoney(keyword);
      return ok(list);
    }

    return fail("请提供 q 或 code 参数");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return fail(toErrorMessage(error), 500);
  }
}

export async function POST() {
  try {
    const user = await requireUser();

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
      fundId: string
      code: string
      name: string
      nav: number | null
      navDate: Date | null
      estimateNav: number | null
      updatedAt: Date
      fund: (typeof holdings)[number]["fund"]
    }

    const fundMap = new Map<string, FundEntry>();
    for (const h of holdings) {
      fundMap.set(h.fundId, {
        fundId: h.fundId,
        code: h.fund.code,
        name: h.fund.name,
        nav: h.fund.nav,
        navDate: h.fund.navDate,
        estimateNav: h.fund.estimateNav,
        updatedAt: h.fund.updatedAt,
        fund: h.fund,
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
          estimateNav: w.fund.estimateNav,
          updatedAt: w.fund.updatedAt,
          fund: w.fund,
        });
      }
    }

    const now = Date.now();
    const entries = [...fundMap.values()];
    const stale: typeof entries = [];
    const fresh: typeof entries = [];
    for (const e of entries) {
      if (
        e.estimateNav == null ||
        now - e.updatedAt.getTime() >= ESTIMATE_FRESH_MS
      ) {
        stale.push(e);
      } else {
        fresh.push(e);
      }
    }

    // 仍新鲜：直接返回本地，不打外网
    const freshResults = fresh.map((e) => ({
      fundId: e.fundId,
      ok: true as const,
      skipped: true as const,
      fund: e.fund,
    }));

    const staleResults = await mapPool(
      stale,
      ESTIMATE_CONCURRENCY,
      async (entry) => {
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
          // 外网超时/失败：保留库内旧估值，不整页失败
          return {
            fundId: entry.fundId,
            ok: false as const,
            error: error instanceof Error ? error.message : "更新失败",
            fund: entry.fund,
          };
        }
      },
    );

    return ok([...freshResults, ...staleResults]);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return fail(toErrorMessage(error), 500);
  }
}
