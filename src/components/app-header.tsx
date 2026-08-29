"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { PenLine, LogOut, Plus, LayoutGrid, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * 顶部导航栏
 * - 所有 Link 启用 prefetch，提前加载目标路由
 * - session 加载中时显示稳定的占位结构，避免布局抖动
 * - 使用固定尺寸容器，保证加载前后宽度一致
 */
export function AppHeader() {
  const { data: session, status } = useSession();
  const router = useRouter();

  return (
    <header className="border-b border-border-neutral-l1 bg-bg-base-default/95 backdrop-blur sticky top-0 z-40">
      <div className="container flex h-14 items-center justify-between">
        <Link href={session?.user ? "/projects" : "/"} className="flex items-center gap-2" prefetch>
          <div className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg shadow-[var(--shadow-glow)]">
            <PenLine className="h-4 w-4 text-text-onbrand" />
          </div>
          <span className="font-semibold text-lg text-text-default">墨笔</span>
          <span className="text-xs text-text-tertiary hidden sm:inline">AI 写作平台</span>
        </Link>

        <nav className="flex items-center gap-2 min-w-[180px] justify-end">
          {/* session 加载中或已登录：根据是否登录渲染对应 UI，避免闪烁 */}
          {status === "loading" ? (
            // 加载占位：固定尺寸 + 禁用动画，最大程度减少感知卡顿
            <div className="flex items-center gap-2 opacity-0 pointer-events-none" aria-hidden>
              <div className="h-8 w-20 rounded-md bg-bg-overlay-l1" />
              <div className="h-8 w-16 rounded-md bg-bg-overlay-l1" />
              <div className="h-8 w-8 rounded-full bg-bg-overlay-l1" />
            </div>
          ) : session?.user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/projects" prefetch>
                  <LayoutGrid className="h-4 w-4" />
                  我的项目
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/projects?new=1" prefetch>
                  <Plus className="h-4 w-4" />
                  新建
                </Link>
              </Button>
              {session.user.role === "ADMIN" && (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin" prefetch>
                    <Shield className="h-4 w-4" />
                    管理后台
                  </Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring transition-transform active:scale-95"
                    aria-label="用户菜单"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
                      <AvatarFallback className="text-xs">
                        {(session.user.name || session.user.email || "U").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="text-sm font-medium text-text-default">{session.user.name || "未命名"}</div>
                    <div className="text-xs text-text-tertiary truncate">{session.user.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/pricing")}>
                    订阅与权益
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-status-error focus:text-status-error"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/pricing" prefetch>定价</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login" prefetch>登录</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register" prefetch>免费注册</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
