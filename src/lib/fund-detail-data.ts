import { prisma } from "@/lib/db"
import {
  fetchFundFromEastMoney,
  fetchFundNavHistoryFromEastMoney,
} from "@/lib/fund-api"
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

export type FundDetailPayload = {
  fund: {
    id: string
    code: string
    name: string
    type: string | null
    nav: number | null
    navDate: string | null
    estimateNav: number | null
    estimateChangePct: number | null
    estimateTime: string | null
  }
  holding: {
    id: string
    shares: number
    costAmount: number
    marketValue: number
    estimateValue: number
    profit: number
    profitRate: number
    estimateProfit: number
    estimateProfitRate: number
    dayProfit: number | null
    dayProfitRate: number | null
    isEstimate: boolean
    note: string | null
  } | null
  isWatched: boolean
  watchlistId: string | null
  history: { date: string; nav: number; changePct?: number }[]
  historySource: "remote" | "local"
  transactions: {
    id: string
    type: string
    amount: number
    shares: number
    nav: number
    fee: number
    tradeDate: string
    note: string | null
  }[]
  liveError: string | null
}

export class FundDetailError extends Error {
  readonly status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = "FundDetailError"
    this.status = status
  }
}

/**
 * 单基金详情读模型。refresh 时强制拉东财；首屏可不 refresh，缺库再拉。
 */
export async function getFundDetailPayload(
  userId: string,
  codeRaw: string,
  opts?: { refresh?: boolean; days?: number },
): Promise<FundDetailPayload> {
  const code = codeRaw.trim()
  if (!/^\d{6}$/.test(code)) {
    throw new FundDetailError("基金代码应为 6 位数字")
  }

  const refresh = opts?.refresh === true
  const daysParam = opts?.days ?? 90
  const days = Number.isFinite(daysParam)
    ? Math.min(Math.max(Math.floor(daysParam), 30), 120)
    : 90

  let fund = await prisma.fund.findUnique({ where: { code } })
  let liveError: string | null = null

  if (!fund || refresh) {
    try {
      const info = await fetchFundFromEastMoney(code)
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
      })
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
        })
      }
    } catch (error) {
      liveError =
        error instanceof Error ? error.message : "拉取最新行情失败"
      if (!fund) {
        throw new FundDetailError(liveError, 404)
      }
    }
  }

  let historySource: "remote" | "local" = "local"
  let history: { date: string; nav: number; changePct?: number }[] = []

  // 首屏优先本地 NavHistory，避免东财 history 拖死 TTFB；refresh 再强制外网
  if (!refresh) {
    const local = await prisma.navHistory.findMany({
      where: { fundId: fund.id },
      orderBy: { date: "desc" },
      take: days,
    })
    if (local.length > 0) {
      history = local
        .slice()
        .reverse()
        .map((h) => ({
          date: h.date.toISOString().slice(0, 10),
          nav: h.nav,
        }))
      historySource = "local"
    }
  }

  if (history.length === 0 || refresh) {
    try {
      const remote = await fetchFundNavHistoryFromEastMoney(code, days)
      if (remote.length > 0) {
        history = remote
        historySource = "remote"
        const toStore = remote.slice(-Math.min(remote.length, 60))
        await prisma.$transaction(
          toStore.map((p) =>
            prisma.navHistory.upsert({
              where: {
                fundId_date: {
                  fundId: fund!.id,
                  date: new Date(p.date),
                },
              },
              create: {
                fundId: fund!.id,
                nav: p.nav,
                date: new Date(p.date),
              },
              update: { nav: p.nav },
            }),
          ),
        )
      }
    } catch {
      // 外网失败时保留已有 local history
    }
  }

  if (history.length === 0) {
    const local = await prisma.navHistory.findMany({
      where: { fundId: fund.id },
      orderBy: { date: "desc" },
      take: days,
    })
    history = local
      .slice()
      .reverse()
      .map((h) => ({
        date: h.date.toISOString().slice(0, 10),
        nav: h.nav,
      }))
    historySource = "local"
  }

  const [holding, watchItem] = await Promise.all([
    prisma.holding.findFirst({
      where: { userId, fundId: fund.id },
    }),
    prisma.watchlistItem.findFirst({
      where: { userId, fundId: fund.id },
    }),
  ])

  let holdingView: FundDetailPayload["holding"] = null
  let transactions: FundDetailPayload["transactions"] = []

  if (holding) {
    const marketValue = calcMarketValue(holding.shares, fund.nav)
    const estimateValue = calcEstimateValue(
      holding.shares,
      fund.estimateNav,
      fund.nav,
    )
    const profit = calcProfit(marketValue, holding.costAmount)
    const estimateProfit = calcProfit(estimateValue, holding.costAmount)
    const dayProfit = calcDayProfit(
      holding.shares,
      fund.estimateNav,
      fund.nav,
      fund.estimateChangePct,
    )
    const dayProfitRate = calcDayProfitRate(
      dayProfit,
      holding.shares,
      fund.nav,
    )
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
      isEstimate: !isNavSettled(fund.navDate, fund.estimateTime),
      note: holding.note,
    }

    const txs = await prisma.transaction.findMany({
      where: { userId, holdingId: holding.id },
      orderBy: { tradeDate: "desc" },
      take: 50,
    })
    transactions = txs.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      shares: t.shares,
      nav: t.nav,
      fee: t.fee,
      tradeDate: t.tradeDate.toISOString(),
      note: t.note,
    }))
  }

  return {
    fund: {
      id: fund.id,
      code: fund.code,
      name: fund.name,
      type: fund.type,
      nav: fund.nav,
      navDate: fund.navDate ? fund.navDate.toISOString() : null,
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
  }
}
