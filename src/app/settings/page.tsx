import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SettingsClient } from "./settings-client";

export const metadata = { title: "AI 设置 - 墨笔" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/settings");

  const providers = await prisma.aiProvider.findMany({
    where: { userId: user.id },
    include: { models: { orderBy: { createdAt: "asc" } } },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  // 绑定了平台账号：服务端预取积分概览（失败不阻塞页面）
  const official = providers.find((p) => p.type === "official");
  let platformQuota: {
    quota: {
      unlimited: boolean;
      available: number;
      monthlyGranted: number;
      monthlyUsed: number;
      bonusBalance: number;
    } | null;
    subscription: { plan: string; status: string; expiresAt: string | null } | null;
  } | null = null;
  if (official) {
    try {
      const resp = await fetch(
        `${official.baseUrl.replace(/\/+$/, "")}/api/desktop/quota`,
        {
          headers: { Authorization: `Bearer ${official.apiKey}` },
          signal: AbortSignal.timeout(10_000),
          cache: "no-store",
        }
      );
      if (resp.ok) {
        const data = (await resp.json()) as {
          quota: {
            unlimited: boolean;
            available: number;
            monthlyGranted: number;
            monthlyUsed: number;
            bonusBalance: number;
          };
          subscription: { plan: string; status: string; expiresAt: string | null } | null;
        };
        platformQuota = { quota: data.quota, subscription: data.subscription };
      } else {
        platformQuota = { quota: null, subscription: null };
      }
    } catch {
      platformQuota = { quota: null, subscription: null };
    }
  }

  return (
    <SettingsClient
      providers={providers.map((p) => ({
        id: p.id,
        type: p.type,
        name: p.name,
        baseUrl: p.baseUrl,
        apiKeyMasked: p.apiKey ? "已配置" : "",
        isDefault: p.isDefault,
        models: p.models.map((m) => ({
          id: m.id,
          modelId: m.modelId,
          name: m.name,
          isDefault: m.isDefault,
        })),
      }))}
      initialPlatformQuota={platformQuota}
    />
  );
}
