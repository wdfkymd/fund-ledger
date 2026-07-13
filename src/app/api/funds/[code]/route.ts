import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, ok, toErrorMessage, unauthorized } from "@/lib/api";
import {
  fetchFundFromEastMoney,
  fetchFundNavHistoryFromEastMoney,
} from "@/lib/fund-api";
import {
  calcDayProfit,
  calcDayProfitRate,
  calcEstimateValue,
  calcMarketValue,
  calcProfit,
  calcProfitRate,
  roundMoney,
} from "@/lib/finance";

type Params = { params: Promise<{ code: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { code: raw } = await params;
    const code = raw.trim();
    if (!/^\d{6}$/.test(code)) {
      return fail("基金代码应为 6 位数字");
    }

    const refresh = req.nextUrl.searchParams.get("refresh") === "1";
    const daysParam = Number(req.nextUrl.searchParams.get("days") ?? "90");
    const days = Number.isFinite(daysParam)
      ? Math.min(Math.max(Math.floor(daysParam), 30), 120)
      : 90;

    // 1) 最新行情（可选强制刷新）
    let fund = await prisma.fund.findUnique({ where: { code } });
    let liveError: string | null = null;

    if (!fund || refresh) {
      try {
        const info = await fetchFundFromEastMoney(code);
        fund = await prisma.fund.upsert({
          where: { code },
          create: {
            code: info.code,
            name: info.name,
            type: info.type,
            nav: info.nav,
            navDate: info.navDate ? new Date(info.navDate) : null,
            estimateNav: info.estimateNav,
            estimateChangePct: info.estimateChangePct,
            estimateTime: info.estimateTime,
          },
          update: {
            name: info.name || undefined,
            type: info.type ?? undefined,
            nav: info.nav ?? undefined,
            navDate: info.navDate ? new Date(info.navDate) : undefined,
            estimateNav: info.estimateNav ?? undefined,
            estimateChangePct: info.estimateChangePct ?? undefined,
            estimateTime: info.estimateTime ?? undefined,
          },
        });
        if (info.nav && info.navDate) {
          await prisma.navHistory.upsert({
            where: {
              fundId_date: {
                fundId: fund.id,
                date: new Date(info.navDate),
              },
            },
            create: {
              fundId: fund.id,
              nav: info.nav,
              date: new Date(info.navDate),
            },
            update: { nav: info.nav },
          });
        }
      } catch (error) {
        liveError =
          error instanceof Error ? error.message : "拉取最新行情失败";
        if (!fund) {
          return fail(liveError, 404);
        }
      }
    }

    // 2) 历史净值：优先东财，失败回退本地
    let historySource: "remote" | "local" = "local";
    let history: { date: string; nav: number; changePct?: number }[] = [];

    try {
      const remote = await fetchFundNavHistoryFromEastMoney(code, days);
      if (remote.length > 0) {
        history = remote;
        historySource = "remote";
        // 写回最近若干点，供离线回退（控制写入量）
        const toStore = remote.slice(-Math.min(remote.length, 60));
        await prisma.$transaction(
          toStore.map((p) =>
            prisma.navHistory.upsert({
              where: {
                fundId_date: {
                  fundId: fund.id,
                  date: new Date(p.date),
                },
              },
              create: {
                fundId: fund.id,
                nav: p.nav,
                date: new Date(p.date),
              },
              update: { nav: p.nav },
            }),
          ),
        );
      }
    } catch {
      // fall through to local
    }

    if (history.length === 0) {
      const local = await prisma.navHistory.findMany({
        where: { fundId: fund.id },
        orderBy: { date: "desc" },
        take: days,
      });
      history = local
        .slice()
        .reverse()
        .map((h) => ({
          date: h.date.toISOString().slice(0, 10),
          nav: h.nav,
        }));
      historySource = "local";
    }

    // 3) 当前用户持仓 / 自选 / 交易
    const [holding, watchItem] = await Promise.all([
      prisma.holding.findFirst({
        where: { userId: user.id, fundId: fund.id },
      }),
      prisma.watchlistItem.findFirst({
        where: { userId: user.id, fundId: fund.id },
      }),
    ]);

    let holdingView = null as null | {
      id: string;
      shares: number;
      costAmount: number;
      marketValue: number;
      estimateValue: number;
      profit: number;
      profitRate: number;
      estimateProfit: number;
      estimateProfitRate: number;
      dayProfit: number | null;
      dayProfitRate: number | null;
      note: string | null;
    };

    let transactions: Array<{
      id: string;
      type: string;
      amount: number;
      shares: number;
      nav: number;
      fee: number;
      tradeDate: string;
      note: string | null;
    }> = [];

    if (holding) {
      const marketValue = calcMarketValue(holding.shares, fund.nav);
      const estimateValue = calcEstimateValue(
        holding.shares,
        fund.estimateNav,
        fund.nav,
      );
      const profit = calcProfit(marketValue, holding.costAmount);
      const estimateProfit = calcProfit(estimateValue, holding.costAmount);
      const dayProfit = calcDayProfit(
        holding.shares,
        fund.estimateNav,
        fund.nav,
        fund.estimateChangePct,
      );
      const dayProfitRate = calcDayProfitRate(
        dayProfit,
        holding.shares,
        fund.nav,
      );
      holdingView = {
        id: holding.id,
        shares: holding.shares,
        costAmount: roundMoney(holding.costAmount, 4),
        marketValue: roundMoney(marketValue, 4),
        estimateValue: roundMoney(estimateValue, 4),
        profit: roundMoney(profit, 4),
        profitRate: calcProfitRate(profit, holding.costAmount),
        estimateProfit: roundMoney(estimateProfit, 4),
        estimateProfitRate: calcProfitRate(estimateProfit, holding.costAmount),
        dayProfit,
        dayProfitRate,
        note: holding.note,
      };

      const txs = await prisma.transaction.findMany({
        where: { userId: user.id, holdingId: holding.id },
        orderBy: { tradeDate: "desc" },
        take: 50,
      });
      transactions = txs.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        shares: t.shares,
        nav: t.nav,
        fee: t.fee,
        tradeDate: t.tradeDate.toISOString(),
        note: t.note,
      }));
    }

    return ok({
      fund: {
        id: fund.id,
        code: fund.code,
        name: fund.name,
        type: fund.type,
        nav: fund.nav,
        navDate: fund.navDate,
        estimateNav: fund.estimateNav,
        estimateChangePct: fund.estimateChangePct,
        estimateTime: fund.estimateTime,
      },
      holding: holdingView,
      isWatched: Boolean(watchItem),
      watchlistId: watchItem?.id ?? null,
      history,
      historySource,
      transactions,
      liveError,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return fail(toErrorMessage(error), 500);
  }
}
