import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, ok, toErrorMessage, unauthorized } from "@/lib/api";
import { watchlistCreateSchema } from "@/lib/validators";
import { fetchFundFromEastMoney } from "@/lib/fund-api";

export async function GET() {
  try {
    const user = await requireUser();
    const items = await prisma.watchlistItem.findMany({
      where: { userId: user.id },
      include: { fund: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    const holdingFunds = await prisma.holding.findMany({
      where: { userId: user.id },
      select: { fundId: true },
    });
    const holdingFundIds = new Set(holdingFunds.map((h) => h.fundId));

    const data = items.map((item) => ({
      id: item.id,
      note: item.note,
      sortOrder: item.sortOrder,
      isHeld: holdingFundIds.has(item.fundId),
      fund: item.fund,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return ok({ items: data });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return fail(toErrorMessage(error), 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = watchlistCreateSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "参数错误");
    }

    const { fundCode, fundName, note } = parsed.data;

    let fundInfo;
    try {
      fundInfo = await fetchFundFromEastMoney(fundCode);
    } catch (error) {
      if (!fundName?.trim()) {
        return fail(
          error instanceof Error
            ? error.message
            : "无法获取基金信息，请填写基金名称",
        );
      }
      fundInfo = {
        code: fundCode.trim(),
        name: fundName.trim(),
        nav: undefined,
        navDate: undefined,
      };
    }

    const fund = await prisma.fund.upsert({
      where: { code: fundInfo.code },
      create: {
        code: fundInfo.code,
        name: fundName?.trim() || fundInfo.name,
        type: fundInfo.type,
        nav: fundInfo.nav,
        navDate: fundInfo.navDate ? new Date(fundInfo.navDate) : null,
        estimateNav: fundInfo.estimateNav,
        estimateChangePct: fundInfo.estimateChangePct,
        estimateTime: fundInfo.estimateTime,
      },
      update: {
        name: fundName?.trim() || fundInfo.name,
        type: fundInfo.type ?? undefined,
        nav: fundInfo.nav ?? undefined,
        navDate: fundInfo.navDate ? new Date(fundInfo.navDate) : undefined,
        estimateNav: fundInfo.estimateNav ?? undefined,
        estimateChangePct: fundInfo.estimateChangePct ?? undefined,
        estimateTime: fundInfo.estimateTime ?? undefined,
      },
    });

    if (fundInfo.nav && fundInfo.navDate) {
      await prisma.navHistory.upsert({
        where: {
          fundId_date: {
            fundId: fund.id,
            date: new Date(fundInfo.navDate),
          },
        },
        create: {
          fundId: fund.id,
          nav: fundInfo.nav,
          date: new Date(fundInfo.navDate),
        },
        update: { nav: fundInfo.nav },
      });
    }

    const existing = await prisma.watchlistItem.findUnique({
      where: {
        userId_fundId: {
          userId: user.id,
          fundId: fund.id,
        },
      },
    });
    if (existing) {
      return fail("该基金已在自选中");
    }

    const item = await prisma.watchlistItem.create({
      data: {
        userId: user.id,
        fundId: fund.id,
        note,
      },
      include: { fund: true },
    });

    return ok(item, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return fail(toErrorMessage(error), 500);
  }
}
