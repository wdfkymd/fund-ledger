import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, ok, toErrorMessage, unauthorized } from "@/lib/api";

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
        sipPlans: { orderBy: { createdAt: "desc" } },
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
