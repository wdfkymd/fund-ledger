import { prisma } from "@/lib/db";
import { AppError, fail, ok, withApi } from "@/lib/api";
import { holdingUpdateSchema } from "@/lib/validators";

type RouteCtx = { params: Promise<{ id: string }> };

export const GET = withApi<RouteCtx>(async ({ user, routeCtx }) => {
  const { id } = await routeCtx!.params;
  const holding = await prisma.holding.findFirst({
    where: { id, userId: user.id },
    include: {
      fund: true,
      transactions: { orderBy: { tradeDate: "desc" } },
    },
  });
  if (!holding) {
    throw new AppError("持仓不存在", 404);
  }
  return ok(holding);
});

export const PATCH = withApi<RouteCtx>(async ({ user, req, routeCtx }) => {
  const { id } = await routeCtx!.params;
  const body = await req.json();
  const parsed = holdingUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "参数错误");
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.note !== undefined) {
    data.note = parsed.data.note;
  }

  if (Object.keys(data).length === 0) {
    return fail("请至少提供一个要修改的字段");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const holding = await tx.holding.findFirst({
      where: { id, userId: user.id },
    });
    if (!holding) {
      throw new AppError("持仓不存在", 404);
    }

    return tx.holding.update({
      where: { id, userId: user.id },
      data,
      include: { fund: true },
    });
  });

  return ok(updated);
});

export const DELETE = withApi<RouteCtx>(async ({ user, routeCtx }) => {
  const { id } = await routeCtx!.params;
  await prisma.$transaction(async (tx) => {
    const holding = await tx.holding.findFirst({
      where: { id, userId: user.id },
    });
    if (!holding) {
      throw new AppError("持仓不存在", 404);
    }
    await tx.transaction.deleteMany({ where: { holdingId: id, userId: user.id } });
    await tx.holding.delete({ where: { id, userId: user.id } });
  });
  return ok({ success: true });
});
