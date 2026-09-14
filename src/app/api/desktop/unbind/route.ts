/**
 * 桌面版解绑平台账号：吊销当前 Bearer token。
 * POST /api/desktop/unbind（Authorization: Bearer <token>）
 */

import { prisma } from "@/lib/prisma";
import { resolveDesktopToken, sha256 } from "@/lib/desktop-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const authz = req.headers.get("authorization") || "";
  const match = authz.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return Response.json({ error: "缺少 Bearer token" }, { status: 401 });
  }

  const token = match[1].trim();
  const user = await resolveDesktopToken(token);
  if (!user) {
    return Response.json({ error: "token 无效或已过期" }, { status: 401 });
  }

  await prisma.desktopToken.updateMany({
    where: { tokenHash: sha256(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return Response.json({ ok: true });
}
