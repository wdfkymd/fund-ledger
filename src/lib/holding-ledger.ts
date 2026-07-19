import type { Prisma } from "@/generated/prisma/client"
import { AppError } from "@/lib/api"
import {
  rebuildHoldingFromTransactions,
  type LedgerTx,
} from "@/lib/finance"

export type LedgerWriteClient = Prisma.TransactionClient

/** 在事务内按流水重算并写回持仓份额/成本 */
export async function syncHoldingFromLedger(
  db: LedgerWriteClient,
  holdingId: string,
  userId: string,
) {
  const holding = await db.holding.findFirst({
    where: { id: holdingId, userId },
  })
  if (!holding) {
    throw new AppError("持仓不存在", 404)
  }

  const rows = await db.transaction.findMany({
    where: { holdingId, userId },
    select: {
      id: true,
      type: true,
      amount: true,
      shares: true,
      fee: true,
      tradeDate: true,
      createdAt: true,
    },
  })

  const ledger: LedgerTx[] = rows.map((r) => ({
    id: r.id,
    type: r.type,
    amount: r.amount,
    shares: r.shares,
    fee: r.fee,
    tradeDate: r.tradeDate,
    createdAt: r.createdAt,
  }))

  let next
  try {
    next = rebuildHoldingFromTransactions(ledger)
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "持仓重算失败",
      400,
    )
  }

  return db.holding.update({
    where: { id: holdingId, userId },
    data: {
      shares: next.shares,
      costAmount: next.costAmount,
    },
  })
}
