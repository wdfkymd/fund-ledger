import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, ok, toErrorMessage, unauthorized } from "@/lib/api";
import { applyBuy, applySell } from "@/lib/finance";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const tx = await prisma.transaction.findFirst({
      where: { id, userId: user.id },
      include: { holding: true },
    });
    if (!tx) {
      return fail("交易记录不存在", 404);
    }

    let nextShares = tx.holding.shares;
    let nextCost = tx.holding.costAmount;

    if (tx.type === "BUY" || tx.type === "SIP") {
      const result = applySell(tx.holding.shares, tx.holding.costAmount, tx.shares);
      nextShares = result.shares;
      nextCost = result.costAmount;
    } else if (tx.type === "SELL") {
      const netAmount = tx.amount - tx.fee;
      const result = applyBuy(
        tx.holding.shares,
        tx.holding.costAmount,
        tx.shares,
        netAmount,
      );
      nextShares = result.shares;
      nextCost = result.costAmount;
    }

    await prisma.$transaction([
      prisma.transaction.delete({ where: { id } }),
      prisma.holding.update({
        where: { id: tx.holdingId },
        data: {
          shares: nextShares,
          costAmount: nextCost,
        },
      }),
    ]);

    return ok({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return fail(toErrorMessage(error), 500);
  }
}
