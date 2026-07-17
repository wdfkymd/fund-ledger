import { ok, withApi } from "@/lib/api";
import { getAnalyticsPayload } from "@/lib/analytics-data";

export const GET = withApi(async ({ user }) => {
  const payload = await getAnalyticsPayload(user.id);
  return ok(payload);
});
