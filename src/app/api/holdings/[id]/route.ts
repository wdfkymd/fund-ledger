import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, ok, toErrorMessage, unauthorized } from "@/lib/api";
import { holdingUpdateSchema } from "@/lib/validators";
import { roundMoney } from "@/lib/finance";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const holding = await prisma.holding.findFirst({
      where: { id, userId: user.id },
      include: {
        fund: true,
        transactions: { orderBy: { tradeDate: "desc" } },
      },
    });
    if (!holding) {
      return fail("持仓不存在", 404);
    }
    return ok(holding);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return fail(toErrorMessage(error), 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const parsed = holdingUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "参数错误");
    }

    const holding = await prisma.holding.findFirst({
      where: { id, userId: user.id },
    });
    if (!holding) {
      return fail("持仓不存在", 404);
    }

    const data = parsed.data;
    const nextShares =
      data.shares !== undefined ? roundMoney(data.shares, 4) : holding.shares;

    let nextCost = holding.costAmount;
    if (data.costPrice !== undefined) {
      nextCost = roundMoney(nextShares * data.costPrice, 4);
    } else if (data.costAmount !== undefined) {
      nextCost = roundMoney(data.costAmount, 4);
    }

    const updated = await prisma.holding.update({
      where: { id },
      data: {
        shares: nextShares,
        costAmount: nextCost,
        ...(data.note !== undefined ? { note: data.note } : {}),
      },
      include: { fund: true },
    });

    return ok(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return fail(toErrorMessage(error), 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const holding = await prisma.holding.findFirst({
      where: { id, userId: user.id },
    });
    if (!holding) {
      return fail("持仓不存在", 404);
    }
    await prisma.holding.delete({ where: { id } });
    return ok({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return fail(toErrorMessage(error), 500);
  }
}
