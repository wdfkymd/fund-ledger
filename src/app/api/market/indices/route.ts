import { ok, withApi } from "@/lib/api";
import { fetchMarketIndices } from "@/lib/market-index";

export const GET = withApi(async () => {
  const indices = await fetchMarketIndices();
  return ok({
    indices,
    updatedAt: new Date().toISOString(),
  });
});
