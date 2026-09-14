/**
 * 桌面版绑定平台账号：邮箱密码验证 → 签发桌面 token。
 * POST /api/desktop/bind
 * body: { email, password }
 *
 * 明文 token 仅本次响应返回一次，云端只存 sha256。
 * 限流：IP 5 次/小时 + 邮箱 5 次/小时（防暴力破解）。
 */

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCreditsState } from "@/lib/ai/credits";
import { rateLimit } from "@/lib/ai/rate-limit";
import { sha256 } from "@/lib/desktop-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_TTL_DAYS = 90;

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!email || !password) {
    return Response.json({ error: "请填写邮箱和密码" }, { status: 400 });
  }

  // 限流：IP + 邮箱两个维度
  if (!rateLimit(`desktop-bind:${ip}`, 5, 60 * 60 * 1000).ok) {
    return Response.json({ error: "尝试过于频繁，请 1 小时后再试" }, { status: 429 });
  }
  if (!rateLimit(`desktop-bind:${email}`, 5, 60 * 60 * 1000).ok) {
    return Response.json({ error: "尝试过于频繁，请 1 小时后再试" }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return Response.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return Response.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  // 同一用户重复绑定：吊销该用户全部旧 token（一台桌面设备一个凭证）
  await prisma.desktopToken.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const token = randomBytes(32).toString("base64url");
  await prisma.desktopToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  const credits = await getCreditsState(user.id, user.role);
  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { plan: true, status: true, expiresAt: true },
  });

  return Response.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
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
