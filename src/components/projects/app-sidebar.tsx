"use client";

/**
 * 应用壳层左侧导航（Editorial Calm）：
 * 整个导航栏是一张悬浮大圆角卡片（品牌 / 导航 / 签到 / 会员卡 / 用户都在卡内），
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
  Gift,
  CheckCircle2,
  Users,
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
import { ContactQr } from "@/components/about/contact-qr";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "首页", icon: Home, match: (p: string) => p === "/" },
  { href: "/projects", label: "我的项目", icon: FolderClosed, match: (p: string) => p.startsWith("/projects") },
  { href: "/trash", label: "回收站", icon: Trash2, match: (p: string) => p.startsWith("/trash") },
] as const;

const COLLAPSE_KEY = "mb-sidebar-collapsed";
const INTRO_KEY = "mb-side-intro-played";

const EASE = "0.32s cubic-bezier(0.22, 1, 0.36, 1)";

/** 北京时间的日期键（YYYY-MM-DD） */
function todayKey(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
}

interface QuotaInfo {
  unlimited: boolean;
  checkedInToday: boolean;
  checkInReward: number;
  available: number;
  bonusBalance: number;
  monthlyGranted: number;
  monthlyUsed: number;
}

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
  // 积分状态（余额模式：订阅月度积分 + 签到积分）
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  // 每日签到提醒弹窗 + 签到进行中
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinPending, setCheckinPending] = useState(false);
  const [checkinDone, setCheckinDone] = useState(false);

  // 拉取积分状态 + 每天首次访问弹出签到提醒
  async function loadQuota(): Promise<QuotaInfo | null> {
    try {
      const r = await fetch("/api/quota");
      if (!r.ok) return null;
      const d = (await r.json()) as QuotaInfo;
      setQuota(d);
      return d;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    if (!sessionStorage.getItem(INTRO_KEY)) {
      sessionStorage.setItem(INTRO_KEY, "1");
      setIntro(true);
    }
    loadQuota().then((d) => {
      if (!d || d.unlimited || d.checkedInToday) return;
      const key = `mb-checkin-remind-${todayKey()}`;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
      setCheckinOpen(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() {
    setCollapsed((v) => {
      localStorage.setItem(COLLAPSE_KEY, v ? "0" : "1");
      return !v;
    });
  }

  async function doCheckIn() {
    if (checkinPending) return;
    setCheckinPending(true);
    try {
      const r = await fetch("/api/quota/check-in", { method: "POST" });
      const d = await r.json();
      if (d.ok) {
        setCheckinDone(true);
        setQuota((q) =>
          q
            ? {
                ...q,
                checkedInToday: true,
                bonusBalance: (q.bonusBalance ?? 0) + (d.granted ?? 0),
                available: (q.available ?? 0) + (d.granted ?? 0),
              }
            : q
        );
        toast({ title: "签到成功", description: `+${d.granted ?? 50} 积分已到账`, type: "success" });
      } else if (d.already) {
        setQuota((q) => (q ? { ...q, checkedInToday: true } : q));
        setCheckinDone(true);
        toast({ title: "今天已经签到过了", type: "default" });
      }
    } catch {
      toast({ title: "签到失败，请稍后再试", type: "error" });
    } finally {
      setCheckinPending(false);
    }
  }

  const d = (ms: number) =>
    intro ? { ["--d" as string]: `${ms}ms` } : undefined;
  const anim = intro ? "side-in" : "";
  const checkedIn = !!quota?.checkedInToday;

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
      {/* 整体大卡片：品牌 + 导航 + 签到 + 会员 + 用户 */}
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

        {/* 底部：每日签到 + 会员卡 + 用户 */}
        <div className={cn("mt-auto", collapsed ? "px-1.5 pb-3" : "p-3 pb-4")}>
          {/* 每日签到（积分制：签到积分长期有效） */}
          {!collapsed && quota && !quota.unlimited && (
            <button
              type="button"
              onClick={doCheckIn}
              disabled={checkinPending || checkedIn}
              className={cn(
                "mb-3 flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                checkedIn
                  ? "border-[#DFF3E8] bg-[#F0FAF4]"
                  : "border-[#F5DFC0] bg-gradient-to-br from-[#FFF7EA] to-[#FBEAD0] hover:border-[#EBCF9F]"
              )}
            >
              {checkedIn ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#15A877]" />
              ) : (
                <Gift className="h-5 w-5 shrink-0 text-[#D99A00]" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-text-default">
                  {checkedIn ? "今日已签到" : "每日签到"}
                </span>
                <span className="block text-[11px] text-text-tertiary">
                  {checkedIn ? "明天再来领 50 积分" : `签到领 ${quota.checkInReward ?? 50} 积分`}
                </span>
              </span>
            </button>
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
                    我的积分 {quota ? (quota.unlimited ? "不限量" : quota.available) : "…"}
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem onClick={() => setCommunityOpen(true)}>
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

      {/* 每日签到提醒弹窗（每天首次访问弹出一次） */}
      <Dialog open={checkinOpen} onOpenChange={setCheckinOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-6">
          <DialogHeader className="p-0">
            <DialogTitle>每日签到</DialogTitle>
          </DialogHeader>
          {checkinDone ? (
            <div className="flex flex-col items-center py-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-[#15A877]" />
              <p className="mt-3 text-base font-semibold text-text-default">签到成功</p>
              <p className="mt-1 text-sm text-text-tertiary">
                +{quota?.checkInReward ?? 50} 积分已到账，当前可用 {quota?.available ?? 0} 积分
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-2 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#FFF7EA] to-[#FBEAD0]">
                <Gift className="h-7 w-7 text-[#D99A00]" />
              </span>
              <p className="mt-3 text-base font-semibold text-text-default">
                签到领 {quota?.checkInReward ?? 50} 积分
              </p>
              <p className="mt-1 text-xs leading-relaxed text-text-tertiary">
                连续签到积累积分，AI 生成长文时按用量扣减，签到积分长期有效
              </p>
            </div>
          )}
          {!checkinDone && !checkedIn && (
            <button
              type="button"
              onClick={doCheckIn}
              disabled={checkinPending}
              className="btn-cta h-10 w-full rounded-full bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60"
            >
              {checkinPending ? "签到中..." : "立即签到领取"}
            </button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
