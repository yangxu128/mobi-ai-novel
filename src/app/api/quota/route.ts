import { getCurrentUser } from "@/lib/session";
import { checkQuota } from "@/lib/ai/quota";
import { tokensToCredits } from "@/lib/ai/credits";
import { beijingDayStart } from "@/lib/utils";
import { NextResponse } from "next/server";

/**
 * 当前用户今日积分状态（供前端展示剩余额度）。
 * 1 积分 ≈ 100 tokens ≈ 100 字；北京时间 0 点重置。
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const quota = await checkQuota(user.id);
  const unlimited = quota.unlimited;

  // 下次重置：北京时间明天 0 点（ISO，含 +08:00 偏移）
  const next = beijingDayStart();
  next.setDate(next.getDate() + 1);

  return NextResponse.json({
    role: user.role,
    unlimited,
    usedCredits: tokensToCredits(quota.used),
    limitCredits: unlimited ? null : tokensToCredits(quota.limit),
    remainingCredits: unlimited
      ? null
      : Math.max(0, Math.round((quota.remaining / 100) * 10) / 10),
    resetsAt: next.toISOString(),
  });
}
