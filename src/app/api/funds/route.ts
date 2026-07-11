import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, ok, toErrorMessage, unauthorized } from "@/lib/api";
import {
  fetchFundFromEastMoney,
  searchFundsFromEastMoney,
} from "@/lib/fund-api";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const keyword = req.nextUrl.searchParams.get("q") ?? "";
    const code = req.nextUrl.searchParams.get("code") ?? "";

    if (code) {
      const info = await fetchFundFromEastMoney(code);
      return ok(info);
    }

    if (keyword) {
      const list = await searchFundsFromEastMoney(keyword);
      return ok(list);
    }

    return fail("请提供 q 或 code 参数");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return fail(toErrorMessage(error), 500);
  }
}

export async function POST() {
  try {
    const user = await requireUser();
    const holdings = await prisma.holding.findMany({
      where: { userId: user.id },
      include: { fund: true },
    });

    const results = [];
    for (const holding of holdings) {
      try {
        const info = await fetchFundFromEastMoney(holding.fund.code);
        const updated = await prisma.fund.update({
          where: { id: holding.fundId },
          data: {
            name: info.name || holding.fund.name,
            nav: info.nav,
            navDate: info.navDate ? new Date(info.navDate) : holding.fund.navDate,
          },
        });

        if (info.nav && info.navDate) {
          await prisma.navHistory.upsert({
            where: {
              fundId_date: {
                fundId: holding.fundId,
                date: new Date(info.navDate),
              },
            },
            create: {
              fundId: holding.fundId,
              nav: info.nav,
              date: new Date(info.navDate),
            },
            update: { nav: info.nav },
          });
        }

        results.push({ fundId: holding.fundId, ok: true, fund: updated });
      } catch (error) {
        results.push({
          fundId: holding.fundId,
          ok: false,
          error: error instanceof Error ? error.message : "更新失败",
        });
      }
    }

    return ok(results);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return fail(toErrorMessage(error), 500);
  }
}
