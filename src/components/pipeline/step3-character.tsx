"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, Plus, Trash2, Save } from "lucide-react";
import { useAIStream } from "@/hooks/use-ai-stream";
import { saveCharacterAction } from "@/actions/knowledge";
import { toast } from "@/components/ui/toast";

interface CharacterItem {
  name: string;
  role: "PROTAGONIST" | "SUPPORTING" | "ANTAGONIST" | "EXTRA";
  appearance?: string;
  personality?: string;
  background?: string;
  motivation?: string;
  arc?: string;
}

const roleLabel: Record<CharacterItem["role"], string> = {
  PROTAGONIST: "主角",
  SUPPORTING: "配角",
  ANTAGONIST: "反派",
  EXTRA: "路人",
};

interface Props {
  projectId: string;
  genre: string;
  worldSummary: string;
  existing: Array<{
    id: string;
    name: string;
    role: string;
    appearance?: string | null;
    personality?: string | null;
    background?: string | null;
    motivation?: string | null;
    arc?: string | null;
  }>;
}

export function Step3Character({ projectId, genre, worldSummary, existing }: Props) {
  const [items, setItems] = useState<CharacterItem[]>([]);
  const { generate, isStreaming, text, error, stop } = useAIStream();

  useEffect(() => {
    if (existing.length > 0 && items.length === 0) {
      setItems(
        existing.map((e) => ({
          name: e.name,
          role: e.role as CharacterItem["role"],
          appearance: e.appearance || "",
          personality: e.personality || "",
          background: e.background || "",
          motivation: e.motivation || "",
          arc: e.arc || "",
        }))
      );
    }
  }, [existing, items.length]);

  function tryParse(raw: string): CharacterItem[] | null {
    let arr: unknown = null;
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      arr = JSON.parse(cleaned);
    } catch {
      const m = raw.match(/\[[\s\S]*\]/);
      if (m) {
        try {
          arr = JSON.parse(m[0]);
        } catch {
          arr = null;
        }
      }
    }
    if (!Array.isArray(arr)) return null;

    // 中文角色定位 → 英文枚举
    const roleMap: Record<string, CharacterItem["role"]> = {
      PROTAGONIST: "PROTAGONIST",
      主角: "PROTAGONIST",
      男主: "PROTAGONIST",
      女主: "PROTAGONIST",
      SUPPORTING: "SUPPORTING",
      配角: "SUPPORTING",
      ANTAGONIST: "ANTAGONIST",
      反派: "ANTAGONIST",
      EXTRA: "EXTRA",
      路人: "EXTRA",
    };

    return arr
      .filter((item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null
      )
      .map((c) => {
        const rawRole = String(c.role || "").trim();
        return {
          name: String(c.name || "未命名"),
          role: roleMap[rawRole] || "SUPPORTING",
          appearance: String(c.appearance || ""),
          personality: String(c.personality || ""),
          background: String(c.background || ""),
          motivation: String(c.motivation || ""),
          arc: String(c.arc || ""),
        };
      });
  }

  async function onGenerate() {
    setItems([]);
    await generate({
      action: "character",
      projectId,
      payload: { worldSummary, genre },
    });
  }

  const parsed = useMemo(() => (text ? tryParse(text) : null), [text]);
  useEffect(() => {
    if (parsed && parsed.length > 0) {
      setItems(parsed);
    }
  }, [parsed]);

  function updateItem(idx: number, patch: Partial<CharacterItem>) {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeItem(idx: number) {
    setItems((arr) => arr.filter((_, i) => i !== idx));
  }

  function addItem() {
    setItems((arr) => [
      ...arr,
      { name: "新角色", role: "SUPPORTING" },
    ]);
  }

  async function onSave() {
    if (items.length === 0) {
      toast({ title: "请先生成或填写角色", type: "warning" });
      return;
    }
    for (const it of items) {
      const res = await saveCharacterAction({
        projectId,
        name: it.name,
        role: it.role,
        appearance: it.appearance,
        personality: it.personality,
        background: it.background,
        motivation: it.motivation,
        arc: it.arc,
      });
      if (!res.ok) {
        toast({ title: "保存失败", description: res.error, type: "error" });
        return;
      }
    }
    toast({ title: "角色卡已保存", type: "success" });
    window.dispatchEvent(new CustomEvent("pipeline-step-next"));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">第三步：角色卡创建</h2>
        <p className="text-sm text-muted-foreground">
          AI 基于世界观生成主角 + 核心配角，每张角色卡包含姓名、外貌、性格、背景、动机、人物弧光
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">世界观摘要</CardTitle>
          <CardDescription>AI 将参考以下世界观生成角色</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">
            {worldSummary || "(未填写世界观)"}
          </p>
          <Button onClick={onGenerate} disabled={isStreaming} className="mt-4">
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isStreaming ? "生成中..." : "AI 生成角色"}
          </Button>
          {isStreaming && (
            <Button variant="outline" onClick={stop} className="mt-4 ml-2">
              停止
            </Button>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {text && !parsed && (
        <Card>
          <CardContent className="py-4">
            <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground stream-cursor">
              {text}
            </pre>
          </CardContent>
        </Card>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">编辑角色卡，确认后写入知识库</p>
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-3.5 w-3.5" />
              新增
            </Button>
          </div>
          {items.map((it, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <select
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                    value={it.role}
                    onChange={(e) => updateItem(idx, { role: e.target.value as CharacterItem["role"] })}
                  >
                    {Object.entries(roleLabel).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={it.name}
                    onChange={(e) => updateItem(idx, { name: e.target.value })}
                    className="h-8 text-sm font-medium"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-8 w-8 shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">外貌</Label>
                  <Textarea
                    value={it.appearance || ""}
                    onChange={(e) => updateItem(idx, { appearance: e.target.value })}
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">性格</Label>
                  <Textarea
                    value={it.personality || ""}
                    onChange={(e) => updateItem(idx, { personality: e.target.value })}
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">背景故事</Label>
                  <Textarea
                    value={it.background || ""}
                    onChange={(e) => updateItem(idx, { background: e.target.value })}
                    rows={3}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">核心动机</Label>
                  <Textarea
                    value={it.motivation || ""}
                    onChange={(e) => updateItem(idx, { motivation: e.target.value })}
                    rows={3}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">人物弧光</Label>
                  <Textarea
                    value={it.arc || ""}
                    onChange={(e) => updateItem(idx, { arc: e.target.value })}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="flex justify-end">
            <Button onClick={onSave}>
              <Save className="h-4 w-4" />
              保存并进入下一步
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
