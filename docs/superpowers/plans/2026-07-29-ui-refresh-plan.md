# UI 全站美化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将墨笔 AI 写作平台全站界面升级为极简干净、卡片浮层的工具型风格，统一黑色主按钮、大圆角、浅灰背景。

**Architecture:** 以 Tailwind CSS className 覆盖为主，不修改 shadcn/ui 组件源码；按页面/组件拆分任务，逐个验证后提交；通过全局 layout 背景色和 AppHeader 统一基调，再逐个页面替换卡片、按钮、输入框样式。

**Tech Stack:** Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui + Lucide icons

---

## 文件结构映射

| 文件 | 责任 | 本次改动 |
|---|---|---|
| `src/app/layout.tsx` | 全局根布局 | body 背景改为浅灰 |
| `src/components/app-header.tsx` | 顶部导航 | 高度、背景、按钮样式、Logo |
| `src/app/page.tsx` | 首页 Landing | Hero 大卡片、三步骤示意、模式卡片、核心能力 |
| `src/app/projects/page.tsx` | 项目列表服务端 | 无视觉改动，仅保持容器 |
| `src/app/projects/loading.tsx` | 项目列表骨架屏 | 圆角卡片化 |
| `src/components/projects/projects-client.tsx` | 项目列表客户端 | 标题区卡片、项目卡片网格、新建对话框 |
| `src/app/editor/[projectId]/page.tsx` | 工作台页面 | 外层背景与卡片 |
| `src/components/workbench/workbench-client.tsx` | 工作台布局 | 三栏卡片化、按钮黑色 |
| `src/components/editor/tiptap-editor.tsx` | 编辑器 | 工具栏、AI 标签、底栏 |
| `src/components/knowledge/knowledge-sidebar.tsx` | 知识库侧栏 | 卡片化、圆角 |
| `src/app/pipeline/[projectId]/page.tsx` | 流水线页面 | 外层背景 |
| `src/components/pipeline/pipeline-flow.tsx` | 流水线流程 | 步骤条、内容卡片、底部导航 |
| `src/components/pipeline/step*.tsx` | 各步骤表单 | 输入框圆角、按钮样式 |
| `src/app/chat/[projectId]/page.tsx` | 对话页面 | 外层背景 |
| `src/components/chat/chat-cocreate-client.tsx` | 对话组件 | 消息气泡、输入框、侧栏卡片 |
| `src/app/pricing/page.tsx` | 定价页 | 卡片化、推荐标识 |
| `src/components/admin/admin-sidebar.tsx` | 后台侧栏 | 卡片化、当前项黑色 |
| `src/app/admin/page.tsx` | 后台仪表盘 | 统计卡片、图表 |
| `src/app/admin/users/page.tsx` | 用户管理 | 表格样式 |
| `src/app/admin/projects/page.tsx` | 项目管理 | 表格样式 |
| `src/app/admin/logs/page.tsx` | AI 用量日志 | 表格样式 |
| `src/components/project-mode-switcher.tsx` | 模式切换器 | 样式保持或微调 |

---

## Task 1: 全局布局与顶部导航

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/components/app-header.tsx`

- [ ] **Step 1: 修改全局背景色**

将 `src/app/layout.tsx` 中 body 的 `bg-background` 改为 `bg-slate-50`（保留 dark 模式兼容可用 `bg-slate-50 dark:bg-background`）。

```tsx
<body className="min-h-screen bg-slate-50 dark:bg-background antialiased">
```

- [ ] **Step 2: 修改 AppHeader 整体样式**

将 `src/components/app-header.tsx` 第 23 行开始替换为：

```tsx
  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-40">
      <div className="container flex h-16 items-center justify-between">
        <Link href={session?.user ? "/projects" : "/"} className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-neutral-900 flex items-center justify-center">
            <PenLine className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-lg text-neutral-900">墨笔</span>
        </Link>
```

- [ ] **Step 3: 统一未登录态按钮**

将未登录态区域（第 90-100 行）替换为：

```tsx
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100">
                <Link href="/pricing">定价</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100">
                <Link href="/login">登录</Link>
              </Button>
              <Button asChild size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg">
                <Link href="/register">免费注册</Link>
              </Button>
            </>
          )}
```

- [ ] **Step 4: 统一已登录态按钮**

将已登录态按钮区替换为黑色主按钮：

```tsx
              <Button asChild variant="ghost" size="sm" className="text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100">
                <Link href="/projects">
                  <LayoutGrid className="h-4 w-4" />
                  我的项目
                </Link>
              </Button>
              <Button asChild size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg">
                <Link href="/projects?new=1">
                  <Plus className="h-4 w-4" />
                  新建
                </Link>
              </Button>
              {session.user.role === "ADMIN" && (
                <Button asChild variant="ghost" size="sm" className="text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100">
                  <Link href="/admin">
                    <Shield className="h-4 w-4" />
                    管理后台
                  </Link>
                </Button>
              )}
