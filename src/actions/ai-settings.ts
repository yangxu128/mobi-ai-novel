"use server";

/**
 * AI 设置 Server Actions（桌面版双模式模型管理）。
 *
 * 平台模型：绑定（调平台 /api/desktop/bind 换 token → 本地 official AiProvider）
 *           / 解绑 / 同步官方模型（带 token 调平台 models 接口）。
 * 自定义模型：custom AiProvider/AiModel 的增删改、设全局默认。
 *
 * 所有操作校验当前 session 用户归属。
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { z } from "zod";

type ActionResult = { ok: true } | { ok: false; error: string };

/** 平台地址：桌面打包时注入 NEXT_PUBLIC_PLATFORM_URL；dev 默认本地 web 站点 */
function platformUrl(): string {
  return (
    process.env.NEXT_PUBLIC_PLATFORM_URL || "http://localhost:3000"
  ).replace(/\/+$/, "");
}

/** 绑定后同步官方模型：带 token 调平台 models 接口，全量替换该 provider 的模型 */
async function syncOfficialModels(providerId: string, token: string): Promise<number> {
  const resp = await fetch(`${platformUrl()}/api/ai/models`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!resp.ok) return 0;
  const data = (await resp.json()) as {
    providers?: { type?: string; models?: { id: string; name: string }[] }[];
  };
  const models =
    data.providers?.find((g) => g.type === "platform")?.models || [];

  await prisma.aiModel.deleteMany({ where: { providerId } });
  if (models.length > 0) {
    await prisma.aiModel.createMany({
      data: models.map((m) => ({
        providerId,
        modelId: m.id,
        name: m.name,
      })),
    });
  }
  return models.length;
}

/* ------------------------------ 平台模型 ------------------------------ */

const bindSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(1, "请输入密码"),
});

export async function bindPlatformAction(input: {
  email: string;
  password: string;
}): Promise<ActionResult & { modelCount?: number }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const parsed = bindSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  // 调平台 bind 换 token
  let bindResp: Response;
  try {
    bindResp = await fetch(`${platformUrl()}/api/desktop/bind`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return { ok: false, error: "无法连接平台，请检查网络后重试" };
  }
  if (!bindResp.ok) {
    const data = (await bindResp.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: data.error || `绑定失败（${bindResp.status}）` };
  }
  const bind = (await bindResp.json()) as {
    token: string;
    user: { email: string };
  };

  // 本地 upsert official provider（每用户至多 1 条）
  const existing = await prisma.aiProvider.findFirst({
    where: { userId: user.id, type: "official" },
  });
  const provider = existing
    ? await prisma.aiProvider.update({
        where: { id: existing.id },
        data: { baseUrl: platformUrl(), apiKey: bind.token, name: "平台模型" },
      })
    : await prisma.aiProvider.create({
        data: {
          userId: user.id,
          type: "official",
          name: "平台模型",
          baseUrl: platformUrl(),
          apiKey: bind.token,
        },
      });

  let modelCount = 0;
  try {
    modelCount = await syncOfficialModels(provider.id, bind.token);
  } catch {
    // 同步失败不阻断绑定，用户可稍后在设置页手动同步
  }

  revalidatePath("/settings");
  return { ok: true, modelCount };
}

