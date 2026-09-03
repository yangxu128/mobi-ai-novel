"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Plus,
  Trash2,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  ChevronDown,
} from "lucide-react";
import { TipTapEditor } from "@/components/editor/tiptap-editor";
import { KnowledgeSidebarCompact } from "@/components/knowledge/knowledge-sidebar-compact";
import type { StoryMemoryView } from "@/types/memory";
import { createChapterAction, deleteChapterAction, renameChapterAction } from "@/actions/chapter";
import { toast } from "@/components/ui/toast";
import { formatCount, cn } from "@/lib/utils";

interface Chapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  status: string;
  outline?: {
    sceneTitle?: string | null;
    sceneSummary?: string | null;
    plotPoints?: unknown;
    volume?: number | null;
  } | null;
}

interface OutlineItem {
  id: string;
  volume: number;
  chapter: number;
  sceneTitle: string;
  sceneSummary: string;
  plotPoints: unknown;
  order: number;
}

interface Project {
  id: string;
  title: string;
  genre: string;
  worldSettings: Array<{ id: string; category: string; title: string; content: unknown }>;
  characters: Array<{
    id: string;
    name: string;
    role: string;
    appearance?: string | null;
    personality?: string | null;
    background?: string | null;
    motivation?: string | null;
    arc?: string | null;
  }>;
  outlines: OutlineItem[];
  chapters: Chapter[];
}

const CN_NUM = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

/** 卷号 → 中文（1 → 卷一，21 → 卷二十一） */
function volumeLabel(n: number | null | undefined): string {
  if (n == null) return "未分卷";
  if (n <= 0) return `卷${n}`;
  if (n <= 10) return `卷${CN_NUM[n] || n}`;
  if (n < 20) return `卷十${CN_NUM[n - 10] || ""}`;
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    return `卷${CN_NUM[t]}十${u ? CN_NUM[u] : ""}`;
  }
  return `卷${n}`;
}

/** 章节按所属大纲的卷号分组；无大纲章节归入「未分卷」（排在最后） */
function groupByVolume(chapters: Chapter[]) {
  const outlined = new Map<number, { label: string; items: { c: Chapter; index: number }[] }>();
  const loose: { c: Chapter; index: number }[] = [];
  chapters.forEach((c, index) => {
    const v = c.outline?.volume;
    if (v == null) {
      loose.push({ c, index });
    } else {
      let g = outlined.get(v);
      if (!g) {
        g = { label: volumeLabel(v), items: [] };
        outlined.set(v, g);
      }
      g.items.push({ c, index });
    }
  });
  const groups = [...outlined.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([volume, g]) => ({ key: `v${volume}`, label: g.label, items: g.items }));
  if (loose.length > 0) {
    groups.push({ key: "loose", label: "未分卷", items: loose });
  }
  return groups;
}

