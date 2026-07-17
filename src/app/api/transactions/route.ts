import { prisma } from "@/lib/db";
import { AppError, fail, ok, withApi } from "@/lib/api";
import { transactionCreateSchema } from "@/lib/validators";
import { parseTradeDate } from "@/lib/trade-date";
import { syncHoldingFromLedger } from "@/lib/holding-ledger";
import { getTransactionsList } from "@/lib/transactions-data";

export const GET = withApi(async ({ user, req }) => {
  const url = new URL(req.url);
  const holdingId = url.searchParams.get("holdingId") ?? undefined;
  const limitRaw = url.searchParams.get("limit");
  const limit =
    limitRaw != null
      ? Math.min(Math.max(parseInt(limitRaw, 10) || 0, 0), 100)
      : undefined;

  const transactions = await getTransactionsList(user.id, {
    holdingId,
    limit,
  });
  return ok(transactions);
});

export const POST = withApi(async ({ user, req }) => {
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
    throw new AppError("持仓不存在", 404);
  }

  const tradeDateDt = parseTradeDate(tradeDate);

  const [transaction] = await prisma.$transaction(async (tx) => {
    const created = await tx.transaction.create({
      data: {
        userId: user.id,
        holdingId,
        type,
        amount,
        shares,
        nav,
        fee,
        tradeDate: tradeDateDt,
        note,
      },
    });

    await syncHoldingFromLedger(tx, holdingId, user.id);

    return [created];
  });

  return ok(transaction, { status: 201 });
});
