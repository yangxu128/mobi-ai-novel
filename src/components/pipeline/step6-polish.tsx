"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Check, Shield, Save } from "lucide-react";
import { useAIStream } from "@/hooks/use-ai-stream";
import { saveChapterContentAction, markChapterFinalAction } from "@/actions/chapter";
import { toast } from "@/components/ui/toast";
import { formatWordCount, htmlToText, textToHtml } from "@/lib/utils";

interface Chapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  status: string;
}

const polishStyles = ["文笔提升", "对话优化", "节奏调整", "环境描写"] as const;

export function Step6Polish({
  projectId,
  chapters,
}: {
  projectId: string;
  chapters: Chapter[];
}) {
  const [activeId, setActiveId] = useState<string | null>(chapters[0]?.id || null);
  // 流水线编辑以纯文本为主，存回数据库时统一转回 TipTap 兼容的 HTML
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [style, setStyle] = useState<(typeof polishStyles)[number]>("文笔提升");
  const [selectedText, setSelectedText] = useState("");

  // 三个独立的 stream：润色全文 / 行内润色 / 一致性检查
  const polishStream = useAIStream({
    onDone: (full) => activeId && setDraft((d) => ({ ...d, [activeId]: full })),
  });
  const inlineStream = useAIStream();
  const checkStream = useAIStream();

  const activeChapter = chapters.find((c) => c.id === activeId);
  const initialText = htmlToText(activeChapter?.content);
  const activeDraft = activeId
    ? draft[activeId] ?? initialText
    : "";

  async function onPolishFull() {
    if (!activeChapter || !activeDraft.trim()) {
      toast({ title: "章节内容为空", type: "warning" });
      return;
    }
    await polishStream.generate({
      action: "polish",
      projectId,
      payload: { text: activeDraft, style },
    });
  }

  async function onPolishSelection() {
    if (!activeChapter || !selectedText.trim()) {
      toast({ title: "请先在文本框选中文字", type: "warning" });
      return;
    }
    await inlineStream.generate({
      action: "polish",
      projectId,
      payload: { text: selectedText, style },
    });
  }

  async function onConsistencyCheck() {
    if (!activeChapter || !activeDraft.trim()) {
      toast({ title: "章节内容为空", type: "warning" });
      return;
    }
    await checkStream.generate({
      action: "consistency",
      projectId,
      payload: { chapterContent: activeDraft },
    });
  }

  async function onSave() {
    if (!activeChapter) return;
    // 纯文本回写为 TipTap 兼容的 HTML
    const res = await saveChapterContentAction(activeChapter.id, textToHtml(activeDraft));
    if (res.ok) {
      toast({ title: "已保存", type: "success" });
    } else {
      toast({ title: "保存失败", description: res.error, type: "error" });
    }
  }

  async function onMarkFinal() {
    if (!activeChapter) return;
    await onSave();
    const res = await markChapterFinalAction(activeChapter.id);
    if (res.ok) {
      toast({ title: "已标记为定稿", description: "已生成摘要供后续章节检索", type: "success" });
    } else {
      toast({ title: "标记失败", description: res.error, type: "error" });
    }
  }

  function onSelectText() {
    const ta = document.getElementById("polish-textarea") as HTMLTextAreaElement | null;
    if (ta) setSelectedText(ta.value.slice(ta.selectionStart, ta.selectionEnd));
  }

  // 解析一致性检查结果
  function tryParseConflicts(raw: string): Array<{ quote: string; conflict: string; suggestion: string }> {
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const arr = JSON.parse(cleaned);
      if (Array.isArray(arr)) return arr;
    } catch {
      const m = raw.match(/\[[\s\S]*\]/);
      if (m) {
        try {
          return JSON.parse(m[0]);
        } catch {
          // ignore
        }
      }
    }
    return [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">第六步：润色定稿</h2>
        <p className="text-sm text-text-tertiary">
          全文或选段润色：文笔提升、对话优化、节奏调整、环境描写加强。一致性检查标记矛盾
        </p>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr_320px] gap-4">
        {/* 章节列表 */}
        <Card className="rounded-2xl border-border-neutral-l1 shadow-sm bg-bg-base-default">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">章节列表</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {chapters.length === 0 ? (
              <p className="text-xs text-text-tertiary p-3">还没有章节</p>
            ) : (
              <div className="space-y-1">
                {chapters.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      activeId === c.id ? "bg-bg-overlay-l1 text-text-default" : "hover:bg-bg-overlay-l1"
                    }`}
                  >
                    <div className="truncate flex items-center gap-1">
                      {c.status === "final" && <Check className="h-3 w-3 text-status-success shrink-0" />}
                      {c.title}
                    </div>
                    <div className="text-xs text-text-tertiary">
                      {formatWordCount(c.wordCount)}
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
            <CardTitle className="text-base">{activeChapter?.title || "请选择章节"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <Select value={style} onValueChange={(v) => setStyle(v as typeof style)}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {polishStyles.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={onPolishFull} disabled={polishStream.isStreaming || !activeChapter} size="sm" className="bg-bg-brand text-text-onbrand hover:bg-bg-brand-hover">
                {polishStream.isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                润色全文
              </Button>
              <Button
                onClick={onPolishSelection}
                disabled={inlineStream.isStreaming || !activeChapter}
                size="sm"
                variant="outline"
                className="border-border-neutral-l2 hover:bg-bg-overlay-l1"
              >
                {inlineStream.isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                润色选段
              </Button>
              {(polishStream.isStreaming || inlineStream.isStreaming) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    polishStream.stop();
                    inlineStream.stop();
                  }}
                  className="border-border-neutral-l2 hover:bg-bg-overlay-l1"
                >
                  停止
                </Button>
              )}
            </div>

            {polishStream.error && (
              <div className="mb-3 p-3 rounded-md border border-status-error text-sm text-status-error">
                {polishStream.error}
              </div>
            )}
            {inlineStream.error && (
              <div className="mb-3 p-3 rounded-md border border-status-error text-sm text-status-error">
                {inlineStream.error}
              </div>
            )}

            <Textarea
              id="polish-textarea"
              value={
                polishStream.isStreaming
                  ? polishStream.text
                  : inlineStream.isStreaming && selectedText
                  ? activeDraft.replace(selectedText, inlineStream.text)
                  : activeDraft
              }
              onChange={(e) => activeId && setDraft((d) => ({ ...d, [activeId]: e.target.value }))}
              onSelect={onSelectText}
              onKeyUp={onSelectText}
              placeholder="润色结果将显示在此"
              rows={20}
              className="font-serif text-base leading-relaxed rounded-xl"
            />

            {selectedText && (
              <p className="text-xs text-text-tertiary mt-2">
                已选中：{selectedText.length} 字
              </p>
            )}

            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-text-tertiary">
                {formatWordCount(activeDraft.replace(/\s/g, "").length)}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onSave} disabled={!activeChapter} className="border-border-neutral-l2 hover:bg-bg-overlay-l1">
                  <Save className="h-4 w-4" />
                  保存
                </Button>
                <Button onClick={onMarkFinal} disabled={!activeChapter} className="bg-bg-brand text-text-onbrand hover:bg-bg-brand-hover">
                  <Check className="h-4 w-4" />
                  标记定稿
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 一致性检查 */}
        <Card className="rounded-2xl border-border-neutral-l1 shadow-sm bg-bg-base-default">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              一致性检查
            </CardTitle>
            <CardDescription className="text-xs">
              扫描当前章节，找出与世界观/角色矛盾的段落
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={onConsistencyCheck}
              disabled={checkStream.isStreaming || !activeChapter}
              size="sm"
              className="w-full bg-bg-brand text-text-onbrand hover:bg-bg-brand-hover"
            >
              {checkStream.isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              {checkStream.isStreaming ? "检查中..." : "开始检查"}
            </Button>

            {checkStream.error && (
              <p className="text-xs text-status-error mt-3">{checkStream.error}</p>
            )}

            {checkStream.isStreaming && (
              <pre className="text-xs whitespace-pre-wrap font-mono text-text-tertiary stream-cursor mt-3 max-h-96 overflow-auto">
                {checkStream.text}
              </pre>
            )}

            {!checkStream.isStreaming && checkStream.text && (
              <div className="mt-3 space-y-2">
                {tryParseConflicts(checkStream.text).length === 0 ? (
                  <p className="text-xs text-status-success">未发现矛盾，章节一致。</p>
                ) : (
                  tryParseConflicts(checkStream.text).map((c, i) => (
                    <div key={i} className="p-2 rounded-md bg-status-warning/10 border border-status-warning/30">
                      <div className="text-xs font-medium text-status-warning">矛盾 {i + 1}</div>
                      <div className="text-xs mt-1">
                        <span className="text-text-tertiary">原文：</span>
                        <span>{c.quote}</span>
                      </div>
                      <div className="text-xs mt-1">
                        <span className="text-text-tertiary">问题：</span>
                        <span>{c.conflict}</span>
                      </div>
                      <div className="text-xs mt-1">
                        <span className="text-text-tertiary">建议：</span>
                        <span>{c.suggestion}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
