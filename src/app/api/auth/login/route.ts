import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  createSessionToken,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { fail, ok, toErrorMessage } from "@/lib/api";
import { loginSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "参数错误");
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return fail("邮箱或密码错误", 401);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return fail("邮箱或密码错误", 401);
    }

    const token = await createSessionToken(user.id);
    await setSessionCookie(token);

    return ok({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    });
  } catch (error) {
    return fail(toErrorMessage(error), 500);
  }
}
