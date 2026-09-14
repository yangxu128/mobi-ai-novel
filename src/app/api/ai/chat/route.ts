/**
 * 通用 AI 消息端点（云端计费）。
 * POST /api/ai/chat
 * body: { messages, model?, temperature?, maxTokens?, thinking?, stream?, action? }
 *
 * 桌面版官方通道的转发目标：桌面端本地组装完整 prompt（含本地 RAG 上下文）
 * 后转发至此，云端用平台模型生成并对绑定账号计费。
 * stream=true 时返回与 /api/ai/generate 相同格式的 SSE 流。
 */

import { NextRequest } from "next/server";
import { resolveApiUser } from "@/lib/api-user";
import { checkQuota } from "@/lib/ai/quota";
import { rateLimit } from "@/lib/ai/rate-limit";
import { chat, estimateTokens, DEFAULT_MODEL, getEnvModels, type AIMessage } from "@/lib/ai/provider";
import { createAIChatResponse } from "@/lib/ai/chat-stream";
import { logAIUsage } from "@/lib/ai/rag";
import { deductCredits, TOKENS_PER_CREDIT } from "@/lib/ai/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 上限：防滥用（消息数 / 总字符） */
const MAX_MESSAGES = 80;
const MAX_TOTAL_CHARS = 600_000;

const VALID_ACTIONS = new Set([
  "inspire",
  "worldbuild",
  "character",
  "outline",
  "outlineAppend",
  "expand",
  "polish",
  "chat",
  "consistency",
  "extract",
  "wikiExtract",
  "summary",
  "analyzeStyle",
  "importParse",
]);

export async function POST(req: NextRequest) {
  // Bearer token（桌面版）或 session
  const user = await resolveApiUser(req);
  if (!user) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    messages?: AIMessage[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
    thinking?: boolean | "enabled" | "disabled";
    stream?: boolean;
    action?: string;
  };

  // 校验 messages
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (
    messages.length === 0 ||
    messages.length > MAX_MESSAGES ||
    !messages.every(
      (m) =>
        (m?.role === "system" || m?.role === "user" || m?.role === "assistant") &&
        typeof m?.content === "string"
    ) ||
    messages.reduce((s, m) => s + m.content.length, 0) > MAX_TOTAL_CHARS
  ) {
    return Response.json({ error: "messages 参数不合法" }, { status: 400 });
  }

  // 模型校验：仅允许平台模型列表内的值
  const model =
    typeof body.model === "string" && getEnvModels().some((m) => m.id === body.model)
      ? body.model
      : DEFAULT_MODEL;

  // 配额 + 限流（云端计费，与 generate 一致）
  const quota = await checkQuota(user.id);
  if (!quota.ok) {
    return Response.json(
      { error: "QUOTA_EXCEEDED", available: quota.available, checkInReward: quota.checkInReward },
      { status: 429 }
    );
  }
  if (!quota.unlimited) {
    const rl = rateLimit(user.id, 15, 60_000);
    if (!rl.ok) {
      return Response.json(
        { error: "请求过于频繁，请稍后再试" },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
  }

  const thinking = body.thinking === true || body.thinking === "enabled";
  const action =
    typeof body.action === "string" && VALID_ACTIONS.has(body.action)
      ? (body.action as Parameters<typeof logAIUsage>[0]["action"])
      : "chat";

  // 流式：SSE（与 generate 相同事件格式）
  if (body.stream) {
    return createAIChatResponse({
      messages,
      model,
      thinking,
      signal: req.signal,
      maxTokens: body.maxTokens,
      usage: {
        userId: user.id,
        action,
        billed: true,
        role: quota.role,
      },
    });
  }

  // 非流式：JSON
  try {
    const content = await chat({
      messages,
      model,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      thinking: thinking ? "enabled" : "disabled",
    });
    const promptTokens = messages.reduce((s, m) => s + estimateTokens(m.content), 0);
    const completionTokens = estimateTokens(content);
    await logAIUsage({
      userId: user.id,
      action,
      model,
      promptTokens,
      completionTokens,
    });
    try {
      await deductCredits(
        user.id,
        quota.role,
        Math.ceil((promptTokens + completionTokens) / TOKENS_PER_CREDIT)
      );
    } catch {
      // 积分扣减失败不阻塞结果
    }
    return Response.json({ content, promptTokens, completionTokens });
  } catch (e) {
    const err = e as Error & {
      error?: { code?: string; message?: string };
      response?: { data?: { error?: { code?: string; message?: string } } };
    };
    let errMsg = err.message || "生成失败";
    if (err.error?.message) errMsg = err.error.message;
    if (err.response?.data?.error?.message) errMsg = err.response.data.error.message;
    if (
      err.error?.code === "data_inspection_failed" ||
      errMsg.includes("inappropriate content")
    ) {
      errMsg = "输入或输出内容涉嫌敏感，已被内容安全审查拦截，请修改后重试";
    }
    return Response.json({ error: errMsg }, { status: 502 });
  }
}
