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
 */

import { useState, useCallback, useEffect, useTransition } from "react";
import { VIEW_MODES, type ViewMode } from "@/components/project-mode-switcher";
import { updateProjectModeAction } from "@/actions/project";

// module-level 缓存：同一项目在浏览器 session 内只写一次 mode
// 避免快速切视图（如在三个 tab 之间快速点击）触发多次数据库写入和路由刷新
const lastModeSyncRef = new Map<string, { mode: ViewMode; ts: number }>();
const MODE_SYNC_DEBOUNCE_MS = 800;

export function useViewSwitcher(projectId: string, initialView: ViewMode) {
  const [activeView, setActiveView] = useState<ViewMode>(initialView);
  const [pending, setPending] = useState<ViewMode | null>(null);
  const [, startTransition] = useTransition();

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

      // 3. 异步更新 mode（去抖 + 不 revalidate）
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
    [activeView, pending, projectId]
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

  return { activeView, pending, handleViewChange };
}
