import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fail, withApi } from "@/lib/api";
import { csvFilename, toCsv } from "@/lib/csv";
import {
  calcEstimateValue,
  calcMarketValue,
  calcProfit,
  calcProfitRate,
  roundMoney,
} from "@/lib/finance";

function csvResponse(body: string, filename: string) {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export const GET = withApi(async ({ user, req }) => {
  const type = (new URL(req.url).searchParams.get("type") ?? "").trim();

  if (type === "holdings") {
    const holdings = await prisma.holding.findMany({
      where: { userId: user.id },
      include: { fund: true },
      orderBy: { updatedAt: "desc" },
    });

    const headers = [
      "基金代码",
      "基金名称",
      "份额",
      "成本金额",
      "成本价",
      "单位净值",
      "估值净值",
      "市值",
      "估值市值",
      "盈亏",
      "收益率%",
      "估值盈亏",
      "估值收益率%",
      "备注",
      "更新时间",
    ];

    const rows = holdings.map((h) => {
      const costPrice =
        h.shares > 0 ? roundMoney(h.costAmount / h.shares, 6) : "";
      const marketValue = calcMarketValue(h.shares, h.fund.nav);
      const estimateValue = calcEstimateValue(
        h.shares,
        h.fund.estimateNav,
        h.fund.nav,
      );
      const profit = calcProfit(marketValue, h.costAmount);
      const estimateProfit = calcProfit(estimateValue, h.costAmount);
      return [
        h.fund.code,
        h.fund.name,
        h.shares,
        roundMoney(h.costAmount, 4),
        costPrice,
        h.fund.nav ?? "",
        h.fund.estimateNav ?? "",
        marketValue,
        estimateValue,
        profit,
        roundMoney((calcProfitRate(profit, h.costAmount) ?? 0) * 100, 4),
        estimateProfit,
        roundMoney((calcProfitRate(estimateProfit, h.costAmount) ?? 0) * 100, 4),
        h.note ?? "",
        h.updatedAt.toISOString(),
      ];
    });

    return csvResponse(toCsv(headers, rows), csvFilename("fund-ledger-holdings"));
  }

  if (type === "transactions") {
    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      include: { holding: { include: { fund: true } } },
      orderBy: { tradeDate: "desc" },
    });

    const typeLabel: Record<string, string> = {
      BUY: "买入",
      SELL: "卖出",
      SIP: "定投",
    };

    const headers = [
      "交易日期",
      "类型",
      "基金代码",
      "基金名称",
      "金额",
      "份额",
      "净值",
      "手续费",
      "备注",
      "创建时间",
    ];

    const rows = transactions.map((t) => [
      t.tradeDate.toISOString().slice(0, 10),
      typeLabel[t.type] ?? t.type,
      t.holding.fund.code,
      t.holding.fund.name,
      t.amount,
      t.shares,
      t.nav,
      t.fee,
      t.note ?? "",
      t.createdAt.toISOString(),
    ]);

    return csvResponse(
      toCsv(headers, rows),
      csvFilename("fund-ledger-transactions"),
    );
  }

  if (type === "watchlist") {
    const items = await prisma.watchlistItem.findMany({
      where: { userId: user.id },
      include: { fund: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    const headers = [
      "基金代码",
      "基金名称",
      "单位净值",
      "估值净值",
      "估算涨跌幅%",
      "估值时间",
      "备注",
      "添加时间",
    ];

    const rows = items.map((w) => [
      w.fund.code,
      w.fund.name,
      w.fund.nav ?? "",
      w.fund.estimateNav ?? "",
      w.fund.estimateChangePct ?? "",
      w.fund.estimateTime ?? "",
      w.note ?? "",
      w.createdAt.toISOString(),
    ]);

    return csvResponse(
      toCsv(headers, rows),
      csvFilename("fund-ledger-watchlist"),
    );
  }

  return fail("请指定 type=holdings|transactions|watchlist");
});
