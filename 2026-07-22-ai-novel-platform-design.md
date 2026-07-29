# AI 写小说平台设计文档

> 日期：2026-07-22  
> 状态：已确认，待编写实现计划

## 1. 项目概述

### 1.1 目标

构建一个 AI 全流程协作的写小说平台，覆盖从灵感到成稿的完整创作链路。平台以"项目 + 知识库"为枢纽，提供三种创作模式（结构化流水线 / 写作工作台 / 对话共创），用户可随时切换，数据实时同步。通过 SaaS 订阅制变现。

### 1.2 目标用户

| 用户类型 | 核心诉求 | 主要使用模式 |
|----------|----------|--------------|
| 网文作者 | 提升连载产量，管理长篇一致性 | 写作工作台 + 流水线 |
| 普通爱好者 | 零门槛玩出自己故事 | 对话共创 |
| 专业创作者 | 灵感激发、初稿生成、角色探索 | 流水线 + 工作台 |

### 1.3 核心设计决策

- **混合架构**：流水线为骨架（新手引导），工作台为深度创作环境（专业用户），对话共创为轻量入口（爱好者），三者共享同一知识库
- **全栈 Next.js 16**：前端 + 后端统一用 Next.js 16（App Router + Turbopack + Cache Components + PPR），无独立后端服务
- **知识库 RAG**：世界观/角色卡/章节稿均带 embedding 向量，AI 写作时自动检索注入上下文，解决长篇一致性
- **部署于腾讯 EdgeOne Pages**：边缘 SSR/ISR + CDN 加速 + Git 推送自动部署

## 2. 技术架构

### 2.1 技术栈

#### 前端层（Client + RSC）

- Next.js 16（App Router，Turbopack 默认打包）
- React 19 + React Server Components
- Tailwind CSS + shadcn/ui（组件库）
- TipTap（富文本编辑器，用于工作台模式）
- Zustand（客户端状态管理）
- Server-Sent Events（AI 流式输出，打字机效果）

#### 服务层（Server）

- Server Actions（`"use server"`，处理数据变更：CRUD、表单提交）
- Route Handlers（`app/api/`，处理 AI 流式生成接口）
- Cache Components（`"use cache"` 显式缓存指令）
- PPR（Partial Prerendering，部分预渲染，提升首屏速度）
- NextAuth v5（Auth.js，用户认证）
- Prisma ORM + PostgreSQL（数据持久化）
- Redis（会话管理 / 配额缓存 / 限流）

#### 外部服务

- 大模型 API：豆包 / GPT / Claude（通过 AI Provider 抽象层统一调用）
- pgvector（PostgreSQL 向量扩展，知识库 RAG 检索）
- Neon / Supabase（PostgreSQL 托管）
- 对象存储：腾讯 COS / S3（封面图、导出文件）
- Stripe / 支付宝（订阅支付）
- Resend（邮件通知）

#### 部署

- 腾讯 EdgeOne Pages：边缘 SSR/ISR 渲染、全球 CDN 加速、边缘函数、Git 推送自动部署、自定义域名 + HTTPS、DDoS 防护 + WAF

### 2.2 架构分层

```
┌─────────────────────────────────────────────┐
│           三种创作模式（共享知识库）            │
│  结构化流水线  │  写作工作台  │  对话共创      │
└──────────────────┬──────────────────────────┘
                   │ 读写
┌──────────────────▼──────────────────────────┐
│         项目知识库（Project Knowledge Base）   │
│  世界观 │ 角色卡 │ 大纲 │ 章节稿              │
│  + RAG 向量检索 + 一致性引擎 + 版本管理       │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│           AI 引擎层                          │
│  Prompt 模板库 │ RAG 检索器 │ 模型路由        │
│  流式输出 │ 上下文管理 │ 用量计费 │ 安全过滤  │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│           系统服务                           │
│  用户认证 │ SaaS 订阅 │ 项目管理 │ 导出      │
│  用量统计 │ 通知/邮件                          │
└─────────────────────────────────────────────┘
```

## 3. 核心功能模块

### 3.1 结构化流水线模式

适合新手和首次创作者，六步引导式完成创作。每步遵循"AI 生成 → 人工编辑 → 确认后流转"循环，数据自动写入知识库供后续步骤引用。

#### 步骤 1：灵感卡生成

- 用户输入一句话点子（如"一个能听到死者遗言的殡葬师"），或从热门题材库选择
- AI 生成 3 张灵感卡，每张包含：故事内核、核心冲突、目标读者、情绪基调、类似作品参考
- 用户选择一张或融合多张，确认后进入下一步

#### 步骤 2：世界观构建

