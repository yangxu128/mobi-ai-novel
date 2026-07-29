/**
 * 配额控制。MVP 用内存 Map 简化，生产应换 Redis。
 */

import { prisma } from "@/lib/prisma";

const FREE_TIER_DAILY_LIMIT = Number(
  process.env.FREE_TIER_DAILY_WORD_LIMIT || 500
);
const BASIC_TIER_DAILY_LIMIT = 10000;
const PRO_TIER_DAILY_LIMIT = 50000;
// 管理员不限量（用 PRO 级别上限作为合理阈值，避免误用）
const ADMIN_TIER_DAILY_LIMIT = PRO_TIER_DAILY_LIMIT;

function getLimitByRole(role: string): number {
  switch (role) {
    case "ADMIN":
      return ADMIN_TIER_DAILY_LIMIT;
    case "PRO":
      return PRO_TIER_DAILY_LIMIT;
    case "BASIC":
      return BASIC_TIER_DAILY_LIMIT;
    default:
      return FREE_TIER_DAILY_LIMIT;
  }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 查询当日已用字数。
 */
export async function getTodayUsage(userId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
}> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const limit = getLimitByRole(user?.role || "FREE");

  const agg = await prisma.aIUsageLog.aggregate({
    where: {
      userId,
      createdAt: { gte: start, lt: end },
    },
    _sum: { completionTokens: true },
  });

  const used = agg._sum.completionTokens || 0;
  return { used, limit, remaining: Math.max(0, limit - used) };
}

/**
 * 检查是否超出配额。
 */
export async function checkQuota(userId: string): Promise<{
  ok: boolean;
  used: number;
  limit: number;
  remaining: number;
}> {
  const usage = await getTodayUsage(userId);
  return { ok: usage.remaining > 0, ...usage };
}