```

- [ ] **Step 5: 运行开发服务器检查导航**

Run: `npm run dev`
Expected: 页面加载，导航栏为白色、高度 64px、按钮为黑色/ghost。

- [ ] **Step 6: 提交**

```bash
git add src/app/layout.tsx src/components/app-header.tsx
git commit -m "style: update global background and header" -m "- body bg-slate-50" -m "- header white, h-16, neutral-900 buttons"
```

---

## Task 2: 首页改造

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: 重写首页为卡片浮层风格**

完整替换 `src/app/page.tsx` 为：

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PenLine, Workflow, MessageSquare, BookOpen, Sparkles, Shield, Lightbulb, Globe, FileText, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="container py-8 space-y-8">
      {/* Hero */}
      <section className="bg-white rounded-3xl shadow-sm px-6 py-12 lg:px-12 lg:py-16">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-100 bg-indigo-50 text-xs font-medium text-indigo-700 mb-6">
            <Sparkles className="h-3 w-3" />
            AI 全流程协作 · 从灵感到成稿
          </div>
          <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight text-neutral-900 mb-6">
            让 AI 与你共写一本小说
          </h1>
          <p className="text-lg text-neutral-600 mb-8 leading-relaxed max-w-2xl mx-auto">
            墨笔是一个 AI 全流程协作的写小说平台，提供结构化流水线、写作工作台、对话共创三种模式。
            世界观、角色卡、章节稿共享同一知识库，AI 自动检索注入上下文，解决长篇一致性。
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild size="lg" className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl px-8">
              <Link href="/register">免费开始创作</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl border-neutral-200 text-neutral-700 hover:bg-neutral-100 px-8">
              <Link href="/pricing">查看定价</Link>
            </Button>
          </div>
          <p className="text-xs text-neutral-400 mt-4">免费版包含 1 个项目 + 每日 500 字 AI 续写</p>
        </div>

        {/* 三步骤示意 */}
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Lightbulb, title: "灵感", desc: "输入一句话，AI 生成多个故事切入点" },
              { icon: Globe, title: "世界观", desc: "自动延展时代背景、规则与力量体系" },
              { icon: FileText, title: "章节", desc: "按大纲流式扩写，保持人物与设定一致" },
            ].map((step, i) => (
              <div key={i} className="relative">
                <Card className="rounded-2xl border-neutral-100 shadow-sm bg-slate-50/50">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center shrink-0">
                      <step.icon className="h-4 w-4 text-neutral-700" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-neutral-900">{step.title}</div>
                      <p className="text-xs text-neutral-500 mt-0.5">{step.desc}</p>
                    </div>
                  </CardContent>
                </Card>
                {i < 2 && (
                  <div className="hidden md:flex absolute top-1/2 -right-3 transform -translate-y-1/2 text-neutral-300">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 三种创作模式 */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold text-neutral-900 mb-2">三种创作模式，随时切换</h2>
          <p className="text-neutral-500">同一个项目，三种姿态，数据实时同步</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <ModeCard
            icon={Workflow}
            title="结构化流水线"
            desc="新手友好，六步引导式完成创作"
            color="amber"
            points={["灵感卡 → 世界观 → 角色卡", "大纲 → 章节扩写 → 润色", "每步 AI 生成 + 人工确认"]}
          />
          <ModeCard
            icon={PenLine}
            title="写作工作台"
            desc="专业作者深度创作环境"
            color="indigo"
            points={["TipTap 富文本编辑器", "章节树 / 知识库侧栏", "行内 AI：Cmd/Ctrl + K"]}
          />
          <ModeCard
            icon={MessageSquare}
            title="对话共创"
            desc="爱好者零门槛聊天式创作"
            color="violet"
            points={["叙事者接龙、分支选择", "AI 自动提取世界观/角色", "一键转正式项目"]}
          />
        </div>
      </section>

      {/* 核心能力 */}
      <section>
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={BookOpen}
            title="知识库 RAG"
            desc="世界观/角色卡/章节稿自动检索注入 AI 上下文，长篇创作不串设定"
            color="emerald"
          />
          <FeatureCard
            icon={Sparkles}
            title="分层上下文管理"
            desc="近期全文 + 中期摘要 + 远期大纲，10-16K 字精准控制上下文窗口"
            color="indigo"
          />
          <FeatureCard
            icon={Shield}
            title="一致性引擎"
            desc="AI 扫描全文，自动标记与世界观/角色矛盾的段落，给出修改建议"
            color="rose"
          />
        </div>
      </section>

      {/* 底部 CTA */}
      <section className="bg-white rounded-3xl shadow-sm px-6 py-12 text-center">
        <h2 className="text-3xl font-semibold text-neutral-900 mb-2">现在开始你的第一本小说</h2>
        <p className="text-neutral-500 mb-6">三分钟注册，三步生成第一章</p>
        <Button asChild size="lg" className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl px-8">
          <Link href="/register">免费注册</Link>
        </Button>
      </section>
    </div>
  );
}

function ModeCard({
  icon: Icon,
  title,
  desc,
  color,
  points,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  color: "amber" | "indigo" | "violet";
  points: string[];
}) {
  const colorMap = {
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
  };
  return (
    <Card className="rounded-2xl border-neutral-100 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 border ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-neutral-600">
        <ul className="space-y-2">
          {points.map((p, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-300 mt-1.5 shrink-0" />
              {p}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  color,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  color: "emerald" | "indigo" | "rose";
}) {
  const colorMap = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
  };
  return (
    <Card className="rounded-2xl border-neutral-100 shadow-sm">
      <CardHeader>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center mb-2 border ${colorMap[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-neutral-600">
        {desc}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 验证首页渲染**

访问 `http://localhost:3000/`
Expected: Hero 为白色大圆角卡片，按钮黑色，三步骤示意可见，三种模式卡片带彩色微标。

