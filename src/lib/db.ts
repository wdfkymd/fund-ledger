import "dotenv/config";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDbUrl() {
  const raw = process.env.DATABASE_URL ?? "file:./dev.db";
  if (!raw.startsWith("file:")) {
    return raw;
  }
  const filePath = raw.slice("file:".length);
  if (path.isAbsolute(filePath)) {
    return raw;
  }
  return `file:${path.join(process.cwd(), filePath)}`;
}

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({
    url: resolveDbUrl(),
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
