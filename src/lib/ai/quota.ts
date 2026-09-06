/**
 * 配额控制（积分制）。
 * 套餐以"每日积分"定义额度（credits.ts），底层按 token 精确计量：
 * 限额 = 套餐每日积分 × 100（1 积分 ≈ 100 tokens ≈ 100 字）。
 * 计数范围：自然日（北京时间），prompt + completion 合并统计。
 */

import { prisma } from "@/lib/prisma";
import { beijingDayStart } from "@/lib/utils";
import { planDailyTokenLimit } from "./credits";

/**
 * 查询当日已用 token 数（prompt + completion 总和）。
 */
export async function getTodayUsage(userId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
}> {
  const start = beijingDayStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const role = user?.role || "FREE";
  const unlimited = role === "ADMIN";
  const limit = planDailyTokenLimit(role);

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
