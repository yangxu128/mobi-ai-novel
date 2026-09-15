/**
 * AI 流式生成统一入口。
 *
 * POST /api/ai/generate
 * body: { action, projectId, payload }
 *
 * 用 SSE 返回流式 token。
 */

import { NextRequest } from "next/server";
import { resolveApiUser } from "@/lib/api-user";
import { prisma } from "@/lib/prisma";
import { resolveModelRef } from "@/lib/ai/provider";
import { checkQuota } from "@/lib/ai/quota";
import { buildChapterContext } from "@/lib/ai/rag";
import { createAIChatResponse } from "@/lib/ai/chat-stream";
import {
  inspirePrompt,
  worldbuildPrompt,
  characterPrompt,
  outlinePrompt,
  outlineAppendPrompt,
  expandPrompt,
  polishPrompt,
  inlineAIPrompt,
  chatCoCreatePrompt,
  consistencyCheckPrompt,
  extractCardsPrompt,
  summaryPrompt,
  analyzeStylePrompt,
  importParsePrompt,
} from "@/lib/ai/prompts";
import type { AIMessage } from "@/lib/ai/provider";
import type { StyleProfile } from "@/lib/ai/style";
import { rateLimit } from "@/lib/ai/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// EdgeOne 云函数默认 30s 就掐断，长文生成需显式声明上限（配合前端断点续传）
export const maxDuration = 120;

/**
 * Action 处理器策略表。
 * 新增 action 只需在此注册一个 handler，无需修改 route 主体逻辑。
 */
type ActionHandler = (ctx: {
  projectId?: string;
  payload: Record<string, unknown>;
}) => Promise<AIMessage[]>;

