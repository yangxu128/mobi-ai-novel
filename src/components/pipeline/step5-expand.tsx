"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, Save } from "lucide-react";
import { useAIStream } from "@/hooks/use-ai-stream";
import { saveChapterContentAction } from "@/actions/chapter";
import { toast } from "@/components/ui/toast";
import { formatWordCount, htmlToText, textToHtml } from "@/lib/utils";

const EDIT_AUTOSAVE_DELAY = 3000;

interface Chapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  outline?: {
    id: string;
    order?: number;
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
  // 章节统一按大纲顺序展示，确保左侧列表与 RAG 取前文的逻辑一致
  const orderedChapters = [...chapters].sort(
    (a, b) => (a.outline?.order ?? Infinity) - (b.outline?.order ?? Infinity)
  );

  const [activeId, setActiveId] = useState<string | null>(
    orderedChapters[0]?.id || null
  );
  // 草稿统一以纯文本形式存储，避免在工作台（HTML）与流水线（纯文本）之间反复转换
  const [draft, setDraft] = useState<Record<string, string>>({});
  // 流式目标章节：生成期间用户切换章节时，自动保存仍写入正确的章节
  const streamTargetRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const editTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 静默自动保存（纯文本 → TipTap HTML 入库） */
  async function autoSave(chapterId: string, plain: string) {
    if (!chapterId || !plain.trim() || savingRef.current) return;
    savingRef.current = true;
    try {
      const res = await saveChapterContentAction(chapterId, textToHtml(plain));
      if (res.ok) {
        toast({ title: "已自动保存", type: "success" });
      } else {
        toast({ title: "自动保存失败", description: res.error, type: "error" });
      }
    } catch {
      toast({ title: "自动保存失败", type: "error" });
    } finally {
      savingRef.current = false;
    }
  }

  const { generate, isStreaming, text, error, stop } = useAIStream({
    onDone: (full) => {
      const target = streamTargetRef.current ?? activeId;
      if (target) {
        setDraft((d) => ({ ...d, [target]: full }));
        // 生成完成：自动保存正文
        void autoSave(target, full);
      }
    },
    onAbort: (partial) => {
      // 用户主动停止：半成品也自动保存，避免丢失
      const target = streamTargetRef.current ?? activeId;
      if (target && partial.trim()) {
        setDraft((d) => ({ ...d, [target]: partial }));
        void autoSave(target, partial);
      }
    },
  });

  const activeChapter = chapters.find((c) => c.id === activeId);
  // 读取时：HTML → 纯文本（友好显示）；编辑时直接操作纯文本；保存时：纯文本 → HTML
  const initialText = htmlToText(activeChapter?.content);
  const activeDraft = activeId
    ? draft[activeId] ?? initialText
    : "";

  async function onGenerate() {
    if (!activeChapter) return;
    streamTargetRef.current = activeChapter.id;
    setDraft((d) => ({ ...d, [activeChapter.id]: "" }));

    // 按大纲顺序升序排 chapters，找出当前章节在时间线上的位置
    const ordered = [...chapters].sort(
      (a, b) => (a.outline?.order ?? Infinity) - (b.outline?.order ?? Infinity)
    );
    const idx = ordered.findIndex((c) => c.id === activeChapter.id);
    const hasPrev = idx > 0;

    const sceneTitle = activeChapter.outline?.sceneTitle || "";
    const sceneSummary = activeChapter.outline?.sceneSummary || "";
    const baseInstruction = `请按大纲扩写《${activeChapter.title}》本章正文。场景：${sceneTitle}。${sceneSummary}`;
    // 兜底强调：除非这是第一篇，否则必须衔接上一章结尾
    const continuityHint = hasPrev
      ? "\n\n【衔接要求】必须紧接上一章的结尾自然续写，开篇不要重新介绍人物/地点/状态，不要用'且说'/'话说'等开场套话。"
      : "";

    await generate({
      action: "expand",
      projectId,
      payload: {
        outlineId: activeChapter.outline?.id,
        instruction: baseInstruction + continuityHint,
      },
    });
  }

