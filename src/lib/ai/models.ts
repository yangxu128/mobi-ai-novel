/**
 * 可用 AI 模型列表管理（双模式）。
 *
 * 数据源（按优先级）：
 * 1. DB：当前用户的 AiProvider + AiModel（桌面版绑定平台账号 / 自定义服务商）
 * 2. env：AI_MODELS JSON 数组（web 平台模型；未配置回退 [AI_MODEL]）
 *
 * web（无 Provider）→ 仅平台模型组，行为与旧版一致；
 * 桌面版（有 Provider）→ 仅 DB 分组（生产桌面无平台 env Key，env 组无意义）。
 */

import { prisma } from "@/lib/prisma";
import { DEFAULT_MODEL, getEnvModels } from "./provider";

export interface AIModelOption {
  /** modelRef（"modelId@providerId"）；平台组为纯 modelId */
  id: string;
  name: string;
}

export interface ModelProviderGroup {
  /** env 平台组为 "env" */
  providerId: string;
  /** official=平台账号绑定组；custom=自定义服务商；platform=web 平台 env 组 */
  type: "official" | "custom" | "platform";
  name: string;
  isDefault: boolean;
  models: AIModelOption[];
}

const DESKTOP_MODE = process.env.DESKTOP_MODE === "1";

/**
 * 获取模型分组列表 + 全局默认 modelRef。
 * 服务端调用（查 DB）。
 */
export async function getModelGroups(userId?: string): Promise<{
  groups: ModelProviderGroup[];
  defaultModelRef: string;
}> {
  const providers = userId
    ? await prisma.aiProvider.findMany({
        where: { userId },
        include: { models: { orderBy: { createdAt: "asc" } } },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      })
    : [];

  const groups: ModelProviderGroup[] = providers.map((p) => ({
    providerId: p.id,
    type: p.type === "official" ? "official" : "custom",
    name: p.name,
    isDefault: p.isDefault,
    models: p.models.map((m) => ({
      id: `${m.modelId}@${p.id}`,
      name: m.name,
    })),
  }));

  // web：平台 env 组始终追加（现行为保留）；桌面版：生产环境无平台 env Key，不追加
  if (!DESKTOP_MODE) {
    groups.push({
      providerId: "env",
      type: "platform",
      name: "平台模型",
      isDefault: groups.length === 0,
      models: getEnvModels(),
    });
  }

  // 全局默认：用户默认 AiModel → 平台默认（web）
  const defModel = providers
    .flatMap((p) => p.models.map((m) => ({ ...m, providerId: p.id })))
    .find((m) => m.isDefault);
  const defaultModelRef = defModel
    ? `${defModel.modelId}@${defModel.providerId}`
    : DESKTOP_MODE
      ? ""
      : DEFAULT_MODEL;

  return { groups, defaultModelRef };
}