const actionHandlers: Record<string, ActionHandler> = {
  async inspire({ payload }) {
    const idea = String(payload.idea || "");
    const genre = String(payload.genre || "都市");
    if (!idea) throw new Error("缺少 idea");
    const styleProfile = (payload.styleProfile as StyleProfile | null) ?? null;
    return inspirePrompt(idea, genre, styleProfile);
  },

  async worldbuild({ payload }) {
    const inspiration = String(payload.inspiration || "");
    const genre = String(payload.genre || "都市");
    const styleProfile = (payload.styleProfile as StyleProfile | null) ?? null;
    return worldbuildPrompt(inspiration, genre, undefined, styleProfile);
  },

  async character({ payload }) {
    const worldSummary = String(payload.worldSummary || "");
    const genre = String(payload.genre || "都市");
    const styleProfile = (payload.styleProfile as StyleProfile | null) ?? null;
    return characterPrompt(worldSummary, genre, undefined, styleProfile);
  },

  async outline({ projectId, payload }) {
    const worldSummary = String(payload.worldSummary || "");
    const characterSummary = String(payload.characterSummary || "");
    const genre = String(payload.genre || "都市");
    const template = String(payload.template || "三幕式");
    const styleProfile = (payload.styleProfile as StyleProfile | null) ?? null;
    // 全书规模：立项时设定的目标章节数/每章字数，让大纲有整体观
    const targets = projectId
      ? await prisma.project.findUnique({
          where: { id: projectId },
          select: { targetChapters: true, chapterWords: true },
        })
      : null;
    return outlinePrompt(worldSummary, characterSummary, genre, template, styleProfile, {
      targetChapters: targets?.targetChapters ?? null,
      chapterWords: targets?.chapterWords ?? null,
    });
  },

  async outlineAppend({ projectId, payload }) {
    const worldSummary = String(payload.worldSummary || "");
    const characterSummary = String(payload.characterSummary || "");
    const genre = String(payload.genre || "都市");
    const template = String(payload.template || "三幕式");
    const styleProfile = (payload.styleProfile as StyleProfile | null) ?? null;
    const existingOutlines = Array.isArray(payload.existingOutlines)
      ? (payload.existingOutlines as Array<Record<string, unknown>>)
          .map((o) => ({
            chapter: Number(o.chapter) || 0,
            sceneTitle: String(o.sceneTitle || ""),
            sceneSummary: String(o.sceneSummary || ""),
            povCharacter: o.povCharacter ? String(o.povCharacter) : "",
            plotPoints: Array.isArray(o.plotPoints) ? (o.plotPoints as string[]).map(String) : [],
            foreshadowing: o.foreshadowing ? String(o.foreshadowing) : "",
          }))
      : [];
    if (existingOutlines.length === 0) throw new Error("缺少已有大纲");
    const targets = projectId
      ? await prisma.project.findUnique({
          where: { id: projectId },
          select: { targetChapters: true, chapterWords: true },
        })
      : null;
    return outlineAppendPrompt(worldSummary, characterSummary, genre, template, existingOutlines, styleProfile, {
      targetChapters: targets?.targetChapters ?? null,
      chapterWords: targets?.chapterWords ?? null,
    });
  },

  async expand({ projectId, payload }) {
    if (!projectId) throw new Error("缺少 projectId");
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { styleProfile: true, chapterWords: true },
    });
    const outlineId = payload.outlineId ? String(payload.outlineId) : undefined;
    const instruction = String(payload.instruction || "请按大纲扩写本章");
    const ctx = await buildChapterContext({ projectId, currentOutlineId: outlineId });
    const styleProfile = (project?.styleProfile as StyleProfile | null) ?? null;
    return expandPrompt(instruction, ctx, styleProfile, project?.chapterWords ?? null);
  },

  async polish({ projectId, payload }) {
    const text = String(payload.text || "");
    if (!text) throw new Error("缺少 text");
    const style = (payload.style as "文笔提升" | "对话优化" | "节奏调整" | "环境描写") || "文笔提升";
    let styleProfile: StyleProfile | null = null;
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { styleProfile: true },
      });
      styleProfile = (project?.styleProfile as StyleProfile | null) ?? null;
    }
    return polishPrompt(text, style, styleProfile);
  },

  async inline({ projectId, payload }) {
    const selectedText = String(payload.selectedText || "");
    const act = payload.action as "续写" | "扩写" | "润色" | "改写" | "压缩" | "古文风格";
    const context = payload.context ? String(payload.context) : undefined;
    if (!selectedText || !act) throw new Error("缺少 selectedText 或 action");
    let styleProfile: StyleProfile | null = null;
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { styleProfile: true },
      });
      styleProfile = (project?.styleProfile as StyleProfile | null) ?? null;
    }
    return inlineAIPrompt(selectedText, act, context, styleProfile);
  },

  async chat({ projectId, payload }) {
    if (!projectId) throw new Error("缺少 projectId");
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { styleProfile: true },
    });
    const storySoFar = String(payload.storySoFar || "");
    const userMessage = String(payload.userMessage || "");
    if (!userMessage) throw new Error("缺少 userMessage");
    const ctx = await buildChapterContext({ projectId });
    const styleProfile = (project?.styleProfile as StyleProfile | null) ?? null;
    return chatCoCreatePrompt(storySoFar, userMessage, ctx, styleProfile);
  },

  async consistency({ projectId, payload }) {
    if (!projectId) throw new Error("缺少 projectId");
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { styleProfile: true },
    });
    const chapterContent = String(payload.chapterContent || "");
    if (!chapterContent) throw new Error("缺少 chapterContent");
    const ctx = await buildChapterContext({ projectId });
    const styleProfile = (project?.styleProfile as StyleProfile | null) ?? null;
    return consistencyCheckPrompt(chapterContent, ctx, styleProfile);
  },

  async extract({ projectId, payload }) {
    const dialogue = String(payload.dialogue || "");
    if (!dialogue) throw new Error("缺少 dialogue");
    let styleProfile: StyleProfile | null = null;
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { styleProfile: true },
      });
      styleProfile = (project?.styleProfile as StyleProfile | null) ?? null;
    }
    return extractCardsPrompt(dialogue, styleProfile);
  },

  async summary({ projectId, payload }) {
    const chapterContent = String(payload.chapterContent || "");
    if (!chapterContent) throw new Error("缺少 chapterContent");
    let styleProfile: StyleProfile | null = null;
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { styleProfile: true },
      });
      styleProfile = (project?.styleProfile as StyleProfile | null) ?? null;
    }
    return summaryPrompt(chapterContent, styleProfile);
  },

  async analyzeStyle({ payload }) {
    const sampleText = String(payload.sampleText || "");
    if (!sampleText || sampleText.length < 100) throw new Error("样本文本过短，至少需要 100 字");
    if (sampleText.length > 10000) throw new Error("样本文本过长，最多 10000 字");
    return analyzeStylePrompt(sampleText);
  },

  async importParse({ payload }) {
    // 导入向导的智能解析：sampleText 由前端采样构造（设定 + 章节采样）
    const sampleText = String(payload.sampleText || "");
    if (!sampleText) throw new Error("缺少 sampleText");
    if (sampleText.length > 16000) throw new Error("采样文本过长，最多 16000 字");
    const chapterOrders = Array.isArray(payload.chapterOrders)
      ? (payload.chapterOrders as unknown[]).map(Number).filter(Number.isFinite)
      : [];
    return importParsePrompt(sampleText, chapterOrders);
  },
};

