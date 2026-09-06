"use server";

type Plan = "FREE" | "BASIC" | "STANDARD" | "PRO" | "ULTIMATE";

/**
 * 自助切换订阅套餐（当前登录用户）。
 * 内测阶段套餐调整统一由管理员在后台操作，此接口已停用自助切换；
 * 保留 action 供正式上线接入支付后复用。
 */
export async function changeMyPlanAction(plan: string): Promise<
  { ok: true; plan: Plan } | { ok: false; error: string }
> {
  void plan;
  return { ok: false, error: "套餐调整请联系管理员开通" };
}
