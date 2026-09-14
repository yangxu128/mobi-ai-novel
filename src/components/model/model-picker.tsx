"use client";

/**
 * 项目级 AI 模型选择器。
 *
 * 从 /api/ai/models 获取分组模型列表（平台/官方/自定义 Provider），
 * 用 Popover 下拉按组展示。选择后调用 onChange（存 modelRef），
 * 由父组件负责持久化。旧值（纯 modelId）由后端兼容解析。
 */

import { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronDown, Cpu, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ModelOption {
  id: string;
  name: string;
}

interface ModelGroup {
  providerId: string;
  type: "official" | "custom" | "platform";
  name: string;
  isDefault: boolean;
  models: ModelOption[];
}

interface Props {
  /** 项目当前模型（modelRef 或旧值纯 modelId），null 或空表示使用默认 */
  value: string | null;
  onChange: (modelId: string | null) => void;
}

export function ModelPicker({ value, onChange }: Props) {
  const [groups, setGroups] = useState<ModelGroup[]>([]);
  const [defaultModel, setDefaultModel] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/ai/models")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (Array.isArray(data.providers)) setGroups(data.providers);
        if (typeof data.defaultModelRef === "string") setDefaultModel(data.defaultModelRef);
      })
      .catch(() => {});
  }, [open]);

  const allModels = groups.flatMap((g) => g.models);
  const activeId = value || defaultModel;
  const activeName =
    allModels.find((m) => m.id === activeId)?.name ||
    (activeId && !activeId.includes("@")
      ? activeId
      : activeId?.split("@")[0]) ||
    "默认模型";
  const hasAnyModel = allModels.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-overlay-l1 hover:bg-bg-overlay-l2 transition-colors text-xs text-text-default"
        >
          <Cpu className="h-3.5 w-3.5 text-icon-secondary" />
          <span className="font-medium text-text-default">{activeName}</span>
          <ChevronDown className="h-3 w-3 text-text-tertiary" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        <div className="px-2 py-1.5 text-xs font-medium text-text-tertiary">
          选择 AI 模型
        </div>
        <div className="max-h-72 overflow-y-auto">
          {!hasAnyModel && (
            <div className="px-2 py-3 text-xs text-text-tertiary">
              暂无可用模型，请先到
              <Link
                href="/settings"
                className="mx-1 underline underline-offset-2 text-text-default"
              >
                AI 设置
              </Link>
              配置
            </div>
          )}
          {groups.map((g) =>
            g.models.length === 0 ? null : (
              <div key={g.providerId}>
                <div className="px-2 pt-2 pb-1 text-[11px] font-medium text-text-tertiary flex items-center gap-1">
                  <span>{g.name}</span>
                </div>
                {g.models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onChange(m.id === defaultModel ? null : m.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors",
                      m.id === activeId
                        ? "bg-bg-overlay-l2 text-text-default"
                        : "hover:bg-bg-overlay-l1 text-text-default"
                    )}
                  >
                    <span className="truncate">{m.name}</span>
                    {m.id === activeId && (
                      <Check className="h-3.5 w-3.5 text-text-default shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )
          )}
        </div>
        <div className="border-t border-border-neutral-l1 mt-1 pt-1">
          <Link
            href="/settings"
            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-text-secondary hover:bg-bg-overlay-l1 hover:text-text-default transition-colors"
            onClick={() => setOpen(false)}
          >
            <Settings className="h-3.5 w-3.5" />
            管理模型（AI 设置）
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