- [ ] **Step 3: 提交**

```bash
git add src/app/page.tsx
git commit -m "style: refresh homepage with card-based design" -m "- white rounded-3xl hero card" -m "- 3-step workflow strip" -m "- mode cards with color badges"
```

---

## Task 3: 项目列表页改造

**Files:**
- Modify: `src/app/projects/loading.tsx`
- Modify: `src/components/projects/projects-client.tsx`

- [ ] **Step 1: 更新 loading 骨架屏**

完整替换 `src/app/projects/loading.tsx`：

```tsx
export default function Loading() {
  return (
    <div className="container py-8">
      <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-neutral-100 rounded animate-pulse" />
          <div className="h-4 w-48 bg-neutral-100 rounded animate-pulse" />
        </div>
        <div className="h-9 w-24 bg-neutral-100 rounded animate-pulse" />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-40 rounded-2xl bg-white shadow-sm animate-pulse" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 更新项目列表标题区与卡片样式**

将 `src/components/projects/projects-client.tsx` 第 123-133 行替换为：

```tsx
  return (
    <div className="container py-8">
      <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">我的项目</h1>
          <p className="text-sm text-neutral-500 mt-1">在所有模式间切换，数据自动同步</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg">
          <Plus className="h-4 w-4" />
          新建项目
        </Button>
      </div>
```

- [ ] **Step 3: 更新空状态**

将空状态区域（第 135-144 行）替换为：

```tsx
      {projects.length === 0 ? (
        <Card className="rounded-2xl border-neutral-100 shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="h-12 w-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="h-6 w-6 text-neutral-400" />
            </div>
            <p className="text-neutral-500 mb-4">还没有项目，开始你的第一本小说</p>
            <Button onClick={() => setCreateOpen(true)} className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg">
              <Plus className="h-4 w-4" />
              创建第一个项目
            </Button>
          </CardContent>
        </Card>
      ) : (
```

注意需要在 imports 中添加 `FolderOpen`：

```tsx
import { Workflow, PenLine, MessageSquare, Plus, MoreVertical, Trash2, FolderOpen } from "lucide-react";
```

- [ ] **Step 4: 更新项目卡片**

将项目 Card 的 className（第 151 行）改为：

```tsx
              <Card key={p.id} className="rounded-2xl border-neutral-100 shadow-sm hover:shadow-md transition-shadow group bg-white">
```

将图标区 className（第 160 行）改为：

```tsx
                        <div className="h-7 w-7 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                          <Icon className="h-3.5 w-3.5 text-neutral-700" />
                        </div>
```

将卡片底部 className（第 199 行）改为：

```tsx
                  <div className="flex items-center justify-between text-xs text-neutral-400 mt-3 pt-3 border-t border-neutral-100">
```

- [ ] **Step 5: 更新新建对话框按钮**

将对话框底部按钮（第 284-289 行）替换为：

```tsx
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="border-neutral-200 text-neutral-700 hover:bg-neutral-100 rounded-lg">
                取消
              </Button>
              <Button type="submit" disabled={creating} className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg">
                {creating ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
```

- [ ] **Step 6: 验证项目列表页**

访问 `http://localhost:3000/projects`
Expected: 顶部白色卡片，项目卡片圆角阴影，按钮黑色。

- [ ] **Step 7: 提交**

```bash
git add src/app/projects/loading.tsx src/components/projects/projects-client.tsx
git commit -m "style: refresh projects list" -m "- header card, project grid cards" -m "- black primary buttons, neutral badges"
```

---

## Task 4: 工作台 / 编辑器页改造

**Files:**
- Modify: `src/app/editor/[projectId]/page.tsx`
- Modify: `src/components/workbench/workbench-client.tsx`
- Modify: `src/components/editor/tiptap-editor.tsx`
- Modify: `src/components/knowledge/knowledge-sidebar.tsx`

- [ ] **Step 1: 修改 editor 页面容器**

将 `src/app/editor/[projectId]/page.tsx` 第 43-49 行替换为：

```tsx
      <div className="flex-1 min-h-0 container py-4">
        <div className="bg-white rounded-2xl shadow-sm h-full overflow-hidden">
          <WorkbenchClient project={JSON.parse(JSON.stringify(project))} />
        </div>
      </div>
```

- [ ] **Step 2: 修改工作台三栏布局**

将 `src/components/workbench/workbench-client.tsx` 左侧章节树区域（第 102-169 行）替换为：

```tsx
      {!focusMode && (
        <aside className="w-60 border-r border-neutral-100 bg-white flex flex-col">
          <div className="p-4 border-b border-neutral-100">
            <Link
              href="/projects"
              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900"
            >
              <ArrowLeft className="h-3 w-3" />
              返回项目列表
            </Link>
            <h2 className="text-sm font-semibold mt-2 truncate text-neutral-900">{project.title}</h2>
          </div>
          <div className="p-3 border-b border-neutral-100">
            <Button
              size="sm"
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg"
              onClick={() => setCreating(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              新章节
            </Button>
            {creating && (
              <div className="mt-2 flex gap-1">
                <Input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="章节标题"
                  className="h-8 text-xs rounded-lg"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createChapter();
                    if (e.key === "Escape") setCreating(false);
                  }}
                />
                <Button size="sm" onClick={createChapter} className="h-8 px-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg">添加</Button>
              </div>
            )}
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-0.5">
              {chapters.length === 0 ? (
                <p className="text-xs text-neutral-500 p-3">还没有章节，点击上方&ldquo;新章节&rdquo;创建</p>
              ) : (
                chapters.map((c) => (
                  <div
                    key={c.id}
                    className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer ${
                      activeId === c.id ? "bg-neutral-100 text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"
                    }`}
                    onClick={() => setActiveId(c.id)}
                  >
                    <FileText className="h-3 w-3 shrink-0 text-neutral-400" />
                    <span className="flex-1 truncate">{c.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        delChapter(c.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 hover:text-red-600 rounded"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>
      )}
```

- [ ] **Step 3: 修改中间编辑区背景**

将第 173 行 `<main className="flex-1 flex flex-col bg-muted/20">` 改为：

```tsx
      <main className="flex-1 flex flex-col bg-white">
```

- [ ] **Step 4: 修改右侧知识库容器**

将第 214-220 行替换为：

```tsx
      {!focusMode && (
        <aside className="w-72 hidden lg:block border-l border-neutral-100 bg-white">
          <KnowledgeSidebar
            projectId={project.id}
            worldSettings={project.worldSettings}
            characters={project.characters}
          />
        </aside>
      )}
```

- [ ] **Step 5: 修改编辑器工具栏与 AI 按钮**

在 `src/components/editor/tiptap-editor.tsx` 中：

将工具栏 className（第 135 行）改为：

```tsx
      <div className="border-b border-neutral-100 px-4 py-2 flex items-center gap-2 bg-white">
```

将标题输入框 className（第 140 行）改为：

```tsx
          className="h-8 text-base font-medium border-transparent hover:border-neutral-200 focus-visible:border-neutral-300 focus-visible:ring-neutral-200 max-w-md rounded-lg"
```

将 AI 按钮（第 145-149 行）改为：

```tsx
            <Button variant="outline" size="sm" className="rounded-full border-neutral-200 text-neutral-700 hover:bg-neutral-100">
              <Sparkles className="h-3.5 w-3.5" />
              AI
              <kbd className="ml-1 text-[10px] px-1 py-0.5 rounded bg-neutral-100">⌘K</kbd>
            </Button>
```

将 AI 动作标签 className（第 164-169 行）改为：

```tsx
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs border transition-colors",
                      aiAction === a
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                    )}
```

将执行按钮 className（第 175-180 行）改为：

```tsx
              <Button
                size="sm"
                onClick={runAI}
                disabled={aiStream.isStreaming || !selectedText}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg"
              >
```

将接受/拒绝按钮改为：

```tsx
                    <Button size="sm" onClick={acceptAIResult} className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg">
                      <Check className="h-3.5 w-3.5" />
                      接受
                    </Button>
                    <Button size="sm" variant="outline" onClick={rejectAIResult} className="flex-1 rounded-lg border-neutral-200">
                      <X className="h-3.5 w-3.5" />
                      拒绝
                    </Button>
```

- [ ] **Step 6: 修改编辑器底栏**

将底栏 className（第 221 行）改为：

```tsx
      <div className="border-t border-neutral-100 px-4 py-2 flex items-center justify-between text-xs text-neutral-500 bg-white">
```

- [ ] **Step 7: 修改知识库侧栏**

在 `src/components/knowledge/knowledge-sidebar.tsx` 中：

将最外层 className（第 65 行）改为：

```tsx
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-neutral-100">
```

将 AccordionItem 内的标题 className 颜色微调：

```tsx
                <AccordionTrigger className="text-sm font-medium py-2 text-neutral-900 hover:no-underline">
```

将 WorldCard / CharCard 的卡片 className（第 154 行和第 236 行）改为：

```tsx
    <div className="rounded-xl border border-neutral-100 p-2.5 text-xs bg-slate-50/50">
```

将保存按钮 className（第 189 行和第 296 行）改为：

```tsx
          <Button size="sm" className="w-full h-7 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg" onClick={save}>保存</Button>
```

- [ ] **Step 8: 验证工作台**

访问 `http://localhost:3000/editor/<projectId>`
Expected: 外层浅灰，中间白色圆角卡片，左侧章节树、编辑区、右侧知识库风格统一。

- [ ] **Step 9: 提交**

```bash
git add src/app/editor/[projectId]/page.tsx src/components/workbench/workbench-client.tsx src/components/editor/tiptap-editor.tsx src/components/knowledge/knowledge-sidebar.tsx
git commit -m "style: refresh workbench editor" -m "- white rounded-2xl editor container" -m "- neutral-900 primary buttons" -m "- pill AI action tags"
```

---

## Task 5: 流水线页改造

**Files:**
- Modify: `src/app/pipeline/[projectId]/page.tsx`
- Modify: `src/components/pipeline/pipeline-flow.tsx`
- Modify: `src/components/pipeline/step1-inspire.tsx` 至 `step6-polish.tsx`（输入框圆角、按钮）

- [ ] **Step 1: 修改 pipeline 页面容器**

将 `src/app/pipeline/[projectId]/page.tsx` 的内容区容器（类似 editor 页面第 43-49 行）替换为：

```tsx
      <div className="flex-1 min-h-0 container py-4">
        <div className="bg-white rounded-2xl shadow-sm h-full overflow-hidden flex flex-col">
          <PipelineFlow project={...} worldSummary={...} characterSummary={...} />
        </div>
      </div>
```

注意保留原有的 project/worldSummary/characterSummary 传参。

- [ ] **Step 2: 修改步骤条样式**

在 `src/components/pipeline/pipeline-flow.tsx` 中：

将步骤条 className（第 98 行）改为：

```tsx
      <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 shrink-0 bg-white">
```

将步骤圆圈 className（第 106-112 行）改为：

```tsx
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  step > s.key
                    ? "bg-neutral-900 text-white"
                    : step === s.key
                    ? "bg-neutral-900 text-white ring-4 ring-neutral-200"
                    : "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200"
                }`}
