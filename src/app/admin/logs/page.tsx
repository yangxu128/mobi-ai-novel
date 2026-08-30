import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ScrollText, Search } from "lucide-react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

const actionLabels: Record<string, string> = {
  inspire: "灵感卡",
  worldbuild: "世界观",
  character: "角色卡",
  outline: "大纲",
  outlineAppend: "大纲续写",
  expand: "扩写",
  polish: "润色",
  chat: "对话",
};

// 注：session 校验已下沉到 admin/layout.tsx
export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; email?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10));
  const action = sp.action || "";
  const email = sp.email || "";
  const pageSize = 30;

  const AND: Record<string, unknown>[] = [];
  if (action) AND.push({ action });
  if (email) AND.push({ user: { email: { contains: email, mode: "insensitive" as const } } });
  const where = AND.length ? { AND } : {};

  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

  const [logs, total, todayCount, todayAgg] = await Promise.all([
    prisma.aIUsageLog.findMany({
      where,
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
    prisma.aIUsageLog.count({ where }),
    prisma.aIUsageLog.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.aIUsageLog.aggregate({
      where: { createdAt: { gte: todayStart } },
      _sum: { promptTokens: true, completionTokens: true },
    }),
  ]);
  const todayTokens =
    (todayAgg._sum.promptTokens || 0) + (todayAgg._sum.completionTokens || 0);

  const totalPages = Math.ceil(total / pageSize);

  function goPage(p: number) {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (email) params.set("email", email);
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

      {/* 今日汇总 */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border-neutral-l1 bg-bg-base-default px-5 py-4 shadow-[var(--shadow-card)]">
          <div className="text-xs text-text-tertiary">今日调用次数</div>
          <div className="num mt-1 text-2xl font-bold tracking-tight text-text-default">
            {todayCount.toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl border border-border-neutral-l1 bg-bg-base-default px-5 py-4 shadow-[var(--shadow-card)]">
          <div className="text-xs text-text-tertiary">今日 Token 消耗</div>
          <div className="num mt-1 text-2xl font-bold tracking-tight text-text-default">
            {todayTokens.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 筛选（GET 表单，服务端处理） */}
      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <select
          name="action"
          defaultValue={action}
          className="h-9 rounded-lg border border-border-neutral-l1 bg-bg-base-default px-3 text-sm text-text-default outline-none"
        >
          <option value="">全部操作</option>
          {Object.entries(actionLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            name="email"
            defaultValue={email}
            placeholder="按用户邮箱筛选"
            className="h-9 w-full rounded-lg border border-border-neutral-l1 bg-bg-base-default pl-9 pr-3 text-sm text-text-default outline-none placeholder:text-text-tertiary"
          />
        </div>
        <Button type="submit" variant="outline" size="sm">
          <Search className="h-4 w-4" />
          筛选
        </Button>
        {(action || email) && (
          <Link
            href="/admin/logs"
            className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-text-tertiary hover:text-text-default"
          >
            重置
          </Link>
        )}
      </form>

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
