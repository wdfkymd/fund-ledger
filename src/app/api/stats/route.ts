import { requireUser } from "@/lib/auth";
import { fail, ok, toErrorMessage, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  calcMarketValue,
  calcProfit,
  calcProfitRate,
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
    const items = holdings.map((h) => {
      const marketValue = calcMarketValue(h.shares, h.fund.nav);
      const profit = calcProfit(marketValue, h.costAmount);
      totalCost += h.costAmount;
      totalMarketValue += marketValue;
      return {
        holdingId: h.id,
        fundCode: h.fund.code,
        fundName: h.fund.name,
        shares: h.shares,
        costAmount: h.costAmount,
        nav: h.fund.nav,
        marketValue,
        profit,
        profitRate: calcProfitRate(profit, h.costAmount),
      };
    });

    const totalProfit = totalMarketValue - totalCost;
    return ok({
      totalCost,
      totalMarketValue,
      totalProfit,
      totalProfitRate: calcProfitRate(totalProfit, totalCost),
      holdings: items,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return fail(toErrorMessage(error), 500);
  }
}
