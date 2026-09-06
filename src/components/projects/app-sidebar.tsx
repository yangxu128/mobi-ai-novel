"use client";

/**
 * 应用壳层左侧导航（Editorial Calm）：
 * 整个导航栏是一张悬浮大圆角卡片（品牌 / 导航 / 会员卡 / 用户都在卡内），
 * 浮在浅灰画布上；支持收起为窄栏（状态存 localStorage），带入场与悬停微动效。
 * 仅用于 /projects 与 /trash；项目工作台使用自绘顶栏不渲染此组件。
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  PenLine,
  Home,
  FolderClosed,
  Trash2,
  Crown,
  LogOut,
  CreditCard,
  PanelLeftClose,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users } from "lucide-react";
import { ContactQr } from "@/components/about/contact-qr";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "首页", icon: Home, match: (p: string) => p === "/" },
  { href: "/projects", label: "我的项目", icon: FolderClosed, match: (p: string) => p.startsWith("/projects") },
  { href: "/trash", label: "回收站", icon: Trash2, match: (p: string) => p.startsWith("/trash") },
] as const;

const COLLAPSE_KEY = "mb-sidebar-collapsed";
const INTRO_KEY = "mb-side-intro-played";

const EASE = "0.32s cubic-bezier(0.22, 1, 0.36, 1)";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  // 收起状态：挂载后再读 localStorage，避免 SSR 水合不一致
  const [collapsed, setCollapsed] = useState(false);
  // 入场动画只在会话首次进入时播放，避免列表/回收站来回切反复重播
  const [intro, setIntro] = useState(false);
  // 加入社区弹窗（双群二维码）
  const [communityOpen, setCommunityOpen] = useState(false);
  // 今日积分（积分制额度展示）
  const [credits, setCredits] = useState<{
    used: number;
    limit: number;
    unlimited: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/quota")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setCredits({
          used: d.usedCredits ?? 0,
          limit: d.limitCredits ?? 0,
          unlimited: !!d.unlimited,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    if (!sessionStorage.getItem(INTRO_KEY)) {
      sessionStorage.setItem(INTRO_KEY, "1");
      setIntro(true);
    }
  }, []);

  function toggle() {
    setCollapsed((v) => {
      localStorage.setItem(COLLAPSE_KEY, v ? "0" : "1");
      return !v;
    });
  }

  const d = (ms: number) =>
    intro ? { ["--d" as string]: `${ms}ms` } : undefined;
  const anim = intro ? "side-in" : "";

  return (
    <>
      {/* 移动端顶栏（<md：侧边栏隐藏时提供最小导航） */}
      <div className="sticky top-0 z-30 flex w-full items-center gap-2 border-b border-border-neutral-l1 bg-bg-base-default/95 px-3 py-2 backdrop-blur md:hidden">
        <Link
          href="/"
          aria-label="墨笔首页"
          className="brand-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-[var(--shadow-glow)]"
        >
          <PenLine className="h-4 w-4 text-text-onbrand" />
        </Link>
        <span className="font-display hidden text-base font-bold text-text-default sm:inline">墨笔</span>
        <nav className="ml-auto flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs transition-colors",
                  active
                    ? "brand-gradient font-medium text-text-onbrand"
                    : "text-text-secondary hover:bg-bg-overlay-l1 hover:text-text-default"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <aside
      className="sticky top-0 hidden h-[100dvh] shrink-0 overflow-hidden py-4 pl-4 md:block"
      style={{ width: collapsed ? 76 : 288, transition: `width ${EASE}` }}
    >
      {/* 整体大卡片：品牌 + 导航 + 会员 + 用户 */}
      <div
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-3xl border border-border-neutral-l1 bg-bg-base-default shadow-[var(--shadow-card)]",
          collapsed && "side-collapsed"
        )}
        style={{ width: collapsed ? 44 : 256, transition: `width ${EASE}` }}
      >
        {/* 品牌区（收起时点击 logo 展开，不额外占位） */}
        <div
          className={cn(
            "flex shrink-0 items-center gap-3",
            collapsed ? "justify-center px-1 pt-5" : "px-5 pt-5",
            anim
          )}
          style={{
            transition: `padding ${EASE}`,
            ...d(0),
          }}
        >
          <Link
            href="/"
            aria-label={collapsed ? "展开侧边栏" : "墨笔首页"}
            title={collapsed ? "展开侧边栏" : undefined}
            onClick={
              collapsed
                ? (e) => {
                    e.preventDefault();
                    toggle();
                  }
                : undefined
            }
            className={cn(
              "brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-[var(--shadow-glow)]",
              collapsed && "cursor-pointer transition-transform hover:scale-105 active:scale-95"
            )}
          >
            <PenLine className="h-5 w-5 text-text-onbrand" />
          </Link>
          <span className={cn("side-fade min-w-0 flex-1", collapsed && "hidden")}>
            <span className="font-display block text-lg font-bold leading-tight text-text-default">墨笔</span>
            <span className="block text-[11px] leading-tight text-text-tertiary">AI 写作平台</span>
          </span>
          {!collapsed && (
            <button
              type="button"
              aria-label="收起侧边栏"
              onClick={toggle}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-bg-overlay-l1 hover:text-text-default"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 主导航 */}
        <nav className={cn("mt-8 space-y-2", collapsed ? "px-1.5" : "px-3")}>
          {NAV_ITEMS.map((item, i) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                title={collapsed ? item.label : undefined}
                className={cn(
                  "nav-item",
                  anim,
                  collapsed && "nav-item--icon",
                  active && "is-active"
                )}
                style={d(80 + i * 70)}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className={cn("side-fade", collapsed && "hidden")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 底部：会员卡 + 用户 */}
        <div className={cn("mt-auto", collapsed ? "px-1.5 pb-3" : "p-3 pb-4")}>
          {!collapsed && (
            <div
              className={cn(
                "rounded-2xl bg-gradient-to-br from-[#FFF7EA] to-[#FBEAD0] p-4",
                anim
              )}
              style={d(290)}
            >
              <div className="flex items-center gap-2 text-sm font-medium text-text-default">
                <Crown className="h-4 w-4 text-[#D99A00]" />
                会员专享
              </div>
              <p className="mt-1 text-[11px] text-text-tertiary">解锁更多创作权益</p>
              <Link
                href="/pricing"
                prefetch
                className="mt-3 flex h-9 w-full items-center justify-center rounded-full border border-[#F0D9B8] bg-white text-xs font-medium text-text-brand transition-colors hover:bg-[#FFF6EA]"
              >
                升级会员
              </Link>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title={collapsed ? user?.name || "账号" : undefined}
                className={cn(
                  "mt-3 flex w-full items-center gap-3 rounded-xl py-1.5 text-left transition-colors hover:bg-bg-overlay-l1",
                  anim,
                  collapsed ? "justify-center" : "px-1.5"
                )}
                style={d(360)}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                  <AvatarFallback className="text-xs">
                    {(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className={cn("side-fade min-w-0 flex-1", collapsed && "hidden")}>
                  <span className="block truncate text-[13px] font-semibold text-text-default">
                    {user?.name || "墨笔用户"}
                  </span>
                  <span className="block truncate text-[11px] text-text-tertiary">
                    {user?.email || ""}
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {/* 今日积分（积分制额度展示） */}
              {credits && (
                <div className="px-2 pb-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-tertiary">今日积分</span>
                    <span className="num font-medium text-text-default">
                      {credits.unlimited ? "不限量" : `${credits.used} / ${credits.limit}`}
                    </span>
                  </div>
                  {!credits.unlimited && (
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg-overlay-l2">
                      <div
                        className="h-full rounded-full bg-bg-brand transition-[width]"
                        style={{ width: `${Math.min(100, (credits.used / credits.limit) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
              <DropdownMenuItem
                onClick={() => {
                  setTimeout(() => setCommunityOpen(true), 350);
                }}
              >
                <Users className="mr-2 h-4 w-4" />
                加入社区
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/pricing")}>
                <CreditCard className="mr-2 h-4 w-4" />
                订阅与权益
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-status-error focus:text-status-error"
              >
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>

    {/* 加入社区：双群二维码 */}
    <Dialog open={communityOpen} onOpenChange={setCommunityOpen}>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader className="p-0 pr-8">
          <DialogTitle>加入社区</DialogTitle>
        </DialogHeader>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: "0 0 4px 0" }}>
          扫码加入创作者交流群，和作者们一起让 AI 写作更好用：
        </p>
        <ContactQr />
      </DialogContent>
    </Dialog>
    </>
  );
}