export async function unbindPlatformAction(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const provider = await prisma.aiProvider.findFirst({
    where: { userId: user.id, type: "official" },
  });
  if (!provider) return { ok: false, error: "尚未绑定平台账号" };

  // 通知平台吊销 token（尽力而为，失败仍本地解绑）
  try {
    await fetch(`${provider.baseUrl.replace(/\/+$/, "")}/api/desktop/unbind`, {
      method: "POST",
      headers: { Authorization: `Bearer ${provider.apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // 网络失败忽略：token 90 天自然过期，或用户在平台侧手动管理
  }

  // 若默认模型在 official 下，删除后清空默认
  await prisma.aiModel.deleteMany({ where: { providerId: provider.id } });
  await prisma.aiProvider.delete({ where: { id: provider.id } });

  revalidatePath("/settings");
  return { ok: true };
}

export async function syncPlatformModelsAction(): Promise<
  ActionResult & { modelCount?: number }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const provider = await prisma.aiProvider.findFirst({
    where: { userId: user.id, type: "official" },
  });
  if (!provider) return { ok: false, error: "尚未绑定平台账号" };

  try {
    const modelCount = await syncOfficialModels(provider.id, provider.apiKey);
    revalidatePath("/settings");
    return { ok: true, modelCount };
  } catch {
    return { ok: false, error: "同步官方模型失败，请稍后重试" };
  }
}

interface PlatformQuota {
  unlimited: boolean;
  available: number;
  monthlyGranted: number;
  monthlyUsed: number;
  bonusBalance: number;
}

interface PlatformSubscription {
  plan: string;
  status: string;
  expiresAt: string | null;
}

/** 刷新平台账号积分/订阅概览（透传给设置页展示） */
export async function refreshPlatformQuotaAction(): Promise<
  | { ok: true; quota: PlatformQuota | null; subscription: PlatformSubscription | null }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const provider = await prisma.aiProvider.findFirst({
    where: { userId: user.id, type: "official" },
  });
  if (!provider) return { ok: false, error: "尚未绑定平台账号" };

  try {
    const resp = await fetch(
      `${provider.baseUrl.replace(/\/+$/, "")}/api/desktop/quota`,
      {
        headers: { Authorization: `Bearer ${provider.apiKey}` },
        signal: AbortSignal.timeout(15_000),
      }
    );
    if (!resp.ok) {
      if (resp.status === 401) {
        return { ok: false, error: "平台账号凭证已失效，请重新绑定" };
      }
      return { ok: false, error: "查询平台积分失败" };
    }
    const data = (await resp.json()) as {
      quota?: PlatformQuota;
      subscription?: PlatformSubscription | null;
    };
    return { ok: true, quota: data.quota ?? null, subscription: data.subscription ?? null };
  } catch {
    return { ok: false, error: "无法连接平台，请检查网络" };
  }
}

/* ------------------------------ 自定义模型 ------------------------------ */

const providerSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(40, "名称最多 40 字"),
  baseUrl: z.string().url("BaseURL 格式不正确"),
  apiKey: z.string().default(""),
});

export async function addCustomProviderAction(input: {
  name: string;
  baseUrl: string;
  apiKey: string;
  models: { modelId: string; name: string }[];
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const parsed = providerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const provider = await prisma.aiProvider.create({
    data: {
      userId: user.id,
      type: "custom",
      name: parsed.data.name,
      baseUrl: parsed.data.baseUrl.replace(/\/+$/, ""),
      apiKey: parsed.data.apiKey,
    },
  });

  const models = input.models.filter((m) => m.modelId.trim());
  if (models.length > 0) {
    await prisma.aiModel.createMany({
      data: models.map((m) => ({
        providerId: provider.id,
        modelId: m.modelId.trim(),
        name: (m.name || m.modelId).trim(),
      })),
    });
  }

  revalidatePath("/settings");
  return { ok: true };
}

export async function updateCustomProviderAction(input: {
  providerId: string;
  name: string;
  baseUrl: string;
  apiKey: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const parsed = providerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const provider = await prisma.aiProvider.findUnique({
    where: { id: input.providerId },
  });
  if (!provider || provider.userId !== user.id || provider.type !== "custom") {
    return { ok: false, error: "Provider 不存在" };
  }

  await prisma.aiProvider.update({
    where: { id: provider.id },
    data: {
      name: parsed.data.name,
      baseUrl: parsed.data.baseUrl.replace(/\/+$/, ""),
      // Key 留空表示不修改
      ...(parsed.data.apiKey ? { apiKey: parsed.data.apiKey } : {}),
    },
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteProviderAction(providerId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const provider = await prisma.aiProvider.findUnique({
    where: { id: providerId },
  });
  if (!provider || provider.userId !== user.id) {
    return { ok: false, error: "Provider 不存在" };
  }

  await prisma.aiProvider.delete({ where: { id: provider.id } });
  revalidatePath("/settings");
  return { ok: true };
}

/* ------------------------------ 模型管理 ------------------------------ */

export async function addModelsAction(input: {
  providerId: string;
  models: { modelId: string; name: string }[];
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const provider = await prisma.aiProvider.findUnique({
    where: { id: input.providerId },
  });
  if (!provider || provider.userId !== user.id) {
    return { ok: false, error: "Provider 不存在" };
  }

  const models = input.models.filter((m) => m.modelId.trim());
  if (models.length === 0) {
    return { ok: false, error: "请至少填写一个模型 ID" };
  }

  // 去重：跳过已存在的 modelId
  const existing = await prisma.aiModel.findMany({
    where: { providerId: provider.id, modelId: { in: models.map((m) => m.modelId.trim()) } },
    select: { modelId: true },
  });
  const existingIds = new Set(existing.map((e) => e.modelId));
  const fresh = models.filter((m) => !existingIds.has(m.modelId.trim()));
  if (fresh.length === 0) {
    return { ok: false, error: "这些模型已存在" };
  }

  await prisma.aiModel.createMany({
    data: fresh.map((m) => ({
      providerId: provider.id,
      modelId: m.modelId.trim(),
      name: (m.name || m.modelId).trim(),
    })),
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteModelAction(modelId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const model = await prisma.aiModel.findUnique({
    where: { id: modelId },
    include: { provider: true },
  });
  if (!model || model.provider.userId !== user.id) {
    return { ok: false, error: "模型不存在" };
  }

  await prisma.aiModel.delete({ where: { id: model.id } });
  revalidatePath("/settings");
  return { ok: true };
}

/** 设全局默认模型（modelRef = "modelId@providerId"）；null 表示清除默认 */
export async function setDefaultModelAction(
  modelRef: string | null
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  // 事务：清旧默认（含默认 Provider 标记）→ 设新默认
  await prisma.$transaction(async (tx) => {
    await tx.aiModel.updateMany({
      where: { provider: { userId: user.id }, isDefault: true },
      data: { isDefault: false },
    });
    await tx.aiProvider.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    });

    if (!modelRef) return;

    const idx = modelRef.lastIndexOf("@");
    if (idx <= 0) return;
    const modelId = modelRef.slice(0, idx);
    const providerId = modelRef.slice(idx + 1);

    const model = await tx.aiModel.findFirst({
      where: { modelId, providerId, provider: { userId: user.id } },
    });
    if (model) {
      await tx.aiModel.update({
        where: { id: model.id },
        data: { isDefault: true },
      });
      await tx.aiProvider.update({
        where: { id: providerId },
        data: { isDefault: true },
      });
    }
  });

  revalidatePath("/settings");
  return { ok: true };
}

/** 首启引导用：当前用户是否已配置任何 Provider（含 official） */
export async function hasAnyProviderAction(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const count = await prisma.aiProvider.count({ where: { userId: user.id } });
  return count > 0;
}