- 基于灵感卡，AI 生成世界观框架：时代背景、地理设定、社会规则、力量体系（修仙等级/科技水平）、核心矛盾
- 用户可逐项编辑、追问补充（如"这个世界的货币体系是什么"）
- 确认后写入知识库 WorldSetting 表

#### 步骤 3：角色卡创建

- AI 基于世界观生成主角 + 核心配角（3-5 个）
- 每张角色卡包含：姓名、外貌、性格、背景故事、核心动机、人物弧光、人际关系图
- 用户可编辑、增删、追问细化（如"这个反派的童年创伤是什么"）
- 确认后写入知识库 Character 表

#### 步骤 4：大纲生成

- AI 基于世界观 + 角色卡生成结构化大纲：卷 → 章 → 场景
- 每个场景标注：视角角色（关联 Character）、核心事件、情绪节奏、伏笔/回收
- 用户可拖拽调整顺序、编辑场景、增删章节
- 支持大纲模板：三幕式、英雄之旅、网文黄金三章等
- 确认后写入知识库 Outline 表

#### 步骤 5：章节扩写

- 逐章扩写，AI 引用世界观 + 角色卡 + 大纲 + 前文摘要生成正文初稿
- 流式输出（SSE），打字机效果
- 每章生成后用户可编辑、要求重写、或调整生成参数（语气、节奏、详略）
- 生成前自动保存版本快照到 Version 表

#### 步骤 6：润色定稿

- 全文或选段润色：文笔提升、对话优化、节奏调整、环境描写加强
- 一致性检查：AI 扫描全文，标记与世界观/角色卡矛盾的地方
- 确认后标记章节 status 为 final

### 3.2 写作工作台模式

适合网文作者和专业创作者，核心是 TipTap 富文本编辑器 + 行内 AI。

#### 编辑器

- TipTap 富文本编辑器，支持 Markdown 快捷输入 + 所见即所得
- 左侧章节树导航，支持拖拽排序、增删章节
- 全屏专注模式，隐藏侧栏

#### 行内 AI 操作

- 选中文字 → 右键菜单或快捷键（Cmd/Ctrl + K）→ 选择操作
- 操作类型：续写、扩写、润色、改写、压缩、翻译古文风格
- AI 生成结果以 diff 形式展示，用户确认接受或拒绝

#### 知识库侧栏

- 右侧常驻面板，展示当前项目的世界观/角色卡
- 可拖拽角色名插入引用到正文
- 点击角色卡查看详情，支持快速编辑

#### 一致性提示

- 写到与设定矛盾的内容时，编辑器行内标黄提示（如"此角色第 3 章已死亡"）
- 提示来源：知识库 RAG 检索 + 规则引擎

#### 版本快照

- 每次 AI 生成前自动保存当前版本到 Version 表
- 可随时对比历史版本、回滚

### 3.3 对话共创模式

适合普通爱好者，零门槛聊天式创作。

#### 聊天界面

- 用户描述故事走向，AI 以叙述者身份接龙，交替推进
- 支持 AI 角色扮演：让 AI 扮演某个角色对话，探索人物性格

#### 分支选择

- 关键情节点 AI 给出 2-3 个走向选项，用户选择后继续
- 支持回溯到分支点重新选择

#### 自动提取回填

- AI 在对话中识别用户提到的世界观设定和角色信息
- 自动结构化为知识卡，侧栏展示"已识别设定"
- 用户确认后回填知识库 WorldSetting/Character 表

#### 一键转项目

- 聊出的故事可一键转为流水线项目
- 已有的世界观/角色卡自动填充到流水线对应步骤

## 4. 数据模型

### 4.1 实体关系总览

```
User 1:1 Subscription
User 1:N Project
Project 1:N WorldSetting
Project 1:N Character
Project 1:N Outline
Project 1:N Chapter
Project 1:N ChatSession
Outline 1:1 Chapter
Chapter/WorldSetting/Character N:N Version
User 1:N AIUsageLog
```

### 4.2 表结构定义

#### User（用户）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID, PK | 主键 |
| email | String, unique | 邮箱 |
| name | String | 昵称 |
| avatar | String? | 头像 URL |
| role | Enum | FREE / BASIC / PRO |
| subscriptionId | UUID, FK | 关联 Subscription |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### Subscription（订阅）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID, PK | 主键 |
| userId | UUID, FK → User | 用户 |
| plan | Enum | FREE / BASIC / PRO |
| status | Enum | active / expired / cancelled |
| expiresAt | DateTime? | 到期时间 |
| renewAt | DateTime? | 续费时间 |
| paymentProvider | String? | stripe / alipay |
| providerSubId | String? | 支付商订阅 ID |

