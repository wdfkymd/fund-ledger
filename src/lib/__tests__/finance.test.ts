import { describe, expect, it } from "vitest"
import {
  calcDayProfit,
  calcDayProfitRate,
  calcEstimateValue,
  calcMarketValue,
  calcProfit,
  calcProfitRate,
  roundMoney,
} from "@/lib/finance"

describe("roundMoney", () => {
  it("rounds to 4 digits by default", () => {
    expect(roundMoney(1.23456)).toBe(1.2346)
  })
})

describe("calcMarketValue", () => {
  it("multiplies shares by nav", () => {
    expect(calcMarketValue(100, 1.417)).toBe(141.7)
  })
  it("returns 0 when nav is null/undefined/0", () => {
    expect(calcMarketValue(100, null)).toBe(0)
    expect(calcMarketValue(100, undefined)).toBe(0)
    expect(calcMarketValue(100, 0)).toBe(0)
  })
})

describe("calcEstimateValue", () => {
  it("prefers estimateNav over nav", () => {
    expect(calcEstimateValue(100, 1.5, 1.4)).toBe(150)
  })
  it("falls back to nav when estimate missing", () => {
    expect(calcEstimateValue(100, null, 1.4)).toBe(140)
  })
})

describe("calcProfit / calcProfitRate", () => {
  it("profit is market - cost", () => {
    expect(calcProfit(150, 100)).toBe(50)
  })
  it("profitRate null when cost <= 0", () => {
    expect(calcProfitRate(10, 0)).toBeNull()
    expect(calcProfitRate(10, -1)).toBeNull()
  })
  it("profitRate is profit/cost", () => {
    expect(calcProfitRate(50, 100)).toBe(0.5)
  })
})

describe("calcDayProfit — field semantics", () => {
  const shares = 1000
  const nav = 1.417

  it("uses estimateNav - nav when estimate present (盘中估值)", () => {
    // 估值 1.43 vs 净值 1.417
    expect(calcDayProfit(shares, 1.43, nav, -1.0, -1.94)).toBe(
      roundMoney(shares * (1.43 - nav), 4),
    )
  })

  it("uses estimateChangePct when no estimateNav but gszzl present", () => {
    // 仅盘中涨跌 -0.5%
    expect(calcDayProfit(shares, null, nav, -0.5, -1.94)).toBe(
      roundMoney(shares * nav * (-0.5 / 100), 4),
    )
  })

  it("uses navChangePct (日涨跌) when no estimate fields", () => {
    // JZZZL -1.94% only
    expect(calcDayProfit(shares, null, nav, null, -1.94)).toBe(
      roundMoney(shares * nav * (-1.94 / 100), 4),
    )
    expect(calcDayProfit(shares, null, nav, null, -1.94)).toBe(-27.4898)
  })

  it("does not treat missing estimate as day change unless navChangePct passed", () => {
    expect(calcDayProfit(shares, null, nav, null, null)).toBeNull()
    expect(calcDayProfit(shares, null, nav, undefined, undefined)).toBeNull()
  })

  it("returns null for non-positive shares", () => {
    expect(calcDayProfit(0, 1.5, nav, null, -1.94)).toBeNull()
    expect(calcDayProfit(-10, 1.5, nav, null, -1.94)).toBeNull()
  })

  it("dayProfitRate is dayProfit / (shares*nav)", () => {
    const dp = calcDayProfit(shares, null, nav, null, -1.94)
    expect(dp).not.toBeNull()
    const rate = calcDayProfitRate(dp, shares, nav)
    expect(rate).toBe(roundMoney(dp! / (shares * nav), 6))
    expect(rate).toBe(-0.0194)
  })
})
