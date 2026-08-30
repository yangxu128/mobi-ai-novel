"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { AppHeader } from "@/components/app-header";
import { Toaster } from "@/components/ui/toast";

/**
 * 兜底守卫：Radix 的 DropdownMenu 与 AlertDialog 连续开关时，
 * body 上的 pointer-events:none 偶发释放不完全（计数竞态），
 * 导致整页不可点击。这里定时检查：没有任何弹层打开却仍是 none 时，
 * 强制恢复默认指针状态。
 */
function usePointerEventsGuard() {
  useEffect(() => {
    const id = setInterval(() => {
      if (document.body.style.pointerEvents !== "none") return;
      const overlayOpen = document.querySelector(
        '[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"], [data-state="open"][role="menu"], [data-state="open"][role="listbox"], [data-state="open"][role="tooltip"], [data-state="open"][role="combobox"]',
      );
      if (!overlayOpen) {
        document.body.style.pointerEvents = "";
      }
    }, 1500);
    return () => clearInterval(id);
  }, []);
}

export function Providers({ children }: { children: React.ReactNode }) {
  usePointerEventsGuard();
  return (
    // SessionProvider 默认行为：
    //   - refetchInterval=60s：每 60s 轮询 /api/auth/session
    //   - refetchOnWindowFocus=true：窗口获得焦点时重新拉取
    // 在 app router 中多次挂载/路由切换时，会反复触发 session 拉取，
    // 看到 Network 面板里一连串 /api/auth/session 请求。改成 0/false 完全禁用：
    //   - 顶层 layout.tsx 已用 server-side auth() 读取并下发 session 数据
    //   - JWT 策略下 client 端不再需要轮询，session 内容变化（如 role）由 router.refresh 触发
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      {/* 使用 100dvh 动态视口高度，避免移动端地址栏显隐时触发重排导致卡顿 */}
      {/* 保持单一滚动容器，确保 chat 等全屏页面能正确撑开 */}
      <div className="h-[100dvh] flex flex-col overflow-hidden bg-bg-overlay-l1">
        <AppHeader />
        <main className="flex-1 min-h-0 overflow-y-auto page-content">
          {children}
        </main>
        <Toaster />
      </div>
    </SessionProvider>
  );
}