#### Project（项目）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID, PK | 主键 |
| userId | UUID, FK → User | 所属用户 |
| title | String | 小说标题 |
| genre | String | 类型（玄幻/都市/言情/科幻...） |
| synopsis | Text? | 简介 |
| mode | Enum | PIPELINE / WORKBENCH / CHAT |
| currentStep | Int | 流水线当前步骤（1-6） |
| status | Enum | draft / active / archived |
| wordCount | Int | 总字数 |
| coverImage | String? | 封面图 URL |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### WorldSetting（世界观卡）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID, PK | 主键 |
| projectId | UUID, FK → Project | 所属项目 |
| category | Enum | 背景 / 地理 / 规则 / 体系 / 其他 |
| title | String | 标题 |
| content | JSON | 结构化内容 |
| embedding | Vector(1536) | 向量嵌入（RAG 检索用） |
| version | Int | 版本号 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### Character（角色卡）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID, PK | 主键 |
| projectId | UUID, FK → Project | 所属项目 |
| name | String | 角色名 |
| role | Enum | 主角 / 配角 / 反派 / 路人 |
| appearance | Text? | 外貌描述 |
| personality | Text? | 性格特征 |
| background | Text? | 背景故事 |
| motivation | Text? | 核心动机 |
| arc | Text? | 人物弧光 |
| relationships | JSON | 人际关系（[{target, relation, desc}]） |
| embedding | Vector(1536) | 向量嵌入 |
| version | Int | 版本号 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### Outline（大纲节点）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID, PK | 主键 |
| projectId | UUID, FK → Project | 所属项目 |
| volume | Int | 卷号 |
| chapter | Int | 章号 |
| sceneTitle | String | 场景标题 |
| sceneSummary | Text | 场景摘要 |
| povCharacterId | UUID, FK → Character | 视角角色 |
| plotPoints | JSON[] | 情节点列表 |
| foreshadowing | Text? | 伏笔/回收标记 |
| order | Float | 排序索引 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### Chapter（章节稿）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID, PK | 主键 |
| projectId | UUID, FK → Project | 所属项目 |
| outlineId | UUID, FK → Outline | 关联大纲节点 |
| title | String | 章节标题 |
| content | Text | 正文内容 |
| wordCount | Int | 字数 |
| status | Enum | draft / final |
| summary | Text? | 章节摘要（供 RAG 检索） |
| embedding | Vector(1536) | 向量嵌入 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### ChatSession（对话会话）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID, PK | 主键 |
| projectId | UUID, FK → Project | 所属项目 |
| messages | JSON[] | 消息列表（[{role, content, timestamp}]） |
| extractedCards | JSON | 已提取的知识卡（待确认） |
| branchPoints | JSON[] | 分支选择记录 |
| status | Enum | active / converted |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### Version（版本快照）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID, PK | 主键 |
| entityType | Enum | chapter / worldsetting / character |
| entityId | UUID, FK | 关联实体 ID |
| snapshot | JSON | 完整快照数据 |
| label | String? | 用户标签（如"初稿""改版"） |
| createdAt | DateTime | 创建时间 |

#### AIUsageLog（AI 用量日志）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID, PK | 主键 |
| userId | UUID, FK → User | 用户 |
| projectId | UUID, FK → Project | 项目 |
| action | Enum | inspire / worldbuild / character / outline / expand / polish / chat |
| model | String | 使用的模型标识 |
| promptTokens | Int | 输入 token 数 |
| completionTokens | Int | 输出 token 数 |
| cost | Decimal | 预估成本 |
| createdAt | DateTime | 创建时间 |

### 4.3 知识库 RAG 检索流程

1. **触发**：用户在工作台/流水线触发 AI 写作（扩写第 N 章）
2. **向量检索**：以当前写作上下文（大纲 + 前文摘要）生成查询向量，pgvector 检索 top-K 最相关的 WorldSetting + Character + 前 2-3 章的 Chapter
3. **上下文组装**：
   - 近期全文：最近 2-3 章原文（约 6000-9000 字）
   - 中期摘要：更早章节的 AI 摘要（每章约 200 字）
   - 远期大纲：早期章节仅保留大纲级概要
   - 知识卡：RAG 检索的 top-K 相关设定
4. **Prompt 组装**：填入对应场景的 Prompt 模板 + 上下文 + 用户指令
5. **流式生成**：调用大模型，SSE 实时返回，打字机效果
6. **一致性检查**：生成后自动扫描正文与知识卡的矛盾，标记冲突段落

