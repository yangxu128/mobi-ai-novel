import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { beijingDayStart, beijingDayKey, formatDate } from "@/lib/utils";
import { Users, FolderOpen, FileText, Sparkles, ArrowRight, TrendingUp, UserPlus, Layers } from "lucide-react";

// 注：session 校验已下沉到 admin/layout.tsx，避免在每个子页面重复
const MODE_META: Record<string, { label: string; chip: string }> = {
  PIPELINE: { label: "流水线", chip: "chip-amber" },
  WORKBENCH: { label: "工作台", chip: "chip-indigo" },
  CHAT: { label: "对话共创", chip: "chip-violet" },
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "管理员",
  PRO: "专业版",
  BASIC: "基础版",
  FREE: "免费版",
};

export default async function AdminDashboardPage() {
  const sevenDaysAgo = beijingDayStart(new Date(Date.now() - 6 * 86400000));
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const todayStart = beijingDayStart();

  const [
    userCount,
    projectCount,
    chapterCount,
    todayLogs,
    newUsers7d,
    newProjects7d,
    modeCounts,
    genreTop,
    recentUsers,
    activeAgg,
    recentLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.chapter.count(),
    prisma.aIUsageLog.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { promptTokens: true, completionTokens: true },
    }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.project.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.project.groupBy({ by: ["mode"], _count: true }),
    prisma.project.groupBy({
      by: ["genre"],
      _count: true,
      orderBy: { _count: { genre: "desc" } },
      take: 5,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { email: true, name: true, role: true, createdAt: true },
    }),
    prisma.aIUsageLog.groupBy({
      by: ["userId"],
      _count: true,
      orderBy: { _count: { userId: "desc" } },
      take: 5,
    }),
    prisma.aIUsageLog.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, promptTokens: true, completionTokens: true },
    }),
  ]);

  const todayTokens = todayLogs.reduce(
    (s, l) => s + (l.promptTokens || 0) + (l.completionTokens || 0),
    0
  );

  // 近 7 天每日 AI Token 数
  const dailyTokens: { date: string; tokens: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(sevenDaysAgo.getTime() + i * 86400000);
    const key = beijingDayKey(day);
    const label = `${Number(key.slice(5, 7))}/${Number(key.slice(8, 10))}`;
    const tokens = recentLogs
      .filter((l) => beijingDayKey(new Date(l.createdAt)) === key)
      .reduce((s, l) => s + (l.promptTokens || 0) + (l.completionTokens || 0), 0);
    dailyTokens.push({ date: label, tokens });
  }
  const maxTokens = Math.max(...dailyTokens.map((d) => d.tokens), 1);
  const isToday = (i: number) => i === dailyTokens.length - 1;

  // 活跃用户：聚合次数 + 用户信息合并
  const activeUserIds = activeAgg.map((a) => a.userId);
  const activeUserInfos = await prisma.user.findMany({
    where: { id: { in: activeUserIds } },
    select: { id: true, email: true, name: true, role: true },
  });
  const activeUsers = activeAgg
    .map((a) => ({
      count: a._count,
      user: activeUserInfos.find((u) => u.id === a.userId),
    }))
    .filter((x) => x.user)
    .sort((a, b) => b.count - a.count);
  const maxActive = Math.max(...activeUsers.map((a) => a.count), 1);

  const cards = [
    { label: "用户总数", value: userCount, icon: Users, chip: "chip-indigo", href: "/admin/users" },
    { label: "项目总数", value: projectCount, icon: FolderOpen, chip: "chip-amber", href: "/admin/projects" },
    { label: "章节总数", value: chapterCount, icon: FileText, chip: "chip-teal", href: "/admin/projects" },
    { label: "今日 Token", value: todayTokens, icon: Sparkles, chip: "chip-violet", href: "/admin/logs" },
  ];

  const modeTotal = modeCounts.reduce((s, m) => s + m._count, 0) || 1;
  const genreMax = Math.max(...genreTop.map((g) => g._count), 1);

  return (
    <>
      <AdminPageHeader
        icon={TrendingUp}
        chipClass="chip-indigo"
        title="仪表盘"
        description="平台运营数据总览"
        meta="实时数据"
      />

      {/* KPI 卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="block group">
            <Card className="rounded-2xl border-border-neutral-l1 shadow-[var(--shadow-card)] card-lift">
              <CardContent className="pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.chip}`}>
                    <c.icon className="h-4 w-4" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-text-disabled transition-all group-hover:translate-x-0.5 group-hover:text-text-tertiary" />
                </div>
                <div className="num text-2xl font-bold tracking-tight text-text-default">
                  {c.value.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-text-tertiary">{c.label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 增长 + 分布 */}
      <div className="grid md:grid-cols-3 gap-4 mb-4">
        {/* 近 7 天增长 */}
        <Card className="rounded-2xl border-border-neutral-l1 shadow-[var(--shadow-card)]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm text-text-default">
              <UserPlus className="h-4 w-4 text-icon-secondary" />
              近 7 天增长
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">新增用户</span>
              <span className="num text-xl font-bold text-text-default">{newUsers7d}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">新增项目</span>
              <span className="num text-xl font-bold text-text-default">{newProjects7d}</span>
            </div>
            <Link href="/admin/users" className="inline-flex items-center gap-1 text-xs text-text-brand hover:underline">
              查看用户
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* 项目模式分布 */}
        <Card className="rounded-2xl border-border-neutral-l1 shadow-[var(--shadow-card)]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm text-text-default">
              <Layers className="h-4 w-4 text-icon-secondary" />
              项目模式分布
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {modeCounts.length === 0 && (
              <p className="text-xs text-text-tertiary">暂无项目</p>
            )}
            {modeCounts.map((m) => {
              const meta = MODE_META[m.mode] || { label: m.mode, chip: "chip-cyan" };
              const pct = Math.round((m._count / modeTotal) * 100);
              return (
                <div key={m.mode}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-text-secondary">{meta.label}</span>
                    <span className="num text-text-tertiary">{m._count} · {pct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-overlay-l2">
                    <div className={`h-full rounded-full ${meta.chip}`} style={{ width: `${pct}%`, backgroundColor: "currentColor" }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* 热门题材 */}
        <Card className="rounded-2xl border-border-neutral-l1 shadow-[var(--shadow-card)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-text-default">热门题材 Top 5</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {genreTop.length === 0 && (
              <p className="text-xs text-text-tertiary">暂无数据</p>
            )}
            {genreTop.map((g, i) => (
              <div key={g.genre} className="flex items-center gap-2.5">
                <span className="num flex h-5 w-5 items-center justify-center rounded bg-bg-overlay-l1 text-[10px] font-semibold text-text-secondary">
                  {i + 1}
                </span>
                <span className="w-10 text-sm text-text-default">{g.genre}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-overlay-l2">
                  <div className="h-full rounded-full brand-gradient" style={{ width: `${(g._count / genreMax) * 100}%` }} />
                </div>
                <span className="num text-xs text-text-tertiary">{g._count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 最新用户 + 活跃用户 */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <Card className="rounded-2xl border-border-neutral-l1 shadow-[var(--shadow-card)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-text-default">最新注册用户</CardTitle>
            <Link href="/admin/users" className="text-xs text-text-brand hover:underline">全部 →</Link>
          </CardHeader>
          <CardContent className="divide-y divide-border-neutral-l1">
            {recentUsers.length === 0 && <p className="text-xs text-text-tertiary py-2">暂无用户</p>}
            {recentUsers.map((u) => (
              <div key={u.email} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-text-default">{u.name || "未命名"}</div>
                  <div className="truncate text-xs text-text-tertiary">{u.email}</div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="inline-flex rounded bg-bg-overlay-l1 px-1.5 py-0.5 text-[10px] text-text-secondary">
                    {ROLE_LABEL[u.role] || u.role}
                  </span>
                  <div className="num mt-0.5 text-[10px] text-text-tertiary">
                    {formatDate(u.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border-neutral-l1 shadow-[var(--shadow-card)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-text-default">AI 调用活跃 Top 5</CardTitle>
            <Link href="/admin/logs" className="text-xs text-text-brand hover:underline">明细 →</Link>
          </CardHeader>
          <CardContent>
            {activeUsers.length === 0 && <p className="text-xs text-text-tertiary py-2">暂无调用记录</p>}
            {activeUsers.map((a, i) => (
              <div key={a.user!.id} className={`flex items-center gap-3 py-2 ${i > 0 ? "border-t border-border-neutral-l1" : ""}`}>
                <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-overlay-l1 text-[10px] font-semibold text-text-secondary">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-text-default">{a.user!.name || "未命名"}</div>
                  <div className="truncate text-xs text-text-tertiary">{a.user!.email}</div>
                </div>
                <div className="w-24 shrink-0">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-overlay-l2">
                    <div className="h-full rounded-full brand-gradient" style={{ width: `${(a.count / maxActive) * 100}%` }} />
                  </div>
                </div>
                <span className="num w-12 shrink-0 text-right text-xs text-text-tertiary">{a.count} 次</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 7 天 AI Token 趋势 */}
      <Card className="rounded-2xl border-border-neutral-l1 shadow-[var(--shadow-card)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base text-text-default">近 7 天 AI Token 消耗</CardTitle>
          <span className="rounded-full bg-bg-brand-popup px-2.5 py-1 text-[11px] font-medium text-text-brand">
            今日 {todayTokens.toLocaleString()}
          </span>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-44">
            {dailyTokens.map((d, i) => (
              <div key={d.date} className="group/bar flex flex-1 flex-col items-center gap-2">
                <div className={`num text-xs ${isToday(i) ? "font-semibold text-text-brand" : "text-text-tertiary"}`}>
                  {d.tokens.toLocaleString()}
                </div>
                <div
                  className={`w-full rounded-t-md transition-all group-hover/bar:opacity-80 ${
                    isToday(i) ? "brand-gradient shadow-[var(--shadow-glow)]" : "bg-bg-overlay-l3 group-hover/bar:bg-bg-overlay-l4"
                  }`}
                  style={{
                    height: `${Math.max((d.tokens / maxTokens) * 100, 2)}%`,
                    minHeight: d.tokens > 0 ? "4px" : "2px",
                  }}
                />
                <div className={`text-xs ${isToday(i) ? "font-medium text-text-default" : "text-text-tertiary"}`}>
                  {d.date}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
