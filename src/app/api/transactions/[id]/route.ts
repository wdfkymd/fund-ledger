import { prisma } from "@/lib/db";
import { AppError, fail, ok, withApi } from "@/lib/api";
import { transactionUpdateSchema } from "@/lib/validators";
import { parseTradeDate } from "@/lib/trade-date";
import { syncHoldingFromLedger } from "@/lib/holding-ledger";

type RouteCtx = { params: Promise<{ id: string }> };

export const PATCH = withApi<RouteCtx>(async ({ user, req, routeCtx }) => {
  const { id } = await routeCtx!.params;
  const body = await req.json();
  const parsed = transactionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "参数错误");
  }

  const tx = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
  });
  if (!tx) {
    throw new AppError("交易记录不存在", 404);
  }

  const data = parsed.data;
  if (
    data.type === undefined &&
    data.amount === undefined &&
    data.shares === undefined &&
    data.nav === undefined &&
    data.fee === undefined &&
    data.tradeDate === undefined &&
    data.note === undefined
  ) {
    return fail("请至少提供一个要修改的字段");
  }

  const nextTradeDate = data.tradeDate
    ? parseTradeDate(data.tradeDate)
    : undefined;

  const [transaction] = await prisma.$transaction(async (txDb) => {
    const updated = await txDb.transaction.update({
      where: { id },
      data: {
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
        ...(data.shares !== undefined ? { shares: data.shares } : {}),
        ...(data.nav !== undefined ? { nav: data.nav } : {}),
        ...(data.fee !== undefined ? { fee: data.fee } : {}),
        ...(nextTradeDate !== undefined ? { tradeDate: nextTradeDate } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
      },
      include: {
        holding: { include: { fund: true } },
      },
    });

    await syncHoldingFromLedger(txDb, tx.holdingId, user.id);

    return [updated];
  });

  return ok(transaction);
});

export const DELETE = withApi<RouteCtx>(async ({ user, routeCtx }) => {
  const { id } = await routeCtx!.params;

  const tx = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
  });
  if (!tx) {
    throw new AppError("交易记录不存在", 404);
  }

  await prisma.$transaction(async (txDb) => {
    await txDb.transaction.delete({ where: { id } });
    await syncHoldingFromLedger(txDb, tx.holdingId, user.id);
  });

  return ok({ success: true });
});
