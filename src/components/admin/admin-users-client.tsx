"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { updateUserRoleAction, deleteUserAction } from "@/actions/admin";
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
  ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  PRO: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  BASIC: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  FREE: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索邮箱或昵称"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="border-neutral-200 hover:bg-neutral-50">搜索</Button>
      </form>

      {/* 表格 */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">用户</th>
                <th className="px-4 py-3 font-medium">角色</th>
                <th className="px-4 py-3 font-medium">订阅</th>
                <th className="px-4 py-3 font-medium text-center">项目数</th>
                <th className="px-4 py-3 font-medium text-center">AI 调用</th>
                <th className="px-4 py-3 font-medium">注册时间</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    没有找到用户
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.name || "未命名"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
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
                      {u.subscription ? (
                        <Badge variant="outline" className="text-xs">
                          {u.subscription.plan}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">{u._count.projects}</td>
                    <td className="px-4 py-3 text-center">{u._count.aiUsageLogs}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={pending} className="text-destructive hover:text-destructive">
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
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
            className="border-neutral-200 hover:bg-neutral-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
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
            className="border-neutral-200 hover:bg-neutral-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
