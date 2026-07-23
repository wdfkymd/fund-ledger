import { todayCST, toDateStringUTC } from "@/lib/trade-date"

export type LedgerTx = {
  type: string
  amount: number
  shares: number
  fee: number
  tradeDate: Date | string
  createdAt?: Date | string
  id?: string
}

export type HoldingState = {
  shares: number
  costAmount: number
}

export function roundMoney(value: number, digits = 4) {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export function calcMarketValue(shares: number, nav: number | null | undefined) {
  if (!nav) return 0
  return roundMoney(shares * nav, 4)
}

/** 优先用实时估值算市值，否则回退单位净值 */
export function calcEstimateValue(
  shares: number,
  estimateNav: number | null | undefined,
  nav: number | null | undefined,
) {
  if (estimateNav != null && estimateNav > 0) {
    return calcMarketValue(shares, estimateNav)
  }
  return calcMarketValue(shares, nav)
}

/**
 * 日盈亏（相对上一公布单位净值，不是相对成本）。
 * 1) 有盘中估值：份额 × (estimateNav − nav)  → 今日估算
 * 2) 否则有净值日涨跌：份额 × nav × (navChangePct/100) → 净值日涨跌对应盈亏
 * 注意：禁止把 navChangePct 写入 estimateChangePct 再算。
 */
export function calcDayProfit(
  shares: number,
  estimateNav: number | null | undefined,
  nav: number | null | undefined,
  estimateChangePct: number | null | undefined,
  navChangePct?: number | null | undefined,
): number | null {
  if (shares <= 0) return null
  if (estimateNav != null && nav != null && estimateNav > 0 && nav > 0) {
    return roundMoney(shares * (estimateNav - nav), 4)
  }
  // 仅在有真实盘中估算涨跌时用 estimateChangePct
  if (estimateChangePct != null && nav != null && nav > 0) {
    return roundMoney(shares * nav * (estimateChangePct / 100), 4)
  }
  // 净值日涨跌（与估值无关）
  if (navChangePct != null && nav != null && nav > 0) {
    return roundMoney(shares * nav * (navChangePct / 100), 4)
  }
  return null
}

/** 今日收益率：相对「昨收」市值（份额×单位净值） */
export function calcDayProfitRate(
  dayProfit: number | null,
  shares: number,
  nav: number | null | undefined,
): number | null {
  if (dayProfit == null) return null
  const base = calcMarketValue(shares, nav)
  if (base <= 0) return null
  return roundMoney(dayProfit / base, 6)
}

export function calcProfit(marketValue: number, costAmount: number) {
  return roundMoney(marketValue - costAmount, 4)
}

export function calcProfitRate(profit: number, costAmount: number) {
  if (costAmount <= 0) return null
  return roundMoney(profit / costAmount, 6)
}

/**
 * 净值是否已确认（盘后）。
 * 规则：单位净值日期(navDate)是今天 → 当日净值已公布，视为已确认；
 * 或估值时间(estimateTime)存在但不是今天 → 盘中估值已过期，视为已确认。
 * 其余情况按"估值中"处理。
 */
export function isNavSettled(
  navDate: Date | string | null | undefined,
  estimateTime: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  // 统一用北京时间日历日，避免 UTC「今天」与盘中 CST 判断不一致
  const today = todayCST(now)
  // 当日单位净值已公布 -> 肯定是已确认
  if (navDate) {
    const navDateStr =
      navDate instanceof Date
        ? toDateStringUTC(navDate)
        : String(navDate).slice(0, 10)
    if (navDateStr === today) return true
  }
  // 以北京时间(UTC+8)判断交易时段（与 todayCST 同一套时钟）
  const cstMs = now.getTime() + 8 * 60 * 60 * 1000
  const cst = new Date(cstMs)
  const day = cst.getUTCDay()
  const isWeekend = day === 0 || day === 6
  const hour = cst.getUTCHours()
  const minute = cst.getUTCMinutes()
  // 周末 -> 已确认（节假日未建模）
  if (isWeekend) return true
  // 盘前(09:30 前) 或 盘后(15:00 及之后) -> 用已确认净值
  if (hour < 9 || (hour === 9 && minute < 30)) return true
  if (hour >= 15) return true
  // 交易时段内：若估值时间落在「今天」(CST) 则视为估值中
  if (estimateTime) {
    const estStr = String(estimateTime).slice(0, 10)
    if (estStr === today) return false
  }
  return true
}

/** 买入净投入（计入成本）：金额 + 手续费 */
export function buyNetAmount(amount: number, fee: number) {
  return roundMoney(amount + fee, 4)
}

export function applyBuy(
  shares: number,
  costAmount: number,
  buyShares: number,
  buyAmount: number,
): HoldingState {
  return {
    shares: roundMoney(shares + buyShares, 4),
    costAmount: roundMoney(costAmount + buyAmount, 4),
  }
}

/**
 * 卖出：按份额比例扣减成本（移动平均成本法）。
 * 成本扣减与成交金额无关，保证冲销/重放可逆。
 */
export function applySell(
  shares: number,
  costAmount: number,
  sellShares: number,
): HoldingState {
  if (sellShares > shares + 1e-9) {
    throw new Error("卖出份额不能超过持仓份额")
  }
  if (shares === 0) {
    return { shares: 0, costAmount: 0 }
  }
  const ratio = sellShares / shares
  const nextShares = roundMoney(shares - sellShares, 4)
  const nextCost =
    nextShares <= 1e-9 ? 0 : roundMoney(costAmount * (1 - ratio), 4)
  return {
    shares: nextShares <= 1e-9 ? 0 : nextShares,
    costAmount: nextCost < 0 ? 0 : nextCost,
  }
}

/** 应用一笔交易对持仓的影响 */
export function applyTransactionEffect(
  shares: number,
  costAmount: number,
  type: string,
  txShares: number,
  amount: number,
  fee: number,
): HoldingState {
  if (type === "BUY" || type === "SIP") {
    return applyBuy(shares, costAmount, txShares, buyNetAmount(amount, fee))
  }
  if (type === "SELL") {
    return applySell(shares, costAmount, txShares)
  }
  throw new Error(`未知交易类型: ${type}`)
}

function txTime(value: Date | string | undefined): number {
  if (!value) return 0
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime()
  if (!Number.isFinite(t)) {
    throw new Error(`无效交易日期: ${value}`)
  }
  return t
}

/** 交易回放顺序：成交日 → 创建时间 → id */
export function compareLedgerTx(a: LedgerTx, b: LedgerTx): number {
  const byTrade = txTime(a.tradeDate) - txTime(b.tradeDate)
  if (byTrade !== 0) return byTrade
  const byCreated = txTime(a.createdAt) - txTime(b.createdAt)
  if (byCreated !== 0) return byCreated
  return (a.id ?? "").localeCompare(b.id ?? "")
}

/**
 * 从交易流水重算持仓（唯一账本真源）。
 * 编辑/删除交易后应调用此函数，避免冲销近似误差。
 */
export function rebuildHoldingFromTransactions(
  transactions: LedgerTx[],
): HoldingState {
  let shares = 0
  let costAmount = 0
  const ordered = [...transactions].sort(compareLedgerTx)
  for (const tx of ordered) {
    const next = applyTransactionEffect(
      shares,
      costAmount,
      tx.type,
      tx.shares,
      tx.amount,
      tx.fee,
    )
    shares = next.shares
    costAmount = next.costAmount
  }
  return { shares, costAmount }
}

/**
 * @deprecated 仅兼容旧调用；新逻辑请用 rebuildHoldingFromTransactions
 */
export function reverseTransactionEffect(
  shares: number,
  costAmount: number,
  type: string,
  txShares: number,
  amount: number,
  fee: number,
): HoldingState {
  if (type === "BUY" || type === "SIP") {
    const netAmount = buyNetAmount(amount, fee)
    const nextShares = roundMoney(shares - txShares, 4)
    if (nextShares < -1e-9) {
      throw new Error("冲销后份额不能为负")
    }
    const nextCost = roundMoney(costAmount - netAmount, 4)
    if (nextCost < -1e-9) {
      throw new Error("冲销后成本不能为负，请检查交易与持仓是否一致")
    }
    return {
      shares: nextShares < 0 ? 0 : nextShares,
      costAmount: nextCost < 0 ? 0 : nextCost,
    }
  }
  if (type === "SELL") {
    const sharesBefore = roundMoney(shares + txShares, 4)
    if (sharesBefore <= 1e-9) {
      return applyBuy(shares, costAmount, txShares, 0)
    }
    const costBefore =
      shares <= 1e-7
        ? 0
        : roundMoney((costAmount * sharesBefore) / shares, 4)
    const costBack = roundMoney(costBefore - costAmount, 4)
    return applyBuy(shares, costAmount, txShares, Math.max(0, costBack))
  }
  throw new Error(`未知交易类型: ${type}`)
}
