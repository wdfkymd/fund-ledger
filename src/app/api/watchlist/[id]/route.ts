import { prisma } from "@/lib/db";
import { AppError, ok, withApi } from "@/lib/api";

type RouteCtx = { params: Promise<{ id: string }> };

export const DELETE = withApi<RouteCtx>(async ({ user, routeCtx }) => {
  const { id } = await routeCtx!.params;

  const item = await prisma.watchlistItem.findFirst({
    where: { id, userId: user.id },
  });
  if (!item) {
    throw new AppError("自选不存在", 404);
  }

  await prisma.watchlistItem.delete({ where: { id: item.id } });
  return ok({ id: item.id });
});
