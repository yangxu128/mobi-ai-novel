import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Users, FolderOpen, FileText, Sparkles, ArrowRight, TrendingUp } from "lucide-react";

// 注：session 校验已下沉到 admin/layout.tsx，避免在每个子页面重复
export default async function AdminDashboardPage() {
  const [userCount, projectCount, chapterCount, todayLogs] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.chapter.count(),
    prisma.aIUsageLog.findMany({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      select: { promptTokens: true, completionTokens: true },
    }),
  ]);

  const todayTokens = todayLogs.reduce(
    (s, l) => s + (l.promptTokens || 0) + (l.completionTokens || 0),
    0
  );

  // 近 7 天每日 AI Token 数
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const recentLogs = await prisma.aIUsageLog.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true, promptTokens: true, completionTokens: true },
  });
  const dailyTokens: { date: string; tokens: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    const tokens = recentLogs
      .filter((l) => {
        const ld = new Date(l.createdAt);
        return ld.getFullYear() === d.getFullYear() &&
          ld.getMonth() === d.getMonth() &&
          ld.getDate() === d.getDate();
      })
      .reduce((s, l) => s + (l.promptTokens || 0) + (l.completionTokens || 0), 0);
    dailyTokens.push({ date: key, tokens });
  }
  const maxTokens = Math.max(...dailyTokens.map((d) => d.tokens), 1);
  const isToday = (i: number) => i === dailyTokens.length - 1;

  const cards = [
    { label: "用户总数", value: userCount, icon: Users, chip: "chip-indigo", href: "/admin/users" },
    { label: "项目总数", value: projectCount, icon: FolderOpen, chip: "chip-amber", href: "/admin/projects" },
    { label: "章节总数", value: chapterCount, icon: FileText, chip: "chip-teal", href: "/admin/projects" },
    { label: "今日 Token", value: todayTokens, icon: Sparkles, chip: "chip-violet", href: "/admin/logs" },
  ];

  return (
    <>
      <AdminPageHeader
        icon={TrendingUp}
        chipClass="chip-indigo"
        title="仪表盘"
        description="平台运营数据总览"
        meta="实时数据"
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
