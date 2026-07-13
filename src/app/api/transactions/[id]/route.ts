import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, ok, toErrorMessage, unauthorized } from "@/lib/api";
import { transactionUpdateSchema } from "@/lib/validators";
import {
  applyTransactionEffect,
  reverseTransactionEffect,
} from "@/lib/finance";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const parsed = transactionUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "参数错误");
    }

    const tx = await prisma.transaction.findFirst({
      where: { id, userId: user.id },
      include: { holding: true },
    });
    if (!tx) {
      return fail("交易记录不存在", 404);
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

    const nextType = data.type ?? tx.type;
    const nextAmount = data.amount ?? tx.amount;
    const nextShares = data.shares ?? tx.shares;
    const nextNav = data.nav ?? tx.nav;
    const nextFee = data.fee ?? tx.fee;
    const nextTradeDate = data.tradeDate
      ? new Date(data.tradeDate)
      : tx.tradeDate;
    const nextNote = data.note !== undefined ? data.note : tx.note;

    // 1) reverse old effect  2) apply new effect
    const afterReverse = reverseTransactionEffect(
      tx.holding.shares,
      tx.holding.costAmount,
      tx.type,
      tx.shares,
      tx.amount,
      tx.fee,
    );
    const afterApply = applyTransactionEffect(
      afterReverse.shares,
      afterReverse.costAmount,
      nextType,
      nextShares,
      nextAmount,
      nextFee,
    );

    const [transaction] = await prisma.$transaction([
      prisma.transaction.update({
        where: { id },
        data: {
          type: nextType,
          amount: nextAmount,
          shares: nextShares,
          nav: nextNav,
          fee: nextFee,
          tradeDate: nextTradeDate,
          note: nextNote,
        },
        include: {
          holding: { include: { fund: true } },
        },
      }),
      prisma.holding.update({
        where: { id: tx.holdingId },
        data: {
          shares: afterApply.shares,
          costAmount: afterApply.costAmount,
        },
      }),
    ]);

    return ok(transaction);
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

    const tx = await prisma.transaction.findFirst({
      where: { id, userId: user.id },
      include: { holding: true },
    });
    if (!tx) {
      return fail("交易记录不存在", 404);
    }

    const next = reverseTransactionEffect(
      tx.holding.shares,
      tx.holding.costAmount,
      tx.type,
      tx.shares,
      tx.amount,
      tx.fee,
    );

    await prisma.$transaction([
      prisma.transaction.delete({ where: { id } }),
      prisma.holding.update({
        where: { id: tx.holdingId },
        data: {
          shares: next.shares,
          costAmount: next.costAmount,
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
