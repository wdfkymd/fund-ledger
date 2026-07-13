import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, ok, toErrorMessage, unauthorized } from "@/lib/api";
import { holdingCreateSchema } from "@/lib/validators";
import { fetchFundFromEastMoney } from "@/lib/fund-api";
import {
  calcDayProfit,
  calcDayProfitRate,
  calcEstimateValue,
  calcMarketValue,
  calcProfit,
  calcProfitRate,
  roundMoney,
} from "@/lib/finance";

export async function GET() {
  try {
    const user = await requireUser();
    const holdings = await prisma.holding.findMany({
      where: { userId: user.id },
      include: { fund: true },
      orderBy: { updatedAt: "desc" },
    });

    const data = holdings.map((h) => {
      const marketValue = calcMarketValue(h.shares, h.fund.nav);
      const estimateValue = calcEstimateValue(
        h.shares,
        h.fund.estimateNav,
        h.fund.nav,
      );
      const profit = calcProfit(marketValue, h.costAmount);
      const profitRate = calcProfitRate(profit, h.costAmount);
      const estimateProfit = calcProfit(estimateValue, h.costAmount);
      const estimateProfitRate = calcProfitRate(estimateProfit, h.costAmount);
      const dayProfit = calcDayProfit(
        h.shares,
        h.fund.estimateNav,
        h.fund.nav,
        h.fund.estimateChangePct,
      );
      const dayProfitRate = calcDayProfitRate(
        dayProfit,
        h.shares,
        h.fund.nav,
      );
      return {
        id: h.id,
        shares: h.shares,
        costAmount: h.costAmount,
        note: h.note,
        marketValue,
        profit,
        profitRate,
        estimateValue,
        estimateProfit,
        estimateProfitRate,
        dayProfit,
        dayProfitRate,
        fund: h.fund,
        createdAt: h.createdAt,
        updatedAt: h.updatedAt,
      };
    });

    const summary = data.reduce(
      (acc, item) => {
        acc.totalCost += item.costAmount;
        acc.totalMarketValue += item.marketValue;
        acc.totalProfit += item.profit;
        acc.totalEstimateValue += item.estimateValue;
        acc.totalEstimateProfit += item.estimateProfit;
        if (item.dayProfit != null) {
          acc.totalDayProfit = roundMoney(
            (acc.totalDayProfit ?? 0) + item.dayProfit,
            4,
          );
          acc.dayProfitBase += item.marketValue;
        }
        return acc;
      },
      {
        totalCost: 0,
        totalMarketValue: 0,
        totalProfit: 0,
        totalEstimateValue: 0,
        totalEstimateProfit: 0,
        totalDayProfit: null as number | null,
        dayProfitBase: 0,
      },
    );

    const totalDayProfitRate =
      summary.totalDayProfit != null && summary.dayProfitBase > 0
        ? roundMoney(summary.totalDayProfit / summary.dayProfitBase, 6)
        : null;

    return ok({
      holdings: data,
      summary: {
        totalCost: summary.totalCost,
        totalMarketValue: summary.totalMarketValue,
        totalProfit: summary.totalProfit,
        totalEstimateValue: summary.totalEstimateValue,
        totalEstimateProfit: summary.totalEstimateProfit,
        totalProfitRate: calcProfitRate(summary.totalProfit, summary.totalCost),
        totalEstimateProfitRate: calcProfitRate(
          summary.totalEstimateProfit,
          summary.totalCost,
        ),
        totalDayProfit: summary.totalDayProfit,
        totalDayProfitRate,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return fail(toErrorMessage(error), 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = holdingCreateSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "参数错误");
    }

    const { fundCode, fundName, shares, costPrice, costAmount, note } =
      parsed.data;
    const shareValue = shares ?? 0;
    // 成本价优先：总成本 = 份额 × 成本价；否则用直接传入的总成本
    const totalCost =
      costPrice != null
        ? shareValue * costPrice
        : (costAmount ?? 0);
    let fundInfo;
    try {
      fundInfo = await fetchFundFromEastMoney(fundCode);
    } catch (error) {
      if (!fundName?.trim()) {
        return fail(
          error instanceof Error ? error.message : "无法获取基金信息，请填写基金名称",
        );
      }
      fundInfo = {
        code: fundCode.trim(),
        name: fundName.trim(),
        nav: undefined,
        navDate: undefined,
      };
    }

    const fund = await prisma.fund.upsert({
      where: { code: fundInfo.code },
      create: {
        code: fundInfo.code,
        name: fundName?.trim() || fundInfo.name,
        type: fundInfo.type,
        nav: fundInfo.nav,
        navDate: fundInfo.navDate ? new Date(fundInfo.navDate) : null,
        estimateNav: fundInfo.estimateNav,
        estimateChangePct: fundInfo.estimateChangePct,
        estimateTime: fundInfo.estimateTime,
      },
      update: {
        name: fundName?.trim() || fundInfo.name,
        type: fundInfo.type ?? undefined,
        nav: fundInfo.nav ?? undefined,
        navDate: fundInfo.navDate ? new Date(fundInfo.navDate) : undefined,
        estimateNav: fundInfo.estimateNav ?? undefined,
        estimateChangePct: fundInfo.estimateChangePct ?? undefined,
        estimateTime: fundInfo.estimateTime ?? undefined,
      },
    });

    if (fundInfo.nav && fundInfo.navDate) {
      await prisma.navHistory.upsert({
        where: {
          fundId_date: {
            fundId: fund.id,
            date: new Date(fundInfo.navDate),
          },
        },
        create: {
          fundId: fund.id,
          nav: fundInfo.nav,
          date: new Date(fundInfo.navDate),
        },
        update: { nav: fundInfo.nav },
      });
    }

    const existing = await prisma.holding.findUnique({
      where: {
        userId_fundId: {
          userId: user.id,
          fundId: fund.id,
        },
      },
    });
    if (existing) {
      return fail("该基金已在持仓中");
    }

    const hasBuy = shareValue > 0 && totalCost > 0;
    const nav = shareValue > 0 ? totalCost / shareValue : 0;

    // 在事务中先建持仓拿到 id，再记一笔初始买入交易，保证两边联动且不重复累加
    const holding = await prisma.$transaction(async (tx) => {
      const created = await tx.holding.create({
        data: {
          userId: user.id,
          fundId: fund.id,
          shares: shareValue,
          costAmount: totalCost,
          note,
        },
        include: { fund: true },
      });

      if (hasBuy) {
        await tx.transaction.create({
          data: {
            userId: user.id,
            holdingId: created.id,
            type: "BUY",
            amount: totalCost,
            shares: shareValue,
            nav,
            fee: 0,
            tradeDate: new Date(),
            note,
          },
        });
      }

      return created;
    });

    return ok(holding, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return fail(toErrorMessage(error), 500);
  }
}
