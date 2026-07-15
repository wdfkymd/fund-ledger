export type Holding = {
  id: string
  shares: number
  costAmount: number
  estimateValue: number
  estimateProfit: number
  estimateProfitRate: number
  dayProfit: number | null
  dayProfitRate: number | null
  fund: {
    code: string
    name: string
    nav: number | null
    estimateNav: number | null
    estimateChangePct: number | null
    estimateTime: string | null
  }
}

export type WatchItem = {
  id: string
  note: string | null
  isHeld: boolean
  fund: {
    code: string
    name: string
    nav: number | null
    estimateNav: number | null
    estimateChangePct: number | null
    estimateTime: string | null
  }
}

export type Summary = {
  totalCost: number
  totalEstimateValue: number
  totalEstimateProfit: number
  totalEstimateProfitRate: number
  totalDayProfit: number | null
  totalDayProfitRate: number | null
}

export type MarketIndex = {
  name: string
  code: string
  price: number | null
  changePct: number | null
  change: number | null
}

export type RecentTx = {
  id: string
  type: string
  amount: number
  shares: number
  tradeDate: string
  holding: { fund: { name: string; code: string } }
}

export type ListTab = "holdings" | "watchlist"

export type DashboardSnapshot = {
  holdings: Holding[]
  watchlist: WatchItem[]
  recentTxs: RecentTx[]
  summary: Summary | null
  indices: MarketIndex[]
}

export type HoldingsResponse = {
  holdings: Holding[]
  summary: Summary
}

export type WatchlistResponse = {
  items: WatchItem[]
}

export type IndicesResponse = {
  indices: MarketIndex[]
}
