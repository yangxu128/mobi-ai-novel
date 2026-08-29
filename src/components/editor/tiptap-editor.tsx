"use client";

import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sparkles,
  Loader2,
  Check,
  X,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo2,
  Redo2,
  Code,
  Search,
  HelpCircle,
  ChevronDown,
  CheckCircle2,
  CircleDashed,
  ListChecks,
} from "lucide-react";
import { useAIStream } from "@/hooks/use-ai-stream";
import { saveChapterContentAction } from "@/actions/chapter";
import { toast } from "@/components/ui/toast";
import { formatWordCount, cn } from "@/lib/utils";

const AI_ACTIONS = ["续写", "扩写", "润色", "改写", "压缩", "古文风格"] as const;

interface OutlineHint {
  sceneSummary?: string | null;
  plotPoints?: unknown;
}

interface Props {
  chapterId: string;
  projectId: string;
  initialTitle: string;
  initialContent: string;
  outline?: OutlineHint | null;
  onSaveTitle?: (title: string) => void;
}

type SaveStatus = "idle" | "dirty" | "saving" | "saved";

/**
 * 章节正文编辑器（TipTap）
 *
 * 布局：
 *   [大纲提示条（可选）]   <- 有 outline 时显示
 *   [标题输入] [格式化工具栏] [AI ⌘K] [?]   <- 顶栏
 *   [TipTap 编辑区 + 选中悬浮 AI]
 *   [字数 · 保存状态]      <- 底栏
 */
