"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { formatDate } from "@/lib/utils";
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
  draft: "bg-bg-overlay-l1 text-text-secondary",
  active: "bg-status-success-surface-l1 text-status-success",
  archived: "bg-status-warning-surface-l1 text-status-warning",
};

export function AdminProjectsClient({
  projects,
  page,
  totalPages,
  search,
  mode,
}: {
  projects: ProjectItem[];
  page: number;
  totalPages: number;
  search: string;
  mode: string;
}) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(search);
  const [modeFilter, setModeFilter] = useState(mode);
  const [pending, startTransition] = useTransition();

  function navigate(next: { search?: string; mode?: string; page?: number }) {
    const params = new URLSearchParams();
    const s = next.search ?? keyword;
    const m = next.mode ?? modeFilter;
    if (s) params.set("search", s);
    if (m) params.set("mode", m);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    router.push(`/admin/projects?${params.toString()}`);
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ search: keyword, page: 1 });
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
    navigate({ page: p });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSearch} className="flex flex-wrap gap-2">
        <div className="relative min-w-52 flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索项目标题或用户邮箱"
            className="pl-9"
          />
        </div>
        <Select
          value={modeFilter || "all"}
          onValueChange={(v) => {
            setModeFilter(v === "all" ? "" : v);
            navigate({ mode: v === "all" ? "" : v, page: 1 });
          }}
        >
          <SelectTrigger className="w-36 whitespace-nowrap"><SelectValue placeholder="全部模式" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部模式</SelectItem>
            <SelectItem value="PIPELINE">流水线</SelectItem>
            <SelectItem value="WORKBENCH">工作台</SelectItem>
            <SelectItem value="CHAT">对话共创</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" variant="outline" size="sm">查询</Button>
        {(search || modeFilter) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-text-tertiary"
            onClick={() => { setKeyword(""); setModeFilter(""); router.push("/admin/projects"); }}
          >
            重置
          </Button>
        )}
      </form>

      <div className="rounded-2xl border border-border-neutral-l1 bg-bg-base-default shadow-[var(--shadow-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-overlay-l1/70">
              <tr className="text-left text-xs uppercase tracking-wider text-text-tertiary">
                <th className="px-5 py-3.5 font-medium">项目</th>
                <th className="px-5 py-3.5 font-medium">作者</th>
                <th className="px-5 py-3.5 font-medium">类型</th>
                <th className="px-5 py-3.5 font-medium">模式</th>
                <th className="px-5 py-3.5 font-medium">状态</th>
                <th className="px-5 py-3.5 font-medium text-center">章节</th>
                <th className="px-5 py-3.5 font-medium text-center">字数</th>
                <th className="px-5 py-3.5 font-medium">更新时间</th>
                <th className="px-5 py-3.5 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-neutral-l1">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-text-tertiary">
                    没有找到项目
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-bg-overlay-l1/60">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-text-default truncate max-w-48">{p.title}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-xs text-text-default">{p.user.name || "未命名"}</div>
                      <div className="text-xs text-text-tertiary">{p.user.email}</div>
                    </td>
                    <td className="px-5 py-3.5 text-text-tertiary">{p.genre}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant="outline" className="text-xs">
                        {modeLabels[p.mode] || p.mode}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs ${statusColors[p.status] || ""}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="num px-5 py-3.5 text-center text-text-default">{p._count.chapters}</td>
                    <td className="num px-5 py-3.5 text-center text-text-default">{p.wordCount.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-text-tertiary text-xs">
                      {formatDate(p.updatedAt)}
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
                            <AlertDialogTitle>确认删除项目？</AlertDialogTitle>
                            <AlertDialogDescription>
                              将永久删除项目 &ldquo;{p.title}&rdquo; 及其所有章节和数据，此操作不可撤销。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(p.id)}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-text-tertiary">
            {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => goPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
