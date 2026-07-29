import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

const actionLabels: Record<string, string> = {
  inspire: "灵感卡",
  worldbuild: "世界观",
  character: "角色卡",
  outline: "大纲",
  expand: "扩写",
  polish: "润色",
  chat: "对话",
};

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/logs");
  if (session.user.role !== "ADMIN") redirect("/projects");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10));
  const pageSize = 30;

  const [logs, total] = await Promise.all([
    prisma.aIUsageLog.findMany({
      select: {
        id: true,
        action: true,
        model: true,
        promptTokens: true,
        completionTokens: true,
        createdAt: true,
        user: { select: { email: true, name: true } },
        project: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.aIUsageLog.count(),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  function goPage(p: number) {
    const params = new URLSearchParams();
    params.set("page", String(p));
    return `/admin/logs?${params.toString()}`;
  }

  return (
    <div className="container py-6">
      <div className="flex gap-6">
        <AdminSidebar active="logs" />

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold mb-1">AI 用量日志</h1>
          <p className="text-sm text-muted-foreground mb-6">共 {total} 条记录</p>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">时间</th>
                    <th className="px-4 py-3 font-medium">用户</th>
                    <th className="px-4 py-3 font-medium">操作</th>
                    <th className="px-4 py-3 font-medium">项目</th>
                    <th className="px-4 py-3 font-medium">模型</th>
                    <th className="px-4 py-3 font-medium text-center">Prompt</th>
                    <th className="px-4 py-3 font-medium text-center">Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        暂无 AI 调用记录
                      </td>
                    </tr>
                  ) : (
                    logs.map((l) => (
                      <tr key={l.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {new Date(l.createdAt).toLocaleString("zh-CN")}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div>{l.user?.name || "未知"}</div>
                          <div className="text-muted-foreground">{l.user?.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded text-xs bg-primary/10 text-primary">
                            {actionLabels[l.action] || l.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-32">
                          {l.project?.title || "-"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                          {l.model || "-"}
                        </td>
                        <td className="px-4 py-3 text-center">{l.promptTokens || 0}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{l.completionTokens || 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button asChild variant="outline" size="sm" disabled={page <= 1}>
                <Link href={goPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
                <Link href={goPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
