import { headers, cookies } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * 临时诊断页（用完即删）：在 RSC（服务端组件）上下文中
 * 检查 cookie 可见性与 auth() 解析结果。
 * EdgeOne 部署后与 /api/debug-auth 对照，定位
 * 「API 路由能解码会话、RSC 不能」的具体断点。
 */
export const dynamic = "force-dynamic";

export default async function DebugAuthPage() {
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

  const report = {
    context: "rsc-server-component",
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
  };

  return (
    <pre className="container py-10 text-xs">
      {JSON.stringify(report, null, 2)}
    </pre>
  );
}
