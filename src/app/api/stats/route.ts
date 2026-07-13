import { requireUser } from "@/lib/auth";
import { fail, ok, toErrorMessage, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/db";
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
    });

    let totalCost = 0;
    let totalMarketValue = 0;
    let totalEstimateValue = 0;
    let totalDayProfit: number | null = null;
    let dayProfitBase = 0;
    const items = holdings.map((h) => {
      const marketValue = calcMarketValue(h.shares, h.fund.nav);
      const estimateValue = calcEstimateValue(
        h.shares,
        h.fund.estimateNav,
        h.fund.nav,
      );
      const profit = calcProfit(marketValue, h.costAmount);
      const estimateProfit = calcProfit(estimateValue, h.costAmount);
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
      totalCost += h.costAmount;
      totalMarketValue += marketValue;
      totalEstimateValue += estimateValue;
      if (dayProfit != null) {
        totalDayProfit = roundMoney((totalDayProfit ?? 0) + dayProfit, 4);
        dayProfitBase += marketValue;
      }
      return {
        holdingId: h.id,
        fundCode: h.fund.code,
        fundName: h.fund.name,
        shares: h.shares,
        costAmount: h.costAmount,
        nav: h.fund.nav,
        estimateNav: h.fund.estimateNav,
        estimateChangePct: h.fund.estimateChangePct,
        estimateTime: h.fund.estimateTime,
        marketValue,
        estimateValue,
        profit,
        profitRate: calcProfitRate(profit, h.costAmount),
        estimateProfit,
        estimateProfitRate: calcProfitRate(estimateProfit, h.costAmount),
        dayProfit,
        dayProfitRate,
      };
    });

    const totalProfit = totalMarketValue - totalCost;
    const totalEstimateProfit = totalEstimateValue - totalCost;
    return ok({
      totalCost,
      totalMarketValue,
      totalProfit,
      totalProfitRate: calcProfitRate(totalProfit, totalCost),
      totalEstimateValue,
      totalEstimateProfit,
      totalEstimateProfitRate: calcProfitRate(totalEstimateProfit, totalCost),
      totalDayProfit,
      totalDayProfitRate:
        totalDayProfit != null && dayProfitBase > 0
          ? roundMoney(totalDayProfit / dayProfitBase, 6)
          : null,
      holdings: items,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return fail(toErrorMessage(error), 500);
  }
}