  async function onSave() {
    if (!activeChapter) return;
    // 流水线编辑以纯文本为主，存回数据库时转回 TipTap 兼容的 HTML
    const content = textToHtml(activeDraft);
    try {
      const res = await saveChapterContentAction(activeChapter.id, content);
      if (res.ok) {
        toast({
          title: `已保存（${formatWordCount("wordCount" in res ? res.wordCount ?? 0 : 0)}）`,
          type: "success",
        });
      } else {
        toast({ title: "保存失败", description: res.error, type: "error" });
      }
    } catch (e) {
      toast({
        title: "保存失败",
        description: e instanceof Error ? e.message : "未知错误",
        type: "error",
      });
    }
  }

  async function onConfirmNext() {
    await onSave();
    window.dispatchEvent(new CustomEvent("pipeline-step-next"));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">第五步：章节扩写</h2>
        <p className="text-sm text-text-tertiary">
          AI 引用世界观 + 角色卡 + 大纲 + 前文摘要生成正文初稿，流式输出
        </p>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-4">
        {/* 章节列表 */}
        <Card className="rounded-2xl border-border-neutral-l1 shadow-sm bg-bg-base-default">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">章节列表</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {orderedChapters.length === 0 ? (
              <p className="text-xs text-text-tertiary p-3">还没有章节，请回到上一步生成大纲</p>
            ) : (
              <div className="space-y-1">
                {orderedChapters.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      activeId === c.id ? "bg-bg-overlay-l1 text-text-default" : "hover:bg-bg-overlay-l1"
                    }`}
                  >
                    <div className="truncate">{c.title}</div>
                    <div className="text-xs text-text-tertiary">
                      {c.wordCount > 0 ? formatWordCount(c.wordCount) : "未扩写"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 编辑区 */}
        <Card className="rounded-2xl border-border-neutral-l1 shadow-sm bg-bg-base-default">
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
                  className="bg-bg-brand text-text-onbrand hover:bg-bg-brand-hover"
                >
                  {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {isStreaming ? "生成中" : "AI 扩写"}
                </Button>
                {isStreaming && (
                  <Button variant="outline" size="sm" onClick={stop} className="border-border-neutral-l2 hover:bg-bg-overlay-l1">
                    停止
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activeChapter?.outline?.plotPoints?.length ? (
              <div className="mb-3 p-3 rounded-md bg-bg-overlay-l1/50 text-xs">
                <div className="font-medium mb-1">情节点：</div>
                <ol className="list-decimal list-inside text-text-tertiary space-y-0.5">
                  {activeChapter.outline.plotPoints.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ol>
              </div>
            ) : null}

            {error && (
              <div className="mb-3 p-3 rounded-md border border-status-error text-sm text-status-error">
                {error}
              </div>
            )}

            <Textarea
              value={isStreaming && activeId ? text : activeDraft}
              onChange={(e) => {
                if (!activeId || isStreaming) return;
                const v = e.target.value;
                setDraft((d) => ({ ...d, [activeId]: v }));
                // 手动编辑防抖自动保存
                if (editTimerRef.current) clearTimeout(editTimerRef.current);
                editTimerRef.current = setTimeout(() => {
                  void autoSave(activeId, v);
                }, EDIT_AUTOSAVE_DELAY);
              }}
              placeholder="点击 AI 扩写生成正文，或手动输入"
              rows={20}
              className="font-serif text-base leading-relaxed rounded-xl"
            />

            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-text-tertiary">
                {formatWordCount(activeDraft.replace(/\s/g, "").length)}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onSave} disabled={!activeChapter} className="border-border-neutral-l2 hover:bg-bg-overlay-l1">
                  <Save className="h-4 w-4" />
                  保存
                </Button>
                <Button onClick={onConfirmNext} disabled={!activeChapter} className="bg-bg-brand text-text-onbrand hover:bg-bg-brand-hover">
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
