"use client";

/**
 * SSE 流式 AI 生成 Hook。
 * 调用 /api/ai/generate，逐 token 返回。
 *
 * 断点续传：流被平台超时（EdgeOne 云函数 120s 上限）或网络中断切断时，
 * 连接断开但收不到 done/error 事件。此时自动携带已生成内容
 * （payload.__continuation）发起续传请求，模型从中断处继续输出。
 */

import { useCallback, useRef, useState } from "react";
import { isThinkingEnabled } from "@/lib/ai/thinking";

interface UseAIStreamOptions {
  onDone?: (fullText: string) => void;
  onError?: (err: string) => void;
  /** 用户主动停止时回调（携带已生成的部分内容） */
  onAbort?: (partialText: string) => void;
}

/** 1 次初始请求 + 2 次断点续传 */
const MAX_ROUNDS = 3;

export function useAIStream(opts: UseAIStreamOptions = {}) {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [thinking, setThinking] = useState(0); // 推理模型思考字数
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fullTextRef = useRef("");

  const generate = useCallback(
    async (payload: { action: string; projectId?: string; payload: Record<string, unknown> }) => {
      setText("");
      setError(null);
      setThinking(0);
      fullTextRef.current = "";
      setIsStreaming(true);

      const abort = new AbortController();
      abortRef.current = abort;

      let lastErrMsg = "";
      let round = 0;

      try {
        while (round < MAX_ROUNDS) {
          round++;
          const isContinuation = round > 1;
          let receivedDone = false;
          let gotError = false;

          let resp: Response;
          try {
            resp = await fetch("/api/ai/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: payload.action,
                projectId: payload.projectId,
                payload: isContinuation
                  ? { ...payload.payload, __continuation: fullTextRef.current }
                  : payload.payload,
                // 深度思考开关（页面控制，默认关）
                thinking: isThinkingEnabled(),
              }),
              signal: abort.signal,
            });
          } catch (e) {
            // 请求阶段网络异常：无内容时完整重试，有内容时续传
            if ((e as Error).name === "AbortError") throw e;
            lastErrMsg = (e as Error).message || "网络异常";
            continue;
          }

          if (resp.status === 401) {
            setError("未登录");
            opts.onError?.("未登录");
            return;
          }
          if (resp.status === 429) {
            const data = await resp.json().catch(() => ({}));
            // 区分「配额用尽」与「请求过于频繁」：服务端配额 429 返回
            // error === "QUOTA_EXCEEDED"，频次限流 429 返回具体文案
            const msg =
              data.error === "QUOTA_EXCEEDED"
                ? `今日积分已用完（${data.usedCredits ?? Math.round((data.used || 0) / 100 * 10) / 10}/${data.limitCredits ?? Math.round((data.limit || 0) / 100 * 10) / 10} 积分），北京时间 0 点重置，或升级套餐`
                : typeof data.error === "string"
                  ? data.error
                  : "请求过于频繁，请稍后再试";
            setError(msg);
            opts.onError?.(msg);
            return;
          }
          if (!resp.ok || !resp.body) {
            const data = await resp.json().catch(() => ({}));
            // data.error 可能是字符串或对象
            let msg = `请求失败 (${resp.status})`;
            if (typeof data.error === "string") {
              msg = data.error;
            } else if (data.error?.message) {
              msg = data.error.message;
            } else if (data.message) {
              msg = data.message;
            }
            // 内容审查友好提示
            if (data.error?.code === "data_inspection_failed" || msg.includes("inappropriate content")) {
              msg = "输入或输出内容涉嫌敏感，已被内容安全审查拦截，请修改后重试";
            }
            setError(msg);
            opts.onError?.(msg);
            return;
          }

          const reader = resp.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });

              // 按 SSE 事件分割
              const parts = buffer.split("\n\n");
              buffer = parts.pop() || "";

              for (const part of parts) {
                const lines = part.split("\n");
                let event = "message";
                let dataStr = "";
                for (const line of lines) {
                  if (line.startsWith("event: ")) event = line.slice(7);
                  else if (line.startsWith("data: ")) dataStr += line.slice(6);
                }
                if (!dataStr) continue;
                try {
                  const data = JSON.parse(dataStr);
                  if (event === "delta" && data.text) {
                    fullTextRef.current += data.text;
                    setText(fullTextRef.current);
                  } else if (event === "reasoning" && data.text) {
                    // 推理模型思考内容：仅累计字数用于"思考中"反馈
                    setThinking((n) => n + data.text.length);
                  } else if (event === "reset") {
                    // 流中断自动重试：清空上一轮已渲染内容，避免重跑后文本重复
                    fullTextRef.current = "";
                    setText("");
                    setThinking(0);
                  } else if (event === "error") {
                    // 服务端已重试 3 轮失败：终止，不再续传
                    gotError = true;
                    setError(data.message || "生成失败");
                    opts.onError?.(data.message || "生成失败");
                  } else if (event === "done") {
                    receivedDone = true;
                    opts.onDone?.(fullTextRef.current);
                  }
                } catch {
                  // ignore
                }
              }
            }
          } catch (e) {
            // 读取阶段网络中断：无内容时完整重试，有内容时续传
            if ((e as Error).name === "AbortError") throw e;
            lastErrMsg = (e as Error).message || "连接中断";
          }

          // 成功完成（或服务端已终态报错）
          if (receivedDone || gotError) return;
          // 流静默中断（连接断开且无 done/error 事件）→ 下一轮断点续传
        }

        // 续传轮次用尽仍中断：有部分内容则保留并提示，无内容则报错
        if (fullTextRef.current.trim()) {
          const msg = "网络不稳定，已生成部分内容，请点击重试继续";
          setError(msg);
          opts.onError?.(msg);
        } else {
          const msg = lastErrMsg || "生成中断，请重试";
          setError(msg);
          opts.onError?.(msg);
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          // 用户主动取消：把已生成的部分内容交给 onAbort（如自动保存）
          opts.onAbort?.(fullTextRef.current);
        } else {
          setError((e as Error).message);
          opts.onError?.((e as Error).message);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [opts]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setText("");
    setThinking(0);
    fullTextRef.current = "";
    setError(null);
  }, []);

  return { text, isStreaming, thinking, error, generate, stop, reset };
}
