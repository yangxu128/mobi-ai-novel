"use client";

/**
 * SSE 流式 AI 生成 Hook。
 * 调用 /api/ai/generate，逐 token 返回。
 */

import { useCallback, useRef, useState } from "react";

interface UseAIStreamOptions {
  onDone?: (fullText: string) => void;
  onError?: (err: string) => void;
}

export function useAIStream(opts: UseAIStreamOptions = {}) {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fullTextRef = useRef("");

  const generate = useCallback(
    async (payload: { action: string; projectId?: string; payload: Record<string, unknown> }) => {
      setText("");
      setError(null);
      fullTextRef.current = "";
      setIsStreaming(true);

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const resp = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: abort.signal,
        });

        if (resp.status === 401) {
          setError("未登录");
          opts.onError?.("未登录");
          setIsStreaming(false);
          return;
        }
        if (resp.status === 429) {
          const data = await resp.json().catch(() => ({}));
          const msg = `今日配额已用尽（${data.used || 0}/${data.limit || 0}）`;
          setError(msg);
          opts.onError?.(msg);
          setIsStreaming(false);
          return;
        }
        if (!resp.ok || !resp.body) {
          const data = await resp.json().catch(() => ({}));
          const msg = data.error || `请求失败 (${resp.status})`;
          setError(msg);
          opts.onError?.(msg);
          setIsStreaming(false);
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

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
              } else if (event === "error") {
                setError(data.message || "生成失败");
                opts.onError?.(data.message || "生成失败");
              } else if (event === "done") {
                opts.onDone?.(fullTextRef.current);
              }
            } catch {
              // ignore
            }
          }
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          // 用户主动取消，保留已生成内容
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
    fullTextRef.current = "";
    setError(null);
  }, []);

  return { text, isStreaming, error, generate, stop, reset };
}
