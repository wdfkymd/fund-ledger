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

/** YYYY-MM in UTC */
function monthKey(d: Date) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

function lastNMonths(n: number): string[] {
  const keys: string[] = []
  const now = new Date()
  let y = now.getUTCFullYear()
  let m = now.getUTCMonth()
  for (let i = 0; i < n; i++) {
    keys.unshift(`${y}-${String(m + 1).padStart(2, "0")}`)
    m -= 1
    if (m < 0) {
      m = 11
      y -= 1
    }
  }
  return keys
}

export type AnalyticsFundItem = {
  holdingId: string
  fundCode: string
  fundName: string
  shares: number
  costAmount: number
  marketValue: number
  estimateValue: number
  profit: number
  profitRate: number | null
  estimateProfit: number
  estimateProfitRate: number | null
  dayProfit: number | null
  dayProfitRate: number | null
  isEstimate: boolean
  weight: number
}

export type AnalyticsPayload = {
  summary: {
    totalCost: number
    totalMarketValue: number
    totalEstimateValue: number
    totalProfit: number
    totalProfitRate: number | null
    totalEstimateProfit: number
    totalEstimateProfitRate: number | null
    totalDayProfit: number | null
    totalDayProfitRate: number | null
    holdingCount: number
    transactionCount: number
  }
  flow: {
    buyAmount: number
    sellAmount: number
    sipAmount: number
    buyCount: number
    sellCount: number
    sipCount: number
    feeTotal: number
    netInvested: number
  }
  byWeight: AnalyticsFundItem[]
  byProfit: AnalyticsFundItem[]
  monthly: {
    month: string
    invest: number
    redeem: number
    fee: number
    net: number
    count: number
  }[]
}

export async function getAnalyticsPayload(
  userId: string,
): Promise<AnalyticsPayload> {
  const [holdings, transactions] = await Promise.all([
    prisma.holding.findMany({
      where: { userId },
      include: { fund: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { tradeDate: "asc" },
    }),
  ])

  let totalCost = 0
  let totalMarketValue = 0
  let totalEstimateValue = 0
  let totalDayProfit: number | null = null
  let dayProfitBase = 0

  const fundItems: AnalyticsFundItem[] = holdings.map((h) => {
    const marketValue = calcMarketValue(h.shares, h.fund.nav)
    const estimateValue = calcEstimateValue(
      h.shares,
      h.fund.estimateNav,
      h.fund.nav,
    )
    const profit = calcProfit(marketValue, h.costAmount)
    const estimateProfit = calcProfit(estimateValue, h.costAmount)
    const dayProfit = calcDayProfit(
      h.shares,
      h.fund.estimateNav,
      h.fund.nav,
      h.fund.estimateChangePct,
    )
    const dayProfitRate = calcDayProfitRate(dayProfit, h.shares, h.fund.nav)
    const isEstimate = !isNavSettled(h.fund.navDate, h.fund.estimateTime)

    totalCost += h.costAmount
    totalMarketValue += marketValue
    totalEstimateValue += estimateValue
    if (dayProfit != null) {
      totalDayProfit = roundMoney((totalDayProfit ?? 0) + dayProfit, 4)
      dayProfitBase += marketValue
    }

    return {
      holdingId: h.id,
      fundCode: h.fund.code,
      fundName: h.fund.name,
      shares: h.shares,
      costAmount: roundMoney(h.costAmount, 4),
      marketValue: roundMoney(marketValue, 4),
      estimateValue: roundMoney(estimateValue, 4),
      profit: roundMoney(profit, 4),
      profitRate: calcProfitRate(profit, h.costAmount),
      estimateProfit: roundMoney(estimateProfit, 4),
      estimateProfitRate: calcProfitRate(estimateProfit, h.costAmount),
      dayProfit,
      dayProfitRate,
      isEstimate,
      weight: 0,
    }
  })

  const baseTotal =
    totalEstimateValue > 0 ? totalEstimateValue : totalMarketValue
  for (const item of fundItems) {
    const v = item.estimateValue > 0 ? item.estimateValue : item.marketValue
    item.weight = baseTotal > 0 ? roundMoney(v / baseTotal, 6) : 0
  }

  const byWeight = [...fundItems].sort((a, b) => b.weight - a.weight)
  const byProfit = [...fundItems].sort(
    (a, b) => b.estimateProfit - a.estimateProfit,
  )

  let buyAmount = 0
  let sellAmount = 0
  let sipAmount = 0
  let buyCount = 0
  let sellCount = 0
  let sipCount = 0
  let feeTotal = 0

  const monthMap = new Map<
    string,
    { invest: number; redeem: number; fee: number; count: number }
  >()

  for (const tx of transactions) {
    feeTotal += tx.fee
    const key = monthKey(new Date(tx.tradeDate))
    if (!monthMap.has(key)) {
      monthMap.set(key, { invest: 0, redeem: 0, fee: 0, count: 0 })
    }
    const bucket = monthMap.get(key)!
    bucket.count += 1
    bucket.fee += tx.fee

    if (tx.type === "BUY") {
      buyAmount += tx.amount
      buyCount += 1
      bucket.invest += tx.amount + tx.fee
    } else if (tx.type === "SIP") {
      sipAmount += tx.amount
      sipCount += 1
      bucket.invest += tx.amount + tx.fee
    } else if (tx.type === "SELL") {
      sellAmount += tx.amount
      sellCount += 1
      bucket.redeem += Math.max(0, tx.amount - tx.fee)
    }
  }

  const months = lastNMonths(12).map((key) => {
    const b = monthMap.get(key) ?? {
      invest: 0,
      redeem: 0,
      fee: 0,
      count: 0,
    }
    return {
      month: key,
      invest: roundMoney(b.invest, 2),
      redeem: roundMoney(b.redeem, 2),
      fee: roundMoney(b.fee, 2),
      net: roundMoney(b.invest - b.redeem, 2),
      count: b.count,
    }
  })

  const totalProfit = roundMoney(totalMarketValue - totalCost, 4)
  const totalEstimateProfit = roundMoney(totalEstimateValue - totalCost, 4)

  return {
    summary: {
      totalCost: roundMoney(totalCost, 4),
      totalMarketValue: roundMoney(totalMarketValue, 4),
      totalEstimateValue: roundMoney(totalEstimateValue, 4),
      totalProfit,
      totalProfitRate: calcProfitRate(totalProfit, totalCost),
      totalEstimateProfit,
      totalEstimateProfitRate: calcProfitRate(totalEstimateProfit, totalCost),
      totalDayProfit,
      totalDayProfitRate:
        totalDayProfit != null && dayProfitBase > 0
          ? roundMoney(totalDayProfit / dayProfitBase, 6)
          : null,
      holdingCount: holdings.length,
      transactionCount: transactions.length,
    },
    flow: {
      buyAmount: roundMoney(buyAmount, 2),
      sellAmount: roundMoney(sellAmount, 2),
      sipAmount: roundMoney(sipAmount, 2),
      buyCount,
      sellCount,
      sipCount,
      feeTotal: roundMoney(feeTotal, 2),
      netInvested: roundMoney(buyAmount + sipAmount - sellAmount, 2),
    },
    byWeight,
    byProfit,
    monthly: months,
  }
}
