"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, Plus, Trash2, Save } from "lucide-react";
import { useAIStream } from "@/hooks/use-ai-stream";
import { saveWorldSettingAction } from "@/actions/knowledge";
import { toast } from "@/components/ui/toast";

interface WorldItem {
  category: "BACKGROUND" | "GEOGRAPHY" | "RULE" | "SYSTEM" | "OTHER";
  title: string;
  content: string;
}

const categoryLabel: Record<WorldItem["category"], string> = {
  BACKGROUND: "时代背景",
  GEOGRAPHY: "地理",
  RULE: "社会规则",
  SYSTEM: "力量体系",
  OTHER: "其他",
};

interface Props {
  projectId: string;
  genre: string;
  inspiration: string;
  existing: Array<{ id: string; category: string; title: string; content: unknown }>;
}

export function Step2Worldbuild({ projectId, genre, inspiration, existing }: Props) {
  const [items, setItems] = useState<WorldItem[]>([]);
  const { generate, isStreaming, text, error, stop } = useAIStream();

  // 把已有内容映射成 items
  useEffect(() => {
    if (existing.length > 0 && items.length === 0) {
      setItems(
        existing.map((e) => ({
          category: e.category as WorldItem["category"],
          title: e.title,
          content:
            typeof e.content === "string"
              ? e.content
              : (e.content as { text?: string })?.text || JSON.stringify(e.content, null, 2),
        }))
      );
    }
  }, [existing, items.length]);

  function tryParse(raw: string): Record<string, string> | null {
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      return JSON.parse(cleaned);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          return JSON.parse(m[0]);
        } catch {
          // ignore
        }
      }
    }
    return null;
  }

  async function onGenerate() {
    setItems([]);
    await generate({
      action: "worldbuild",
      projectId,
      payload: { inspiration, genre },
    });
  }

  // 解析流式输出
  const parsed = useMemo(() => (text ? tryParse(text) : null), [text]);
  useEffect(() => {
    if (parsed) {
      setItems([
        { category: "BACKGROUND", title: "时代背景", content: parsed.background || "" },
        { category: "GEOGRAPHY", title: "地理设定", content: parsed.geography || "" },
        { category: "RULE", title: "社会规则", content: parsed.rules || "" },
        { category: "SYSTEM", title: "力量体系", content: parsed.system || "" },
        { category: "OTHER", title: "核心矛盾", content: parsed.conflict || "" },
      ]);
    }
  }, [parsed]);

  function updateItem(idx: number, patch: Partial<WorldItem>) {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeItem(idx: number) {
    setItems((arr) => arr.filter((_, i) => i !== idx));
  }

  function addItem() {
    setItems((arr) => [...arr, { category: "OTHER", title: "新设定", content: "" }]);
  }

  async function onSave() {
    if (items.length === 0) {
      toast({ title: "请先生成或填写设定", type: "warning" });
      return;
    }
    for (const it of items) {
      const res = await saveWorldSettingAction({
        projectId,
        title: it.title,
        category: it.category,
        content: { text: it.content },
      });
      if (!res.ok) {
        toast({ title: "保存失败", description: res.error, type: "error" });
        return;
      }
    }
    toast({ title: "世界观已保存到知识库", type: "success" });
    window.dispatchEvent(new CustomEvent("pipeline-step-next"));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">第二步：世界观构建</h2>
        <p className="text-sm text-text-tertiary">
          基于灵感卡，AI 生成世界观框架：时代背景、地理设定、社会规则、力量体系、核心矛盾
        </p>
      </div>

      <Card className="rounded-2xl border-border-neutral-l1 shadow-sm bg-bg-base-default">
        <CardHeader>
          <CardTitle className="text-base">灵感来源</CardTitle>
          <CardDescription>AI 将基于以下灵感生成世界观</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-tertiary whitespace-pre-line">
            {inspiration || "(未填写灵感)"}
          </p>
          <Button onClick={onGenerate} disabled={isStreaming} className="mt-4 bg-bg-brand text-text-onbrand hover:bg-bg-brand-hover">
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isStreaming ? "生成中..." : "AI 生成世界观"}
          </Button>
          {isStreaming && (
            <Button variant="outline" onClick={stop} className="mt-4 ml-2 border-border-neutral-l2 hover:bg-bg-overlay-l1">
              停止
            </Button>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="rounded-2xl border-status-error">
          <CardContent className="py-4 text-sm text-status-error">{error}</CardContent>
        </Card>
      )}

      {text && !parsed && (
        <Card className="rounded-2xl border-border-neutral-l1 shadow-sm bg-bg-base-default">
          <CardContent className="py-4">
            <pre className="text-xs whitespace-pre-wrap font-mono text-text-tertiary stream-cursor">
              {text}
            </pre>
          </CardContent>
        </Card>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-tertiary">编辑世界观设定，确认后写入知识库</p>
            <Button variant="outline" size="sm" onClick={addItem} className="border-border-neutral-l2 hover:bg-bg-overlay-l1">
              <Plus className="h-3.5 w-3.5" />
              新增
            </Button>
          </div>
          {items.map((it, idx) => (
            <Card key={idx} className="rounded-2xl border-border-neutral-l1 shadow-sm bg-bg-base-default">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <select
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                    value={it.category}
                    onChange={(e) => updateItem(idx, { category: e.target.value as WorldItem["category"] })}
                  >
                    {Object.entries(categoryLabel).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={it.title}
                    onChange={(e) => updateItem(idx, { title: e.target.value })}
                    className="h-8 text-sm"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-8 w-8 shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={it.content}
                  onChange={(e) => updateItem(idx, { content: e.target.value })}
                  rows={4}
                  className="text-sm"
                />
              </CardContent>
            </Card>
          ))}
          <div className="flex justify-end">
            <Button onClick={onSave} className="bg-bg-brand text-text-onbrand hover:bg-bg-brand-hover">
              <Save className="h-4 w-4" />
              保存并进入下一步
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