export function TipTapEditor({
  chapterId,
  projectId,
  initialTitle,
  initialContent,
  outline,
  onSaveTitle,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiAction, setAiAction] = useState<(typeof AI_ACTIONS)[number]>("续写");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [contextText, setContextText] = useState("");
  const [showOutline, setShowOutline] = useState(!!outline?.sceneSummary);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "开始写作...选中文字按 ⌘K 唤起 AI",
      }),
      CharacterCount,
    ],
    content: initialContent || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[60vh] focus:outline-none leading-relaxed font-serif",
      },
    },
  });

  // 手动保存
  const manualSave = useCallback(async () => {
    if (!editor) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    const content = editor.getHTML();
    try {
      const res = await saveChapterContentAction(chapterId, content);
      if (res.ok) {
        setSavedAt(new Date());
        setSaveStatus("saved");
        toast({ title: "保存成功", type: "success" });
      } else {
        setSaveStatus("dirty");
        toast({ title: "保存失败", description: res.error, type: "error" });
      }
    } catch {
      setSaveStatus("dirty");
      toast({ title: "保存失败", type: "error" });
    }
  }, [editor, chapterId]);

  // 自动保存：编辑后 2s 防抖触发
  const performSave = useCallback(async () => {
    if (!editor) return;
    setSaveStatus("saving");
    const content = editor.getHTML();
    try {
      const res = await saveChapterContentAction(chapterId, content);
      if (res.ok) {
        setSavedAt(new Date());
        setSaveStatus("saved");
      } else {
        setSaveStatus("dirty");
        toast({ title: "自动保存失败", description: res.error, type: "error" });
      }
    } catch {
      setSaveStatus("dirty");
    }
  }, [editor, chapterId]);

  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      setSaveStatus("dirty");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(performSave, 2000);
    };
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [editor, performSave]);

  // ⌘K 唤起 AI
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!editor) return;
        const { from, to, empty } = editor.state.selection;
        if (!empty) {
          const text = editor.state.doc.textBetween(from, to, "\n");
          setSelectedText(text);
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

  // 打开 AI 弹窗（供工具栏按钮和 BubbleMenu 共用）
  const openAIPanel = useCallback(() => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) {
      toast({ title: "请先选中要 AI 处理的文字", type: "warning" });
      return;
    }
    const text = editor.state.doc.textBetween(from, to, "\n");
    setSelectedText(text);
    const docText = editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n");
    const start = Math.max(0, from - 1000);
    const end = Math.min(docText.length, to + 1000);
    setContextText(docText.slice(start, end));
    setAiResult(null);
    setAiOpen(true);
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

  // 解析 outline 的 plotPoints（可能是 JSON 字符串或数组）
  const plotPoints = (() => {
    if (!outline?.plotPoints) return [];
    if (Array.isArray(outline.plotPoints)) return outline.plotPoints as string[];
    if (typeof outline.plotPoints === "string") {
      try {
        const parsed = JSON.parse(outline.plotPoints);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  })();

  return (
    <div className="flex flex-col h-full">
      {/* 大纲提示条：有 outline 时可折叠 */}
      {outline?.sceneSummary && (
        <div className="border-b border-border-neutral-l1 bg-bg-overlay-l1/60">
          <div className="mx-auto w-full max-w-[920px] px-8 py-2">
            <button
              type="button"
              onClick={() => setShowOutline((v) => !v)}
              className="w-full flex items-start gap-2 text-xs text-text-tertiary hover:text-text-default transition-colors text-left"
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform shrink-0 mt-0.5",
                  !showOutline && "-rotate-90"
                )}
              />
              <ListChecks className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="font-medium shrink-0">本章大纲</span>
              <span className="text-text-tertiary/60 shrink-0">·</span>
              <span className="flex-1 whitespace-normal break-words">{outline.sceneSummary}</span>
            </button>
            {showOutline && plotPoints.length > 0 && (
              <ul className="mt-2 pl-7 space-y-1 text-xs text-text-tertiary">
                {plotPoints.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-text-tertiary shrink-0">{i + 1}.</span>
                    <span className="flex-1 whitespace-normal break-words">{p}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* 顶栏：标题 + 格式化工具栏 + AI + 帮助 */}
      <div className="border-b border-border-neutral-l1 bg-bg-base-default">
        <div className="mx-auto w-full max-w-[920px] px-8">
          <div className="flex items-center gap-2 py-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => onSaveTitle?.(title)}
              className="h-8 text-base font-medium border-transparent hover:border-input focus-visible:border-input max-w-xs"
              placeholder="章节标题"
            />
          </div>
        </div>
        <FormatToolbar editor={editor} onAI={openAIPanel} />
      </div>

      {/* 编辑区 */}
      <div className="flex-1 min-h-0 overflow-auto bg-bg-base-default">
        <div className="mx-auto w-full max-w-[920px] px-8 py-6">
          <EditorContent editor={editor} className="prose-editor" />
        {/* 选中文字时显示悬浮 AI 按钮 */}
        {editor && (
          <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 100 }}
            className="flex items-center gap-1 rounded-lg border border-border-neutral-l2 bg-bg-base-default shadow-lg p-1"
          >
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={openAIPanel}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              AI 处理
            </Button>
          </BubbleMenu>
        )}
        </div>
      </div>

      {/* 底栏：字数 + 保存按钮 + 保存状态 */}
      <div className="border-t border-border-neutral-l1 bg-bg-base-default">
        <div className="mx-auto w-full max-w-[920px] px-8 py-1.5 flex items-center justify-between text-xs text-text-tertiary">
          <span>{formatWordCount(wordCount)}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={manualSave}
              disabled={saveStatus === "saving"}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-text-default bg-bg-overlay-l1 hover:bg-bg-overlay-l2 transition-colors disabled:opacity-50"
            >
              {saveStatus === "saving" ? "保存中..." : "保存"}
            </button>
            <SaveIndicator status={saveStatus} savedAt={savedAt} />
          </div>
        </div>
      </div>

      {/* AI 弹窗 */}
      <Popover open={aiOpen} onOpenChange={setAiOpen}>
        <PopoverTrigger asChild>
          {/* 隐藏的 trigger，AI 弹窗由状态控制 */}
          <span className="hidden" />
        </PopoverTrigger>
        <PopoverContent className="w-96" align="end" side="top">
          <AIPanel
            selectedText={selectedText}
            aiAction={aiAction}
            setAiAction={setAiAction}
            isStreaming={aiStream.isStreaming}
            text={aiStream.text}
            result={aiResult}
            error={aiStream.error}
            onRun={runAI}
            onAccept={acceptAIResult}
            onReject={rejectAIResult}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ========== 格式化工具栏 ========== */

function FormatToolbar({
  editor,
  onAI,
}: {
  editor: ReturnType<typeof useEditor>;
  onAI: () => void;
}) {
  const [findOpen, setFindOpen] = useState(false);
  const [findTerm, setFindTerm] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setFindOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // 简单查找：仅高亮第一处匹配并滚动到位置
  const runFind = useCallback(() => {
    if (!editor || !findTerm) return;
    let found = false;
    editor.state.doc.descendants((node, pos) => {
      if (found) return false;
      if (node.isText) {
        const idx = node.text?.indexOf(findTerm);
        if (idx !== undefined && idx >= 0) {
          const from = pos + idx;
          const to = from + findTerm.length;
          editor.chain().focus().setTextSelection({ from, to }).run();
          found = true;
          return false;
        }
      }
      return true;
    });
    if (!found) toast({ title: `未找到「${findTerm}」`, type: "warning" });
  }, [editor, findTerm]);

  if (!editor) return null;

  // 判断当前选区/光标所在的 mark 和 node
  const isActive = (type: string, attrs?: Record<string, unknown>) =>
    editor.isActive(type, attrs);

  const btnBase =
    "h-7 w-7 inline-flex items-center justify-center rounded text-text-secondary hover:bg-bg-overlay-l1 transition-colors";
  const btnActive = "bg-bg-brand text-text-onbrand hover:bg-bg-brand-hover";

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 border-t border-border-neutral-l1 flex-wrap">
      {/* 撤销/重做 */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="撤销 ⌘Z"
      >
        <Undo2 className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="重做 ⌘⇧Z"
      >
        <Redo2 className="h-3.5 w-3.5" />
      </ToolbarBtn>

      <Divider />

      {/* 标题 */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={isActive("heading", { level: 1 })}
        title="一级标题"
      >
        <Heading1 className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={isActive("heading", { level: 2 })}
        title="二级标题"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={isActive("heading", { level: 3 })}
        title="三级标题"
      >
        <Heading3 className="h-3.5 w-3.5" />
      </ToolbarBtn>

      <Divider />

      {/* 行内格式 */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={isActive("bold")}
        title="加粗 ⌘B"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={isActive("italic")}
        title="斜体 ⌘I"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={isActive("strike")}
        title="删除线"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={isActive("code")}
        title="行内代码 ⌘E"
      >
        <Code className="h-3.5 w-3.5" />
      </ToolbarBtn>

      <Divider />

      {/* 列表 / 引用 / 分割线 */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={isActive("bulletList")}
        title="无序列表"
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={isActive("orderedList")}
        title="有序列表"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={isActive("blockquote")}
        title="引用块"
      >
        <Quote className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="分割线"
      >
        <Minus className="h-3.5 w-3.5" />
      </ToolbarBtn>

      <div className="flex-1" />

      {/* 查找 */}
      <Popover open={findOpen} onOpenChange={setFindOpen}>
        <PopoverTrigger asChild>
          <button
            className={btnBase}
            title="查找 ⌘F"
            onClick={() => setFindOpen(true)}
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="end">
          <div className="flex gap-1">
            <Input
              autoFocus
              value={findTerm}
              onChange={(e) => setFindTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  runFind();
                } else if (e.key === "Escape") {
                  setFindOpen(false);
                }
              }}
              placeholder="查找文字"
              className="h-8 text-sm"
            />
            <Button
              size="sm"
              className="h-8 bg-bg-brand text-text-onbrand hover:bg-bg-brand-hover"
              onClick={runFind}
            >
              查找
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* 快捷键帮助 */}
      <ShortcutsHelp />

      {/* AI */}
      <Button
        size="sm"
        variant="outline"
        className="h-7 ml-1 border-border-neutral-l2 hover:bg-bg-overlay-l1"
        onClick={onAI}
      >
        <Sparkles className="h-3.5 w-3.5" />
        AI
        <kbd className="ml-1 text-[10px] px-1 py-0.5 rounded bg-bg-overlay-l1 text-text-secondary">
          ⌘K
        </kbd>
      </Button>
    </div>
  );
}

function ToolbarBtn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "h-7 w-7 inline-flex items-center justify-center rounded transition-colors",
        active
          ? "bg-bg-brand text-text-onbrand hover:bg-bg-brand-hover"
          : "text-text-secondary hover:bg-bg-overlay-l1",
        disabled && "opacity-30 cursor-not-allowed hover:bg-transparent"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-bg-overlay-l2 mx-1" />;
}

/* ========== AI 面板 ========== */

function AIPanel({
  selectedText,
  aiAction,
  setAiAction,
  isStreaming,
  text,
  result,
  error,
  onRun,
  onAccept,
  onReject,
}: {
  selectedText: string;
  aiAction: (typeof AI_ACTIONS)[number];
  setAiAction: (a: (typeof AI_ACTIONS)[number]) => void;
  isStreaming: boolean;
  text: string;
  result: string | null;
  error: string | null;
  onRun: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs font-medium mb-1">
          选中文字（{selectedText.length} 字）
        </div>
        <div className="text-xs text-text-tertiary bg-bg-overlay-l1/50 p-2 rounded max-h-24 overflow-auto">
          {selectedText.slice(0, 200)}
          {selectedText.length > 200 ? "..." : ""}
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
                ? "border-border-contrast bg-bg-brand text-text-onbrand"
                : "border-border-neutral-l2 text-text-default hover:bg-bg-overlay-l1"
            )}
          >
            {a}
          </button>
        ))}
      </div>
      <Button
        size="sm"
        onClick={onRun}
        disabled={isStreaming || !selectedText}
        className="w-full bg-bg-brand text-text-onbrand hover:bg-bg-brand-hover"
      >
        {isStreaming ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {isStreaming ? "生成中..." : "执行"}
      </Button>
      {error && <p className="text-xs text-status-error">{error}</p>}
      {isStreaming && (
        <div className="text-xs bg-bg-overlay-l1/50 p-2 rounded max-h-48 overflow-auto stream-cursor whitespace-pre-wrap">
          {text}
        </div>
      )}
      {result && !isStreaming && (
        <div className="space-y-2">
          <div className="text-xs font-medium">AI 结果：</div>
          <div className="text-xs bg-status-success/10 border border-status-success/30 p-2 rounded max-h-48 overflow-auto whitespace-pre-wrap">
            {result}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onAccept}
              className="flex-1 bg-bg-brand text-text-onbrand hover:bg-bg-brand-hover"
            >
              <Check className="h-3.5 w-3.5" />
              接受
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              className="flex-1 border-border-neutral-l2"
            >
              <X className="h-3.5 w-3.5" />
              拒绝
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== 保存状态指示 ========== */

function SaveIndicator({
  status,
  savedAt,
}: {
  status: SaveStatus;
  savedAt: Date | null;
}) {
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-text-secondary">
        <Loader2 className="h-3 w-3 animate-spin" />
        保存中...
      </span>
    );
  }
  if (status === "dirty") {
    return (
      <span className="inline-flex items-center gap-1 text-status-warning">
        <CircleDashed className="h-3 w-3" />
        有未保存修改
      </span>
    );
  }
  if (status === "saved" && savedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-status-success">
        <CheckCircle2 className="h-3 w-3" />
        已保存 · {savedAt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
      </span>
    );
  }
  return <span>编辑后将自动保存</span>;
}

/* ========== 快捷键帮助 ========== */

const SHORTCUTS: Array<{ keys: string; desc: string }> = [
  { keys: "⌘K", desc: "AI 处理选中文字" },
  { keys: "⌘F", desc: "查找文字" },
  { keys: "⌘B", desc: "加粗" },
  { keys: "⌘I", desc: "斜体" },
  { keys: "⌘E", desc: "行内代码" },
  { keys: "⌘Z", desc: "撤销" },
  { keys: "⌘⇧Z", desc: "重做" },
];

function ShortcutsHelp() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="h-7 w-7 inline-flex items-center justify-center rounded text-text-secondary hover:bg-bg-overlay-l1 transition-colors"
          title="快捷键"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="text-xs font-medium mb-2">快捷键</div>
        <div className="space-y-1.5">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">{s.desc}</span>
              <kbd className="px-1.5 py-0.5 rounded bg-bg-overlay-l1 text-text-default font-mono text-[10px]">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
