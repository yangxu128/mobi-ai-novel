"use client";

import { useEffect, useRef, memo, useState } from "react";
import Link from "next/link";
import { ProjectModeSwitcher, VIEW_MODES } from "@/components/project-mode-switcher";
import { PipelineFlow } from "@/components/pipeline/pipeline-flow";
import { WorkbenchClient } from "@/components/workbench/workbench-client";
import { ChatCoCreateClient, getOrFetchChatSession } from "@/components/chat/chat-cocreate-client";
import { useViewSwitcher } from "@/components/hooks/use-view-switcher";
import type { ViewMode } from "@/components/project-mode-switcher";
import type { StoryMemoryView } from "@/types/memory";
import { KnowledgeSidebarCompact } from "@/components/knowledge/knowledge-sidebar-compact";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StylePicker } from "@/components/style/style-picker";
import { ModelPicker } from "@/components/model/model-picker";
import { ThinkingToggle } from "@/components/model/thinking-toggle";
import { PenLine, BookOpenText } from "lucide-react";
import {
  updateStyleProfileAction,
  updateProjectModelAction,
  updateProjectTargetsAction,
} from "@/actions/project";
import type { StyleProfile } from "@/lib/ai/style";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/utils";

interface ProjectData {
  id: string;
  title: string;
  genre: string;
  mode: string;
  currentStep: number;
  synopsis: string | null;
  model: string | null;
  targetChapters: number | null;
  chapterWords: number | null;
  styleProfile: StyleProfile | null;
  worldSettings: Array<{
    id: string;
    category: string;
    title: string;
    content: unknown;
  }>;
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
  outlines: Array<{
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
  chapters: Array<{
    id: string;
    title: string;
    content: string;
    wordCount: number;
    status: string;
    outline?: {
      id: string;
      sceneTitle: string;
      sceneSummary: string;
      plotPoints: unknown;
    } | null;
  }>;
}

interface Props {
  project: ProjectData;
  memory?: StoryMemoryView;
  initialView: ViewMode;
}

const STEP_LABELS = ["灵感卡", "世界观", "角色卡", "大纲", "章节扩写", "润色定稿"];

/**
 * 统一项目工作区
 *
 * 关键优化点：
 * 1. 三个视图同时挂载，但用 content-visibility: auto 让非激活视图不渲染
 * 2. TipTap 通过 requestIdleCallback 在空闲时预加载
 * 3. Chat session 数据在空闲时预取，切到对话时立即可用
 * 4. URL 同步用 history.replaceState，不触发 Next.js 路由
 * 5. 切换视图 = setState + CSS display 切换，毫秒级
 * 6. 视图切换逻辑已提取到 useViewSwitcher hook
 */
function ProjectWorkspaceImpl({ project, memory, initialView }: Props) {
  const { activeView, pending, handleViewChange } = useViewSwitcher(project.id, initialView);
  const tipTapLoadedRef = useRef(false);
  const chatPrefetchedRef = useRef(false);
  const [styleDialogOpen, setStyleDialogOpen] = useState(false);
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(
    (project.styleProfile as StyleProfile | null) ?? null
  );
  const [projectModel, setProjectModel] = useState<string | null>(
    project.model ?? null
  );
  // 全书规模（章节数/每章字数）：供大纲与扩写把控整体节奏
  const [targets, setTargets] = useState<{
    targetChapters: number | null;
    chapterWords: number | null;
  }>({
    targetChapters: project.targetChapters ?? null,
    chapterWords: project.chapterWords ?? null,
  });
  const [targetsDialogOpen, setTargetsDialogOpen] = useState(false);
  const [draftChapters, setDraftChapters] = useState("");
  const [draftWords, setDraftWords] = useState("");

  function openTargetsDialog() {
    setDraftChapters(targets.targetChapters ? String(targets.targetChapters) : "");
    setDraftWords(targets.chapterWords ? String(targets.chapterWords) : "");
    setTargetsDialogOpen(true);
  }

  async function saveTargets() {
    const chapters = draftChapters ? Number(draftChapters) : null;
    const words = draftWords ? Number(draftWords) : null;
    if (chapters != null && (!Number.isFinite(chapters) || chapters < 1)) {
      toast({ title: "章节数需为大于 0 的整数", type: "warning" });
      return;
    }
    if (words != null && (!Number.isFinite(words) || words < 100)) {
      toast({ title: "每章字数需不小于 100", type: "warning" });
      return;
    }
    const res = await updateProjectTargetsAction(project.id, {
      targetChapters: chapters,
      chapterWords: words,
    });
    if (res.ok) {
      setTargets({ targetChapters: chapters, chapterWords: words });
      setTargetsDialogOpen(false);
      toast({ title: "全书规模已更新", type: "success" });
    } else {
      toast({ title: "更新失败", description: res.error, type: "error" });
    }
  }

  async function handleStyleChange(profile: StyleProfile | null) {
    setStyleProfile(profile);
    const res = await updateStyleProfileAction(project.id, profile);
    if (res.ok) {
      toast({ title: profile ? "风格已更新" : "风格已清除", type: "success" });
      setStyleDialogOpen(false);
    } else {
      toast({ title: "更新失败", description: res.error, type: "error" });
    }
  }

  async function handleModelChange(modelId: string | null) {
    setProjectModel(modelId);
    const res = await updateProjectModelAction(project.id, modelId);
    if (res.ok) {
      toast({ title: "模型已切换", type: "success" });
    } else {
      toast({ title: "切换失败", description: res.error, type: "error" });
    }
  }

  // 预计算摘要
  const worldSummary = project.worldSettings
    .map(
      (w) =>
        `【${w.title}】${typeof w.content === "string" ? w.content : JSON.stringify(w.content)}`
    )
    .join("\n");
  const characterSummary = project.characters
    .map(
      (c) =>
        `${c.name}(${c.role})：${c.personality || ""} ${c.background || ""} ${
          c.motivation ? "动机：" + c.motivation : ""
        }`
    )
    .join("\n");

  // 空闲时预加载：TipTap bundle + chat session 数据
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const ric = w.requestIdleCallback;

    const preloadChat = () => {
      if (chatPrefetchedRef.current) return;
      chatPrefetchedRef.current = true;
      getOrFetchChatSession(project.id).catch(() => {});
    };

    const preloadTipTap = () => {
      if (tipTapLoadedRef.current) return;
      import("@/components/editor/tiptap-editor").then(() => {
        tipTapLoadedRef.current = true;
      }).catch(() => {});
    };

    if (ric) {
      const h1 = ric(preloadTipTap, { timeout: 3000 });
      const h2 = ric(preloadChat, { timeout: 5000 });
      return () => {
        const cic = (window as Window & {
          cancelIdleCallback?: (id: number) => void;
        }).cancelIdleCallback;
        cic?.(h1);
        cic?.(h2);
      };
    } else {
      const t1 = setTimeout(preloadTipTap, 1500);
      const t2 = setTimeout(preloadChat, 2500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [project.id]);

  const isPipeline = activeView === "PIPELINE";
  const modeLabel = VIEW_MODES.find((m) => m.key === activeView)?.label ?? "";
  const caption = isPipeline
    ? `${project.genre} · 第 ${project.currentStep}/6 步 · ${STEP_LABELS[project.currentStep - 1]}`
    : `${project.genre} · ${modeLabel}`;

  return (
    <div className="h-full flex flex-col bg-[var(--bg-canvas)]">
      {/* 统一顶栏：品牌 + 项目名 + 模型/思考/模式切换 */}
      <header className="shrink-0 border-b border-border-neutral-l1 bg-bg-base-default">
        <div className="flex h-14 items-center gap-3 px-4">
          <Link href="/projects" className="flex shrink-0 items-center gap-2">
            <span className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg shadow-[var(--shadow-glow)]">
              <PenLine className="h-4 w-4 text-text-onbrand" />
            </span>
            <span className="font-display hidden text-base font-bold text-text-default sm:block">
              墨笔
            </span>
          </Link>
          <span className="hidden h-5 w-px bg-border-neutral-l2 sm:block" />
          <div className="min-w-0">
            <h1 className="font-display truncate text-[15px] font-semibold leading-tight text-text-default">
              {project.title}
            </h1>
            <p className="truncate text-[11px] leading-tight text-text-tertiary">{caption}</p>
          </div>
          {isPipeline && (
            <>
              <button
                onClick={openTargetsDialog}
                className={cn(
                  "hidden h-7 items-center gap-1.5 rounded-md px-2 text-xs transition-colors md:inline-flex",
                  targets.targetChapters || targets.chapterWords
                    ? "bg-bg-overlay-l1 text-text-default hover:bg-bg-overlay-l2"
                    : "border border-border-neutral-l2 text-text-tertiary hover:bg-bg-overlay-l1 hover:text-text-default"
                )}
                title="设定全书目标章节数与每章字数，大纲与扩写将据此把控整体节奏"
              >
                <BookOpenText className="h-3.5 w-3.5" />
                {targets.targetChapters || targets.chapterWords
                  ? [
                      targets.targetChapters ? `${targets.targetChapters} 章` : null,
                      targets.chapterWords ? `${targets.chapterWords}字/章` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : "全书规划"}
              </button>
              {styleProfile ? (
                <button
                  onClick={() => setStyleDialogOpen(true)}
                  className="hidden h-7 items-center gap-1.5 rounded-md bg-bg-brand-popup px-2 text-xs text-text-brand transition-colors hover:brightness-[0.98] md:inline-flex"
                  title="点击更换写作风格"
                >
                  <span className="font-medium">{styleProfile.name}</span>
                  <span className="opacity-70">
                    {styleProfile.intensity === "low"
                      ? "轻微"
                      : styleProfile.intensity === "medium"
                        ? "中等"
                        : "强烈"}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => setStyleDialogOpen(true)}
                  className="hidden h-7 items-center gap-1 rounded-md border border-border-neutral-l2 px-2 text-xs text-text-tertiary transition-colors hover:bg-bg-overlay-l1 hover:text-text-default md:inline-flex"
                >
                  + 写作风格
                </button>
              )}
            </>
          )}
          <div className="flex-1" />
          <span className="hidden items-center gap-1.5 lg:flex">
            <span className="text-xs text-text-tertiary">字数统计</span>
            <span className="num text-sm font-medium text-text-default">
              {formatCount(
                project.chapters.reduce((s, c) => s + (c.wordCount || 0), 0)
              )}{" "}
              字
            </span>
          </span>
          <span className="hidden text-xs text-text-tertiary md:inline">模型</span>
          <ModelPicker value={projectModel} onChange={handleModelChange} />
          <ThinkingToggle />
          <ProjectModeSwitcher
            current={activeView}
            onChange={handleViewChange}
            pending={pending}
          />
        </div>
      </header>

      {/* 三个视图同时挂载，但用 content-visibility: auto 让非激活视图跳过渲染 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* 流水线视图 */}
        <div
          className="h-full"
          style={{
            display: activeView === "PIPELINE" ? "block" : "none",
            contentVisibility: activeView === "PIPELINE" ? "visible" : "auto",
            containIntrinsicSize: "0 600px",
          } as React.CSSProperties}
          aria-hidden={activeView !== "PIPELINE"}
        >
          <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0 container py-4 flex flex-col">
              <div className="bg-bg-base-default rounded-2xl shadow-sm border border-border-neutral-l1 p-6 flex flex-col h-full">
                <PipelineFlow
                  project={project as unknown as React.ComponentProps<typeof PipelineFlow>["project"]}
                  worldSummary={worldSummary}
                  characterSummary={characterSummary}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 工作台视图 */}
        <div
          className="h-full"
          style={{
            display: activeView === "WORKBENCH" ? "block" : "none",
            contentVisibility: activeView === "WORKBENCH" ? "visible" : "auto",
            containIntrinsicSize: "0 600px",
          } as React.CSSProperties}
          aria-hidden={activeView !== "WORKBENCH"}
        >
          <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0 flex flex-col">
              <WorkbenchClient
                project={project as unknown as React.ComponentProps<typeof WorkbenchClient>["project"]}
                memory={memory}
              />
            </div>
          </div>
        </div>

        {/* 对话共创视图 */}
        <div
          className="h-full"
          style={{
            display: activeView === "CHAT" ? "block" : "none",
            contentVisibility: activeView === "CHAT" ? "visible" : "auto",
            containIntrinsicSize: "0 600px",
          } as React.CSSProperties}
          aria-hidden={activeView !== "CHAT"}
        >
          <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0 flex flex-row p-3.5 gap-3">
              <div className="flex-1 min-w-0 flex flex-col">
                <ChatCoCreateClient projectId={project.id} />
              </div>
              {/* 对话模式右侧知识库（与工作台同款四页签，含记忆） */}
              <aside className="hidden w-80 shrink-0 flex-col lg:flex rounded-2xl border border-border-neutral-l1 bg-bg-base-default">
                <KnowledgeSidebarCompact
                  worldSettings={project.worldSettings}
                  characters={project.characters}
                  activeOutline={null}
                  genre={project.genre}
                  projectId={project.id}
                  memory={memory}
                />
              </aside>
            </div>
          </div>
        </div>
      </div>
      {/* 全书规模编辑弹窗 */}
      <Dialog open={targetsDialogOpen} onOpenChange={setTargetsDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader className="p-0 pr-8">
            <DialogTitle>全书规划</DialogTitle>
          </DialogHeader>
          <p className="text-xs leading-relaxed text-text-tertiary">
            设定目标章节数与每章字数后，大纲生成会把全书弧线与当前进度纳入规划，章节扩写会按每章字数控制篇幅。
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="target-chapters">目标章节数</Label>
              <Input
                id="target-chapters"
                type="number"
                min={1}
                max={10000}
                value={draftChapters}
                onChange={(e) => setDraftChapters(e.target.value)}
                placeholder="如 24"
                className="border-border-neutral-l2"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chapter-words">每章字数</Label>
              <Input
                id="chapter-words"
                type="number"
                min={100}
                max={50000}
                step={100}
                value={draftWords}
                onChange={(e) => setDraftWords(e.target.value)}
                placeholder="如 2000"
                className="border-border-neutral-l2"
              />
            </div>
          </div>
          {Number(draftChapters) > 0 && Number(draftWords) > 0 && (
            <p className="num text-xs text-text-tertiary">
              全书体量约 {((Number(draftChapters) * Number(draftWords)) / 10000).toFixed(1)} 万字
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => setTargetsDialogOpen(false)}
              className="border-border-neutral-l2 hover:bg-bg-overlay-l1"
            >
              取消
            </Button>
            <Button onClick={saveTargets}>保存</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 风格选择弹窗 */}
      <Dialog open={styleDialogOpen} onOpenChange={setStyleDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>写作风格</DialogTitle>
          </DialogHeader>
          <StylePicker value={styleProfile} onChange={handleStyleChange} />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setStyleDialogOpen(false)}
              className="border-border-neutral-l2 hover:bg-bg-overlay-l1"
            >
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 用 React.memo 包裹整个工作区，project 数据不变时不会重渲染
export const ProjectWorkspace = memo(ProjectWorkspaceImpl, (prev, next) => {
  // project 引用变化时重渲染（router.refresh 后 SSR 会传入新对象）
  return prev.project === next.project;
});
