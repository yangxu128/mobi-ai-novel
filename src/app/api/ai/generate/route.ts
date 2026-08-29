/**
 * AI 流式生成统一入口。
 *
 * POST /api/ai/generate
 * body: { action, projectId, payload }
 *
 * 用 SSE 返回流式 token。
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { streamChat, estimateTokens } from "@/lib/ai/provider";
import { resolveModel } from "@/lib/ai/models";
import { checkQuota } from "@/lib/ai/quota";
import { logAIUsage, buildChapterContext } from "@/lib/ai/rag";
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
} from "@/lib/ai/prompts";
import type { AIMessage } from "@/lib/ai/provider";
import type { StyleProfile } from "@/lib/ai/style";
import { rateLimit } from "@/lib/ai/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  async outline({ payload }) {
    const worldSummary = String(payload.worldSummary || "");
    const characterSummary = String(payload.characterSummary || "");
    const genre = String(payload.genre || "都市");
    const template = String(payload.template || "三幕式");
    const styleProfile = (payload.styleProfile as StyleProfile | null) ?? null;
    return outlinePrompt(worldSummary, characterSummary, genre, template, styleProfile);
  },

  async outlineAppend({ payload }) {
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
    return outlineAppendPrompt(worldSummary, characterSummary, genre, template, existingOutlines, styleProfile);
  },

  async expand({ projectId, payload }) {
    if (!projectId) throw new Error("缺少 projectId");
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { styleProfile: true },
    });
    const outlineId = payload.outlineId ? String(payload.outlineId) : undefined;
    const instruction = String(payload.instruction || "请按大纲扩写本章");
    const ctx = await buildChapterContext({ projectId, currentOutlineId: outlineId });
    const styleProfile = (project?.styleProfile as StyleProfile | null) ?? null;
    return expandPrompt(instruction, ctx, styleProfile);
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
};

export async function POST(req: NextRequest) {
  // CSRF 保护：校验 Origin 头，防止跨站 POST
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && !origin.includes(host)) {
    return new Response(JSON.stringify({ error: "跨站请求被拒绝" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "未登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = session.user.id;

  // 限流：每用户每分钟最多 15 次 AI 请求
  const rl = rateLimit(userId, 15, 60_000);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: "请求过于频繁，请稍后再试" }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { action, projectId, payload } = body as {
    action: string;
    projectId?: string;
    payload: Record<string, unknown>;
  };

  if (!action || !actionHandlers[action]) {
    return new Response(
      JSON.stringify({ error: `未知 action: ${action || "(空)"}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 配额检查
  const quota = await checkQuota(userId);
  if (!quota.ok) {
    return new Response(
      JSON.stringify({
        error: "QUOTA_EXCEEDED",
        used: quota.used,
        limit: quota.limit,
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // 解析项目级模型：有 projectId 时读项目配置，否则回退到 DEFAULT_MODEL
  let projectModel: string | null = null;
  if (projectId) {
    const proj = await prisma.project.findUnique({
      where: { id: projectId },
      select: { model: true },
    });
    projectModel = proj?.model ?? null;
  }
  const model = resolveModel(projectModel);

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

  const encoder = new TextEncoder();
  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort());

  let completionText = "";
  let promptTokens = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        // 估算 prompt tokens
        promptTokens = messages.reduce(
          (sum, m) => sum + estimateTokens(m.content),
          0
        );
        send("start", { model, promptTokens });

        for await (const chunk of streamChat({
          messages,
          model,
          signal: abort.signal,
        })) {
          if (chunk.delta) {
            completionText += chunk.delta;
            send("delta", { text: chunk.delta });
          }
        }

        const completionTokens = estimateTokens(completionText);
        send("done", {
          text: completionText,
          promptTokens,
          completionTokens,
        });

        // 异步记账
        await logAIUsage({
          userId,
          projectId,
          action: action as never,
          model,
          promptTokens,
          completionTokens,
        });
      } catch (e) {
        // 提取友好错误信息
        const err = e as Error & { 
          status?: number; 
          error?: { code?: string; message?: string; type?: string };
          response?: { status?: number; data?: { error?: { code?: string; message?: string } } };
        };
        let errMsg = err.message || "生成失败";
        let errCode = "";

        // OpenAI SDK 错误对象结构
        if (err.error?.code) errCode = err.error.code;
        if (err.error?.message) errMsg = err.error.message;
        if (err.response?.data?.error?.code) errCode = err.response.data.error.code;
        if (err.response?.data?.error?.message) errMsg = err.response.data.error.message;

        // 内容审查拦截友好提示
        if (errCode === "data_inspection_failed" || errMsg.includes("inappropriate content")) {
          errMsg = "输入或输出内容涉嫌敏感，已被内容安全审查拦截，请修改后重试";
        }
        // 配额/限流
        if (err.status === 429 || errCode === "rate_limit_exceeded") {
          errMsg = "AI 请求过于频繁，请稍后重试";
        }
        // 模型不可用
        if (err.status === 404 || errMsg.includes("model")) {
          errMsg = "AI 模型暂时不可用，请稍后重试";
        }

        send("error", { message: errMsg, code: errCode });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
