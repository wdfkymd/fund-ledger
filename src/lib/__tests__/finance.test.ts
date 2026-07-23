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

import {
  applySell,
  applyBuy,
  rebuildHoldingFromTransactions,
  isNavSettled,
  buyNetAmount,
} from "@/lib/finance"
import { todayCST, parseTradeDate } from "@/lib/trade-date"

describe("todayCST / parseTradeDate", () => {
  it("todayCST is YYYY-MM-DD", () => {
    expect(todayCST()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it("parseTradeDate stores UTC noon", () => {
    const d = parseTradeDate("2026-07-23")
    expect(d.toISOString()).toBe("2026-07-23T12:00:00.000Z")
  })
  it("rejects invalid calendar dates", () => {
    expect(() => parseTradeDate("2026-02-31")).toThrow()
  })
})

describe("ledger rebuild", () => {
  it("buy then partial sell uses average cost", () => {
    const state = rebuildHoldingFromTransactions([
      {
        id: "1",
        type: "BUY",
        amount: 1000,
        shares: 1000,
        fee: 0,
        tradeDate: "2026-01-01",
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "2",
        type: "SELL",
        amount: 600,
        shares: 500,
        fee: 0,
        tradeDate: "2026-01-02",
        createdAt: "2026-01-02T00:00:00Z",
      },
    ])
    expect(state.shares).toBe(500)
    expect(state.costAmount).toBe(500) // half of 1000
  })

  it("rejects oversell", () => {
    expect(() =>
      rebuildHoldingFromTransactions([
        {
          type: "BUY",
          amount: 100,
          shares: 10,
          fee: 0,
          tradeDate: "2026-01-01",
        },
        {
          type: "SELL",
          amount: 50,
          shares: 20,
          fee: 0,
          tradeDate: "2026-01-02",
        },
      ]),
    ).toThrow(/卖出份额/)
  })

  it("applyBuy adds fee into cost", () => {
    const s = applyBuy(0, 0, 100, buyNetAmount(1000, 10))
    expect(s.shares).toBe(100)
    expect(s.costAmount).toBe(1010)
  })

  it("applySell clears cost when all sold", () => {
    const s = applySell(100, 500, 100)
    expect(s.shares).toBe(0)
    expect(s.costAmount).toBe(0)
  })
})

describe("isNavSettled timezone", () => {
  it("navDate equal todayCST => settled", () => {
    const now = new Date("2026-07-23T04:00:00.000Z") // CST 12:00
    // force todayCST for that now
    const today = todayCST(now)
    expect(isNavSettled(today, null, now)).toBe(true)
  })

  it("weekday session with estimate today => not settled (估值中)", () => {
    // 2026-07-23 is Thursday
    const now = new Date("2026-07-23T04:00:00.000Z") // 12:00 CST
    const today = todayCST(now)
    expect(isNavSettled("2026-07-22", `${today} 11:00`, now)).toBe(false)
  })

  it("after 15:00 CST => settled even without navDate today", () => {
    const now = new Date("2026-07-23T08:00:00.000Z") // 16:00 CST
    expect(isNavSettled("2026-07-22", null, now)).toBe(true)
  })
})
