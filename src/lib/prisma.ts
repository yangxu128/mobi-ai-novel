import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma driverAdapters：连接层走纯 JS pg 驱动（@prisma/adapter-pg）；
 * Query Engine 二进制由 schema 的 binaryTargets 覆盖 EdgeOne 运行时
 * （构建机 rhel-openssl-3.0.x ≠ 运行时 rhel-openssl-1.1.x）。
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
