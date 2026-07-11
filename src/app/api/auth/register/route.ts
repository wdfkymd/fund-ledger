import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  createSessionToken,
  hashPassword,
  setSessionCookie,
} from "@/lib/auth";
import { fail, ok, toErrorMessage } from "@/lib/api";
import { registerSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "参数错误");
    }

    const { email, password, name } = parsed.data;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return fail("该邮箱已注册");
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name ?? email.split("@")[0],
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    const token = await createSessionToken(user.id);
    await setSessionCookie(token);

    return ok(user, { status: 201 });
  } catch (error) {
    return fail(toErrorMessage(error), 500);
  }
}
