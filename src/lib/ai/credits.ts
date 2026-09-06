/**
 * 积分体系（对标智谱 BigModel 的套餐积分模式）：
 * - 统一计量单位：1 积分 = 4000 tokens（50 积分 ≈ 20 万 tokens）
 * - 套餐积分 = 订阅月度积分（每月 1 日北京时间重置）+ 每日签到积分（长期有效）
 * - 底层按 token 精确计量扣减，先扣签到积分再扣订阅积分
 * - 月中套餐变更时立即按新套餐刷新月度积分（下次读取自动生效）
 */

import { prisma } from "@/lib/prisma";
import { beijingDayKey } from "@/lib/utils";

export const TOKENS_PER_CREDIT = 4000;

/** 每日签到奖励（50 积分 ≈ 20 万 tokens） */
export const CHECKIN_REWARD = 50;

/** 各套餐每月订阅积分（北京时间每月 1 日重置） */
export const PLAN_MONTHLY_CREDITS: Record<string, number> = {
  FREE: 0, // 免费版靠每日签到领积分
  BASIC: 1000, // 基础版 ¥39 ≈ 400 万 tokens/月
  STANDARD: 2000, // 标准版 ¥99 ≈ 800 万 tokens/月
  PRO: 4000, // 专业版 ¥189 ≈ 1600 万 tokens/月
  ULTIMATE: 7000, // 旗舰版 ¥299 ≈ 2800 万 tokens/月
  ADMIN: Number.POSITIVE_INFINITY, // 不限量
};

/** tokens → 积分（保留 1 位小数） */
export function tokensToCredits(tokens: number): number {
  return Math.round((tokens / TOKENS_PER_CREDIT) * 10) / 10;
}

/** 积分 → tokens */
export function creditsToTokens(credits: number): number {
  return credits * TOKENS_PER_CREDIT;
}

/** 套餐每月积分额度 */
export function planMonthlyCredits(role: string): number {
  const v = PLAN_MONTHLY_CREDITS[role];
  return v == null ? 0 : v;
}

/** 格式化积分（整数则不带小数） */
export function formatCredits(credits: number): string {
  return Number.isInteger(credits) ? String(credits) : credits.toFixed(1);
}

function cycleKey(d = new Date()): string {
  return beijingDayKey(d).slice(0, 7); // "2026-09"
}

function todayKey(d = new Date()): string {
  return beijingDayKey(d);
}

export interface CreditsState {
  role: string;
  unlimited: boolean;
  cycleKey: string;
  monthlyGranted: number;
  monthlyUsed: number;
  bonusBalance: number;
  /** 可用积分 = 订阅剩余 + 签到余额 */
  available: number;
  checkedInToday: boolean;
}

/**
 * 读取积分状态（含周期滚动、套餐变更刷新与懒建行）：
 * - 首次访问懒建余额行；
 * - 新月份首次访问时按套餐重发月度积分（未用完不结转）；
 * - 月中套餐变更（自助/管理员切换）：立即按新套餐刷新月度积分，已用量保留；
 * - ADMIN 不限量，不维护余额。
 */
export async function getCreditsState(
  userId: string,
  role: string
): Promise<CreditsState> {
  const unlimited = role === "ADMIN";
  const ck = cycleKey();
  const tk = todayKey();

  if (unlimited) {
    return {
      role,
      unlimited: true,
      cycleKey: ck,
      monthlyGranted: 0,
      monthlyUsed: 0,
      bonusBalance: 0,
      available: Number.MAX_SAFE_INTEGER,
      checkedInToday: false,
    };
  }

  let row = await prisma.creditBalance.findUnique({ where: { userId } });
  if (!row) {
    row = await prisma.creditBalance.create({
      data: { userId, cycleKey: ck, monthlyGranted: planMonthlyCredits(role) },
    });
  } else if (row.cycleKey !== ck) {
    row = await prisma.creditBalance.update({
      where: { userId },
      data: { cycleKey: ck, monthlyGranted: planMonthlyCredits(role), monthlyUsed: 0 },
    });
  } else if (row.monthlyGranted !== planMonthlyCredits(role)) {
    // 月中套餐变更：按新套餐刷新月度积分，已用量保留（切换后立即生效）
    row = await prisma.creditBalance.update({
      where: { userId },
      data: { monthlyGranted: planMonthlyCredits(role) },
    });
  }

  const monthlyRemaining = Math.max(0, row.monthlyGranted - row.monthlyUsed);
  const checkedInToday = row.lastCheckInKey === tk;

  return {
    role,
    unlimited: false,
    cycleKey: ck,
    monthlyGranted: row.monthlyGranted,
    monthlyUsed: row.monthlyUsed,
    bonusBalance: row.bonusBalance,
    available: monthlyRemaining + row.bonusBalance,
    checkedInToday,
  };
}

/**
 * 每日签到：+CHECKIN_REWARD 积分（每北京时间天一次）。
 */
export async function checkIn(
  userId: string,
  role: string
): Promise<{ ok: boolean; already?: boolean; granted?: number; bonus?: number; total?: number }> {
  const state = await getCreditsState(userId, role);
  if (state.unlimited) return { ok: false, already: true };
  if (state.checkedInToday) {
    return { ok: false, already: true, granted: 0, bonus: state.bonusBalance, total: state.available };
  }
  const row = await prisma.creditBalance.update({
    where: { userId },
    data: { bonusBalance: { increment: CHECKIN_REWARD }, lastCheckInKey: todayKey() },
  });
  const total = Math.max(0, row.monthlyGranted - row.monthlyUsed) + row.bonusBalance;
  return { ok: true, granted: CHECKIN_REWARD, bonus: row.bonusBalance, total };
}

/**
 * 消耗积分：先扣签到积分（先到先用），再扣订阅月度积分。
 * 最后一次调用允许轻微透支（每月 1 日重置兜底）。
 */
export async function deductCredits(
  userId: string,
  role: string,
  credits: number
): Promise<void> {
  if (credits <= 0) return;
  const state = await getCreditsState(userId, role);
  if (state.unlimited) return;

  const fromBonus = Math.min(state.bonusBalance, credits);
  const fromMonthly = credits - fromBonus;
  await prisma.creditBalance.update({
    where: { userId },
    data: {
      bonusBalance: state.bonusBalance - fromBonus,
      monthlyUsed: state.monthlyUsed + fromMonthly,
    },
  });
}
