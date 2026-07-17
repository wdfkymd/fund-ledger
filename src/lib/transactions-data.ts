import { prisma } from "@/lib/db"

export type TransactionListItem = {
  id: string
  type: string
  amount: number
  shares: number
  nav: number
  fee: number
  tradeDate: string
  note: string | null
  holdingId: string
  holding: { fund: { name: string; code: string } }
}

export type HoldingOption = {
  id: string
  shares: number
  fund: { name: string; code: string }
}

export type TransactionsPagePayload = {
  transactions: TransactionListItem[]
  holdings: HoldingOption[]
}

export async function getTransactionsList(
  userId: string,
  opts?: { holdingId?: string; limit?: number },
): Promise<TransactionListItem[]> {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      ...(opts?.holdingId ? { holdingId: opts.holdingId } : {}),
    },
    include: {
      holding: { include: { fund: true } },
    },
    orderBy: [{ tradeDate: "desc" }, { createdAt: "desc" }],
    ...(opts?.limit ? { take: opts.limit } : {}),
  })

  return transactions.map((tx) => ({
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    shares: tx.shares,
    nav: tx.nav,
    fee: tx.fee,
    tradeDate: tx.tradeDate.toISOString(),
    note: tx.note,
    holdingId: tx.holdingId,
    holding: {
      fund: {
        name: tx.holding.fund.name,
        code: tx.holding.fund.code,
      },
    },
  }))
}

export async function getTransactionsPagePayload(
  userId: string,
): Promise<TransactionsPagePayload> {
  const [transactions, holdings] = await Promise.all([
    getTransactionsList(userId),
    prisma.holding.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        shares: true,
        fund: { select: { name: true, code: true } },
      },
    }),
  ])

  return { transactions, holdings }
}