### 4.4 上下文窗口管理策略

超长小说不可能把全文塞进上下文，采用分层摘要策略：

| 层级 | 范围 | 内容 | 预估 token |
|------|------|------|-----------|
| 近期全文 | 最近 2-3 章 | 原文 | 6000-9000 字 |
| 中期摘要 | 更早 10-20 章 | 每章 AI 摘要 200 字 | 2000-4000 字 |
| 远期大纲 | 更早章节 | 大纲级概要 | 500-1000 字 |
| 知识卡 | RAG top-K | 世界观 + 角色卡 | 1000-2000 字 |
| 大纲 | 当前章节 | 场景摘要 + 情节点 | 200-500 字 |

总计约 10000-16500 字，控制在大多数模型 128K 上下文窗口的合理范围内。

## 5. AI 引擎层

### 5.1 Prompt 模板库

按场景/类型/环节预制模板，结构统一：

```
[系统角色设定]
你是专业的小说创作助手，擅长{题材}类型创作。

[知识库上下文]
## 世界观设定
{rag_worldsetting}

## 角色信息
{rag_characters}

## 前文摘要
{context_summary}

[当前任务]
{task_instruction}

[用户指令]
{user_input}

[输出要求]
{output_format}
```

模板分类：
- 按环节：灵感卡、世界观、角色卡、大纲、扩写、润色、对话
- 按题材：玄幻、都市、言情、科幻、悬疑、历史
- 用户可自定义模板并保存

### 5.2 模型路由

根据任务类型自动选择模型，也支持用户手动覆盖：

| 任务类型 | 推荐模型 | 理由 |
|----------|----------|------|
| 灵感卡生成 | 豆包 Pro | 创意发散，速度快 |
| 世界观/角色卡 | GPT-4o | 结构化输出能力强 |
| 大纲生成 | Claude | 长逻辑链推理 |
| 章节扩写 | 豆包 Pro / Claude | 长文本生成 + 中文表现力 |
| 润色 | GPT-4o | 文笔精细 |
| 对话共创 | 豆包 Pro | 响应快，成本低 |
| 一致性检查 | GPT-4o | 逻辑分析 |

### 5.3 流式输出

使用 Route Handler（`app/api/ai/generate/route.ts`）实现 SSE 流式输出：

```typescript
// 伪代码
export async function POST(req: Request) {
  const { prompt, model, projectId } = await req.json();
  const stream = await aiProvider.generateStream({ prompt, model });
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
        }
        controller.close();
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream' } }
  );
}
```

### 5.4 安全过滤

- 敏感词检测：生成前后过滤违禁内容
- 内容合规审核：调用大模型安全 API 或自建规则
- 输入长度限制：防止单次请求 token 爆炸

## 6. SaaS 订阅与用户系统

### 6.1 三档订阅方案

| 权益 | 免费版 Free | 基础版 Basic | 专业版 Pro |
|------|------------|-------------|-----------|
| 价格 | ¥0 | ¥29/月 | ¥79/月 |
| 项目数 | 1 个 | 10 个 | 无限 |
| 流水线 | 前 2 步 | 全 6 步 | 全 6 步 |
| 对话共创 | 20 轮/天 | 无限 | 无限 |
| AI 续写 | 500 字/天 | 1 万字/天 | 5 万字/天 |
| 工作台 | 不可用 | 可用 | 可用 |
| 角色卡 | 3 张 | 50 张 | 无限 |
| 知识库 RAG | 不可用 | 可用 | 可用 |
| 一致性检查 | 不可用 | 不可用 | 可用 |
| 高级模型 | 不可用 | 不可用 | Claude/豆包 Pro |
| 导出 | 不可用 | TXT/Markdown | TXT/Markdown/EPUB/PDF |
| 版本历史 | 不可用 | 7 天 | 30 天 |
| 优先客服 | 不可用 | 不可用 | 可用 |

### 6.2 配额控制流程

```
用户触发 AI → Redis 校验当日配额
  ├─ 配额充足 → AI 生成 → 计 token → 写入 AIUsageLog → Redis 扣减配额
  └─ 配额不足 → 提示升级 / 购买加量包
```

- Redis 负责实时配额扣减（高性能）
- PostgreSQL（AIUsageLog）负责用量日志持久化
- 两者每日对账，防止数据不一致

### 6.3 用户认证

使用 NextAuth v5（Auth.js）：

- 登录方式：邮箱密码 / 手机验证码 / 微信 OAuth / GitHub OAuth
- Session 策略：JWT + Database Session 混合
- 权限校验：Server Actions 内通过 `getServerSession()` 获取用户角色，按 role 限制功能访问

