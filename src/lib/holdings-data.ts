import { prisma } from "@/lib/db"
import {
  calcDayProfit,
  calcDayProfitRate,
  calcEstimateValue,
  calcMarketValue,
  calcProfit,
  calcProfitRate,
  isNavSettled,
  roundMoney,
} from "@/lib/finance"

export type HoldingListItem = {
  id: string
  shares: number
  costAmount: number
  note: string | null
  marketValue: number
  profit: number
  profitRate: number
  estimateValue: number
  estimateProfit: number
  estimateProfitRate: number
  dayProfit: number | null
  dayProfitRate: number | null
  isEstimate: boolean
  fund: {
    id: string
    code: string
    name: string
    nav: number | null
    estimateNav: number | null
    estimateChangePct: number | null
    estimateTime: string | null
  }
  createdAt: string
  updatedAt: string
}

export type HoldingsSummary = {
  totalCost: number
  totalMarketValue: number
  totalProfit: number
  totalEstimateValue: number
  totalEstimateProfit: number
  totalProfitRate: number
  totalEstimateProfitRate: number
  totalDayProfit: number | null
  totalDayProfitRate: number | null
}

export type HoldingsPayload = {
  holdings: HoldingListItem[]
  summary: HoldingsSummary
}

export async function getHoldingsPayload(
  userId: string,
): Promise<HoldingsPayload> {
  const holdings = await prisma.holding.findMany({
    where: { userId },
    include: { fund: true },
    orderBy: { updatedAt: "desc" },
  })

  const data: HoldingListItem[] = holdings.map((h) => {
    const marketValue = calcMarketValue(h.shares, h.fund.nav)
    const estimateValue = calcEstimateValue(
      h.shares,
      h.fund.estimateNav,
      h.fund.nav,
    )
    const profit = calcProfit(marketValue, h.costAmount)
    const profitRate = calcProfitRate(profit, h.costAmount)
    const estimateProfit = calcProfit(estimateValue, h.costAmount)
    const estimateProfitRate = calcProfitRate(estimateProfit, h.costAmount)
    const dayProfit = calcDayProfit(
      h.shares,
      h.fund.estimateNav,
      h.fund.nav,
      h.fund.estimateChangePct,
    )
    const dayProfitRate = calcDayProfitRate(dayProfit, h.shares, h.fund.nav)
    const isEstimate = !isNavSettled(h.fund.navDate, h.fund.estimateTime)
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
      isEstimate,
      fund: {
        id: h.fund.id,
        code: h.fund.code,
        name: h.fund.name,
        nav: h.fund.nav,
        estimateNav: h.fund.estimateNav,
        estimateChangePct: h.fund.estimateChangePct,
        estimateTime: h.fund.estimateTime,
      },
      createdAt: h.createdAt.toISOString(),
      updatedAt: h.updatedAt.toISOString(),
    }
  })

  const summaryAcc = data.reduce(
    (acc, item) => {
      acc.totalCost += item.costAmount
      acc.totalMarketValue += item.marketValue
      acc.totalProfit += item.profit
      acc.totalEstimateValue += item.estimateValue
      acc.totalEstimateProfit += item.estimateProfit
      if (item.dayProfit != null) {
        acc.totalDayProfit = roundMoney(
          (acc.totalDayProfit ?? 0) + item.dayProfit,
          4,
        )
        acc.dayProfitBase += item.marketValue
      }
      return acc
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
  )

  const totalDayProfitRate =
    summaryAcc.totalDayProfit != null && summaryAcc.dayProfitBase > 0
      ? roundMoney(summaryAcc.totalDayProfit / summaryAcc.dayProfitBase, 6)
      : null

  return {
    holdings: data,
    summary: {
      totalCost: summaryAcc.totalCost,
      totalMarketValue: summaryAcc.totalMarketValue,
      totalProfit: summaryAcc.totalProfit,
      totalEstimateValue: summaryAcc.totalEstimateValue,
      totalEstimateProfit: summaryAcc.totalEstimateProfit,
      totalProfitRate: calcProfitRate(
        summaryAcc.totalProfit,
        summaryAcc.totalCost,
      ),
      totalEstimateProfitRate: calcProfitRate(
        summaryAcc.totalEstimateProfit,
        summaryAcc.totalCost,
      ),
      totalDayProfit: summaryAcc.totalDayProfit,
      totalDayProfitRate,
    },
  }
}
