"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FolderOpen, ScrollText } from "lucide-react";
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
  return (
    <>
      {/* 桌面端：左侧垂直侧边栏（240px） */}
      <aside className="w-60 shrink-0 hidden md:block">
        <nav className="sticky top-20 space-y-1">
          {items.map((it) => {
            const active = matchActive(pathname, it);
            return (
              <Link
                key={it.key}
                href={it.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-bg-overlay-l2 text-text-default font-medium"
                    : "text-text-secondary hover:text-text-default hover:bg-bg-overlay-l1"
                )}
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      {/* 移动端：顶部水平导航条 */}
      <nav className="md:hidden flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
        {items.map((it) => {
          const active = matchActive(pathname, it);
          return (
            <Link
              key={it.key}
              href={it.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors",
                active
                  ? "bg-bg-overlay-l2 text-text-default font-medium"
                  : "text-text-secondary hover:text-text-default hover:bg-bg-overlay-l1"
              )}
            >
              <it.icon className="h-3.5 w-3.5" />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