### 6.4 支付集成

- 支付商：Stripe（国际）/ 支付宝（国内）
- 订阅模式：按月/按年自动续费
- Webhook 处理：支付成功 → 更新 Subscription 表 → 更新 User.role
- 加量包：单次购买额外 AI 字数，不过期

## 7. 项目目录结构

```
ai-novel-platform/
├── app/
│   ├── (auth)/                 # 认证相关页面
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/            # 登录后主界面
│   │   ├── projects/           # 项目列表
│   │   ├── editor/[projectId]/ # 写作工作台
│   │   ├── pipeline/[projectId]/ # 流水线
│   │   └── chat/[projectId]/   # 对话共创
│   ├── api/
│   │   ├── ai/
│   │   │   ├── generate/       # AI 流式生成
│   │   │   ├── extract/        # 对话提取知识卡
│   │   │   └── check/          # 一致性检查
│   │   ├── auth/               # NextAuth 路由
│   │   └── payment/            # 支付 Webhook
│   ├── pricing/                # 定价页
│   └── layout.tsx
├── components/
│   ├── editor/                 # TipTap 编辑器组件
│   ├── pipeline/               # 流水线步骤组件
│   ├── chat/                   # 对话界面组件
│   ├── knowledge/              # 知识库侧栏组件
│   └── ui/                     # shadcn/ui 基础组件
├── lib/
│   ├── ai/                     # AI 引擎
│   │   ├── provider.ts         # 模型路由抽象层
│   │   ├── prompts/            # Prompt 模板
│   │   ├── rag.ts              # RAG 检索逻辑
│   │   └── context.ts          # 上下文窗口管理
├── prisma/
│   ├── schema.prisma           # 数据模型定义
│   └── migrations/
├── actions/                    # Server Actions
│   ├── project.ts
│   ├── chapter.ts
│   ├── knowledge.ts
│   └── subscription.ts
├── public/
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## 8. 关键页面与用户流程

### 8.1 新用户首次创作（流水线）

1. 注册/登录 → 项目列表页
2. 点击"新建项目" → 选择"引导式创作" → 输入小说标题和类型
3. 进入流水线步骤 1（灵感卡）→ AI 生成 3 张卡 → 选择一张
4. 步骤 2（世界观）→ AI 生成 → 编辑 → 确认
5. 步骤 3（角色卡）→ AI 生成 → 编辑 → 确认
6. 步骤 4（大纲）→ AI 生成 → 调整 → 确认
7. 步骤 5（章节扩写）→ 可切换到工作台模式深度编辑
8. 步骤 6（润色定稿）→ 一致性检查 → 导出

### 8.2 爱好者对话创作

1. 新建项目 → 选择"聊天式创作"
2. 输入一句话开头 → AI 接龙 → 循环对话
3. 侧栏自动展示已提取的世界观/角色卡
4. 点击"转为正式项目" → 自动填充知识库 → 进入工作台继续

### 8.3 专业作者工作台

1. 新建项目 → 选择"自由创作" → 直接进入工作台
2. 左侧章节树 → 右侧知识库侧栏 → 中间编辑器
3. 手动填写世界观/角色卡（或用 AI 辅助生成）
4. 写作时选中文字 → Cmd+K → 续写/润色/改写
5. 一致性提示实时标黄

## 9. 错误处理

- **AI 生成失败**：流式中断时前端展示"生成中断"提示，提供"重试"按钮，已生成内容保留
- **配额用尽**：拦截 AI 请求，弹出升级引导弹窗，展示当前用量和各档位对比
- **网络断开**：编辑器内容自动保存到 localStorage，网络恢复后同步到服务端
- **模型限流**：AI Provider 抽象层实现自动重试 + 指数退避 + 降级到备选模型
- **数据冲突**：多标签页编辑同一项目时，后保存者收到"内容已被修改"提示，提供合并/覆盖选项

## 10. 测试策略

- **单元测试**：AI Prompt 组装、RAG 检索逻辑、配额计算、上下文窗口管理
- **集成测试**：Server Actions → Prisma → PostgreSQL 全链路、AI 流式生成端到端
- **E2E 测试**：Playwright 覆盖三种模式的核心用户流程
- **性能测试**：AI 流式生成首 token 延迟 < 2s、编辑器输入无卡顿、知识库检索 < 500ms

## 11. 后续可扩展方向（非本次范围）

- 作品社区/市场：作者发布作品、读者阅读打赏
- 多人协作：多人共同创作同一项目
- AI 插画：为角色/场景生成配图
- 语音朗读：TTS 朗读章节
- 移动端 App：React Native 适配
