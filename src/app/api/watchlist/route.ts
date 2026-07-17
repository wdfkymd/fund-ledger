import { prisma } from "@/lib/db";
import { AppError, fail, ok, withApi } from "@/lib/api";
import { watchlistCreateSchema } from "@/lib/validators";
import { fetchFundFromEastMoney } from "@/lib/fund-api";
import { getWatchlistPayload } from "@/lib/watchlist-data";

export const GET = withApi(async ({ user }) => {
  const payload = await getWatchlistPayload(user.id);
  return ok(payload);
});

export const POST = withApi(async ({ user, req }) => {
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
      throw new AppError(
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
      name: fundInfo.name || undefined,
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
    throw new AppError("该基金已在自选中");
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
});
