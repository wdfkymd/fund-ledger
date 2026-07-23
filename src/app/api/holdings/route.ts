import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { AppError, fail, ok, withApi } from "@/lib/api";
import { holdingCreateSchema } from "@/lib/validators";
import { fetchFundFromEastMoney } from "@/lib/fund-api";
import { getHoldingsPayload } from "@/lib/holdings-data";
import { parseTradeDate } from "@/lib/trade-date";

export const GET = withApi(async ({ user }) => {
  const payload = await getHoldingsPayload(user.id);
  return ok(payload);
});

export const POST = withApi(async ({ user, req }) => {
  const body = await req.json();
  const parsed = holdingCreateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "参数错误");
  }

  const { fundCode, fundName, shares, costPrice, costAmount, note } =
    parsed.data;
  const shareValue = shares ?? 0;
  const totalCost =
    costPrice != null ? shareValue * costPrice : (costAmount ?? 0);
  let fundInfo;
  try {
    fundInfo = await fetchFundFromEastMoney(fundCode);
  } catch (error) {
    if (!fundName?.trim()) {
      throw new AppError(
        error instanceof Error
          ? error.message
          : "无法获取基金信息，请填写基金名称",
      );
    }
    fundInfo = {
      code: fundCode.trim(),
      name: fundName.trim(),
      nav: undefined,
      navDate: undefined,
    };
  }

  const fund = await prisma.fund.upsert({
    where: { code: fundInfo.code },
    create: {
      code: fundInfo.code,
      name: fundName?.trim() || fundInfo.name,
      type: fundInfo.type,
      nav: fundInfo.nav,
      navDate: fundInfo.navDate ? new Date(fundInfo.navDate) : null,
      navChangePct: fundInfo.navChangePct,
      estimateNav: fundInfo.estimateNav,
      estimateChangePct: fundInfo.estimateChangePct,
      estimateTime: fundInfo.estimateTime,
    },
    update: {
      name: fundInfo.name || undefined,
      type: fundInfo.type ?? undefined,
      nav: fundInfo.nav ?? undefined,
      navDate: fundInfo.navDate ? new Date(fundInfo.navDate) : undefined,
      navChangePct: fundInfo.navChangePct ?? undefined,
      estimateNav: fundInfo.estimateNav ?? undefined,
      estimateChangePct: fundInfo.estimateChangePct ?? undefined,
      estimateTime: fundInfo.estimateTime ?? undefined,
    },
  });

  const hasBuy = shareValue > 0 || totalCost > 0;
  const nav = shareValue > 0 ? totalCost / shareValue : 0;
  const tradeDateDt = parsed.data.tradeDate
    ? parseTradeDate(parsed.data.tradeDate)
    : parseTradeDate(new Date().toISOString().slice(0, 10));

  try {
    const holding = await prisma.$transaction(async (tx) => {
      const existing = await tx.holding.findUnique({
        where: {
          userId_fundId: {
            userId: user.id,
            fundId: fund.id,
          },
        },
      });
      if (existing) {
        throw new AppError("该基金已在持仓中");
      }

      const created = await tx.holding.create({
        data: {
          userId: user.id,
          fundId: fund.id,
          shares: shareValue,
          costAmount: totalCost,
          note,
        },
        include: { fund: true },
      });

      if (hasBuy) {
        await tx.transaction.create({
          data: {
            userId: user.id,
            holdingId: created.id,
            type: "BUY",
            amount: totalCost,
            shares: shareValue,
            nav: fundInfo.nav ?? nav,
            fee: 0,
            tradeDate: tradeDateDt,
            note,
          },
        });
      }

      if (fundInfo.nav && fundInfo.navDate) {
        await tx.navHistory.upsert({
          where: {
            fundId_date: {
              fundId: fund.id,
              date: new Date(fundInfo.navDate),
            },
          },
          create: {
            fundId: fund.id,
            nav: fundInfo.nav,
            date: new Date(fundInfo.navDate),
          },
          update: { nav: fundInfo.nav },
        });
      }

      return created;
    });

    return ok(holding, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return fail("该基金已在持仓中");
    }
    throw error;
  }
});
