import { prisma } from "@/lib/db"
import { isNavSettled } from "@/lib/finance"
import {
  calcDayProfit,
  calcDayProfitRate,
  calcEstimateValue,
  calcMarketValue,
  calcProfit,
  calcProfitRate,
  roundMoney,
} from "@/lib/finance"
export type DashboardHolding = {
  id: string
  shares: number
  costAmount: number
  marketValue: number
  estimateValue: number
  profit: number
  estimateProfit: number
  profitRate: number | null
  estimateProfitRate: number | null
  dayProfit: number | null
  dayProfitRate: number | null
  isEstimate: boolean
  fund: {
    code: string
    name: string
    nav: number | null
    estimateNav: number | null
    estimateChangePct: number | null
    navChangePct: number | null
    estimateTime: string | null
  }
}

export type DashboardWatchItem = {
  id: string
  note: string | null
  isHeld: boolean
  fund: {
    code: string
    name: string
    nav: number | null
    estimateNav: number | null
    estimateChangePct: number | null
    navChangePct: number | null
    estimateTime: string | null
  }
}

export type DashboardSummary = {
  totalCost: number
  totalMarketValue: number
  totalEstimateValue: number
  totalEstimateProfit: number
  totalEstimateProfitRate: number | null
  totalProfit: number
  totalProfitRate: number | null
  totalDayProfit: number | null
  totalDayProfitRate: number | null
  isEstimate: boolean
}

export type DashboardRecentTx = {
  id: string
  type: string
  amount: number
  shares: number
  tradeDate: string
  holding: { fund: { name: string; code: string } }
}

export type DashboardIndex = {
  name: string
  code: string
  price: number | null
  changePct: number | null
  change: number | null
}

export type DashboardPayload = {
  holdings: DashboardHolding[]
  watchlist: DashboardWatchItem[]
  recentTxs: DashboardRecentTx[]
  summary: DashboardSummary
  indices: DashboardIndex[]
}

/**
 * 总览首屏读模型。指数外网有 120ms 超时，避免拖死 TTFB/LCP。
 */
export async function getDashboardPayload(
  userId: string,
): Promise<DashboardPayload> {
  const [rawHoldings, rawWatch, rawTxs] = await Promise.all([
    prisma.holding.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        shares: true,
        costAmount: true,
        fund: {
          select: {
            id: true,
            code: true,
            name: true,
            nav: true,
            navDate: true,
            estimateNav: true,
            estimateChangePct: true,
            navChangePct: true,
            estimateTime: true,
          },
        },
      },
    }),
    prisma.watchlistItem.findMany({
      where: { userId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        note: true,
        fundId: true,
        fund: {
          select: {
            code: true,
            name: true,
            nav: true,
            estimateNav: true,
            estimateChangePct: true,
            navChangePct: true,
            estimateTime: true,
          },
        },
      },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: [{ tradeDate: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        type: true,
        amount: true,
        shares: true,
        tradeDate: true,
        holding: {
          select: {
            fund: { select: { name: true, code: true } },
          },
        },
      },
    }),
  ])

  const holdingFundIds = new Set(rawHoldings.map((h) => h.fund.id))
  let anyUnsettled = false

  const holdings: DashboardHolding[] = rawHoldings.map((h) => {
    if (!isNavSettled(h.fund.navDate, h.fund.estimateTime)) {
      anyUnsettled = true
    }
    const marketValue = calcMarketValue(h.shares, h.fund.nav)
    const estimateValue = calcEstimateValue(
      h.shares,
      h.fund.estimateNav,
      h.fund.nav,
    )
    const estimateProfit = calcProfit(estimateValue, h.costAmount)
    const dayProfit = calcDayProfit(
      h.shares,
      h.fund.estimateNav,
      h.fund.nav,
      h.fund.estimateChangePct,
      h.fund.navChangePct,
    )
    const dayProfitRate = calcDayProfitRate(dayProfit, h.shares, h.fund.nav)
    const profit = calcProfit(marketValue, h.costAmount)
    return {
      id: h.id,
      shares: h.shares,
      costAmount: h.costAmount,
      marketValue: roundMoney(marketValue, 4),
      estimateValue: roundMoney(estimateValue, 4),
      profit: roundMoney(profit, 4),
      estimateProfit: roundMoney(estimateProfit, 4),
      profitRate: calcProfitRate(profit, h.costAmount),
      estimateProfitRate: calcProfitRate(estimateProfit, h.costAmount),
      dayProfit,
      dayProfitRate,
      isEstimate: !isNavSettled(h.fund.navDate, h.fund.estimateTime),
      fund: {
        code: h.fund.code,
        name: h.fund.name,
        nav: h.fund.nav,
        estimateNav: h.fund.estimateNav,
        estimateChangePct: h.fund.estimateChangePct,
        navChangePct: h.fund.navChangePct,
        estimateTime: h.fund.estimateTime,
      },
    }
  })

  const summaryAcc = holdings.reduce(
    (acc, item) => {
      acc.totalCost += item.costAmount
      acc.totalMarketValue += item.marketValue
      acc.totalEstimateValue += item.estimateValue
      acc.totalProfit += item.profit
      acc.totalEstimateProfit += item.estimateProfit
      if (item.dayProfit != null) {
        acc.totalDayProfit = roundMoney(
          (acc.totalDayProfit ?? 0) + item.dayProfit,
          4,
        )
        acc.dayProfitBase += calcMarketValue(
          item.shares,
          item.fund.nav,
        )
      }
      return acc
    },
    {
      totalCost: 0,
      totalMarketValue: 0,
      totalEstimateValue: 0,
      totalProfit: 0,
      totalEstimateProfit: 0,
      totalDayProfit: null as number | null,
      dayProfitBase: 0,
    },
  )

  const summary: DashboardSummary = {
    totalCost: summaryAcc.totalCost,
    totalEstimateValue: summaryAcc.totalEstimateValue,
    totalEstimateProfit: summaryAcc.totalEstimateProfit,
    totalEstimateProfitRate: calcProfitRate(
      summaryAcc.totalEstimateProfit,
      summaryAcc.totalCost,
    ),
    totalMarketValue: summaryAcc.totalMarketValue,
    totalProfit: summaryAcc.totalProfit,
    totalProfitRate: calcProfitRate(summaryAcc.totalProfit, summaryAcc.totalCost),
    totalDayProfit: summaryAcc.totalDayProfit,
    totalDayProfitRate:
      summaryAcc.totalDayProfit != null && summaryAcc.dayProfitBase > 0
        ? roundMoney(summaryAcc.totalDayProfit / summaryAcc.dayProfitBase, 6)
        : null,
    isEstimate: anyUnsettled,
  }

  const watchlist: DashboardWatchItem[] = rawWatch.map((item) => ({
    id: item.id,
    note: item.note,
    isHeld: holdingFundIds.has(item.fundId),
    fund: {
      code: item.fund.code,
      name: item.fund.name,
      nav: item.fund.nav,
      estimateNav: item.fund.estimateNav,
      estimateChangePct: item.fund.estimateChangePct,
      navChangePct: item.fund.navChangePct,
      estimateTime: item.fund.estimateTime,
    },
  }))

  const recentTxs: DashboardRecentTx[] = rawTxs.map((tx) => ({
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    shares: tx.shares,
    tradeDate:
      tx.tradeDate instanceof Date
        ? tx.tradeDate.toISOString()
        : String(tx.tradeDate),
    holding: {
      fund: {
        name: tx.holding.fund.name,
        code: tx.holding.fund.code,
      },
    },
  }))

  return {
    holdings,
    watchlist,
    recentTxs,
    summary,
    indices: [],
  }
}
