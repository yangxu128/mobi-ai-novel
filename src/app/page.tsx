import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PenLine, Workflow, MessageSquare, BookOpen, Sparkles, Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="container py-12">
      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto py-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-muted/50 text-xs text-muted-foreground mb-6">
          <Sparkles className="h-3 w-3" />
          AI 全流程协作 · 从灵感到成稿
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          让 AI 与你共写一本小说
        </h1>
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          墨笔是一个 AI 全流程协作的写小说平台，提供结构化流水线、写作工作台、对话共创三种模式。
          世界观、角色卡、章节稿共享同一知识库，AI 自动检索注入上下文，解决长篇一致性。
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild size="lg">
            <Link href="/register">免费开始创作</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/pricing">查看定价</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">免费版包含 1 个项目 + 每日 500 字 AI 续写</p>
      </section>

      {/* 三种创作模式 */}
      <section className="py-12">
        <h2 className="text-3xl font-bold text-center mb-3">三种创作模式，随时切换</h2>
        <p className="text-center text-muted-foreground mb-10">同一个项目，三种姿态，数据实时同步</p>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center mb-2">
                <Workflow className="h-5 w-5" />
              </div>
              <CardTitle>结构化流水线</CardTitle>
              <CardDescription>新手友好，六步引导式完成创作</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>灵感卡 → 世界观 → 角色卡 → 大纲 → 章节扩写 → 润色定稿</p>
              <p>每步遵循 AI 生成 → 人工编辑 → 确认流转</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center mb-2">
                <PenLine className="h-5 w-5" />
              </div>
              <CardTitle>写作工作台</CardTitle>
              <CardDescription>专业作者深度创作环境</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>TipTap 富文本编辑器 + 行内 AI（Cmd+K）</p>
              <p>章节树 / 知识库侧栏 / 一致性提示 / 版本快照</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center mb-2">
                <MessageSquare className="h-5 w-5" />
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
      <section className="py-12">
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center mb-1">
                <BookOpen className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">知识库 RAG</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              世界观/角色卡/章节稿自动检索注入 AI 上下文，长篇创作不串设定
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center mb-1">
                <Sparkles className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">分层上下文管理</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              近期全文 + 中期摘要 + 远期大纲，10-16K 字精准控制上下文窗口
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center mb-1">
                <Shield className="h-4 w-4" />
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
      <section className="py-16 text-center">
        <h2 className="text-3xl font-bold mb-3">现在开始你的第一本小说</h2>
        <p className="text-muted-foreground mb-6">三分钟注册，三步生成第一章</p>
        <Button asChild size="lg">
          <Link href="/register">免费注册</Link>
        </Button>
      </section>
    </div>
  );
}
