"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Save, Trash2 } from "lucide-react";
import { useAIStream } from "@/hooks/use-ai-stream";
import { saveOutlineAction, createChaptersFromOutlinesAction } from "@/actions/knowledge";
import { toast } from "@/components/ui/toast";

interface OutlineItem {
  volume: number;
  chapter: number;
  sceneTitle: string;
  sceneSummary: string;
  povCharacter?: string;
  plotPoints: string[];
  foreshadowing?: string;
  order: number;
}

interface Props {
  projectId: string;
  genre: string;
  worldSummary: string;
  characterSummary: string;
  characters: Array<{ id: string; name: string }>;
  existing: Array<{
    id: string;
    volume: number;
    chapter: number;
    sceneTitle: string;
    sceneSummary: string;
    povCharacterId: string | null;
    plotPoints: unknown;
    foreshadowing: string | null;
    order: number;
  }>;
}

const templates = ["三幕式", "英雄之旅", "网文黄金三章", "悬疑反转"];

export function Step4Outline({ projectId, genre, worldSummary, characterSummary, characters, existing }: Props) {
  const [items, setItems] = useState<OutlineItem[]>([]);
  const [template, setTemplate] = useState("三幕式");
  const { generate, isStreaming, text, error, stop } = useAIStream();

  useEffect(() => {
    if (existing.length > 0 && items.length === 0) {
      setItems(
        existing.map((o) => ({
          volume: o.volume,
          chapter: o.chapter,
          sceneTitle: o.sceneTitle,
          sceneSummary: o.sceneSummary,
          plotPoints: Array.isArray(o.plotPoints) ? (o.plotPoints as string[]) : [],
          foreshadowing: o.foreshadowing || "",
          order: o.order,
        }))
      );
    }
  }, [existing, items.length]);

  function tryParse(raw: string): OutlineItem[] | null {
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

    // 按 volume+chapter 去重合并（防止 AI 对同一章返回多个对象）
    const merged = new Map<string, OutlineItem>();
    arr.forEach((item, i) => {
      if (typeof item !== "object" || item === null) return;
      const o = item as Record<string, unknown>;
      const volume = Number(o.volume) || 1;
      const chapter = Number(o.chapter) || i + 1;
      const key = `${volume}-${chapter}`;
      const plotPoints = Array.isArray(o.plotPoints)
        ? (o.plotPoints as string[]).map(String)
        : [];
      const existing = merged.get(key);
      if (existing) {
        // 合并情节点到已有章节
        existing.plotPoints.push(...plotPoints);
        if (!existing.sceneTitle && o.sceneTitle) existing.sceneTitle = String(o.sceneTitle);
        if (!existing.sceneSummary && o.sceneSummary) existing.sceneSummary = String(o.sceneSummary);
        if (!existing.povCharacter && o.povCharacter) existing.povCharacter = String(o.povCharacter);
        if (!existing.foreshadowing && o.foreshadowing) existing.foreshadowing = String(o.foreshadowing);
      } else {
        merged.set(key, {
          volume,
          chapter,
          sceneTitle: String(o.sceneTitle || `第 ${chapter} 章`),
          sceneSummary: String(o.sceneSummary || ""),
          povCharacter: o.povCharacter ? String(o.povCharacter) : "",
          plotPoints,
          foreshadowing: o.foreshadowing ? String(o.foreshadowing) : "",
          order: merged.size,
        });
      }
    });
    const result = Array.from(merged.values());
    return result.length > 0 ? result : null;
  }

  async function onGenerate() {
    setItems([]);
    await generate({
      action: "outline",
      projectId,
      payload: { worldSummary, characterSummary, genre, template },
    });
  }

  const parsed = useMemo(() => (text ? tryParse(text) : null), [text]);
  useEffect(() => {
    if (parsed && parsed.length > 0) {
      setItems(parsed);
    }
  }, [parsed]);

  function updateItem(idx: number, patch: Partial<OutlineItem>) {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function onSave() {
    if (items.length === 0) {
      toast({ title: "请先生成大纲", type: "warning" });
      return;
    }
    // 通过角色名找到 ID
    const enriched = items.map((it) => ({
      ...it,
      povCharacterId: it.povCharacter
        ? characters.find((c) => c.name === it.povCharacter)?.id
        : undefined,
    }));
    const res = await saveOutlineAction({ projectId, outlines: enriched });
    if (!res.ok) {
      toast({ title: "保存失败", description: res.error, type: "error" });
      return;
    }
    // 顺手创建空章节
    await createChaptersFromOutlinesAction(projectId);
    toast({ title: "大纲已保存，并创建空章节", type: "success" });
    window.dispatchEvent(new CustomEvent("pipeline-step-next"));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">第四步：大纲生成</h2>
        <p className="text-sm text-muted-foreground">
          AI 基于世界观 + 角色卡生成结构化大纲：卷 → 章 → 场景。每个场景标注视角角色、情节点、伏笔
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">生成参数</CardTitle>
          <CardDescription>选择大纲模板，AI 将参考世界观与角色生成</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-xs">大纲模板</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={onGenerate} disabled={isStreaming}>
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isStreaming ? "生成中..." : "AI 生成大纲"}
            </Button>
            {isStreaming && (
              <Button variant="outline" onClick={stop}>
                停止
              </Button>
            )}
          </div>
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
          <p className="text-sm text-muted-foreground">编辑大纲（含序号），确认后写入知识库并创建空章节</p>
          {items.map((it, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>第 {idx + 1} 条</span>
                  {items.length > 1 && (
                    <button
                      onClick={() => {
                        setItems((arr) => arr.filter((_, i) => i !== idx));
                      }}
                      className="ml-auto p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                      title="删除此条大纲"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">卷号</Label>
                    <Input
                      type="number"
                      min={1}
                      value={it.volume}
                      onChange={(e) => updateItem(idx, { volume: Math.max(1, Number(e.target.value) || 1) })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">章号</Label>
                    <Input
                      type="number"
                      min={1}
                      value={it.chapter}
                      onChange={(e) => updateItem(idx, { chapter: Math.max(1, Number(e.target.value) || 1) })}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">场景标题</Label>
                  <Input
                    value={it.sceneTitle}
                    onChange={(e) => updateItem(idx, { sceneTitle: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">场景摘要</Label>
                  <Textarea
                    value={it.sceneSummary}
                    onChange={(e) => updateItem(idx, { sceneSummary: e.target.value })}
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">视角角色</Label>
                    <Select
                      value={it.povCharacter || "none"}
                      onValueChange={(v) => updateItem(idx, { povCharacter: v === "none" ? "" : v })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="选择角色" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">未指定</SelectItem>
                        {characters.map((c) => (
                          <SelectItem key={c.id} value={c.name}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">伏笔 / 回收</Label>
                    <Input
                      value={it.foreshadowing || ""}
                      onChange={(e) => updateItem(idx, { foreshadowing: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">情节点（每行一个）</Label>
                  <Textarea
                    value={it.plotPoints.join("\n")}
                    onChange={(e) =>
                      updateItem(idx, {
                        plotPoints: e.target.value.split("\n").filter(Boolean),
                      })
                    }
                    rows={Math.max(2, it.plotPoints.length)}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="flex justify-end">
            <Button onClick={onSave}>
              <Save className="h-4 w-4" />
              保存大纲并创建空章节
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
