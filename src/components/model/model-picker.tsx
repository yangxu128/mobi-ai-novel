"use client";

/**
 * 项目级 AI 模型选择器。
 *
 * 从 /api/ai/models 获取可用模型列表，用 Popover 下拉展示。
 * 选择后调用 onChange，由父组件负责持久化。
 */

import { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronDown, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModelOption {
  id: string;
  name: string;
}

interface Props {
  /** 项目当前模型 id，null 或空表示使用默认 */
  value: string | null;
  onChange: (modelId: string | null) => void;
}

export function ModelPicker({ value, onChange }: Props) {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [defaultModel, setDefaultModel] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/ai/models")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.models)) setModels(data.models);
        if (data.defaultModel) setDefaultModel(data.defaultModel);
      })
      .catch(() => {});
  }, []);

  const activeId = value || defaultModel;
  const activeName =
    models.find((m) => m.id === activeId)?.name || activeId || "默认模型";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-overlay-l1 hover:bg-bg-overlay-l2 transition-colors text-xs text-text-default"
        >
          <Cpu className="h-3.5 w-3.5 text-icon-secondary" />
          <span className="font-medium text-text-default">{activeName}</span>
          <ChevronDown className="h-3 w-3 text-icon-tertiary" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        <div className="px-2 py-1.5 text-xs font-medium text-text-tertiary">
          选择 AI 模型
        </div>
        <div className="max-h-64 overflow-y-auto">
          {models.map((m) => (
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
      </PopoverContent>
    </Popover>
  );
}
