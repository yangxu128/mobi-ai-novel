import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PenLine, Workflow, MessageSquare, BookOpen, Sparkles, Shield, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="container py-8 lg:py-12">
      {/* Hero */}
      <section className="bg-white rounded-3xl shadow-sm px-6 py-12 lg:px-12 lg:py-16 mb-12">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-200 bg-neutral-50 text-xs text-muted-foreground mb-6">
            <Sparkles className="h-3 w-3" />
            AI 全流程协作 · 从灵感到成稿
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            让 AI 与你共写一本小说
          </h1>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            墨笔是一个 AI 全流程协作的写小说平台，提供结构化流水线、写作工作台、对话共创三种模式。
            世界观、角色卡、章节稿共享同一知识库，AI 自动检索注入上下文，解决长篇一致性。
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild size="lg" className="bg-neutral-900 text-white hover:bg-neutral-800">
              <Link href="/register">免费开始创作</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-neutral-200 hover:bg-neutral-50">
              <Link href="/pricing">查看定价</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">免费版包含 1 个项目 + 每日 500 字 AI 续写</p>
        </div>

        {/* 三步示意条 */}
        <div className="mt-12 lg:mt-16 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { step: "01", title: "输入灵感", desc: "一句话描述你的故事点子" },
              { step: "02", title: "AI 生成世界观", desc: "自动构建角色、大纲与章节" },
              { step: "03", title: "沉浸式写作", desc: "在工作台或对话中完成成稿" },
            ].map((item, i) => (
              <div key={item.step} className="relative flex items-start gap-4 p-4 rounded-2xl bg-slate-50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-xs font-semibold">
                  {item.step}
                </div>
                <div>
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-muted-foreground">{item.desc}</div>
                </div>
                {i < 2 && (
                  <ArrowRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 三种创作模式 */}
      <section className="mb-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3">三种创作模式，随时切换</h2>
          <p className="text-muted-foreground">同一个项目，三种姿态，数据实时同步</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="rounded-2xl border-neutral-100 shadow-sm hover:shadow-md transition-shadow bg-white">
            <CardHeader>
              <div className="h-10 w-10 rounded-xl bg-neutral-100 flex items-center justify-center mb-3">
                <Workflow className="h-5 w-5 text-neutral-700" />
              </div>
              <CardTitle>结构化流水线</CardTitle>
              <CardDescription>新手友好，六步引导式完成创作</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>灵感卡 → 世界观 → 角色卡 → 大纲 → 章节扩写 → 润色定稿</p>
              <p>每步遵循 AI 生成 → 人工编辑 → 确认流转</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-neutral-100 shadow-sm hover:shadow-md transition-shadow bg-white">
            <CardHeader>
              <div className="h-10 w-10 rounded-xl bg-neutral-100 flex items-center justify-center mb-3">
                <PenLine className="h-5 w-5 text-neutral-700" />
              </div>
              <CardTitle>写作工作台</CardTitle>
              <CardDescription>专业作者深度创作环境</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>TipTap 富文本编辑器 + 行内 AI（Cmd+K）</p>
              <p>章节树 / 知识库侧栏 / 一致性提示 / 版本快照</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-neutral-100 shadow-sm hover:shadow-md transition-shadow bg-white">
            <CardHeader>
              <div className="h-10 w-10 rounded-xl bg-neutral-100 flex items-center justify-center mb-3">
                <MessageSquare className="h-5 w-5 text-neutral-700" />
              </div>
              <CardTitle>对话共创</CardTitle>
              <CardDescription>爱好者零门槛聊天式创作</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>叙事者接龙、分支选择、角色扮演</p>
              <p>AI 自动提取世界观/角色，一键转正式项目</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 核心能力 */}
      <section className="mb-12">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="rounded-2xl border-neutral-100 shadow-sm bg-white">
            <CardHeader>
              <div className="h-8 w-8 rounded-lg bg-neutral-100 flex items-center justify-center mb-2">
                <BookOpen className="h-4 w-4 text-neutral-700" />
              </div>
              <CardTitle className="text-base">知识库 RAG</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              世界观/角色卡/章节稿自动检索注入 AI 上下文，长篇创作不串设定
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-neutral-100 shadow-sm bg-white">
            <CardHeader>
              <div className="h-8 w-8 rounded-lg bg-neutral-100 flex items-center justify-center mb-2">
                <Sparkles className="h-4 w-4 text-neutral-700" />
              </div>
              <CardTitle className="text-base">分层上下文管理</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              近期全文 + 中期摘要 + 远期大纲，10-16K 字精准控制上下文窗口
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-neutral-100 shadow-sm bg-white">
            <CardHeader>
              <div className="h-8 w-8 rounded-lg bg-neutral-100 flex items-center justify-center mb-2">
                <Shield className="h-4 w-4 text-neutral-700" />
              </div>
              <CardTitle className="text-base">一致性引擎</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              AI 扫描全文，自动标记与世界观/角色矛盾的段落，给出修改建议
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 底部 CTA */}
      <section className="bg-white rounded-3xl shadow-sm px-6 py-12 lg:py-16 text-center">
        <h2 className="text-3xl font-bold mb-3">现在开始你的第一本小说</h2>
        <p className="text-muted-foreground mb-6">三分钟注册，三步生成第一章</p>
        <Button asChild size="lg" className="bg-neutral-900 text-white hover:bg-neutral-800">
          <Link href="/register">免费注册</Link>
        </Button>
      </section>
    </div>
  );
}
