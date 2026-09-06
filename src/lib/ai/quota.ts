/**
 * 配额校验（积分制，余额模式）。
 *
 * 积分构成：订阅月度积分（每月 1 日北京时间重置，不结转）
 *          + 每日签到积分（长期有效，先扣先用）。
 * 校验规则：可用余额 > 0 即可发起生成；余额在生成完成后按
 * tokens 折算扣减（1 积分 ≈ 100 tokens，向上取整），允许最后一次轻微透支。
 */

import { prisma } from "@/lib/prisma";
import { CHECKIN_REWARD, getCreditsState } from "./credits";

export interface QuotaState {
  ok: boolean;
  unlimited: boolean;
  role: string;
  monthlyGranted: number;
  monthlyUsed: number;
  bonusBalance: number;
  available: number;
  checkedInToday: boolean;
  checkInReward: number;
}

/**
 * 校验当前用户是否还有可用积分。
 */
export async function checkQuota(userId: string): Promise<QuotaState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const role = user?.role || "FREE";
  const state = await getCreditsState(userId, role);

  return {
    ok: state.unlimited || state.available > 0,
    unlimited: state.unlimited,
    role: state.role,
    monthlyGranted: state.monthlyGranted,
    monthlyUsed: state.monthlyUsed,
    bonusBalance: state.bonusBalance,
    available: state.available,
    checkedInToday: state.checkedInToday,
    checkInReward: CHECKIN_REWARD,
  };
}
