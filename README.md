# 墨笔 AI 小说创作平台

AI 全流程协作的中文小说创作平台。结构化流水线、写作工作台、对话共创三种模式覆盖从灵感到成稿的完整链路；世界观、角色卡、章节稿沉淀为项目知识库，配合**长期记忆系统（LLM wiki + RAG 混合架构）**与一致性检查，解决 AI 长篇创作的"健忘症"问题。

**在线体验**：<https://mobi.uanx.online/>

## 功能特性

- **三种创作模式**：结构化流水线（六步引导）/ 写作工作台（TipTap 富文本 + 行内 AI）/ 对话共创（聊天接龙，一键转正式项目）
- **长期记忆系统**：章节保存后自动提取摘要、事件、角色状态与伏笔增减，构建可检索的"设定维基"；扩写与一致性检查时注入"故事状态卡"
- **全书规划**：立项设定目标章节数与每章字数，大纲生成带全书弧线与进度感知（临近完结自动进入收官模式）
- **知识库 RAG**：世界观 / 角色卡 / 大纲 / 近期章节分层注入，按需检索
- **一致性检查**：扫描章节正文与设定矛盾，自动标记并给出修改建议
- **作家风格模仿**：8 位网文名家风格预设，或粘贴个人样本分析专属笔风（强度可调）
- **深度思考开关**：推理模型思考过程可全局开关，兼顾质量与成本
- **管理后台**：用户 / 角色 / 订阅管理，项目与 AI 用量统计

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 15 (App Router + Turbopack)、React 19、Tailwind CSS、shadcn/ui、TipTap |
| 后端 | Next.js Server Actions、API Routes（SSE 流式）、NextAuth.js v5 |
| 数据库 | PostgreSQL（Supabase）+ Prisma ORM + pg 驱动适配器 |
| AI | OpenAI 兼容协议（DeepSeek / 豆包 / 智谱等）、RAG、LLM 长期记忆 |
| 部署 | 腾讯 EdgeOne Pages（GitHub 自动构建）、自定义域名 |

## 快速开始

```bash
# 1. 安装依赖（postinstall 会自动执行 prisma generate）
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env：填入数据库连接串与 AI API Key（可用 Supabase 免费库）

# 3. 初始化数据库（表结构推送到数据库）
npx prisma db push

# 4. 启动开发服务器
npm run dev
```

访问 <http://localhost:3000>。要求 Node.js ≥ 20.9。

## 三种创作模式

| 模式 | 说明 | 适合人群 |
|---|---|---|
| 结构化流水线 | 六步引导式：灵感卡 → 世界观 → 角色卡 → 大纲 → 章节扩写 → 润色定稿 | 新手作者 |
| 写作工作台 | TipTap 富文本编辑器 + 行内 AI (Cmd+K) + 二级章节目录 + 知识库侧栏 | 专业作者 |
| 对话共创 | 聊天式接龙创作，AI 自动提取世界观/角色，一键转正式项目 | 爱好者 |

## 用户角色与配额（积分制）

计量单位：**1 积分 ≈ 100 tokens ≈ 100 字**，按实际用量扣减，每天北京时间 0 点重置。

| 角色 | 每日积分 | 约合字数 | 项目数上限 |
|---|---|---|---|
| FREE | 5 | 500 字 | 1 |
| BASIC | 100 | 1 万字 | 不限 |
| PRO | 500 | 5 万字 | 不限 |
| ADMIN | 不限 | 不限 | 不限 |

## 项目结构

