/**
 * AI 流式生成 SSE 响应构建（generate 与 chat 端点共用）。
 *
 * 事件格式（use-ai-stream 解析）：
 * - start { model, promptTokens }
 * - reasoning { text }   思考内容增量
 * - delta { text }       正文增量
 * - reset { reason, message }  中断重跑时清空前端已渲染内容
 * - done { text, promptTokens, completionTokens }
 * - error { message, code }
 *
 * 内置 3 轮重试：正文为空追加提示重跑；流挂起 reset 后整体重跑。
 * 计费：usage.billed 为 true 时按 tokens 折算扣积分（仅 platform 通道）。
 */

import type { AIMessage } from "./provider";
import { streamChat, estimateTokens, AIStreamStalledError } from "./provider";
import { logAIUsage } from "./rag";
import { deductCredits, TOKENS_PER_CREDIT } from "./credits";

type LogAction =
  | "inspire"
  | "worldbuild"
  | "character"
  | "outline"
  | "outlineAppend"
  | "expand"
  | "polish"
  | "chat"
  | "consistency"
  | "extract"
  | "wikiExtract"
  | "summary"
  | "analyzeStyle"
  | "importParse";

export function createAIChatResponse(opts: {
  messages: AIMessage[];
  /** 实际调用的 modelId */
  model: string;
  /** 显示/记账用（modelRef），缺省同 model */
  displayModel?: string;
  thinking: boolean;
  signal?: AbortSignal;
  maxTokens?: number;
  /** 记账 + 本地扣费配置；省略则不记账 */
  usage?: {
    userId: string;
    projectId?: string;
    action: LogAction;
    /** 仅 platform 通道为 true（official 云端已扣、custom 免费） */
    billed: boolean;
    /** billed 时必传（deductCredits 需要角色） */
    role?: string;
  };
}): Response {
  const displayModel = opts.displayModel || opts.model;
  const encoder = new TextEncoder();
  const abort = new AbortController();
  opts.signal?.addEventListener("abort", () => abort.abort());

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
        promptTokens = opts.messages.reduce(
          (sum, m) => sum + estimateTokens(m.content),
          0
        );
        send("start", { model: displayModel, promptTokens });

        // maxTokens 32768：给思考与正文留足预算。
        // 大纲类 JSON 结构化任务关闭思考（thinking disabled）：
        // 推理模型思考动辄数万 token、耗时数分钟且大概率解析失败，
        // 得不偿失。重试策略（共 3 轮）：
        // - 正文为空 → 追加提示词要求直接输出后重试
        // - 流中途挂起（AIStreamStalledError）→ 发 reset 事件清空前端已渲染内容后整体重跑
        let attemptMsgs = opts.messages;
        for (let attempt = 1; attempt <= 3; attempt++) {
          completionText = "";
          reasoningText = "";
          try {
            for await (const chunk of streamChat({
              messages: attemptMsgs,
              model: opts.model,
              signal: abort.signal,
              maxTokens: opts.maxTokens ?? 32768,
              // 深度思考由页面开关控制（默认关，全 action 生效）
              thinking: opts.thinking ? "enabled" : "disabled",
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
            if (
              e instanceof AIStreamStalledError &&
              attempt < 3 &&
              !abort.signal.aborted
            ) {
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
        if (opts.usage) {
          await logAIUsage({
            userId: opts.usage.userId,
            projectId: opts.usage.projectId,
            action: opts.usage.action,
            model: displayModel,
            promptTokens,
            completionTokens,
          });
          if (opts.usage.billed && opts.usage.role) {
            try {
              await deductCredits(
                opts.usage.userId,
                opts.usage.role,
                Math.ceil((promptTokens + completionTokens) / TOKENS_PER_CREDIT)
              );
            } catch {
              // 积分扣减失败不阻塞生成结果
            }
          }
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
