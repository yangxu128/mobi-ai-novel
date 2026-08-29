/**
 * 可用 AI 模型列表管理。
 *
 * 模型列表通过环境变量 AI_MODELS 配置（JSON 数组），
 * 每项形如 { id, name }：id 为调用模型名，name 为前端显示名。
 *
 * 若未配置或解析失败，回退到 [DEFAULT_MODEL]。
 */

import { DEFAULT_MODEL } from "./provider";

export interface AIModelOption {
  id: string;
  name: string;
}

let cachedModels: AIModelOption[] | null = null;

/**
 * 获取可用模型列表。
 * 服务端调用，结果缓存。
 */
export function getAvailableModels(): AIModelOption[] {
  if (cachedModels) return cachedModels;

  const raw = process.env.AI_MODELS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedModels = parsed
          .filter(
            (m): m is AIModelOption =>
              typeof m?.id === "string" && typeof m?.name === "string"
          )
          .map((m) => ({ id: m.id, name: m.name }));
        if (cachedModels.length > 0) return cachedModels;
      }
    } catch {
      // 解析失败，回退
    }
  }

  // 回退：仅 DEFAULT_MODEL
  cachedModels = [{ id: DEFAULT_MODEL, name: DEFAULT_MODEL }];
  return cachedModels;
}

/**
 * 校验模型 id 是否在可用列表中。
 */
export function isValidModel(modelId: string | null | undefined): boolean {
  if (!modelId) return false;
  return getAvailableModels().some((m) => m.id === modelId);
}

/**
 * 解析项目级模型：优先用项目配置，否则回退到 DEFAULT_MODEL。
 */
export function resolveModel(projectModel: string | null | undefined): string {
  if (projectModel && isValidModel(projectModel)) {
    return projectModel;
  }
  return DEFAULT_MODEL;
}
