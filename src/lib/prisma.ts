import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma 无引擎模式（driverAdapters）：
 * EdgeOne 函数运行时无法加载 Prisma 原生引擎二进制，
 * 因此查询全部经 @prisma/adapter-pg（纯 JS pg 驱动）执行。
 */

/** 构建标记：/api/health 回显，用于判断线上代码版本 */
export const PRISMA_INIT_MODE = "adapter-pg";

function createPrisma() {
  const connectionString = process.env.DATABASE_URL || "";
  // Supabase 强制 TLS；本地/自建库无 SSL 时不启用
  const pool = new Pool({
    connectionString,
    max: 1,
    ...(connectionString.includes("supabase.")
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
