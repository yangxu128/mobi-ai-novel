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
}: {
  users: UserItem[];
  page: number;
  totalPages: number;
  search: string;
}) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(search);
  const [pending, startTransition] = useTransition();

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.set("search", keyword);
    router.push(`/admin/users?${params.toString()}`);
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
      {/* 搜索 */}
      <form onSubmit={onSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索邮箱或昵称"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline" size="sm">搜索</Button>
      </form>

      {/* 表格 */}
      <div className="rounded-lg border border-border-neutral-l1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-overlay-l1">
              <tr className="text-left text-text-default">
                <th className="px-4 py-3 font-medium">用户</th>
                <th className="px-4 py-3 font-medium">角色</th>
                <th className="px-4 py-3 font-medium">订阅</th>
                <th className="px-4 py-3 font-medium text-center">项目数</th>
                <th className="px-4 py-3 font-medium text-center">AI 调用</th>
                <th className="px-4 py-3 font-medium">注册时间</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-neutral-l1">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-tertiary">
                    没有找到用户
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-bg-overlay-l1">
                    <td className="px-4 py-3">
                      <div className="font-medium text-text-default">{u.name || "未命名"}</div>
                      <div className="text-xs text-text-tertiary">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3 text-center text-text-default">{u._count.projects}</td>
                    <td className="px-4 py-3 text-center text-text-default">{u._count.aiUsageLogs}</td>
                    <td className="px-4 py-3 text-text-tertiary">
                      {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-4 py-3 text-right">
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
            onClick={() => {
              const params = new URLSearchParams();
              if (search) params.set("search", search);
              params.set("page", String(page - 1));
              router.push(`/admin/users?${params.toString()}`);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-text-tertiary">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => {
              const params = new URLSearchParams();
              if (search) params.set("search", search);
              params.set("page", String(page + 1));
              router.push(`/admin/users?${params.toString()}`);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
