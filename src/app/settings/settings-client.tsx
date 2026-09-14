"use client";

/**
 * AI 设置页（桌面版双模式模型管理）。
 *
 * 双 tab：「平台模型」（绑定平台账号，用官方模型、云端扣积分）
 *        「自定义模型」（BYOK，本地直连、不耗积分）
 */

import { useState } from "react";
import { AppSidebar } from "@/components/projects/app-sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlatformPanel } from "./platform-panel";
import { CustomPanel } from "./custom-panel";

export interface ProviderVM {
  id: string;
  type: string;
  name: string;
  baseUrl: string;
  apiKeyMasked: string;
  isDefault: boolean;
  models: { id: string; modelId: string; name: string; isDefault: boolean }[];
}

export interface PlatformQuotaVM {
  quota: {
    unlimited: boolean;
    available: number;
    monthlyGranted: number;
    monthlyUsed: number;
    bonusBalance: number;
  } | null;
  subscription: { plan: string; status: string; expiresAt: string | null } | null;
}

export function SettingsClient({
  providers,
  initialPlatformQuota,
}: {
  providers: ProviderVM[];
  initialPlatformQuota: PlatformQuotaVM | null;
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  // Server Action revalidatePath("/settings") 已触发 RSC 刷新；
  // refreshKey 用于同页操作后强制子面板重置内部状态
  const onRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="flex min-h-full flex-col bg-[var(--bg-canvas)] md:flex-row">
      <AppSidebar />

      <main className="w-full min-w-0 flex-1 md:w-auto">
        <div className="mx-auto max-w-[860px] px-6 py-8 lg:px-10">
          <h1 className="font-display text-3xl font-bold text-text-default">AI 设置</h1>
          <p className="mt-1.5 text-sm text-text-tertiary">
            管理模型接入：绑定平台账号使用官方模型（按云端套餐扣积分），或添加自定义模型（本地直连，不耗积分）
          </p>

          <Tabs defaultValue="platform" className="mt-8">
            <TabsList>
              <TabsTrigger value="platform">平台模型</TabsTrigger>
              <TabsTrigger value="custom">自定义模型</TabsTrigger>
            </TabsList>
            <TabsContent value="platform" className="mt-6">
              <PlatformPanel
                key={`platform-${refreshKey}`}
                providers={providers}
                initialQuota={initialPlatformQuota}
                onChanged={onRefresh}
              />
            </TabsContent>
            <TabsContent value="custom" className="mt-6">
              <CustomPanel
                key={`custom-${refreshKey}`}
                providers={providers.filter((p) => p.type === "custom")}
                onChanged={onRefresh}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
