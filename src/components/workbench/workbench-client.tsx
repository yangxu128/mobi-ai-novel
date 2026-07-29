"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Trash2, FileText, Maximize2, ArrowLeft } from "lucide-react";
import { createChapterAction, deleteChapterAction, renameChapterAction } from "@/actions/chapter";
import { toast } from "@/components/ui/toast";
import { formatWordCount } from "@/lib/utils";

const TipTapEditor = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => m.TipTapEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        编辑器加载中...
      </div>
    ),
  }
);

const KnowledgeSidebar = dynamic(
  () => import("@/components/knowledge/knowledge-sidebar").then((m) => m.KnowledgeSidebar),
  { ssr: false }
);

interface Chapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  status: string;
}

interface Project {
  id: string;
  title: string;
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
  chapters: Chapter[];
}

export function WorkbenchClient({ project }: { project: Project }) {
  const [chapters, setChapters] = useState<Chapter[]>(project.chapters);
  const [activeId, setActiveId] = useState<string | null>(
    project.chapters[0]?.id || null
  );
  const [focusMode, setFocusMode] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const active = chapters.find((c) => c.id === activeId);

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

  return (
    <div className="flex flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
      {/* 左侧章节树 */}
      {!focusMode && (
        <aside className="w-60 border-r border-neutral-100 bg-white flex flex-col">
          <div className="p-3 border-b border-neutral-100">
            <Link
              href="/projects"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              返回项目列表
            </Link>
            <h2 className="text-sm font-semibold mt-2 truncate">{project.title}</h2>
          </div>
          <div className="p-2 border-b border-neutral-100">
            <Button
              size="sm"
              className="w-full bg-neutral-900 text-white hover:bg-neutral-800"
              onClick={() => setCreating(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              新章节
            </Button>
            {creating && (
              <div className="mt-2 flex gap-1">
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
                <Button size="sm" onClick={createChapter} className="h-8 px-2 bg-neutral-900 text-white hover:bg-neutral-800">添加</Button>
              </div>
            )}
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {chapters.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3">还没有章节，点击上方&ldquo;新章节&rdquo;创建</p>
              ) : (
                chapters.map((c) => (
                  <div
                    key={c.id}
                    className={`group flex items-center gap-1 px-2 py-1.5 rounded-md text-sm cursor-pointer ${
                      activeId === c.id ? "bg-neutral-100" : "hover:bg-neutral-50"
                    }`}
                    onClick={() => setActiveId(c.id)}
                  >
                    <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{c.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        delChapter(c.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 hover:text-destructive rounded"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>
      )}

      {/* 中间编辑器 */}
      <main className="flex-1 flex flex-col bg-white">
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
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">
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
                className="fixed bottom-4 right-4 h-9 w-9 rounded-full bg-neutral-900 text-white shadow-lg flex items-center justify-center hover:bg-neutral-800 z-30"
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

      {/* 右侧知识库 */}
      {!focusMode && (
        <aside className="w-72 hidden lg:block border-l border-neutral-100 bg-white">
          <KnowledgeSidebar
            projectId={project.id}
            worldSettings={project.worldSettings}
            characters={project.characters}
          />
        </aside>
      )}
    </div>
  );
}