```

将连接线 className（第 124-127 行）改为：

```tsx
              <div
                className={`flex-1 h-px mx-2 ${step > s.key ? "bg-neutral-900" : "bg-neutral-200"}`}
              />
```

- [ ] **Step 3: 修改内容区和底部导航**

将内容区 className（第 133 行）改为：

```tsx
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 bg-slate-50/30">
```

将底部导航 className（第 172 行）改为：

```tsx
      <div className="flex items-center justify-between border-t border-neutral-100 px-6 py-4 shrink-0 bg-white">
```

将「上一步」按钮 className 添加：

```tsx
          className="border-neutral-200 text-neutral-700 hover:bg-neutral-100 rounded-lg"
```

将「跳到下一步」和「前往工作台」按钮改为黑色/outline：

```tsx
          <Button onClick={() => gotoStep(step + 1)} className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg">
            跳到下一步
          </Button>
```

```tsx
          <Button asChild variant="outline" className="border-neutral-200 text-neutral-700 hover:bg-neutral-100 rounded-lg">
            <Link href={`/editor/${project.id}`}>前往工作台继续编辑</Link>
          </Button>
```

- [ ] **Step 4: 统一各 step 组件的输入框和按钮**

对每个 `src/components/pipeline/step*.tsx`：
- 将 `<Button>` 主操作改为 `className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg"`
- 将 `<Textarea>` 和 `<Input>` 添加 `className="rounded-xl"`
- 将卡片容器改为 `className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6"`

