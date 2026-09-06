/**
 * 积分体系（对标智谱 BigModel 的套餐积分模式）：
 * - 统一计量单位：1 积分 ≈ 100 tokens ≈ 100 个中文字
 * - 套餐以"每日积分"定义额度，底层仍按 token 精确计量（credits × 100）
 * - 好处：对用户直观（1 积分 ≈ 100 字），对系统单一换算口径
 */

export const TOKENS_PER_CREDIT = 100;

/** 各套餐每日积分额度 */
export const PLAN_DAILY_CREDITS: Record<string, number> = {
  FREE: 5, // ≈ 500 字/天
  BASIC: 100, // ≈ 1 万字/天
  PRO: 500, // ≈ 5 万字/天
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

/** 套餐每日 token 限额（由积分额度派生，供配额校验使用） */
export function planDailyTokenLimit(role: string): number {
  const credits = PLAN_DAILY_CREDITS[role];
  if (credits == null) return PLAN_DAILY_CREDITS.FREE * TOKENS_PER_CREDIT;
  if (!Number.isFinite(credits)) return Number.MAX_SAFE_INTEGER;
  return creditsToTokens(credits);
}

/** 格式化积分（整数则不带小数） */
export function formatCredits(credits: number): string {
  return Number.isInteger(credits) ? String(credits) : credits.toFixed(1);
}
