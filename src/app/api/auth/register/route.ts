import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import {
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { fail, ok, toErrorMessage } from "@/lib/api";
import { registerSchema } from "@/lib/validators";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    // 个人部署默认关注册；需要时 .env 设 ALLOW_REGISTER=1
    if (process.env.ALLOW_REGISTER !== "1") {
      return fail("注册已关闭", 403, undefined, "REGISTER_DISABLED");
    }
    const rl = rateLimit(clientKey(req, "register"), 5, 60000);
    if (!rl.ok) {
      return fail("注册过于频繁，请稍后再试", 429, { retryAfterSec: rl.retryAfterSec });
    }

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
        avatarUrl: true,
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