由于各 step 文件结构类似，此处不一一展开，执行时按上述规则批量替换。

- [ ] **Step 5: 验证流水线**

访问 `http://localhost:3000/pipeline/<projectId>`
Expected: 白色圆角卡片容器，步骤条黑色高亮，输入框大圆角。

- [ ] **Step 6: 提交**

```bash
git add src/app/pipeline/[projectId]/page.tsx src/components/pipeline/pipeline-flow.tsx src/components/pipeline/step*.tsx
git commit -m "style: refresh pipeline flow" -m "- rounded-2xl white container" -m "- black step indicator" -m "- rounded-xl inputs"
```

---

## Task 6: 对话页改造

**Files:**
- Modify: `src/app/chat/[projectId]/page.tsx`
- Modify: `src/components/chat/chat-cocreate-client.tsx`

- [ ] **Step 1: 修改 chat 页面容器**

将 `src/app/chat/[projectId]/page.tsx` 第 43 行改为：

```tsx
      <div className="flex-1 min-h-0 container py-4">
        <div className="bg-white rounded-2xl shadow-sm h-full overflow-hidden">
          <ChatCoCreateClient projectId={projectId} />
        </div>
      </div>
```

- [ ] **Step 2: 修改对话组件外层和顶部栏**

在 `src/components/chat/chat-cocreate-client.tsx` 中：

