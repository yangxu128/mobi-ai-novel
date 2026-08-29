"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FolderOpen, ScrollText, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "仪表盘", icon: LayoutDashboard, key: "dashboard", exact: true },
  { href: "/admin/users", label: "用户管理", icon: Users, key: "users" },
  { href: "/admin/projects", label: "项目管理", icon: FolderOpen, key: "projects" },
  { href: "/admin/logs", label: "AI 用量", icon: ScrollText, key: "logs" },
];

function matchActive(pathname: string, item: (typeof items)[number]) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export function AdminSidebar() {
  const pathname = usePathname() || "";

  const navList = (vertical: boolean) => (
    <>
      {items.map((it) => {
        const active = matchActive(pathname, it);
        return (
          <Link
            key={it.key}
            href={it.href}
            className={cn(
              "relative flex items-center gap-2.5 rounded-lg text-sm transition-all",
              vertical ? "px-3 py-2.5" : "px-3 py-1.5 whitespace-nowrap",
              active
                ? "bg-bg-brand-popup text-text-brand font-medium"
                : "text-text-secondary hover:text-text-default hover:bg-bg-overlay-l1"
            )}
          >
            {active && vertical && (
              <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full brand-gradient" />
            )}
            <it.icon className={vertical ? "h-4 w-4" : "h-3.5 w-3.5"} />
            {it.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* 桌面端：左侧垂直侧边栏（白色卡片） */}
      <aside className="w-56 shrink-0 hidden md:block">
        <div className="sticky top-20 rounded-2xl border border-border-neutral-l1 bg-bg-base-default p-3 shadow-[var(--shadow-card)]">
          <div className="mb-2 px-2 pb-2 pt-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">管理控制台</div>
          </div>
          <nav className="space-y-1">{navList(true)}</nav>
          <div className="mt-2 border-t border-border-neutral-l1 pt-2">
            <Link
              href="/projects"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-text-tertiary transition-colors hover:bg-bg-overlay-l1 hover:text-text-default"
            >
              <ArrowLeft className="h-4 w-4" />
              返回前台
            </Link>
          </div>
        </div>
      </aside>
      {/* 移动端：顶部水平导航条 */}
      <nav className="md:hidden flex gap-1 overflow-x-auto rounded-2xl border border-border-neutral-l1 bg-bg-base-default p-2 shadow-[var(--shadow-card)] -mx-1">
        {navList(false)}
      </nav>
    </>
  );
}
