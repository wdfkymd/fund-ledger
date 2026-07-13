export function roundMoney(value: number, digits = 4) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function calcMarketValue(shares: number, nav: number | null | undefined) {
  if (!nav) return 0;
  return roundMoney(shares * nav, 4);
}

/** 优先用实时估值算市值，否则回退单位净值 */
export function calcEstimateValue(
  shares: number,
  estimateNav: number | null | undefined,
  nav: number | null | undefined,
) {
  if (estimateNav != null && estimateNav > 0) {
    return calcMarketValue(shares, estimateNav);
  }
  return calcMarketValue(shares, nav);
}

/**
 * 今日预估盈利（相对上一公布单位净值，不是相对成本）。
 * 优先：份额 × (估值 − 单位净值)；
 * 否则：份额 × 单位净值 × 估算涨跌幅%。
 * 无数据时返回 null（前端显示 —）。
 */
export function calcDayProfit(
  shares: number,
  estimateNav: number | null | undefined,
  nav: number | null | undefined,
  estimateChangePct: number | null | undefined,
): number | null {
  if (shares <= 0) return null;
  if (
    estimateNav != null &&
    nav != null &&
    estimateNav > 0 &&
    nav > 0
  ) {
    return roundMoney(shares * (estimateNav - nav), 4);
  }
  if (estimateChangePct != null && nav != null && nav > 0) {
    return roundMoney(shares * nav * (estimateChangePct / 100), 4);
  }
  return null;
}

/** 今日收益率：相对「昨收」市值（份额×单位净值） */
export function calcDayProfitRate(
  dayProfit: number | null,
  shares: number,
  nav: number | null | undefined,
): number | null {
  if (dayProfit == null) return null;
  const base = calcMarketValue(shares, nav);
  if (base <= 0) return null;
  return roundMoney(dayProfit / base, 6);
}

export function calcProfit(marketValue: number, costAmount: number) {
  return roundMoney(marketValue - costAmount, 4);
}

export function calcProfitRate(profit: number, costAmount: number) {
  if (costAmount <= 0) return 0;
  return roundMoney(profit / costAmount, 6);
}

export function applyBuy(
  shares: number,
  costAmount: number,
  buyShares: number,
  buyAmount: number,
) {
  return {
    shares: roundMoney(shares + buyShares, 4),
    costAmount: roundMoney(costAmount + buyAmount, 4),
  };
}

export function applySell(
  shares: number,
  costAmount: number,
  sellShares: number,
) {
  if (sellShares > shares + 1e-9) {
    throw new Error("卖出份额不能超过持仓份额");
  }
  if (shares === 0) {
    return { shares: 0, costAmount: 0 };
  }
  const ratio = sellShares / shares;
  return {
    shares: roundMoney(shares - sellShares, 4),
    costAmount: roundMoney(costAmount * (1 - ratio), 4),
  };
}

/**
 * 冲销一笔交易对持仓的影响。
 * BUY/SIP：按记账时加入的净金额精确扣回（amount+fee），不用比例卖出，避免成本漂移。
 * SELL：按卖出时减少的份额与（amount-fee）近似加回成本（与历史 DELETE 行为一致的可逆路径）。
 */
export function reverseTransactionEffect(
  shares: number,
  costAmount: number,
  type: string,
  txShares: number,
  amount: number,
  fee: number,
) {
  if (type === "BUY" || type === "SIP") {
    const netAmount = amount + fee;
    const nextShares = roundMoney(shares - txShares, 4);
    if (nextShares < -1e-9) {
      throw new Error("冲销后份额不能为负");
    }
    const nextCost = roundMoney(costAmount - netAmount, 4);
    if (nextCost < -1e-9) {
      throw new Error("冲销后成本不能为负，请检查交易与持仓是否一致");
    }
    return {
      shares: nextShares < 0 ? 0 : nextShares,
      costAmount: nextCost < 0 ? 0 : nextCost,
    };
  }
  if (type === "SELL") {
    const netAmount = amount - fee;
    return applyBuy(shares, costAmount, txShares, netAmount);
  }
  throw new Error(`未知交易类型: ${type}`);
}

/** 应用一笔交易对持仓的影响 */
export function applyTransactionEffect(
  shares: number,
  costAmount: number,
  type: string,
  txShares: number,
  amount: number,
  fee: number,
) {
  if (type === "BUY" || type === "SIP") {
    const netAmount = amount + fee;
    return applyBuy(shares, costAmount, txShares, netAmount);
  }
  if (type === "SELL") {
    return applySell(shares, costAmount, txShares);
  }
  throw new Error(`未知交易类型: ${type}`);
}
