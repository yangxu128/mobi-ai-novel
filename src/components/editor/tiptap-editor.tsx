"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sparkles, Loader2, Check, X } from "lucide-react";
import { useAIStream } from "@/hooks/use-ai-stream";
import { saveChapterContentAction } from "@/actions/chapter";
import { toast } from "@/components/ui/toast";
import { formatWordCount, cn } from "@/lib/utils";

const AI_ACTIONS = ["续写", "扩写", "润色", "改写", "压缩", "古文风格"] as const;

interface Props {
  chapterId: string;
  projectId: string;
  initialTitle: string;
  initialContent: string;
  onSaveTitle?: (title: string) => void;
}

export function TipTapEditor({ chapterId, projectId, initialTitle, initialContent, onSaveTitle }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiAction, setAiAction] = useState<(typeof AI_ACTIONS)[number]>("续写");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [contextText, setContextText] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "开始写作...选中文字按 Cmd/Ctrl+K 唤起 AI",
      }),
      CharacterCount,
    ],
    content: initialContent || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[60vh] focus:outline-none px-8 py-6 leading-relaxed font-serif",
      },
    },
  });

  // 自动保存（防抖 2s）
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        const content = editor.getHTML();
        const res = await saveChapterContentAction(chapterId, content);
        if (res.ok) setSavedAt(new Date());
      }, 2000);
    };
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [editor, chapterId]);

  // Cmd/Ctrl+K 唤起 AI
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!editor) return;
        const { from, to, empty } = editor.state.selection;
        if (!empty) {
          const text = editor.state.doc.textBetween(from, to, "\n");
          setSelectedText(text);
          // 取选中前后 1000 字作为上下文
          const docText = editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n");
          const start = Math.max(0, from - 1000);
          const end = Math.min(docText.length, to + 1000);
          setContextText(docText.slice(start, end));
          setAiResult(null);
          setAiOpen(true);
        } else {
          toast({ title: "请先选中要 AI 处理的文字", type: "warning" });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editor]);

  const aiStream = useAIStream({
    onDone: (full) => setAiResult(full),
  });

  async function runAI() {
    if (!selectedText) return;
    setAiResult(null);
    await aiStream.generate({
      action: "inline",
      projectId,
      payload: { selectedText, action: aiAction, context: contextText },
    });
  }

  function acceptAIResult() {
    if (!editor || !aiResult) return;
    const { from, to } = editor.state.selection;
    editor.chain().focus().deleteRange({ from, to }).insertContent(aiResult).run();
    setAiOpen(false);
    setAiResult(null);
  }

  function rejectAIResult() {
    setAiResult(null);
  }

  const wordCount = editor?.storage.characterCount?.characters() || 0;

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="border-b px-4 py-2 flex items-center gap-2 bg-background">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => onSaveTitle?.(title)}
          className="h-8 text-base font-medium border-transparent hover:border-input focus-visible:border-input max-w-md"
        />
        <div className="flex-1" />
        <Popover open={aiOpen} onOpenChange={setAiOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Sparkles className="h-3.5 w-3.5" />
              AI
              <kbd className="ml-1 text-[10px] px-1 py-0.5 rounded bg-muted">⌘K</kbd>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96" align="end">
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium mb-1">选中文字（{selectedText.length} 字）</div>
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded max-h-24 overflow-auto">
                  {selectedText.slice(0, 200)}{selectedText.length > 200 ? "..." : ""}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {AI_ACTIONS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAiAction(a)}
                    className={cn(
                      "px-2 py-1 rounded text-xs border transition-colors",
                      aiAction === a
                        ? "border-primary bg-primary/10"
                        : "border-input hover:bg-accent"
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                onClick={runAI}
                disabled={aiStream.isStreaming || !selectedText}
                className="w-full"
              >
                {aiStream.isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {aiStream.isStreaming ? "生成中..." : "执行"}
              </Button>
              {aiStream.error && (
                <p className="text-xs text-destructive">{aiStream.error}</p>
              )}
              {aiStream.isStreaming && (
                <div className="text-xs bg-muted/50 p-2 rounded max-h-48 overflow-auto stream-cursor whitespace-pre-wrap">
                  {aiStream.text}
                </div>
              )}
              {aiResult && !aiStream.isStreaming && (
                <div className="space-y-2">
                  <div className="text-xs font-medium">AI 结果：</div>
                  <div className="text-xs bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-2 rounded max-h-48 overflow-auto whitespace-pre-wrap">
                    {aiResult}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={acceptAIResult} className="flex-1">
                      <Check className="h-3.5 w-3.5" />
                      接受
                    </Button>
                    <Button size="sm" variant="outline" onClick={rejectAIResult} className="flex-1">
                      <X className="h-3.5 w-3.5" />
                      拒绝
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 编辑器 */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} className="prose-editor" />
      </div>

      {/* 底栏 */}
      <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground bg-background">
        <span>{formatWordCount(wordCount)}</span>
        <span>
          {savedAt ? `已自动保存 · ${savedAt.toLocaleTimeString("zh-CN")}` : "编辑后将自动保存"}
        </span>
      </div>
    </div>
  );
}
