import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

const actionLabels: Record<string, string> = {
  inspire: "灵感卡",
  worldbuild: "世界观",
  character: "角色卡",
  outline: "大纲",
  expand: "扩写",
  polish: "润色",
  chat: "对话",
};

// 注：session 校验已下沉到 admin/layout.tsx
export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
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
    <div>
      <AdminPageHeader
        icon={ScrollText}
        chipClass="chip-violet"
        title="AI 用量日志"
        description="全平台 AI 调用与 Token 消耗明细"
        meta={`共 ${total} 条记录`}
      />

      <div className="rounded-2xl border border-border-neutral-l1 bg-bg-base-default shadow-[var(--shadow-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-overlay-l1/70">
              <tr className="text-left text-xs uppercase tracking-wider text-text-tertiary">
                <th className="px-5 py-3.5 font-medium">时间</th>
                <th className="px-5 py-3.5 font-medium">用户</th>
                <th className="px-5 py-3.5 font-medium">操作</th>
                <th className="px-5 py-3.5 font-medium">项目</th>
                <th className="px-5 py-3.5 font-medium">模型</th>
                <th className="px-5 py-3.5 font-medium text-center">Prompt</th>
                <th className="px-5 py-3.5 font-medium text-center">Completion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-neutral-l1">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-text-tertiary">
                    暂无 AI 调用记录
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="transition-colors hover:bg-bg-overlay-l1/60">
                    <td className="px-5 py-3 text-text-tertiary text-xs whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString("zh-CN")}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      <div className="text-text-default">{l.user?.name || "未知"}</div>
                      <div className="text-text-tertiary">{l.user?.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-bg-brand-popup text-text-brand">
                        {actionLabels[l.action] || l.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-text-tertiary truncate max-w-32">
                      {l.project?.title || "-"}
                    </td>
                    <td className="px-5 py-3 text-xs text-text-tertiary font-mono">
                      {l.model || "-"}
                    </td>
                    <td className="num px-5 py-3 text-center text-text-default">{(l.promptTokens || 0).toLocaleString()}</td>
                    <td className="num px-5 py-3 text-center text-text-tertiary">{(l.completionTokens || 0).toLocaleString()}</td>
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
          <span className="num text-sm text-text-tertiary">
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
  );
}
