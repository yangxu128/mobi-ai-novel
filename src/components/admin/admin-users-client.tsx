"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/toast";
import { updateUserRoleAction, deleteUserAction, updateUserSubscriptionAction } from "@/actions/admin";
import { Search, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

type UserItem = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatar: string | null;
  createdAt: string;
  _count: { projects: number; aiUsageLogs: number };
  subscription: { plan: string; status: string } | null;
};

const roleColors: Record<string, string> = {
  ADMIN: "bg-status-error/10 text-status-error",
  PRO: "bg-bg-brand-popup text-text-brand",
  BASIC: "bg-status-info/10 text-status-info",
  FREE: "bg-bg-overlay-l1 text-text-secondary",
};
export function AdminUsersClient({
  users,
  page,
  totalPages,
  search,
  role,
  plan,
}: {
  users: UserItem[];
  page: number;
  totalPages: number;
  search: string;
  role: string;
  plan: string;
}) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(search);
  const [roleFilter, setRoleFilter] = useState(role);
  const [planFilter, setPlanFilter] = useState(plan);
  const [pending, startTransition] = useTransition();

  /** 组合筛选参数并导航（filters 变更时重置到第 1 页） */
  function navigate(next: { search?: string; role?: string; plan?: string; page?: number }) {
    const params = new URLSearchParams();
    const s = next.search ?? keyword;
    const r = next.role ?? roleFilter;
    const pl = next.plan ?? planFilter;
    if (s) params.set("search", s);
    if (r) params.set("role", r);
    if (pl) params.set("plan", pl);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    router.push(`/admin/users?${params.toString()}`);
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ search: keyword, page: 1 });
  }

  function onRoleChange(userId: string, role: string) {
    startTransition(async () => {
      const res = await updateUserRoleAction(userId, role as "ADMIN" | "FREE" | "BASIC" | "PRO");
      if (res.ok) {
        toast({ title: "角色已更新", type: "success" });
        router.refresh();
      } else {
        toast({ title: "操作失败", description: res.error, type: "error" });
      }
    });
  }

  function onPlanChange(userId: string, plan: string) {
    startTransition(async () => {
      const res = await updateUserSubscriptionAction(userId, plan as "FREE" | "BASIC" | "PRO");
      if (res.ok) {
        toast({ title: "订阅套餐已更新", type: "success" });
        router.refresh();
      } else {
        toast({ title: "操作失败", description: res.error, type: "error" });
      }
    });
  }

  function onDelete(userId: string) {
    startTransition(async () => {
      const res = await deleteUserAction(userId);
      if (res.ok) {
        toast({ title: "用户已删除", type: "success" });
        router.refresh();
      } else {
        toast({ title: "删除失败", description: res.error, type: "error" });
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* 搜索与筛选 */}
      <form onSubmit={onSearch} className="flex flex-wrap gap-2">
        <div className="relative min-w-52 flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索邮箱或昵称"
            className="pl-9"
          />
        </div>
        <Select value={roleFilter || "all"} onValueChange={(v) => { setRoleFilter(v === "all" ? "" : v); navigate({ role: v === "all" ? "" : v, page: 1 }); }}>
          <SelectTrigger className="w-36 whitespace-nowrap"><SelectValue placeholder="全部角色" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部角色</SelectItem>
            <SelectItem value="ADMIN">ADMIN</SelectItem>
            <SelectItem value="PRO">PRO</SelectItem>
            <SelectItem value="BASIC">BASIC</SelectItem>
            <SelectItem value="FREE">FREE</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter || "all"} onValueChange={(v) => { setPlanFilter(v === "all" ? "" : v); navigate({ plan: v === "all" ? "" : v, page: 1 }); }}>
          <SelectTrigger className="w-36 whitespace-nowrap"><SelectValue placeholder="全部订阅" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部订阅</SelectItem>
            <SelectItem value="FREE">FREE</SelectItem>
            <SelectItem value="BASIC">BASIC</SelectItem>
            <SelectItem value="PRO">PRO</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" variant="outline" size="sm">查询</Button>
        {(search || roleFilter || planFilter) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-text-tertiary"
            onClick={() => { setKeyword(""); setRoleFilter(""); setPlanFilter(""); router.push("/admin/users"); }}
          >
            重置
          </Button>
        )}
      </form>

      {/* 表格 */}
      <div className="rounded-2xl border border-border-neutral-l1 bg-bg-base-default shadow-[var(--shadow-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-overlay-l1/70">
              <tr className="text-left text-xs uppercase tracking-wider text-text-tertiary">
                <th className="px-5 py-3.5 font-medium">用户</th>
                <th className="px-5 py-3.5 font-medium">角色</th>
                <th className="px-5 py-3.5 font-medium">订阅</th>
                <th className="px-5 py-3.5 font-medium text-center">项目数</th>
                <th className="px-5 py-3.5 font-medium text-center">AI 调用</th>
                <th className="px-5 py-3.5 font-medium">注册时间</th>
                <th className="px-5 py-3.5 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-neutral-l1">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-text-tertiary">
                    没有找到用户
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-bg-overlay-l1/60">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-text-default">{u.name || "未命名"}</div>
                      <div className="text-xs text-text-tertiary">{u.email}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Select
                        value={u.role}
                        onValueChange={(v) => onRoleChange(u.id, v)}
                        disabled={pending}
                      >
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue>
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs ${roleColors[u.role] || ""}`}>
                              {u.role}
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">ADMIN</SelectItem>
                          <SelectItem value="PRO">PRO</SelectItem>
                          <SelectItem value="BASIC">BASIC</SelectItem>
                          <SelectItem value="FREE">FREE</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-3.5">
                      <Select
                        value={u.subscription?.plan || "FREE"}
                        onValueChange={(v) => onPlanChange(u.id, v)}
                        disabled={pending || u.role === "ADMIN"}
                      >
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FREE">FREE</SelectItem>
                          <SelectItem value="BASIC">BASIC</SelectItem>
                          <SelectItem value="PRO">PRO</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="num px-5 py-3.5 text-center text-text-default">{u._count.projects}</td>
                    <td className="num px-5 py-3.5 text-center text-text-default">{u._count.aiUsageLogs}</td>
                    <td className="px-5 py-3.5 text-text-tertiary">
                      {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={pending} className="text-status-error hover:text-status-error">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>确认删除用户？</AlertDialogTitle>
                            <AlertDialogDescription>
                              将永久删除用户 {u.email} 及其所有项目和数据，此操作不可撤销。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(u.id)}
                              className="bg-status-error text-text-onaccent hover:bg-status-error-hover"
                            >
                              确认删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => navigate({ page: page - 1 })}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="num text-sm text-text-tertiary">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => navigate({ page: page + 1 })}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
