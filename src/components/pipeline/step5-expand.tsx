"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, Save } from "lucide-react";
import { useAIStream } from "@/hooks/use-ai-stream";
import { saveChapterContentAction } from "@/actions/chapter";
import { toast } from "@/components/ui/toast";
import { formatWordCount } from "@/lib/utils";

interface Chapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  outline?: {
    id: string;
    sceneTitle: string;
    sceneSummary: string;
    plotPoints: string[];
  } | null;
}

export function Step5Expand({
  projectId,
  chapters,
}: {
  projectId: string;
  chapters: Chapter[];
}) {
  const [activeId, setActiveId] = useState<string | null>(
    chapters[0]?.id || null
  );
  const [draft, setDraft] = useState<Record<string, string>>({});
  const { generate, isStreaming, text, error, stop } = useAIStream({
    onDone: (full) => {
      if (activeId) {
        setDraft((d) => ({ ...d, [activeId]: full }));
      }
    },
  });

  const activeChapter = chapters.find((c) => c.id === activeId);
  const activeDraft = activeId ? draft[activeId] ?? activeChapter?.content ?? "" : "";

  async function onGenerate() {
    if (!activeChapter) return;
    setDraft((d) => ({ ...d, [activeChapter.id]: "" }));
    await generate({
      action: "expand",
      projectId,
      payload: {
        outlineId: activeChapter.outline?.id,
        instruction: `请按大纲扩写《${activeChapter.title}》本章正文。场景：${activeChapter.outline?.sceneTitle || ""}。${activeChapter.outline?.sceneSummary || ""}`,
      },
    });
  }

  async function onSave() {
    if (!activeChapter) return;
    const content = activeDraft;
    const res = await saveChapterContentAction(activeChapter.id, content);
    if (res.ok && "wordCount" in res) {
      toast({ title: `已保存（${formatWordCount(res.wordCount ?? 0)}）`, type: "success" });
    } else if (!res.ok) {
      toast({ title: "保存失败", description: res.error, type: "error" });
    }
  }

  function onConfirmNext() {
    onSave();
    window.dispatchEvent(new CustomEvent("pipeline-step-next"));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">第五步：章节扩写</h2>
        <p className="text-sm text-muted-foreground">
          AI 引用世界观 + 角色卡 + 大纲 + 前文摘要生成正文初稿，流式输出
        </p>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-4">
        {/* 章节列表 */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">章节列表</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {chapters.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">还没有章节，请回到上一步生成大纲</p>
            ) : (
              <div className="space-y-1">
                {chapters.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      activeId === c.id ? "bg-primary/10 text-foreground" : "hover:bg-accent"
                    }`}
                  >
                    <div className="truncate">{c.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.wordCount > 0 ? formatWordCount(c.wordCount) : "未扩写"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 编辑区 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{activeChapter?.title || "请选择章节"}</CardTitle>
                <CardDescription className="text-xs mt-1">
                  {activeChapter?.outline
                    ? `${activeChapter.outline.sceneTitle} · ${activeChapter.outline.sceneSummary}`
                    : "无大纲关联"}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={onGenerate}
                  disabled={isStreaming || !activeChapter}
                  size="sm"
                >
                  {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {isStreaming ? "生成中" : "AI 扩写"}
                </Button>
                {isStreaming && (
                  <Button variant="outline" size="sm" onClick={stop}>
                    停止
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activeChapter?.outline?.plotPoints?.length ? (
              <div className="mb-3 p-3 rounded-md bg-muted/50 text-xs">
                <div className="font-medium mb-1">情节点：</div>
                <ol className="list-decimal list-inside text-muted-foreground space-y-0.5">
                  {activeChapter.outline.plotPoints.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ol>
              </div>
            ) : null}

            {error && (
              <div className="mb-3 p-3 rounded-md border border-destructive text-sm text-destructive">
                {error}
              </div>
            )}

            <Textarea
              value={isStreaming && activeId ? text : activeDraft}
              onChange={(e) => activeId && setDraft((d) => ({ ...d, [activeId]: e.target.value }))}
              placeholder="点击 AI 扩写生成正文，或手动输入"
              rows={20}
              className="font-serif text-base leading-relaxed"
            />

            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground">
                {formatWordCount(activeDraft.replace(/\s/g, "").length)}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onSave} disabled={!activeChapter}>
                  <Save className="h-4 w-4" />
                  保存
                </Button>
                <Button onClick={onConfirmNext} disabled={!activeChapter}>
                  确认并进入下一步
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
