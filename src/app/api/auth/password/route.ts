import { prisma } from "@/lib/db";
import {
  clearSessionCookie,
  createSessionToken,
  hashPassword,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { fail, ok, unauthorized, withApi } from "@/lib/api";
import { passwordChangeSchema } from "@/lib/validators";

export const POST = withApi(async ({ user: sessionUser, req }) => {
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

  // 改密后 passwordHash 变，旧 token sessionVer 不匹配 → 所有设备自动登出
  await clearSessionCookie();
  const token = await createSessionToken(user.id);
  await setSessionCookie(token);

  return ok({ success: true });
});
