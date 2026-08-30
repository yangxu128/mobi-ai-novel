"use client";

import { useEffect, useState } from "react";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isThinkingEnabled,
  setThinkingEnabled,
  THINKING_CHANGE_EVENT,
} from "@/lib/ai/thinking";

/**
 * 深度思考开关（默认关）：
 * 开启后推理模型先思考再输出——更慢、更耗 token；关闭则直接输出。
 * 状态存 localStorage，全站生成请求统一读取。
 */
export function ThinkingToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(isThinkingEnabled());
    const handler = () => setOn(isThinkingEnabled());
    window.addEventListener(THINKING_CHANGE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(THINKING_CHANGE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setThinkingEnabled(!on)}
      title={
        on
          ? "深度思考已开启：模型先思考再输出（更慢、更耗 token），点击关闭"
          : "深度思考已关闭：模型直接输出（更快更省），点击开启"
      }
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border transition-colors text-xs",
        on
          ? "border-transparent bg-bg-brand-popup text-text-brand"
          : "border-border-neutral-l2 text-text-tertiary hover:bg-bg-overlay-l1 hover:text-text-default"
      )}
    >
      <Brain className="h-3.5 w-3.5" />
      深度思考
      <span
        className={cn(
          "inline-flex h-3.5 w-6 items-center rounded-full px-0.5 transition-colors",
          on ? "bg-bg-brand justify-end" : "bg-bg-overlay-l3 justify-start"
        )}
      >
        <span className="h-2.5 w-2.5 rounded-full bg-white shadow-sm" />
      </span>
    </button>
  );
}
