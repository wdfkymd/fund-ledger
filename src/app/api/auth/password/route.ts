import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  clearSessionCookie,
  createSessionToken,
  hashPassword,
  requireUser,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { fail, ok, toErrorMessage, unauthorized } from "@/lib/api";
import { passwordChangeSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireUser();
    const body = await req.json();
    const parsed = passwordChangeSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "参数错误");
    }

    const { currentPassword, newPassword } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
    });
    if (!user) {
      return unauthorized();
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      return fail("当前密码不正确", 401);
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // 换新会话，避免旧 cookie 长期有效感；本实现为单 token 无服务端吊销列表
    await clearSessionCookie();
    const token = await createSessionToken(user.id);
    await setSessionCookie(token);

    return ok({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorized();
    }
    return fail(toErrorMessage(error), 500);
  }
}