将最外层 className（第 154 行）的负 margin 去掉，改为：

```tsx
    <div className="flex flex-1 min-h-0">
```

将主聊天区 className（第 156 行）改为：

```tsx
      <div className="flex-1 flex flex-col px-4 lg:px-6">
```

将顶部栏 className（第 157 行）改为：

```tsx
        <div className="border-b border-neutral-100 py-3 flex items-center justify-between">
```

将「提取知识卡」按钮改为 outline：

```tsx
            <Button variant="outline" size="sm" onClick={onExtract} disabled={extracting || messages.length < 2} className="border-neutral-200 text-neutral-700 hover:bg-neutral-100 rounded-lg">
```

将「转为正式项目」按钮改为黑色：

```tsx
            <Button size="sm" onClick={onConvert} className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg">
```

- [ ] **Step 3: 修改消息气泡**

将用户消息气泡 className（第 188-192 行）改为：

```tsx
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-800"
                  }`}
```

将 AI 流式消息气泡 className（第 200 行）改为：

```tsx
                  <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm bg-neutral-100 text-neutral-800">
```

- [ ] **Step 4: 修改输入框区域**

将输入框容器 className（第 208 行）改为：

```tsx
        <div className="border-t border-neutral-100 py-4 bg-white">
```

将 Textarea className（第 221 行）改为：

```tsx
                  className="flex-1 resize-none rounded-2xl border-neutral-200 focus-visible:ring-neutral-300"
```

将发送按钮改为黑色圆角：

```tsx
            <Button onClick={onSend} disabled={!input.trim() || aiStream.isStreaming || sending} className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl h-10 w-10 p-0">
```

- [ ] **Step 5: 修改右侧侧栏**

将 aside className（第 232 行）改为：

```tsx
      <aside className="w-80 border-l border-neutral-100 bg-white hidden lg:flex flex-col">
```

将侧栏标题区 className（第 233 行）改为：

```tsx
        <div className="p-3 border-b border-neutral-100 flex items-center justify-between">
```

将 Badge 颜色改为靛蓝/紫罗兰浅色（第 251 行和第 269 行）：

```tsx
                        <Badge variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-50">{w.category}</Badge>
```

```tsx
                        <Badge variant="secondary" className="text-[10px] bg-violet-50 text-violet-700 hover:bg-violet-50">{c.role}</Badge>
```

- [ ] **Step 6: 验证对话页**

访问 `http://localhost:3000/chat/<projectId>`
Expected: 白色圆角卡片容器，用户消息黑色气泡，AI 消息灰色气泡，输入框大圆角。

- [ ] **Step 7: 提交**

```bash
git add src/app/chat/[projectId]/page.tsx src/components/chat/chat-cocreate-client.tsx
git commit -m "style: refresh chat cocreate page" -m "- white rounded-2xl container" -m "- black user bubbles, gray AI bubbles" -m "- rounded-2xl input"
```

