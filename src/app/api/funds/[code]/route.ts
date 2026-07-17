import { AppError, fail, ok, withApi } from "@/lib/api";
import {
  FundDetailError,
  getFundDetailPayload,
} from "@/lib/fund-detail-data";

type RouteCtx = { params: Promise<{ code: string }> };

export const GET = withApi<RouteCtx>(async ({ user, req, routeCtx }) => {
  const { code } = await routeCtx!.params;
  const url = new URL(req.url);
  const refresh = url.searchParams.get("refresh") === "1";
  const daysParam = Number(url.searchParams.get("days") ?? "90");
  const days = Number.isFinite(daysParam) ? daysParam : 90;

  try {
    const payload = await getFundDetailPayload(user.id, code, {
      refresh,
      days,
    });
    return ok(payload);
  } catch (error) {
    if (error instanceof FundDetailError) {
      if (error.status === 404) {
        throw new AppError(error.message, 404);
      }
      return fail(error.message);
    }
    throw error;
  }
});
