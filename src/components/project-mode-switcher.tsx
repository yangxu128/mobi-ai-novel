"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 项目模式切换器 - 客户端状态切换版本
 *
 * 不再走 router.push，而是通过 props.onChange 通知父组件切换视图。
 * 父组件 ProjectWorkspace 在客户端通过 setState 切换，
 * 配合 history.replaceState 同步 URL，避免触发 Server Component 重新执行。
 * 样式为「Editorial Calm」下划线页签：选中项橙色文字 + 底部橙色指示条。
 */

export const VIEW_MODES = [
  { key: "PIPELINE", label: "流水线", query: "pipeline" },
  { key: "WORKBENCH", label: "工作台", query: "workbench" },
  { key: "CHAT", label: "对话共创", query: "chat" },
] as const;

export type ViewMode = "PIPELINE" | "WORKBENCH" | "CHAT";

interface Props {
  current: ViewMode;
  onChange: (mode: ViewMode) => void;
  pending?: ViewMode | null;
}

export function ProjectModeSwitcher({ current, onChange, pending }: Props) {
  // 切换中：禁用其他 tab，防止重复点击
  const isPending = !!pending;
  const displayValue = isPending ? (pending as ViewMode) : current;

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-bg-overlay-l1 p-1" role="tablist" aria-label="切换创作模式">
      {VIEW_MODES.map((m) => {
        const isLoading = isPending && pending === m.key;
        const active = displayValue === m.key;
        return (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={isPending}
            onClick={() => onChange(m.key)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-md px-3.5 text-[13px] transition-colors disabled:cursor-not-allowed",
              active
                ? "bg-bg-base-default font-medium text-text-brand shadow-[0_1px_3px_rgba(26,26,26,0.08)]"
                : "text-text-secondary hover:text-text-default"
            )}
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
