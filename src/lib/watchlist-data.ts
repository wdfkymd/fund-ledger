import { prisma } from "@/lib/db"

export type WatchlistItem = {
  id: string
  note: string | null
  sortOrder: number
  isHeld: boolean
  fund: {
    id: string
    code: string
    name: string
    nav: number | null
    estimateNav: number | null
    estimateChangePct: number | null
    estimateTime: string | null
  }
  createdAt: string
  updatedAt: string
}

export type WatchlistPayload = {
  items: WatchlistItem[]
}

export async function getWatchlistPayload(
  userId: string,
): Promise<WatchlistPayload> {
  const [items, holdingFunds] = await Promise.all([
    prisma.watchlistItem.findMany({
      where: { userId },
      include: { fund: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.holding.findMany({
      where: { userId },
      select: { fundId: true },
    }),
  ])

  const holdingFundIds = new Set(holdingFunds.map((h) => h.fundId))

  return {
    items: items.map((item) => ({
      id: item.id,
      note: item.note,
      sortOrder: item.sortOrder,
      isHeld: holdingFundIds.has(item.fundId),
      fund: {
        id: item.fund.id,
        code: item.fund.code,
        name: item.fund.name,
        nav: item.fund.nav,
        estimateNav: item.fund.estimateNav,
        estimateChangePct: item.fund.estimateChangePct,
        estimateTime: item.fund.estimateTime,
      },
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  }
}