---

## Task 7: 定价页改造

**Files:**
- Modify: `src/app/pricing/page.tsx`

- [ ] **Step 1: 重写定价页卡片样式**

将 `src/app/pricing/page.tsx` 中 plans 数组后的 JSX（第 67-111 行）替换为：

```tsx
export default function PricingPage() {
  return (
    <div className="container py-12">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl font-semibold text-neutral-900 mb-3">选择适合你的方案</h1>
        <p className="text-neutral-500">免费版永久免费，付费方案按月订阅，可随时取消</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`rounded-2xl border-neutral-100 shadow-sm ${
              plan.highlight ? "border-t-4 border-t-neutral-900" : ""
            }`}
          >
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-lg">{plan.cn}</CardTitle>
                {plan.highlight && (
                  <Badge className="bg-neutral-900 text-white hover:bg-neutral-800">推荐</Badge>
                )}
              </div>
              <CardDescription>{plan.desc}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-neutral-900">{plan.price}</span>
                <span className="text-neutral-500">{plan.period}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-neutral-900 shrink-0" />
                    <span className="text-neutral-600">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={`w-full rounded-lg ${
                  plan.highlight
                    ? "bg-neutral-900 hover:bg-neutral-800 text-white"
                    : "border-neutral-200 text-neutral-700 hover:bg-neutral-100 bg-white"
                }`}
                variant={plan.highlight ? "default" : "outline"}
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-center text-xs text-neutral-400 mt-8">
        MVP 版本暂未接入支付，订阅升级请联系管理员手动调整用户角色
      </p>
    </div>
  );
}
```

- [ ] **Step 2: 验证定价页**

访问 `http://localhost:3000/pricing`
Expected: 三列白色圆角卡片，推荐方案顶部黑色条，对勾为黑色。

- [ ] **Step 3: 提交**

```bash
git add src/app/pricing/page.tsx
git commit -m "style: refresh pricing page" -m "- rounded-2xl cards" -m "- black top bar for highlighted plan" -m "- black checkmarks"
```

---

## Task 8: 管理后台改造

**Files:**
- Modify: `src/components/admin/admin-sidebar.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/users/page.tsx`
- Modify: `src/app/admin/projects/page.tsx`
- Modify: `src/app/admin/logs/page.tsx`
- Modify: `src/components/admin/admin-users-client.tsx`
- Modify: `src/components/admin/admin-projects-client.tsx`

- [ ] **Step 1: 修改后台侧栏**

完整替换 `src/components/admin/admin-sidebar.tsx`：

