import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * 生产诊断端点：检查环境变量注入与数据库连通性。
 * 只暴露布尔状态与错误代码，不泄露密钥或完整连接串。
 */
export async function GET() {
  const checks = {
    DATABASE_URL: process.env.DATABASE_URL ? "set" : "MISSING",
    DIRECT_URL: process.env.DIRECT_URL ? "set" : "MISSING",
    AUTH_SECRET: process.env.AUTH_SECRET ? "set" : "MISSING",
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST || "unset",
    AI_API_KEY: process.env.AI_API_KEY ? "set" : "MISSING",
    AI_BASE_URL: process.env.AI_BASE_URL ? "set" : "MISSING",
  };

  let db = "up";
  let dbErrorCode = "";
  let dbErrorName = "";
  let dbErrorMessage = "";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    const err = e as { code?: string; name?: string; message?: string };
    db = "down";
    dbErrorCode = err.code || "";
    dbErrorName = err.name || (e as Error).constructor.name;
    // 仅保留首行，便于定位；不包含连接串
    dbErrorMessage = (err.message || "").split("\n")[0].slice(0, 160);
  }

  return NextResponse.json({
    ok: db === "up",
    checks,
    db,
    dbErrorCode,
    dbErrorName,
    dbErrorMessage,
  });
}
