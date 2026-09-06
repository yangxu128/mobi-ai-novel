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
import { streamChat, estimateTokens, AIStreamStalledError } from "@/lib/ai/provider";
import { resolveModel } from "@/lib/ai/models";
import { checkQuota } from "@/lib/ai/quota";
import { logAIUsage, buildChapterContext } from "@/lib/ai/rag";
import { deductCredits, TOKENS_PER_CREDIT } from "@/lib/ai/credits";
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

  const encoder = new TextEncoder();
  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort());

  let completionText = "";
  let reasoningText = "";
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

        // maxTokens 32768：给思考与正文留足预算。
        // 大纲类 JSON 结构化任务关闭思考（thinking disabled）：
        // 推理模型思考动辄数万 token、耗时数分钟且大概率解析失败，
        // 得不偿失。重试策略（共 3 轮）：
        // - 正文为空 → 追加提示词要求直接输出后重试
        // - 流中途挂起（AIStreamStalledError）→ 发 reset 事件清空前端已渲染内容后整体重跑
        let attemptMsgs = messages;
        for (let attempt = 1; attempt <= 3; attempt++) {
          completionText = "";
          reasoningText = "";
          try {
            for await (const chunk of streamChat({
              messages: attemptMsgs,
              model,
              signal: abort.signal,
              maxTokens: 32768,
              // 深度思考由页面开关控制（默认关，全 action 生效）
              thinking: body.thinking === true ? "enabled" : "disabled",
            })) {
              // 思考内容单独作为 reasoning 事件推送（前端显示思考中）
              if (chunk.reasoning) {
                reasoningText += chunk.delta;
                send("reasoning", { text: chunk.delta });
                continue;
              }
              if (chunk.delta) {
                completionText += chunk.delta;
                send("delta", { text: chunk.delta });
              }
            }
          } catch (e) {
            // 流中途挂起：provider 层已重试无果，这里清空前端内容后整体重跑
            if (e instanceof AIStreamStalledError && attempt < 3 && !abort.signal.aborted) {
              send("reset", { reason: "stalled", message: "生成中断，正在自动重试..." });
              send("reasoning", { text: "\n[流式输出挂起，自动重试中...]\n" });
              continue;
            }
            throw e;
          }
          if (completionText.trim() || attempt >= 3) break;
          // 正文为空：提示模型直接输出后重试
          attemptMsgs = [
            ...attemptMsgs,
            {
              role: "user" as const,
              content:
                "你上一轮只输出了思考过程，没有输出正文。请直接输出符合要求的 JSON 数组结果，不要输出任何解释或思考过程。",
            },
          ];
          send("reasoning", { text: "\n[模型未输出正文，自动重试中...]\n" });
        }

        // 计费含思考 token（推理模型的思考也是真实成本）
        const completionTokens =
          estimateTokens(completionText) + estimateTokens(reasoningText);
        send("done", {
          text: completionText,
          promptTokens,
          completionTokens,
        });

        // 异步记账 + 积分扣减（1 积分 = 4000 tokens，向上取整）
        await logAIUsage({
          userId,
          projectId,
          action: action as never,
          model,
          promptTokens,
          completionTokens,
        });
        try {
          await deductCredits(
            userId,
            quota.role,
            Math.ceil((promptTokens + completionTokens) / TOKENS_PER_CREDIT)
          );
        } catch {
          // 积分扣减失败不阻塞生成结果
        }
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
