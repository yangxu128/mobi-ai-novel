"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type Plan = "FREE" | "BASIC" | "STANDARD" | "PRO" | "ULTIMATE";

const VALID_PLANS: Plan[] = ["FREE", "BASIC", "STANDARD", "PRO", "ULTIMATE"];

/**
 * 自助切换订阅套餐（当前登录用户）。
 * 内测阶段未接入支付，切换即时生效：
 * - 同步 upsert Subscription 表（plan / status / expiresAt）
 * - 同步 User.role（配额按 role 从数据库读取，立即生效）
 */
export async function changeMyPlanAction(plan: string): Promise<
  { ok: true; plan: Plan } | { ok: false; error: string }
> {
  if (!VALID_PLANS.includes(plan as Plan)) {
    return { ok: false, error: "无效的套餐" };
  }
  const target = plan as Plan;

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "请先登录" };
  if (user.role === "ADMIN") {
    return { ok: false, error: "管理员账号不限量，无需订阅" };
  }

  // 付费套餐有效期 30 天；免费版不设有效期
  const expiresAt = target === "FREE" ? null : (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  })();

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      plan: target,
      status: target === "FREE" ? "cancelled" : "active",
      expiresAt,
    },
    create: {
      userId: user.id,
      plan: target,
      status: target === "FREE" ? "cancelled" : "active",
      expiresAt,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { role: target },
  });

  revalidatePath("/pricing");
  revalidatePath("/projects");
  return { ok: true, plan: target };
}
