export function roundMoney(value: number, digits = 4) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function calcMarketValue(shares: number, nav: number | null | undefined) {
  if (!nav) return 0;
  return roundMoney(shares * nav, 4);
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
  if (sellShares > shares) {
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
