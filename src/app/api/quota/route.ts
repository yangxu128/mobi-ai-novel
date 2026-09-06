import { getCurrentUser } from "@/lib/session";
import { CHECKIN_REWARD, getCreditsState } from "@/lib/ai/credits";
import { beijingDayStart } from "@/lib/utils";
import { NextResponse } from "next/server";

/**
 * 当前用户积分状态（供前端展示与每日签到提醒）。
 * 订阅积分每月 1 日重置；签到积分长期有效。
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

  return NextResponse.json({
    role: state.role,
    unlimited: state.unlimited,
    checkedInToday: state.checkedInToday,
    checkInReward: CHECKIN_REWARD,
    monthlyGranted: state.monthlyGranted,
    monthlyUsed: state.monthlyUsed,
    bonusBalance: state.bonusBalance,
    available: state.available,
    resetsAt: next.toISOString(),
  });
}
