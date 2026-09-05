import { NextResponse } from "next/server";

/**
 * 生产诊断端点：分层隔离数据库问题。
 * - build：构建标记（判断线上代码是否含 driverAdapters 修复）
 * - checks：环境变量注入状态
 * - pg：绕过 Prisma，用 pg 驱动直连（定位网络/证书层）
 * - prisma：Prisma 客户端全链路（定位引擎/适配器层）
 * 错误展开前 6 行消息 + 前 12 行堆栈（Prisma 真正原因在第 3-4 行），不泄露连接串。
 */
export async function GET() {
  const checks = {
    healthVersion: "v3-full-error",
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
      // PrismaClientInitializationError 的真正原因在第 3-4 行，
      // 只取第 1 行会拿到空字符串 —— 展开前 6 行
      message: (err.message || "")
        .split("\n")
        .slice(0, 6)
        .join(" ⏎ ")
        .slice(0, 600),
      stack: (err.stack || "").split("\n").slice(0, 12).join("\n").slice(0, 1200),
    };
  }

  // 第 0 层：构建标记 —— 判断线上是否为 driverAdapters 新代码
  let build: Record<string, unknown> = {};
  try {
    const mod = await import("@/lib/prisma");
    build = { prismaInit: mod.PRISMA_INIT_MODE ?? "legacy-engine" };
  } catch (e) {
    build = { prismaInit: "import-failed", ...fmt(e) };
  }

  // 第 1 层：原生 pg 直连（不经过 Prisma）
  let pg: Record<string, unknown> = { status: "skipped" };
  try {
    const { Pool } = await import("pg");
    const cs = process.env.DATABASE_URL || "";
    const pool = new Pool({
      connectionString: cs,
      max: 1,
      // Supabase 强制 TLS；本地库无 SSL 时不启用，避免误报
      ...(cs.includes("supabase.") ? { ssl: { rejectUnauthorized: false } } : {}),
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
    build,
    pg,
    prismaModel,
    prismaRawUnsafe,
    prismaRawTagged,
  });
}

/**
 * POST 探针：验证 EdgeOne 运行时是否把请求体提前排空（平台已知缺陷）。
 * curl -X POST <site>/api/health -H "Content-Type: application/json" -d '{"t":1}'
 * 正常应返回 bodyLen: 7；若 bodyLen: 0 且 bodyUsed: false 则命中平台缺陷。
 */
export async function POST(request: Request) {
  const logs: string[] = [];
  const contentLength = request.headers.get("content-length") || "";
  const contentType = request.headers.get("content-type") || "";
  logs.push(`content-length=${contentLength}`);
  logs.push(`content-type=${contentType}`);
  logs.push(`bodyUsed=${request.bodyUsed}`);
  let text = "";
  try {
    text = await request.text();
  } catch (e) {
    logs.push(`text() error: ${(e as Error).message}`);
  }
  logs.push(`bodyLen=${text.length}`);
  if (text.length === 0 && Number(contentLength) > 0) {
    logs.push("FATAL: Content-Length>0 但 body 为空 —— 平台排空了请求体");
  }
  return NextResponse.json({ probe: "post-body", logs });
}
