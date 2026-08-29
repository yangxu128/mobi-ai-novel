"use client";

import { useEffect, useState, useTransition, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Workflow, PenLine, MessageSquare, Loader2 } from "lucide-react";
import { updateProjectModeAction } from "@/actions/project";

/**
 * 项目模式切换器 - 客户端状态切换版本
 *
 * 不再走 router.push，而是通过 props.onChange 通知父组件切换视图。
 * 父组件 ProjectWorkspace 在客户端通过 setState 切换，
 * 配合 history.replaceState 同步 URL，避免触发 Server Component 重新执行。
 */

export const VIEW_MODES = [
  { key: "PIPELINE", label: "流水线", icon: Workflow, query: "pipeline" },
  { key: "WORKBENCH", label: "工作台", icon: PenLine, query: "workbench" },
  { key: "CHAT", label: "对话共创", icon: MessageSquare, query: "chat" },
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
    <Tabs value={displayValue} onValueChange={(v) => onChange(v as ViewMode)}>
      <TabsList className={isPending ? "opacity-90" : ""}>
        {VIEW_MODES.map((m) => {
          const Icon = m.icon;
          const isLoading = isPending && pending === m.key;
          return (
            <TabsTrigger
              key={m.key}
              value={m.key}
              className="gap-1.5"
              disabled={isPending}
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              {m.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
