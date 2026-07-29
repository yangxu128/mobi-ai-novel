import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderOpen, FileText, Sparkles } from "lucide-react";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin");
  if (session.user.role !== "ADMIN") redirect("/projects");

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

  const cards = [
    { label: "用户总数", value: userCount, icon: Users, href: "/admin/users" },
    { label: "项目总数", value: projectCount, icon: FolderOpen, href: "/admin/projects" },
    { label: "章节总数", value: chapterCount, icon: FileText, href: "/admin/projects" },
    { label: "今日 Token", value: todayTokens, icon: Sparkles, href: "/admin/logs" },
  ];

  return (
    <div className="container py-6">
      <div className="flex gap-6">
        <AdminSidebar active="dashboard" />

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold mb-1">管理后台</h1>
          <p className="text-sm text-muted-foreground mb-6">平台运营数据总览</p>

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map((c) => (
              <Link key={c.label} href={c.href}>
                <Card className="hover:border-primary/50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {c.label}
                    </CardTitle>
                    <c.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{c.value.toLocaleString()}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* 7 天 AI Token 趋势 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">近 7 天 AI Token 消耗</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 h-48">
                {dailyTokens.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-xs text-muted-foreground">{d.tokens}</div>
                    <div
                      className="w-full bg-primary/80 rounded-t-sm transition-all"
                      style={{ height: `${(d.tokens / maxTokens) * 100}%`, minHeight: d.tokens > 0 ? "4px" : "0" }}
                    />
                    <div className="text-xs text-muted-foreground">{d.date}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                <span className="text-muted-foreground">今日 Token 消耗</span>
                <span className="font-medium">{todayTokens.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
