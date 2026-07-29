"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { deleteProjectAdminAction } from "@/actions/admin";
import { Search, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

type ProjectItem = {
  id: string;
  title: string;
  genre: string;
  mode: string;
  status: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; name: string | null };
  _count: { chapters: number };
};

const modeLabels: Record<string, string> = {
  PIPELINE: "流水线",
  WORKBENCH: "工作台",
  CHAT: "对话共创",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  archived: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

export function AdminProjectsClient({
  projects,
  page,
  totalPages,
  search,
}: {
  projects: ProjectItem[];
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
    router.push(`/admin/projects?${params.toString()}`);
  }

  function onDelete(projectId: string) {
    startTransition(async () => {
      const res = await deleteProjectAdminAction(projectId);
      if (res.ok) {
        toast({ title: "项目已删除", type: "success" });
        router.refresh();
      } else {
        toast({ title: "删除失败", description: res.error, type: "error" });
      }
    });
  }

  function goPage(p: number) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(p));
    router.push(`/admin/projects?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索项目标题或用户邮箱"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="border-neutral-200 hover:bg-neutral-50">搜索</Button>
      </form>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">项目</th>
                <th className="px-4 py-3 font-medium">作者</th>
                <th className="px-4 py-3 font-medium">类型</th>
                <th className="px-4 py-3 font-medium">模式</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium text-center">章节</th>
                <th className="px-4 py-3 font-medium text-center">字数</th>
                <th className="px-4 py-3 font-medium">更新时间</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    没有找到项目
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium truncate max-w-48">{p.title}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">{p.user.name || "未命名"}</div>
                      <div className="text-xs text-muted-foreground">{p.user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.genre}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {modeLabels[p.mode] || p.mode}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs ${statusColors[p.status] || ""}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{p._count.chapters}</td>
                    <td className="px-4 py-3 text-center">{p.wordCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(p.updatedAt).toLocaleDateString("zh-CN")}
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
                            <AlertDialogTitle>确认删除项目？</AlertDialogTitle>
                            <AlertDialogDescription>
                              将永久删除项目 &ldquo;{p.title}&rdquo; 及其所有章节和数据，此操作不可撤销。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(p.id)}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goPage(page - 1)} className="border-neutral-200 hover:bg-neutral-50">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => goPage(page + 1)} className="border-neutral-200 hover:bg-neutral-50">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
