"use client";

import { useEffect, useRef, memo, useState } from "react";
import Link from "next/link";
import { ProjectModeSwitcher } from "@/components/project-mode-switcher";
import { PipelineFlow } from "@/components/pipeline/pipeline-flow";
import { WorkbenchClient } from "@/components/workbench/workbench-client";
import { ChatCoCreateClient, getOrFetchChatSession } from "@/components/chat/chat-cocreate-client";
import { useViewSwitcher } from "@/components/hooks/use-view-switcher";
import type { ViewMode } from "@/components/project-mode-switcher";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StylePicker } from "@/components/style/style-picker";
import { ModelPicker } from "@/components/model/model-picker";
import { updateStyleProfileAction, updateProjectModelAction } from "@/actions/project";
import type { StyleProfile } from "@/lib/ai/style";
import { toast } from "@/components/ui/toast";

interface ProjectData {
  id: string;
  title: string;
  genre: string;
  mode: string;
  currentStep: number;
  synopsis: string | null;
  model: string | null;
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
function ProjectWorkspaceImpl({ project, initialView }: Props) {
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

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      {isPipeline ? (
        <div className="container py-4 shrink-0">
          <div className="bg-bg-base-default rounded-2xl shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-text-tertiary mb-1">
                <Link href="/projects" className="hover:text-text-default">
                  我的项目
                </Link>
                <span>/</span>
                <span>流水线</span>
              </div>
              <h1 className="text-2xl font-bold">{project.title}</h1>
              <p className="text-sm text-text-tertiary mt-1">
                {project.genre} · 第 {project.currentStep}/6 步 ·{" "}
                {STEP_LABELS[project.currentStep - 1]}
              </p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {styleProfile && (
                  <button
                    onClick={() => setStyleDialogOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-overlay-l1 hover:bg-bg-overlay-l2 transition-colors text-xs"
                  >
                    <span className="font-medium text-text-default">{styleProfile.name}</span>
                    <span className="text-text-tertiary">
                      {styleProfile.intensity === "low" ? "轻微" : styleProfile.intensity === "medium" ? "中等" : "强烈"}
                    </span>
                    <span className="text-text-disabled">|</span>
                    <span className="text-text-tertiary">更换</span>
                  </button>
                )}
                {!styleProfile && (
                  <button
                    onClick={() => setStyleDialogOpen(true)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border-neutral-l2 hover:bg-bg-overlay-l1 transition-colors text-xs text-text-tertiary"
                  >
                    + 设置写作风格
                  </button>
                )}
                <ModelPicker value={projectModel} onChange={handleModelChange} />
              </div>
            </div>
            <ProjectModeSwitcher
              current={activeView}
              onChange={handleViewChange}
              pending={pending}
            />
          </div>
        </div>
      ) : (
        <div className="border-b border-border-neutral-l1 bg-bg-base-default shrink-0">
          <div className="container py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link
                href="/projects"
                className="text-xs text-text-tertiary hover:text-text-default"
              >
                项目列表
              </Link>
              <span className="text-xs text-text-tertiary">/</span>
              <span className="text-sm font-medium">{project.title}</span>
              <span className="ml-2">
                <ModelPicker value={projectModel} onChange={handleModelChange} />
              </span>
            </div>
            <ProjectModeSwitcher
              current={activeView}
              onChange={handleViewChange}
              pending={pending}
            />
          </div>
        </div>
      )}

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
            <div className="flex-1 min-h-0 container py-2 flex flex-col">
              <WorkbenchClient
                project={project as unknown as React.ComponentProps<typeof WorkbenchClient>["project"]}
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
            <div className="flex-1 min-h-0 container py-2 flex flex-col">
              <ChatCoCreateClient projectId={project.id} />
            </div>
          </div>
        </div>
      </div>
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
