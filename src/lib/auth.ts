import { cache } from "react";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export { SESSION_COOKIE_NAME };
const COOKIE_NAME = SESSION_COOKIE_NAME;
const SESSION_DAYS = 7;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) throw new Error("用户不存在");
  // 用 passwordHash 前 16 字符作为 sessionVersion，改密则旧 token 失效
  const sessionVer = user.passwordHash.slice(0, 16);
  return new SignJWT({ sub: userId, ver: sessionVer })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string") return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { passwordHash: true },
    });
    if (!user) return null;
    const sessionVer = user.passwordHash.slice(0, 16);
    if (payload.ver !== sessionVer) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/**
 * 当前登录用户（同请求内 React cache 去重）。
 * 未登录返回 null，不抛错。
 */
export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  try {
    const userId = await verifySessionToken(token);
    if (!userId) {
      return null;
    }
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  } catch {
    return null;
  }
});

/**
 * 要求已登录；否则抛 UNAUTHORIZED（供 API/RSC 捕获）。
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
