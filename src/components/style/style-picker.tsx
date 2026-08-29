"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { STYLE_PRESETS } from "@/lib/ai/style-presets";
import type { StyleProfile } from "@/lib/ai/style";
import { useAIStream } from "@/hooks/use-ai-stream";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const INTENSITY_OPTIONS = [
  { value: "low" as const, label: "轻微" },
  { value: "medium" as const, label: "中等" },
  { value: "high" as const, label: "强烈" },
];

export interface StylePickerProps {
  /** 当前已选风格（null 表示未设置） */
  value: StyleProfile | null;
  /** 选择/清除回调，返回完整的 StyleProfile 或 null */
  onChange: (profile: StyleProfile | null) => void;
  /** 是否显示强度选择器，默认 true */
  showIntensity?: boolean;
}

export function StylePicker({ value, onChange, showIntensity = true }: StylePickerProps) {
  const [mode, setMode] = useState<"preset" | "custom" | null>(
    value ? (value.type === "preset" ? "preset" : "custom") : null
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    value?.type === "preset" ? STYLE_PRESETS.find((p) => p.name === value.name)?.id ?? null : null
  );
  const [intensity, setIntensity] = useState<StyleProfile["intensity"]>(value?.intensity ?? "medium");
  const [sampleText, setSampleText] = useState("");
  const [customName, setCustomName] = useState(value?.type === "custom" ? value.name : "");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");

  const { generate, isStreaming, stop } = useAIStream({
    onDone: (full) => {
      setAnalysisResult(full);
      setAnalyzing(false);
    },
    onError: (err) => {
      toast({ title: "分析失败", description: err, type: "error" });
      setAnalyzing(false);
    },
  });

  function handlePresetSelect(presetId: string) {
    setSelectedPresetId(presetId);
    const preset = STYLE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    onChange({
      type: "preset",
      name: preset.name,
      description: preset.description,
      intensity,
    });
  }

  function handleIntensityChange(level: StyleProfile["intensity"]) {
    setIntensity(level);
    if (value) {
      onChange({ ...value, intensity: level });
    }
  }

  function handleAnalyze() {
    if (sampleText.length < 100) {
      toast({ title: "样本过短", description: "至少需要 100 字", type: "warning" });
      return;
    }
    setAnalyzing(true);
    setAnalysisResult("");
    generate({ action: "analyzeStyle", payload: { sampleText } });
  }

  function handleConfirmCustom() {
    if (!analysisResult.trim()) {
      toast({ title: "请先分析样本", type: "warning" });
      return;
    }
    onChange({
      type: "custom",
      name: customName.trim() || "自定义风格",
      description: analysisResult,
      sampleText,
      intensity,
      analyzedAt: new Date().toISOString(),
    });
  }

  function handleClear() {
    onChange(null);
    setSelectedPresetId(null);
    setMode(null);
    setSampleText("");
    setAnalysisResult("");
    setCustomName("");
  }

  return (
    <div className="space-y-4">
      {/* 模式切换 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("preset")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs border transition-colors",
            mode === "preset"
              ? "border-border-neutral-l3 bg-bg-overlay-l1 text-text-default font-medium"
              : "border-border-neutral-l1 text-text-tertiary hover:bg-bg-overlay-l1"
          )}
        >
          预设名家
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs border transition-colors",
            mode === "custom"
              ? "border-border-neutral-l3 bg-bg-overlay-l1 text-text-default font-medium"
              : "border-border-neutral-l1 text-text-tertiary hover:bg-bg-overlay-l1"
          )}
        >
          自定义上传
        </button>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs text-text-tertiary hover:text-status-error transition-colors"
          >
            清除风格
          </button>
        )}
      </div>

      {/* 预设名家卡片区 */}
      {mode === "preset" && (
        <div className="grid grid-cols-2 gap-2">
          {STYLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset.id)}
              className={cn(
                "text-left p-3 rounded-xl border transition-colors",
                selectedPresetId === preset.id
                  ? "border-border-neutral-l3 bg-bg-overlay-l1"
                  : "border-border-neutral-l1 hover:bg-bg-overlay-l1"
              )}
            >
              <div className="text-sm font-medium text-text-default">{preset.name}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {preset.genres.map((g) => (
                  <span key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-overlay-l1 text-text-tertiary">
                    {g}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 自定义上传区 */}
      {mode === "custom" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">风格名称（可选）</Label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="如：某作家风格"
              maxLength={20}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-border-neutral-l1 bg-bg-base-default text-text-default focus:outline-none focus:border-border-contrast"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">文本样本（100-10000 字）</Label>
            <Textarea
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              placeholder="粘贴你想模仿的作家文本片段..."
              rows={6}
              maxLength={10000}
            />
            <div className="text-xs text-text-tertiary text-right">{sampleText.length} / 10000</div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              disabled={analyzing || sampleText.length < 100}
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  分析中...
                </>
              ) : (
                "AI 分析风格"
              )}
            </Button>
            {analyzing && (
              <Button type="button" variant="ghost" size="sm" onClick={stop}>
                停止
              </Button>
            )}
          </div>
          {(analysisResult || isStreaming) && (
            <div className="space-y-1">
              <Label className="text-xs">分析结果（可编辑）</Label>
              <Textarea
                value={analysisResult}
                onChange={(e) => setAnalysisResult(e.target.value)}
                rows={5}
                placeholder="AI 分析的风格特征将显示在这里..."
              />
              {!analyzing && analysisResult && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmCustom}
                >
                  确认使用此风格
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 强度选择 */}
      {showIntensity && value && (
        <div className="space-y-1">
          <Label className="text-xs">模仿强度</Label>
          <div className="flex gap-2">
            {INTENSITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleIntensityChange(opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                  intensity === opt.value
                    ? "border-border-neutral-l3 bg-bg-overlay-l1 text-text-default font-medium"
                    : "border-border-neutral-l1 text-text-tertiary hover:bg-bg-overlay-l1"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 当前风格摘要 */}
      {value && (
        <div className="p-3 rounded-xl bg-bg-overlay-l1 border border-border-neutral-l1">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-text-default">{value.name}</span>
            <span className="px-1.5 py-0.5 rounded bg-bg-overlay-l2 text-text-tertiary">
              {value.type === "preset" ? "预设" : "自定义"}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-bg-overlay-l2 text-text-tertiary">
              {INTENSITY_OPTIONS.find((o) => o.value === value.intensity)?.label}
            </span>
          </div>
          <p className="text-xs text-text-tertiary mt-1.5 line-clamp-2">{value.description}</p>
        </div>
      )}
    </div>
  );
}
