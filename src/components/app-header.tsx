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

export function AppHeader() {
  const { data: session, status } = useSession();
  const router = useRouter();

  return (
    <header className="border-b border-neutral-100 bg-white/95 backdrop-blur sticky top-0 z-40">
      <div className="container flex h-14 items-center justify-between">
        <Link href={session?.user ? "/projects" : "/"} className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-neutral-900 flex items-center justify-center">
            <PenLine className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-lg">墨笔</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">AI 写作平台</span>
        </Link>

        <nav className="flex items-center gap-2">
          {/* 避免闪烁：session 加载中时显示骨架占位 */}
          {status === "loading" ? (
            <div className="h-8 w-20 bg-muted rounded animate-pulse" />
          ) : session?.user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/projects">
                  <LayoutGrid className="h-4 w-4" />
                  我的项目
                </Link>
              </Button>
              <Button asChild size="sm" className="bg-neutral-900 text-white hover:bg-neutral-800">
                <Link href="/projects?new=1">
                  <Plus className="h-4 w-4" />
                  新建
                </Link>
              </Button>
              {session.user.role === "ADMIN" && (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin">
                    <Shield className="h-4 w-4" />
                    管理后台
                  </Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring">
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
                    <div className="text-sm font-medium">{session.user.name || "未命名"}</div>
                    <div className="text-xs text-muted-foreground truncate">{session.user.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/pricing")}>
                    订阅与权益
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-destructive focus:text-destructive"
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
                <Link href="/pricing">定价</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">登录</Link>
              </Button>
              <Button asChild size="sm" className="bg-neutral-900 text-white hover:bg-neutral-800">
                <Link href="/register">免费注册</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
