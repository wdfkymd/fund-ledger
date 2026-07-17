import { prisma } from "@/lib/db";
import { fail, ok, withApi } from "@/lib/api";
import { profileUpdateSchema } from "@/lib/validators";

export const GET = withApi(async ({ user }) => ok(user));

export const PATCH = withApi(async ({ user, req }) => {
  const body = await req.json();
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "参数错误");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  return ok(updated);
});
