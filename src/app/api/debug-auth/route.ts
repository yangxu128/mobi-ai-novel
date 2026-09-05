import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * 临时诊断端点（用完即删）：在 Route Handler 上下文中
 * 检查 cookie 可见性与裸 auth()（经 headers() 上下文）解析结果。
 * 与 /debug-auth（RSC 上下文）对照定位断点。
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const h = await headers();
  const c = await cookies();

  const rawCookieHeader = h.get("cookie") || "";

  let authResult: string;
  try {
    const s = await auth();
    authResult = s?.user?.id
      ? `session-ok id=${s.user.id.slice(0, 8)} role=${s.user.role}`
      : "session-null";
  } catch (e) {
    authResult = `auth-threw: ${(e as Error).message.split("\n")[0]}`;
  }

  return NextResponse.json({
    context: "route-handler",
    host: h.get("host"),
    xForwardedProto: h.get("x-forwarded-proto"),
    rawCookieHeaderNames: rawCookieHeader
      .split(";")
      .map((s) => s.trim().split("=")[0])
      .filter(Boolean),
    cookiesApiNames: c.getAll().map((k) => k.name),
    authSecret: process.env.AUTH_SECRET
      ? `set-len-${process.env.AUTH_SECRET.length}`
      : "MISSING",
    authUrl: process.env.AUTH_URL || "unset",
    authResult,
  });
}
