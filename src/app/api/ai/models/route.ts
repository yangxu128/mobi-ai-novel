/**
 * 返回可用 AI 模型分组列表。
 * GET /api/ai/models
 *   → { providers: ModelProviderGroup[], defaultModelRef }
 *
 * GET /api/ai/models?probeProviderId=xxx
 *   → 拉取指定 Provider 的远端模型列表（设置页导入用）
 *     official：带 token 调云端 models 接口；custom：GET baseUrl/models
 */

import { NextRequest } from "next/server";
import { resolveApiUser } from "@/lib/api-user";
import { prisma } from "@/lib/prisma";
import { getModelGroups } from "@/lib/ai/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function trimSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export async function GET(req: NextRequest) {
  const user = await resolveApiUser(req);
  if (!user) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const probeProviderId = searchParams.get("probeProviderId");

  if (probeProviderId) {
    const provider = await prisma.aiProvider.findUnique({
      where: { id: probeProviderId },
    });
    if (!provider || provider.userId !== user.id) {
      return Response.json({ error: "Provider 不存在" }, { status: 404 });
    }

    try {
      if (provider.type === "official") {
        // 官方：带 token 调云端 models 接口，取平台模型组
        const resp = await fetch(`${trimSlash(provider.baseUrl)}/api/ai/models`, {
          headers: { Authorization: `Bearer ${provider.apiKey}` },
          signal: AbortSignal.timeout(15_000),
        });
        if (!resp.ok) {
          if (resp.status === 401) {
            return Response.json(
              { error: "平台账号凭证无效或已过期，请重新绑定" },
              { status: 401 }
            );
          }
          return Response.json({ error: "同步官方模型失败" }, { status: 502 });
        }
        const data = (await resp.json()) as {
          providers?: { type?: string; models?: { id: string; name: string }[] }[];
        };
        const platformGroup = data.providers?.find((g) => g.type === "platform");
        return Response.json({
          models: platformGroup?.models || [],
        });
      }

      // 自定义：OpenAI 协议 GET /models（仅依赖标准 data[].id）
      const resp = await fetch(`${trimSlash(provider.baseUrl)}/models`, {
        headers: { Authorization: `Bearer ${provider.apiKey}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (!resp.ok) {
        return Response.json(
          { error: "拉取模型列表失败，请检查 BaseURL 与 API Key" },
          { status: 502 }
        );
      }
      const data = (await resp.json()) as { data?: { id?: string }[] };
      const models = (data.data || [])
        .map((m) => ({ id: String(m.id || ""), name: String(m.id || "") }))
        .filter((m) => m.id);
      return Response.json({ models });
    } catch {
      return Response.json(
        { error: "无法连接服务商，请检查网络与 BaseURL" },
        { status: 502 }
      );
    }
  }

  const { groups, defaultModelRef } = await getModelGroups(user.id);
  return Response.json({ providers: groups, defaultModelRef });
}
