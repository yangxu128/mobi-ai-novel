import { getCurrentUser } from "@/lib/session";
import { getCreditsState, TOKENS_PER_CREDIT } from "@/lib/ai/credits";
import { prisma } from "@/lib/prisma";
import { beijingDayKey, beijingDayStart } from "@/lib/utils";
import { NextResponse } from "next/server";

/** AI 功能中文名（用量明细展示） */
const ACTION_LABELS: Record<string, string> = {
  inspire: "灵感卡",
  worldbuild: "世界观",
  character: "角色卡",
  outline: "大纲",
  outlineAppend: "大纲续写",
  expand: "章节扩写",
  polish: "润色",
  chat: "对话共创",
  consistency: "一致性检查",
  extract: "卡片提取",
  summary: "章节摘要",
  analyzeStyle: "风格分析",
};

/**
 * 套餐用量详情（弹窗展示）：
 * - 积分状态：可用 / 月度已用与总量 / 签到余额 / 下次重置时间
 * - 本月消耗：按功能聚合 tokens 用量与调用次数（北京时间月度周期）
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const state = await getCreditsState(user.id, user.role);

  // 下次重置：下月 1 日北京时间 0 点
  const next = beijingDayStart();
  next.setMonth(next.getMonth() + 1);

  // 本月周期起始（北京时间 1 日 0 点）
  const cycleStart = new Date(
    `${beijingDayKey(new Date()).slice(0, 7)}-01T00:00:00+08:00`
  );

  const logs = await prisma.aIUsageLog.findMany({
    where: { userId: user.id, createdAt: { gte: cycleStart } },
    select: { action: true, promptTokens: true, completionTokens: true },
  });

  // 按 action 聚合
  const grouped = new Map<string, { tokens: number; count: number }>();
  let totalTokens = 0;
  for (const log of logs) {
    const tokens = log.promptTokens + log.completionTokens;
    const g = grouped.get(log.action) || { tokens: 0, count: 0 };
    g.tokens += tokens;
    g.count += 1;
    grouped.set(log.action, g);
    totalTokens += tokens;
  }

  const usage = Array.from(grouped.entries())
    .map(([action, g]) => ({
      action,
      label: ACTION_LABELS[action] || action,
      count: g.count,
      tokens: g.tokens,
      credits: Math.round((g.tokens / TOKENS_PER_CREDIT) * 10) / 10,
    }))
    .sort((a, b) => b.tokens - a.tokens);

  return NextResponse.json({
    role: state.role,
    unlimited: state.unlimited,
    monthlyGranted: state.monthlyGranted,
    monthlyUsed: state.monthlyUsed,
    bonusBalance: state.bonusBalance,
    available: state.available,
    resetsAt: next.toISOString(),
    cycleLabel: beijingDayKey(new Date()).slice(0, 7),
    totalTokens,
    totalCredits: Math.round((totalTokens / TOKENS_PER_CREDIT) * 10) / 10,
    usage,
  });
}
