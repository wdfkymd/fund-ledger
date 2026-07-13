import { requireUser } from "@/lib/auth";
import { fail, ok, toErrorMessage, unauthorized } from "@/lib/api";
import { fetchMarketIndices } from "@/lib/market-index";

export async function GET() {
  try {
    await requireUser();
    const indices = await fetchMarketIndices();
    return ok({
      indices,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return fail(toErrorMessage(error), 500);
  }
}