export async function POST(req: NextRequest) {
  // CSRF 保护：校验 Origin 头，防止跨站 POST
  // （Bearer token 请求靠 token 本身认证，跳过 Origin 校验——桌面版转发不带 Origin）
  const hasBearer = /^Bearer\s+/i.test(req.headers.get("authorization") || "");
  if (!hasBearer) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host && !origin.includes(host)) {
      return new Response(JSON.stringify({ error: "跨站请求被拒绝" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // 认证：浏览器 session 或桌面版 Bearer token（云端对 token 对应账号照常计费）
  const apiUser = await resolveApiUser(req);
  if (!apiUser) {
    return new Response(JSON.stringify({ error: "未登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = apiUser.id;

  const body = await req.json().catch(() => ({}));
  const { action, projectId, payload } = body as {
    action: string;
    projectId?: string;
    payload: Record<string, unknown>;
    /** 深度思考开关（页面控制，默认关）：开=模型先思考再输出 */
    thinking?: boolean;
  };

  if (!action || !actionHandlers[action]) {
    return new Response(
      JSON.stringify({ error: `未知 action: ${action || "(空)"}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 解析项目级模型 + 双模式通道（DB Provider → env 回退）
  let projectModel: string | null = null;
  if (projectId) {
    const proj = await prisma.project.findUnique({
      where: { id: projectId },
      select: { model: true },
    });
    projectModel = proj?.model ?? null;
  }
  const config = await resolveModelRef(projectModel, userId);

  // 配额 + 限流：仅平台通道本地计费（custom=用户自己的 Key 免费；official=云端计费）
  let quotaRole: string | undefined;
  if (config.channel === "platform") {
    // 配额检查（管理员 unlimited → 同时跳过下面的频次限流）
    const quota = await checkQuota(userId);
    if (!quota.ok) {
      return new Response(
        JSON.stringify({
          error: "QUOTA_EXCEEDED",
          available: quota.available,
          checkInReward: quota.checkInReward,
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
    // 限流：每用户每分钟最多 15 次 AI 请求（管理员不限量，跳过）
    if (!quota.unlimited) {
      const rl = rateLimit(userId, 15, 60_000);
      if (!rl.ok) {
        return new Response(
          JSON.stringify({ error: "请求过于频繁，请稍后再试" }),
          { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } }
        );
      }
    }
    quotaRole = quota.role;
  } else {
    // custom / official：不本地计费，仅保留频次限流保护
    const rl = rateLimit(userId, 15, 60_000);
    if (!rl.ok) {
      return new Response(
        JSON.stringify({ error: "请求过于频繁，请稍后再试" }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } }
      );
    }
  }

  // 组装 prompt（策略模式分发）
  let messages: AIMessage[] = [];

  try {
    messages = await actionHandlers[action]({ projectId, payload: payload || {} });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "prompt 组装失败" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 客户端断点续传：流被平台超时/网络中断切断后，前端携带已生成内容从中断处继续
  const continuation =
    typeof (payload || {}).__continuation === "string"
      ? ((payload as Record<string, unknown>).__continuation as string)
      : "";
  if (continuation) {
    messages = [
      ...messages,
      { role: "assistant" as const, content: continuation },
      {
        role: "user" as const,
        content:
          "你的输出在上文被意外中断。请从中断处的最后一个字符继续，只输出剩余内容。不要重复已输出的部分，不要重新开始，不要添加任何解释或道歉。",
      },
    ];
  }

  // official 通道：本地组装完整 prompt（含本地 RAG 上下文）后转发云端，
  // 云端用平台模型生成并对绑定账号计费（SSE 事件格式一致，直接透传）
  if (config.channel === "official" && config.platformUrl && config.token) {
    const upstream = await fetch(
      `${config.platformUrl.replace(/\/+$/, "")}/api/ai/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.token}`,
        },
        body: JSON.stringify({
          messages,
          model: config.modelId,
          thinking: body.thinking === true,
          stream: true,
          action,
        }),
        signal: req.signal,
      }
    );

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "");
      let errMsg = "";
      try {
        errMsg = (JSON.parse(text) as { error?: string }).error || "";
      } catch {
        // 非 JSON 错误体
      }
      if (upstream.status === 401) {
        errMsg = "平台账号凭证无效或已过期，请到「AI 设置」重新绑定";
      }
      return new Response(
        JSON.stringify({ error: errMsg || `平台请求失败（${upstream.status}）` }),
        { status: upstream.status, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  // custom / platform 通道：本地直连流式生成（SSE）
  return createAIChatResponse({
    messages,
    model: config.modelId,
    displayModel: config.ref,
    thinking: body.thinking === true,
    signal: req.signal,
    usage: {
      userId,
      projectId,
      // "inline" 不在记账枚举内，logAIUsage 内部 try/catch 兜底（与旧行为一致）
      action: action as never,
      billed: config.channel === "platform",
      role: quotaRole,
    },
  });
}
