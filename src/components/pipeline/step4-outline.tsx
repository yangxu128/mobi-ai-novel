"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  const modeRef = useRef<"generate" | "append">("generate");
  const { generate, isStreaming, thinking, text, error, stop } = useAIStream({
    onDone: (fullText) => {
      if (modeRef.current !== "append") return;
      const appended = tryParse(fullText);
      if (!appended || appended.length === 0) {
        toast({ title: "AI 返回格式异常，无法解析", type: "error" });
        return;
      }
      setItems((prev) => {
        const maxChapter = prev.reduce((m, it) => Math.max(m, it.chapter), 0);
        const adjusted = appended.map((p, i) => ({
          ...p,
          chapter: maxChapter + 1 + i,
          order: prev.length + i,
        }));
        return [...prev, ...adjusted];
      });
      toast({ title: `已追加 ${appended.length} 条大纲`, type: "success" });
    },
  });

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

  /**
   * 修复模型常见 JSON 错误：把 "foreshadowing":"..."（或其他字段）误写成
   * plotPoints 数组里的一个元素（"xx","字段":"yy" 形式，属非法 JSON）。
   * 遍历字符跟踪容器栈：数组内元素位置出现 "字段": 值 时，用 ] 提前闭合
   * 数组使其成为对象字段；修复后悬空的冗余闭合符直接跳过。
   */
  function repairMisplacedField(src: string): string {
    let out = "";
    let inStr = false;
    let esc = false;
    const stack: string[] = [];
    let i = 0;
    while (i < src.length) {
      const ch = src[i];
      if (inStr) {
        out += ch;
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
        i++;
        continue;
      }
      if (ch === '"') {
        inStr = true;
        out += ch;
        i++;
        continue;
      }
      if (ch === "[" || ch === "{") {
        stack.push(ch);
        out += ch;
        i++;
        continue;
      }
      if (ch === "]" || ch === "}") {
        const top = stack[stack.length - 1];
        const expected = ch === "]" ? "[" : "{";
        if (top === expected) {
          stack.pop();
          out += ch;
        }
        i++;
        continue;
      }
      if (ch === ",") {
        const rest = src.slice(i + 1);
        const m = rest.match(/^\s*"[A-Za-z_\u4e00-\u9fa5]+"\s*:/);
        const top = stack[stack.length - 1];
        if (m && top === "[") {
          out += "],";
          stack.pop();
          i++;
          continue;
        }
      }
      out += ch;
      i++;
    }
    return out;
  }

  function tryParse(raw: string): OutlineItem[] | null {
    let arr: unknown = null;
    try {
      const cleaned = repairMisplacedField(raw.replace(/```json|```/g, "").trim());
      arr = JSON.parse(cleaned);
    } catch {
      const m = raw.match(/\[[\s\S]*\]/);
      if (m) {
        try {
          arr = JSON.parse(repairMisplacedField(m[0]));
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
    modeRef.current = "generate";
    setItems([]);
    await generate({
      action: "outline",
      projectId,
      payload: { worldSummary, characterSummary, genre, template },
    });
  }

  async function onAppend() {
    if (items.length === 0) {
      toast({ title: "请先生成大纲", type: "warning" });
      return;
    }
    modeRef.current = "append";
    const existingOutlines = items.map((it) => ({
      chapter: it.chapter,
      sceneTitle: it.sceneTitle,
      sceneSummary: it.sceneSummary,
      povCharacter: it.povCharacter || "",
      plotPoints: it.plotPoints,
      foreshadowing: it.foreshadowing || "",
    }));
    await generate({
      action: "outlineAppend",
      projectId,
      payload: { worldSummary, characterSummary, genre, template, existingOutlines },
    });
  }

  const parsed = useMemo(() => (text ? tryParse(text) : null), [text]);
  useEffect(() => {
    if (parsed && parsed.length > 0 && modeRef.current === "generate") {
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
        <p className="text-sm text-text-tertiary">
          AI 基于世界观 + 角色卡生成结构化大纲：卷 → 章 → 场景。每个场景标注视角角色、情节点、伏笔
        </p>
      </div>

      <Card className="rounded-2xl border-border-neutral-l1 shadow-sm bg-bg-base-default">
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
            <Button onClick={onGenerate} disabled={isStreaming} className="bg-bg-brand text-text-onbrand hover:bg-bg-brand-hover">
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isStreaming ? (thinking > 0 ? `思考中 ${thinking} 字...` : "生成中...") : "AI 生成大纲"}
            </Button>
            {items.length > 0 && (
              <Button
                onClick={onAppend}
                disabled={isStreaming}
                variant="outline"
                className="border-border-neutral-l2 hover:bg-bg-overlay-l1"
              >
                {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isStreaming ? (thinking > 0 ? `思考中 ${thinking} 字...` : "生成中...") : "继续生成"}
              </Button>
            )}
            {isStreaming && (
              <Button variant="outline" onClick={stop} className="border-border-neutral-l2 hover:bg-bg-overlay-l1">
                停止
              </Button>
            )}
          </div>
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
          <p className="text-sm text-text-tertiary">编辑大纲（含序号），确认后写入知识库并创建空章节</p>
          {items.map((it, idx) => (
            <Card key={idx} className="rounded-2xl border-border-neutral-l1 shadow-sm bg-bg-base-default">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-xs text-text-tertiary">
                  <span>第 {idx + 1} 条</span>
                  {items.length > 1 && (
                    <button
                      onClick={() => {
                        setItems((arr) => arr.filter((_, i) => i !== idx));
                      }}
                      className="ml-auto p-1 hover:bg-status-error/10 hover:text-status-error rounded"
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
                      className="h-8 text-sm rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">章号</Label>
                    <Input
                      type="number"
                      min={1}
                      value={it.chapter}
                      onChange={(e) => updateItem(idx, { chapter: Math.max(1, Number(e.target.value) || 1) })}
                      className="h-8 text-sm rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">场景标题</Label>
                  <Input
                    value={it.sceneTitle}
                    onChange={(e) => updateItem(idx, { sceneTitle: e.target.value })}
                    className="h-8 text-sm rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">场景摘要</Label>
                  <Textarea
                    value={it.sceneSummary}
                    onChange={(e) => updateItem(idx, { sceneSummary: e.target.value })}
                    rows={2}
                    className="text-sm rounded-xl"
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
                      className="h-8 text-sm rounded-xl"
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
                    className="text-sm rounded-xl"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="flex justify-end">
            <Button onClick={onSave} className="bg-bg-brand text-text-onbrand hover:bg-bg-brand-hover">
              <Save className="h-4 w-4" />
              保存大纲并创建空章节
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
