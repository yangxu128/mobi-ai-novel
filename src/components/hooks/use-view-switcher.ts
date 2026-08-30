"use client";

/**
 * 视图切换 Hook —— 从 project-workspace.tsx 中提取。
 *
 * 职责：
 * 1. 管理 activeView / pending 状态
 * 2. 立即切换 UI（setState + CSS display）
 * 3. 同步 URL（history.replaceState，不触发 Next.js 路由）
 * 4. 异步更新 mode（去抖 + 不 revalidate，避免连续写库和路由刷新）
 * 5. 监听浏览器前进/后退
 * 6. 切换视图时 router.refresh() 拉取最新服务端数据
 *    （流水线里自动保存的章节内容要能在工作台看到）
 * 7. 监听 PROJECT_VIEW_CHANGE_EVENT，供任意组件（如流水线
 *    「前往工作台继续编辑」按钮）以编程方式切换视图
 */

import { useState, useCallback, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { VIEW_MODES, type ViewMode } from "@/components/project-mode-switcher";
import { updateProjectModeAction } from "@/actions/project";

/** 跨组件切换工作区视图的事件名，detail: { view: ViewMode } */
export const PROJECT_VIEW_CHANGE_EVENT = "mb-project-view-change";

// module-level 缓存：同一项目在浏览器 session 内只写一次 mode
// 避免快速切视图（如在三个 tab 之间快速点击）触发多次数据库写入和路由刷新
const lastModeSyncRef = new Map<string, { mode: ViewMode; ts: number }>();
const MODE_SYNC_DEBOUNCE_MS = 800;

export function useViewSwitcher(projectId: string, initialView: ViewMode) {
  const [activeView, setActiveView] = useState<ViewMode>(initialView);
  const [pending, setPending] = useState<ViewMode | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const handleViewChange = useCallback(
    (next: ViewMode) => {
      if (next === activeView || pending) return;
      setPending(next);

      // 1. 立即切换 UI 视图（瞬时）
      startTransition(() => {
        setActiveView(next);
      });

      // 2. 同步 URL（不触发 Next.js 路由）
      const query = VIEW_MODES.find((m) => m.key === next)?.query ?? "pipeline";
      const newUrl = `${window.location.pathname}?view=${query}`;
      window.history.replaceState(null, "", newUrl);

      // 3. 拉取最新服务端数据：其他视图（流水线/对话）保存的内容
      //    需要在切换后立即可见，否则工作台章节是旧数据
      router.refresh();

      // 4. 异步更新 mode（去抖 + 不 revalidate）
      const last = lastModeSyncRef.get(projectId);
      const now = Date.now();
      const skip =
        last && last.mode === next && now - last.ts < MODE_SYNC_DEBOUNCE_MS * 5;
      if (!skip) {
        lastModeSyncRef.set(projectId, { mode: next, ts: now });
        setTimeout(() => {
          updateProjectModeAction(projectId, next)
            .catch(() => {})
            .finally(() => {
              setTimeout(() => setPending(null), 200);
            });
        }, MODE_SYNC_DEBOUNCE_MS);
      } else {
        setTimeout(() => setPending(null), 200);
      }
    },
    [activeView, pending, projectId, router]
  );

  // 监听浏览器前进/后退
  useEffect(() => {
    const onPopState = () => {
      const url = new URL(window.location.href);
      const view = url.searchParams.get("view") as ViewMode | null;
      if (view && VIEW_MODES.some((m) => m.key === view) && view !== activeView) {
        setActiveView(view);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [activeView]);

  // 监听编程式视图切换事件（流水线「前往工作台继续编辑」按钮）
  useEffect(() => {
    const handler = (e: Event) => {
      const view = (e as CustomEvent<{ view?: ViewMode }>).detail?.view;
      if (view && VIEW_MODES.some((m) => m.key === view)) {
        handleViewChange(view);
      }
    };
    window.addEventListener(PROJECT_VIEW_CHANGE_EVENT, handler);
    return () => window.removeEventListener(PROJECT_VIEW_CHANGE_EVENT, handler);
  }, [handleViewChange]);

  return { activeView, pending, handleViewChange };
}
