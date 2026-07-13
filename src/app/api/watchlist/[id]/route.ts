import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, ok, toErrorMessage, unauthorized } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const item = await prisma.watchlistItem.findFirst({
      where: { id, userId: user.id },
    });
    if (!item) {
      return fail("自选不存在", 404);
    }

    await prisma.watchlistItem.delete({ where: { id: item.id } });
    return ok({ id: item.id });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return fail(toErrorMessage(error), 500);
  }
}
