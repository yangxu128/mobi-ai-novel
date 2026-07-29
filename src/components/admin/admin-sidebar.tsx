import Link from "next/link";
import { LayoutDashboard, Users, FolderOpen, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "仪表盘", icon: LayoutDashboard, key: "dashboard" },
  { href: "/admin/users", label: "用户管理", icon: Users, key: "users" },
  { href: "/admin/projects", label: "项目管理", icon: FolderOpen, key: "projects" },
  { href: "/admin/logs", label: "AI 用量", icon: ScrollText, key: "logs" },
];

export function AdminSidebar({ active }: { active: string }) {
  return (
    <aside className="w-52 shrink-0 hidden md:block">
      <nav className="sticky top-20 space-y-1">
        {items.map((it) => (
          <Link
            key={it.key}
            href={it.href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
              active === it.key
                ? "bg-neutral-100 text-neutral-900 font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <it.icon className="h-4 w-4" />
            {it.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