```
src/
├── app/                      # Next.js App Router
│   ├── api/ai/generate/      # AI 流式生成 SSE 接口
│   ├── api/health/           # 生产诊断端点（环境变量 + DB 连通性）
│   ├── project/[id]/         # 项目工作区（三模式切换）
│   ├── projects/             # 项目列表（搜索/排序/分页）
│   ├── trash/                # 回收站（软删除恢复）
│   ├── about|pricing|faq|guide|changelog|api-docs|terms|privacy/
│   ├── login | register/     # 认证页
│   └── admin/                # 管理后台（仪表盘/用户/项目/AI 用量）
├── components/
│   ├── pipeline/             # 流水线六步组件
│   ├── workbench/            # 工作台（章节目录/编辑器容器）
│   ├── editor/               # TipTap 编辑器（含排版规范化）
│   ├── chat/                 # 对话共创
│   ├── knowledge/            # 知识库侧栏（世界观/角色/情节大纲）
│   ├── projects/             # 项目列表 + 应用壳层侧边栏
│   ├── about/                # 关于页（社区二维码）
│   ├── home/                 # 官网首页
│   ├── auth/                 # 登录/注册品牌面板
│   ├── model/                # 模型选择器/深度思考开关
│   └── admin/                # 管理后台组件
├── lib/
│   ├── ai/
│   │   ├── provider.ts       # AI Provider 抽象层（OpenAI 兼容，SSE）
│   │   ├── prompts.ts        # 提示词模板库（14 个，详见 docs/prompt-library.md）
│   │   ├── rag.ts            # RAG 检索 + 分层上下文
│   │   ├── wiki.ts           # 长期记忆：章节保存后自动提取故事状态
│   │   ├── quota.ts          # 配额控制
│   │   ├── rate-limit.ts     # 限流（登录/注册）
│   │   ├── style.ts          # 作家风格档案
│   │   ├── thinking.ts       # 深度思考开关
│   │   └── models.ts         # 可用模型列表
│   ├── auth.ts               # NextAuth v5 配置（JWT + 角色）
│   ├── session.ts            # 会话助手（requireUser/requireAdmin）
│   └── prisma.ts             # Prisma 客户端
├── actions/                  # Server Actions（project/chapter/chat/knowledge/wiki/admin/auth/subscription）
└── types/                    # 共享类型
```

## AI 提示词体系

提示词统一收敛在 `src/lib/ai/prompts.ts`（14 个提示词函数），覆盖流水线六步、行内 AI、对话共创、一致性检查、风格分析与长期记忆提取。设计上内置于番茄网文节奏体系、去 AI 味规则与长篇一致性机制，并支持全书规模注入与进度感知。

完整的提示词设计说明（触发场景 / 核心策略 / 输出格式 / RAG 分层机制）见 **[docs/prompt-library.md](docs/prompt-library.md)**。

## 环境变量

完整说明见 `.env.example`。核心变量：

```bash
# 数据库（推荐 Supabase：运行时走 Pooler 6543，迁移走 5432）
DATABASE_URL="postgresql://postgres.xxx:密码@aws-0-xxx.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:密码@aws-0-xxx.pooler.supabase.com:5432/postgres"

# NextAuth（反代/托管环境 AUTH_TRUST_HOST 必开）
AUTH_SECRET="openssl rand -base64 32 生成"
AUTH_TRUST_HOST=true

# AI 服务（OpenAI 兼容协议）
AI_API_KEY="your-api-key"
AI_BASE_URL="https://api.deepseek.com"
AI_MODEL="deepseek-v4-flash"
AI_MODELS='[{"id":"deepseek-v4-flash","name":"DeepSeek-V4-Flash"}]'

# GitHub OAuth（可选）
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# 应用配置
FREE_TIER_DAILY_TOKEN_LIMIT=500
```

## 部署

支持任意支持 Node.js 的托管平台（项目在腾讯 EdgeOne Pages 上验证通过，GitHub 导入自动构建）。

以 **EdgeOne Pages + Supabase** 为例：

1. Supabase 创建项目，取 Connection Pooler 与 Direct 两条连接串
2. 本地 `DATABASE_URL`/`DIRECT_URL` 指向 Supabase 后 `npx prisma db push` 同步表结构
3. EdgeOne Pages 导入 GitHub 仓库，配置环境变量（上表全部）
4. 部署完成后注册账号，按需通过 SQL 提升管理员角色

详细步骤与踩坑记录见文章：*《0 成本上线一个全栈应用：EdgeOne Pages + Supabase 踩坑实录》*（wechat-article/ 目录）。

## License

MIT
