/**
 * 配额控制。MVP 用内存 Map 简化，生产应换 Redis。
 */

import { prisma } from "@/lib/prisma";

const FREE_TIER_DAILY_LIMIT = Number(
  process.env.FREE_TIER_DAILY_TOKEN_LIMIT || 500
);
const BASIC_TIER_DAILY_LIMIT = 10000;
const PRO_TIER_DAILY_LIMIT = 50000;
// 管理员不限量
const ADMIN_TIER_DAILY_LIMIT = Number.MAX_SAFE_INTEGER;

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

/**
 * 查询当日已用 token 数（prompt + completion 总和）。
 */
export async function getTodayUsage(userId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
}> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const role = user?.role || "FREE";
  const unlimited = role === "ADMIN";
  const limit = getLimitByRole(role);

  // 同时聚合 promptTokens 和 completionTokens，避免 RAG 场景下
  // prompt 远大于 completion 时配额被低估
  const agg = await prisma.aIUsageLog.aggregate({
    where: {
      userId,
      createdAt: { gte: start, lt: end },
    },
    _sum: { promptTokens: true, completionTokens: true },
  });

  const used =
    (agg._sum.promptTokens || 0) + (agg._sum.completionTokens || 0);
  return {
    used,
    limit,
    remaining: unlimited ? Number.MAX_SAFE_INTEGER : Math.max(0, limit - used),
    unlimited,
  };
}

/**
 * 检查是否超出配额。
 */
export async function checkQuota(userId: string): Promise<{
  ok: boolean;
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
}> {
  const usage = await getTodayUsage(userId);
  // ADMIN 不限量，直接放行
  if (usage.unlimited) return { ok: true, ...usage };
  return { ok: usage.remaining > 0, ...usage };
}
