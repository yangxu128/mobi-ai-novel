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
import { streamChat, estimateTokens, DEFAULT_MODEL } from "@/lib/ai/provider";
import { checkQuota } from "@/lib/ai/quota";
import { logAIUsage, buildChapterContext } from "@/lib/ai/rag";
import {
  inspirePrompt,
  worldbuildPrompt,
  characterPrompt,
  outlinePrompt,
  expandPrompt,
  polishPrompt,
  inlineAIPrompt,
  chatCoCreatePrompt,
  consistencyCheckPrompt,
  extractCardsPrompt,
  summaryPrompt,
} from "@/lib/ai/prompts";
import type { AIMessage } from "@/lib/ai/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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
  };

  if (!action) {
    return new Response(JSON.stringify({ error: "缺少 action 参数" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
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

  // 组装 prompt
  let messages: AIMessage[] = [];
  const model = DEFAULT_MODEL;

  try {
    messages = await buildMessages(action, projectId, payload);
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
        const err = e as Error;
        send("error", { message: err.message });
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

async function buildMessages(
  action: string,
  projectId: string | undefined,
  payload: Record<string, unknown>
): Promise<AIMessage[]> {
  switch (action) {
    case "inspire": {
      const idea = String(payload.idea || "");
      const genre = String(payload.genre || "都市");
      if (!idea) throw new Error("缺少 idea");
      return inspirePrompt(idea, genre);
    }
    case "worldbuild": {
      const inspiration = String(payload.inspiration || "");
      const genre = String(payload.genre || "都市");
      return worldbuildPrompt(inspiration, genre);
    }
    case "character": {
      const worldSummary = String(payload.worldSummary || "");
      const genre = String(payload.genre || "都市");
      return characterPrompt(worldSummary, genre);
    }
    case "outline": {
      const worldSummary = String(payload.worldSummary || "");
      const characterSummary = String(payload.characterSummary || "");
      const genre = String(payload.genre || "都市");
      const template = String(payload.template || "三幕式");
      return outlinePrompt(worldSummary, characterSummary, genre, template);
    }
    case "expand": {
      if (!projectId) throw new Error("缺少 projectId");
      const outlineId = payload.outlineId
        ? String(payload.outlineId)
        : undefined;
      const instruction = String(payload.instruction || "请按大纲扩写本章");
      const ctx = await buildChapterContext({ projectId, currentOutlineId: outlineId });
      return expandPrompt(instruction, ctx);
    }
    case "polish": {
      const text = String(payload.text || "");
      if (!text) throw new Error("缺少 text");
      const style = (payload.style as "文笔提升" | "对话优化" | "节奏调整" | "环境描写") || "文笔提升";
      return polishPrompt(text, style);
    }
    case "inline": {
      const selectedText = String(payload.selectedText || "");
      const act = payload.action as
        | "续写"
        | "扩写"
        | "润色"
        | "改写"
        | "压缩"
        | "古文风格";
      const context = payload.context ? String(payload.context) : undefined;
      if (!selectedText || !act) throw new Error("缺少 selectedText 或 action");
      return inlineAIPrompt(selectedText, act, context);
    }
    case "chat": {
      if (!projectId) throw new Error("缺少 projectId");
      const storySoFar = String(payload.storySoFar || "");
      const userMessage = String(payload.userMessage || "");
      if (!userMessage) throw new Error("缺少 userMessage");
      const ctx = await buildChapterContext({ projectId });
      return chatCoCreatePrompt(storySoFar, userMessage, ctx);
    }
    case "consistency": {
      if (!projectId) throw new Error("缺少 projectId");
      const chapterContent = String(payload.chapterContent || "");
      if (!chapterContent) throw new Error("缺少 chapterContent");
      const ctx = await buildChapterContext({ projectId });
      return consistencyCheckPrompt(chapterContent, ctx);
    }
    case "extract": {
      const dialogue = String(payload.dialogue || "");
      if (!dialogue) throw new Error("缺少 dialogue");
      return extractCardsPrompt(dialogue);
    }
    case "summary": {
      const chapterContent = String(payload.chapterContent || "");
      if (!chapterContent) throw new Error("缺少 chapterContent");
      return summaryPrompt(chapterContent);
    }
    default:
      throw new Error(`未知 action: ${action}`);
  }
}