```tsx
import Link from "next/link";
import { LayoutDashboard, Users, FolderOpen, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "仪表盘", icon: LayoutDashboard, key: "dashboard" },
  { href: "/admin/users", label: "用户管理", icon: Users, key: "users" },
  { href: "/admin/projects", label: "项目管理", icon: FolderOpen, key: "projects" },
  { href: "/admin/logs", label: "AI 用量", icon: ScrollText, key: "logs" },
];

export function AdminSidebar({ active }: { active: string }) {
  return (
    <aside className="w-52 shrink-0 hidden md:block">
      <nav className="sticky top-20 space-y-1 bg-white rounded-2xl shadow-sm border border-neutral-100 p-3">
        {items.map((it) => (
          <Link
            key={it.key}
            href={it.href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors",
              active === it.key
                ? "bg-neutral-900 text-white font-medium"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
            )}
          >
            <it.icon className="h-4 w-4" />
            {it.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: 修改后台仪表盘**

将 `src/app/admin/page.tsx` 第 61-115 行替换为：

```tsx
  return (
    <div className="container py-6">
      <div className="flex gap-6">
        <AdminSidebar active="dashboard" />

        <div className="flex-1 min-w-0 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
            <h1 className="text-2xl font-semibold text-neutral-900 mb-1">管理后台</h1>
            <p className="text-sm text-neutral-500">平台运营数据总览</p>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((c) => (
              <Link key={c.label} href={c.href}>
                <Card className="rounded-2xl border-neutral-100 shadow-sm hover:border-neutral-300 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-neutral-500">
                      {c.label}
                    </CardTitle>
                    <c.icon className="h-4 w-4 text-neutral-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-neutral-900">{c.value.toLocaleString()}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* 7 天 AI Token 趋势 */}
          <Card className="rounded-2xl border-neutral-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-neutral-900">近 7 天 AI Token 消耗</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 h-48">
                {dailyTokens.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-xs text-neutral-500">{d.tokens}</div>
                    <div
                      className="w-full bg-neutral-900/80 rounded-t-lg transition-all"
                      style={{ height: `${(d.tokens / maxTokens) * 100}%`, minHeight: d.tokens > 0 ? "4px" : "0" }}
                    />
                    <div className="text-xs text-neutral-500">{d.date}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between text-sm">
                <span className="text-neutral-500">今日 Token 消耗</span>
                <span className="font-medium text-neutral-900">{todayTokens.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
```

- [ ] **Step 3: 修改用户管理页**

将 `src/app/admin/users/page.tsx` 中内容区外层（类似 logs 页面结构）用白色卡片包裹：

```tsx
        <div className="flex-1 min-w-0 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
            <h1 className="text-2xl font-semibold text-neutral-900 mb-1">用户管理</h1>
            <p className="text-sm text-neutral-500">共 {total} 位用户</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <AdminUsersClient users={...} page={page} totalPages={totalPages} />
          </div>
        </div>
```

- [ ] **Step 4: 修改项目管理页**

类似用户管理页，将 `src/app/admin/projects/page.tsx` 内容区用白色卡片包裹。

- [ ] **Step 5: 修改日志页**

将 `src/app/admin/logs/page.tsx` 中内容区外层替换为：

```tsx
        <div className="flex-1 min-w-0 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
            <h1 className="text-2xl font-semibold text-neutral-900 mb-1">AI 用量日志</h1>
            <p className="text-sm text-neutral-500">共 {total} 条记录</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr className="text-left text-neutral-600">
                    ...
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  ...
                </tbody>
              </table>
            </div>
          </div>
          ...
        </div>
```

将操作标签 className（第 100 行）改为：

```tsx
                          <span className="inline-flex px-2 py-0.5 rounded text-xs bg-indigo-50 text-indigo-700">
```

将分页按钮改为 outline 圆角：

```tsx
              <Button asChild variant="outline" size="sm" disabled={page <= 1} className="rounded-lg border-neutral-200">
```

- [ ] **Step 6: 验证管理后台**

访问 `http://localhost:3000/admin`
Expected: 左侧白色圆角卡片导航，当前项黑色高亮，统计卡片和图表风格统一。

- [ ] **Step 7: 提交**

```bash
git add src/components/admin/admin-sidebar.tsx src/app/admin/page.tsx src/app/admin/users/page.tsx src/app/admin/projects/page.tsx src/app/admin/logs/page.tsx
git commit -m "style: refresh admin dashboard" -m "- white rounded-2xl sidebar" -m "- content cards, neutral table headers" -m "- black active nav item"
```

---

## Task 9: 验证与最终提交

- [ ] **Step 1: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 无 TypeScript 错误。

- [ ] **Step 2: 检查所有关键页面**

依次访问：
- `/`
- `/projects`
- `/editor/<projectId>`
- `/pipeline/<projectId>`
- `/chat/<projectId>`
- `/pricing`
- `/admin`

Expected: 所有页面背景为浅灰，内容区为白色圆角卡片，主按钮黑色，无明显错位。

- [ ] **Step 3: 检查 git 状态并提交**

Run:
```bash
git status
```

Expected: 无未跟踪文件（除 .env、node_modules 等已忽略项）。

- [ ] **Step 4: 创建最终提交（如还有未提交改动）**

```bash
git add -A
git commit -m "style: complete UI refresh across all pages"
```

---

## Spec 覆盖检查

| Spec 要求 | 对应 Task |
|---|---|
| 浅灰背景 + 白色卡片 | Task 1, 2, 3, 4, 5, 6, 7, 8 |
| 黑色主按钮 | Task 1, 2, 3, 4, 5, 6, 7, 8 |
| 大圆角 rounded-2xl | Task 2, 3, 4, 5, 6, 7, 8 |
| 首页 Hero 大卡片 + 三步骤 | Task 2 |
| 项目列表卡片网格 | Task 3 |
| 工作台三栏卡片化 | Task 4 |
| 流水线步骤条黑色高亮 | Task 5 |
| 对话页消息气泡 | Task 6 |
| 定价页推荐黑色顶条 | Task 7 |
| 后台侧栏当前项黑色 | Task 8 |
| 类型检查通过 | Task 9 |

---

## 注意事项

1. 本次改动均为样式层，不修改业务逻辑和数据库 schema。
2. 所有 Button 通过 `className` 覆盖颜色，保留 shadcn Button 的 `variant` 语义。
3. 若某些组件（如 Dialog、DropdownMenu）内部样式未变，无需修改。
4. 执行过程中如发现某页面布局异常，应暂停并回到对应 Task 调整，不要一次性全部改完再检查。