// 静态 import TipTap：ProjectWorkspace 已经通过 requestIdleCallback 预加载，
// 这里静态 import 不会重复下载，且能让 React 在挂载时直接拿到组件引用
// 用 React.memo 包裹整个组件，ProjectWorkspace 的其他状态变化不会重渲染工作台
function WorkbenchClientImpl({
  project,
  memory,
}: {
  project: Project;
  memory?: StoryMemoryView;
}) {
  const [chapters, setChapters] = useState<Chapter[]>(project.chapters);
  const [activeId, setActiveId] = useState<string | null>(
    project.chapters[0]?.id || null
  );
  const [focusMode, setFocusMode] = useState(false);
  const [tocCollapsed, setTocCollapsed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  // 外部数据更新（流水线生成/自动保存后 router.refresh 拉到新 props）时
  // 同步章节列表与内容，否则工作台永远停留在首次挂载时的空数据
  useEffect(() => {
    setChapters(project.chapters);
    setActiveId((cur) =>
      cur && project.chapters.some((c) => c.id === cur)
        ? cur
        : project.chapters[0]?.id || null
    );
  }, [project.chapters]);

  const active = chapters.find((c) => c.id === activeId);

  // 二级目录：按卷分组，默认展开当前章节所在卷，其余折叠
  const groups = useMemo(() => groupByVolume(chapters), [chapters]);
  const [closedVols, setClosedVols] = useState<Record<string, boolean>>({});
  const isVolOpen = (key: string, items: { c: Chapter }[]) => {
    if (key in closedVols) return !closedVols[key];
    return items.some((it) => it.c.id === activeId);
  };

  async function createChapter() {
    if (!newTitle.trim()) {
      toast({ title: "请填写章节标题", type: "warning" });
      return;
    }
    setCreating(false);
    const res = await createChapterAction({ projectId: project.id, title: newTitle });
    if (res.ok && res.chapter) {
      setChapters((arr) => [...arr, res.chapter]);
      setActiveId(res.chapter.id);
      setNewTitle("");
      toast({ title: "已新增章节", type: "success" });
    } else {
      toast({ title: "新增失败", description: res.error, type: "error" });
    }
  }

  async function delChapter(id: string) {
    if (!confirm("确认删除此章节？")) return;
    const res = await deleteChapterAction(id);
    if (res.ok) {
      setChapters((arr) => arr.filter((c) => c.id !== id));
      if (activeId === id) setActiveId(chapters[0]?.id || null);
      toast({ title: "已删除", type: "success" });
    }
  }

  async function onRename(id: string, title: string) {
    await renameChapterAction(id, title);
  }

  const cardCls =
    "rounded-2xl border border-border-neutral-l1 bg-bg-base-default shadow-[var(--shadow-card)] overflow-hidden";

  return (
    <div className="flex min-h-0 flex-1 gap-3 bg-[var(--bg-canvas)] p-3.5">
      {/* 左侧章节目录（卡片式） */}
      {!focusMode && !tocCollapsed && (
        <aside className={cn("flex w-64 shrink-0 flex-col", cardCls)}>
          <div className="flex items-center justify-between py-3.5 pl-5 pr-4">
            <h2 className="text-sm font-semibold text-text-default">章节目录</h2>
            <button
              type="button"
              aria-label="新增章节"
              onClick={() => setCreating(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border-neutral-l2 text-text-tertiary transition-colors hover:border-border-neutral-l3 hover:text-text-default"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {creating && (
            <div className="border-b border-border-neutral-l1 p-2.5">
              <div className="flex gap-1">
                <Input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="章节标题"
                  className="h-8 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createChapter();
                    if (e.key === "Escape") setCreating(false);
                  }}
                />
                <Button size="sm" onClick={createChapter} className="h-8 px-2">
                  添加
                </Button>
              </div>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
            {chapters.length === 0 ? (
              <p className="p-3 text-xs leading-relaxed text-text-tertiary">
                还没有章节，点击上方「+」创建
              </p>
            ) : (
              <div className="space-y-2.5">
                {groups.map((g) => {
                  const open = isVolOpen(g.key, g.items);
                  return (
                    <div key={g.key}>
                      <button
                        type="button"
                        onClick={() => setClosedVols((s) => ({ ...s, [g.key]: open }))}
                        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-text-default transition-colors hover:bg-bg-overlay-l1"
                      >
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 text-text-tertiary transition-transform",
                            !open && "-rotate-90"
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate text-left">{g.label}</span>
                        <span className="num shrink-0 text-[11px] font-normal text-text-tertiary">
                          共 {g.items.length} 章
                        </span>
                      </button>
                      {open && (
                        <div className="mt-0.5 space-y-0.5 pl-2">
                          {g.items.map(({ c, index }) => {
                            // 标题自带「第N章」前缀的不再重复编号
                            const hasPrefix = /第\s*[0-9一二三四五六七八九十百千]+\s*章/.test(c.title);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                className={cn("chapter-row group", activeId === c.id && "is-active")}
                                onClick={() => setActiveId(c.id)}
                              >
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 shrink-0 rounded-full",
                                    activeId === c.id ? "bg-bg-brand" : "bg-transparent"
                                  )}
                                />
                                <span className="min-w-0 flex-1 truncate">
                                  {hasPrefix ? (
                                    c.title
                                  ) : (
                                    <>
                                      <span className="text-text-tertiary">第 {index + 1} 章</span>
                                      <span className="ml-1.5">{c.title}</span>
                                    </>
                                  )}
                                </span>
                                <span
                                  className={cn(
                                    "num shrink-0 text-[11px]",
                                    activeId === c.id ? "text-text-brand opacity-80" : "text-text-tertiary"
                                  )}
                                >
                                  {formatCount(c.wordCount)} 字
                                </span>
                                <span
                                  role="button"
                                  tabIndex={0}
                                  aria-label="删除章节"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    delChapter(c.id);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.stopPropagation();
                                      delChapter(c.id);
                                    }
                                  }}
                                  className="hidden shrink-0 rounded p-0.5 text-text-tertiary transition-colors hover:bg-status-error/10 hover:text-status-error group-hover:block"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* 底部收起目录 */}
          <div className="border-t border-border-neutral-l1 p-2">
            <button
              type="button"
              onClick={() => setTocCollapsed(true)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-text-tertiary transition-colors hover:bg-bg-overlay-l1 hover:text-text-default"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
              收起目录
            </button>
          </div>
        </aside>
      )}
      {!focusMode && tocCollapsed && (
        <div
          className={cn(
            "flex w-12 shrink-0 flex-col items-center gap-2 py-3",
            cardCls
          )}
        >
          <button
            type="button"
            aria-label="展开目录"
            onClick={() => setTocCollapsed(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-text-tertiary transition-colors hover:bg-bg-overlay-l1 hover:text-text-default"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="新增章节"
            onClick={() => {
              setTocCollapsed(false);
              setCreating(true);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-text-tertiary transition-colors hover:bg-bg-overlay-l1 hover:text-text-default"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 中间编辑器（卡片式） */}
      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border-neutral-l1 bg-bg-base-default shadow-[var(--shadow-card)]">
        {active ? (
            <TipTapEditor
              key={active.id}
              chapterId={active.id}
              projectId={project.id}
              initialTitle={active.title}
              initialContent={active.content}
              onSaveTitle={(t) => onRename(active.id, t)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="space-y-3 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-bg-overlay-l1">
                  <PenLine className="h-6 w-6 text-text-tertiary" />
                </span>
                <p className="text-sm text-text-tertiary">
                  {chapters.length === 0 ? "创建第一个章节开始创作" : "从左侧选择章节"}
                </p>
              </div>
            </div>
          )}

        {/* 专注模式按钮 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setFocusMode(!focusMode)}
                className="fixed bottom-5 right-5 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-bg-brand text-text-onbrand shadow-[var(--shadow-glow)] transition-transform hover:scale-105 active:scale-95"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {focusMode ? "退出专注模式" : "进入专注模式"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </main>

      {/* 右侧知识库（卡片式） */}
      {!focusMode && (
        <aside className={cn("hidden w-80 shrink-0 flex-col lg:flex", cardCls)}>
          <KnowledgeSidebarCompact
            worldSettings={project.worldSettings}
            characters={project.characters}
            activeOutline={active?.outline ?? null}
            genre={project.genre}
            projectId={project.id}
            memory={memory}
            activeChapterId={active?.id ?? null}
          />
        </aside>
      )}
    </div>
  );
}

// memo 包裹：工作台自身的状态变化不触发重渲染；
// 但 chapters 数据更新（router.refresh 后引用变化）必须放行，
// 由上面的 useEffect 同步章节列表与正文
export const WorkbenchClient = memo(WorkbenchClientImpl, (prev, next) => {
  return (
    prev.project.id === next.project.id &&
    prev.project.chapters === next.project.chapters
  );
});
