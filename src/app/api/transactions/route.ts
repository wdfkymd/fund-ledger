import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, ok, toErrorMessage, unauthorized } from "@/lib/api";
import { transactionCreateSchema } from "@/lib/validators";
import { applyBuy, applySell } from "@/lib/finance";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const holdingId = req.nextUrl.searchParams.get("holdingId") ?? undefined;
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        ...(holdingId ? { holdingId } : {}),
      },
      include: {
        holding: { include: { fund: true } },
      },
      orderBy: { tradeDate: "desc" },
    });
    return ok(transactions);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return fail(toErrorMessage(error), 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = transactionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "参数错误");
    }

    const { holdingId, type, amount, shares, nav, fee, tradeDate, note } =
      parsed.data;

    const holding = await prisma.holding.findFirst({
      where: { id: holdingId, userId: user.id },
    });
    if (!holding) {
      return fail("持仓不存在", 404);
    }

    const netAmount = type === "SELL" ? amount - fee : amount + fee;
    let nextShares = holding.shares;
    let nextCost = holding.costAmount;

    if (type === "BUY" || type === "SIP") {
      const result = applyBuy(holding.shares, holding.costAmount, shares, netAmount);
      nextShares = result.shares;
      nextCost = result.costAmount;
    } else {
      const result = applySell(holding.shares, holding.costAmount, shares);
      nextShares = result.shares;
      nextCost = result.costAmount;
    }

    const [transaction] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId: user.id,
          holdingId,
          type,
          amount,
          shares,
          nav,
          fee,
          tradeDate: new Date(tradeDate),
          note,
        },
      }),
      prisma.holding.update({
        where: { id: holdingId },
        data: {
          shares: nextShares,
          costAmount: nextCost,
        },
      }),
    ]);

    return ok(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return fail(toErrorMessage(error), 500);
  }
}
