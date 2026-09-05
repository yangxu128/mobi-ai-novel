import { NextResponse } from "next/server";

/**
 * 生产诊断端点：分层隔离数据库问题。
 * - checks：环境变量注入状态
 * - pg：绕过 Prisma，用 pg 驱动直连（定位网络/证书层）
 * - prisma：Prisma 客户端全链路（定位引擎/适配器层）
 * 仅暴露布尔状态与错误首行+堆栈前 3 行，不泄露连接串。
 */
export async function GET() {
  const checks = {
    DATABASE_URL: process.env.DATABASE_URL ? "set" : "MISSING",
    DIRECT_URL: process.env.DIRECT_URL ? "set" : "MISSING",
    AUTH_SECRET: process.env.AUTH_SECRET ? "set" : "MISSING",
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST || "unset",
    AI_API_KEY: process.env.AI_API_KEY ? "set" : "MISSING",
    AI_BASE_URL: process.env.AI_BASE_URL ? "set" : "MISSING",
    NODE_VERSION: process.version,
  };

  function fmt(e: unknown) {
    const err = e as { code?: string; message?: string; stack?: string };
    return {
      code: err.code || "",
      message: (err.message || "").split("\n")[0].slice(0, 200),
      stack: (err.stack || "").split("\n").slice(0, 4).join("\n").slice(0, 500),
    };
  }

  // 第 1 层：原生 pg 直连（不经过 Prisma）
  let pg: Record<string, unknown> = { status: "skipped" };
  try {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      ssl: { rejectUnauthorized: false },
    });
    const t0 = Date.now();
    const r = await pool.query("SELECT 1 AS ok");
    pg = { status: "up", ms: Date.now() - t0, result: r.rows[0]?.ok };
    await pool.end();
  } catch (e) {
    pg = { status: "down", ...fmt(e) };
  }

  // 第 2 层：Prisma 模型查询（业务主路径）
  let prismaModel: Record<string, unknown> = { status: "skipped" };
  try {
    const { prisma } = await import("@/lib/prisma");
    const t0 = Date.now();
    const n = await prisma.user.count();
    prismaModel = { status: "up", ms: Date.now() - t0, users: n };
  } catch (e) {
    prismaModel = { status: "down", ...fmt(e) };
  }

  // 第 3 层：$queryRawUnsafe（部分 v5.22 适配器对标签模板支持有缺陷）
  let prismaRawUnsafe: Record<string, unknown> = { status: "skipped" };
  try {
    const { prisma } = await import("@/lib/prisma");
    const r = await prisma.$queryRawUnsafe("SELECT 1 AS ok");
    prismaRawUnsafe = { status: "up", result: (r as Array<{ ok: number }>)[0]?.ok };
  } catch (e) {
    prismaRawUnsafe = { status: "down", ...fmt(e) };
  }

  // 第 4 层：$queryRaw 标签模板
  let prismaRawTagged: Record<string, unknown> = { status: "skipped" };
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    prismaRawTagged = { status: "up" };
  } catch (e) {
    prismaRawTagged = { status: "down", ...fmt(e) };
  }

  return NextResponse.json({
    checks,
    pg,
    prismaModel,
    prismaRawUnsafe,
    prismaRawTagged,
  });
}
