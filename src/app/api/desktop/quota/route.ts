/**
 * 桌面版查询平台账号积分概览（设置页刷新用）。
 * GET /api/desktop/quota（Authorization: Bearer <token>）
 */

import { prisma } from "@/lib/prisma";
import { resolveDesktopToken } from "@/lib/desktop-token";
import { getCreditsState } from "@/lib/ai/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authz = req.headers.get("authorization") || "";
  const match = authz.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return Response.json({ error: "缺少 Bearer token" }, { status: 401 });
  }

  const user = await resolveDesktopToken(match[1].trim());
  if (!user) {
    return Response.json({ error: "token 无效或已过期" }, { status: 401 });
  }

  const credits = await getCreditsState(user.id, user.role);
  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { plan: true, status: true, expiresAt: true },
  });

  return Response.json({
    user: { email: user.email, name: user.name, role: user.role },
    quota: {
      unlimited: credits.unlimited,
      available: credits.available,
      monthlyGranted: credits.monthlyGranted,
      monthlyUsed: credits.monthlyUsed,
      bonusBalance: credits.bonusBalance,
    },
    subscription,
  });
}
