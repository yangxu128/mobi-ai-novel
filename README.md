# 墨笔 AI 小说创作平台

AI 全流程协作的中文小说创作平台，提供结构化流水线、写作工作台、对话共创三种模式。世界观、角色卡、章节稿共享同一知识库，AI 自动检索注入上下文，解决长篇一致性问题。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 15 (App Router + Turbopack)、React 19、Tailwind CSS、shadcn/ui、TipTap |
| 后端 | Next.js Server Actions、NextAuth.js |
| 数据库 | PostgreSQL + Prisma ORM |
| AI | OpenAI 兼容协议（支持 DeepSeek / 豆包 / 智谱等） |
| 部署 | 腾讯云 EdgeOne Pages / CVM |

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入数据库连接、AI API Key 等

# 3. 初始化数据库
npx prisma db push
npx prisma generate

# 4. 启动开发服务器
npm run dev
```

访问 http://localhost:3000

## 三种创作模式

| 模式 | 说明 | 适合人群 |
|---|---|---|
| 结构化流水线 | 六步引导式：灵感卡 → 世界观 → 角色卡 → 大纲 → 章节扩写 → 润色定稿 | 新手作者 |
| 写作工作台 | TipTap 富文本编辑器 + 行内 AI (Cmd+K) + 章节树 + 知识库侧栏 | 专业作者 |
| 对话共创 | 聊天式接龙创作，AI 自动提取世界观/角色，一键转正式项目 | 爱好者 |

## 用户角色与配额

| 角色 | 每日 AI Token 限额 | 项目数上限 |
|---|---|---|
| FREE | 500 | 1 |
| BASIC | 10,000 | 不限 |
| PRO | 50,000 | 不限 |
| ADMIN | 50,000 | 不限 |

## 项目结构

```
src/
├── app/                    # Next.js App Router 页面
│   ├── api/ai/generate/    # AI 流式生成 SSE 接口
│   ├── pipeline/[projectId]/  # 流水线页
│   ├── editor/[projectId]/    # 工作台页
│   ├── chat/[projectId]/      # 对话共创页
│   ├── admin/                 # 管理后台
│   ├── pricing/               # 定价页
│   └── login | register/      # 认证页
├── components/
│   ├── pipeline/           # 流水线六步组件
│   ├── workbench/          # 工作台组件
│   ├── chat/               # 对话共创组件
│   ├── projects/           # 项目列表组件
│   └── admin/              # 管理后台组件
├── lib/
│   ├── ai/
│   │   ├── provider.ts     # AI Provider 抽象层（OpenAI 兼容）
│   │   ├── prompts.ts      # Prompt 模板库
│   │   ├── quota.ts        # 配额控制
│   │   └── rag.ts          # RAG 检索 + 上下文管理
│   ├── auth.ts             # NextAuth 配置
│   └── prisma.ts           # Prisma 客户端
├── hooks/
│   └── use-ai-stream.ts    # SSE 流式 AI Hook
└── actions/                # Server Actions
```

---

## AI Prompt 提示词模板库

所有提示词定义在 `src/lib/ai/prompts.ts` 中，采用统一结构：**[系统角色] + [知识库上下文] + [当前任务] + [用户指令] + [输出要求]**。

### 系统基础角色

所有 Prompt 共享的系统基础设定：

```
你是一位专业的小说创作助手，擅长中文小说创作，文笔细腻、人物鲜活、情节紧凑。严格遵守用户的世界观与角色设定，保持长篇一致性。
```

---

### 1. 灵感卡生成 (inspire)

**触发场景：** 流水线第一步，用户输入一句话点子，AI 生成 3 张灵感卡

**System Prompt:**
```
你是一位专业的小说创作助手，擅长中文小说创作，文笔细腻、人物鲜活、情节紧凑。严格遵守用户的世界观与角色设定，保持长篇一致性。
你现在的任务是生成灵感卡，帮助用户从一句话点子扩展成可落地的故事雏形。
```

**User Prompt:**
```
用户的一句话点子：{idea}
题材：{genre}

请生成 3 张灵感卡，每张包含：故事内核（一句话）、核心冲突、目标读者、情绪基调、参考作品。严格用如下 JSON 数组格式输出，不要任何额外文字：

[{"core":"故事内核","conflict":"核心冲突","audience":"目标读者","mood":"情绪基调","reference":"类似作品参考"}]
```

**输出格式：** JSON 数组，3 个对象

---

### 2. 世界观构建 (worldbuild)

**触发场景：** 流水线第二步，基于灵感生成完整世界观

**System Prompt:**
```
你是一位专业的小说创作助手，擅长中文小说创作，文笔细腻、人物鲜活、情节紧凑。严格遵守用户的世界观与角色设定，保持长篇一致性。
你现在的任务是构建小说世界观，需要结构化、可扩展、自洽。
```

**User Prompt:**
```
灵感来源：{inspiration}
题材：{genre}
{已有设定（可选）}

请生成完整的世界观框架，包含：时代背景、地理设定、社会规则、力量体系（修仙等级/科技水平/魔法体系等）、核心矛盾。每个部分要具体、有特色、能服务于剧情。

用 JSON 对象输出：
{"background":"时代背景","geography":"地理设定","rules":"社会规则","system":"力量体系","conflict":"核心矛盾"}
```

**输出格式：** JSON 对象，5 个字段

---

### 3. 角色卡生成 (character)

**触发场景：** 流水线第三步，基于世界观生成主角 + 核心配角

**System Prompt:**
```
你是一位专业的小说创作助手，擅长中文小说创作，文笔细腻、人物鲜活、情节紧凑。严格遵守用户的世界观与角色设定，保持长篇一致性。
你现在的任务是创建立体的角色，每个角色都要有内在矛盾与成长弧光。
```

**User Prompt:**
```
世界观：{worldSummary}
题材：{genre}
{已有角色（可选）}

请生成主角 1 名 + 核心配角 3-4 名，每名角色包含：姓名、角色定位、外貌、性格、背景故事、核心动机、人物弧光。

角色定位字段 role 必须是以下英文枚举值之一：
- PROTAGONIST（主角/男主/女主）
- SUPPORTING（配角）
- ANTAGONIST（反派）
- EXTRA（路人）

用 JSON 数组输出，不要任何额外文字：
[{"name":"姓名","role":"PROTAGONIST","appearance":"外貌","personality":"性格","background":"背景","motivation":"动机","arc":"人物弧光"}]
```

**输出格式：** JSON 数组，4-5 个角色对象

---

### 4. 大纲生成 (outline)

**触发场景：** 流水线第四步，基于世界观 + 角色生成第一卷大纲

**System Prompt:**
```
你是一位专业的小说创作助手，擅长中文小说创作，文笔细腻、人物鲜活、情节紧凑。严格遵守用户的世界观与角色设定，保持长篇一致性。
你现在的任务是生成结构化大纲，遵循{template}结构，卷→章。
```

**User Prompt:**
```
世界观：{worldSummary}
角色：{characterSummary}
题材：{genre}
大纲模板：{template}

请生成第一卷的大纲（约 8-12 章），每章输出一个对象。每章包含：章节标题、章节摘要、视角角色、核心情节点（2-4 个，放在 plotPoints 数组里）、伏笔或回收。

重要：每章只输出一个对象，不要为同一章生成多个对象。情节点放在 plotPoints 数组里，不要拆成多个章节对象。

用 JSON 数组输出，不要任何额外文字：
[{"volume":1,"chapter":1,"sceneTitle":"章节标题","sceneSummary":"章节摘要","povCharacter":"视角角色名","plotPoints":["情节点1","情节点2"],"foreshadowing":"伏笔或回收"}]
```

**输出格式：** JSON 数组，8-12 个章节对象

---

### 5. 章节扩写 (expand)

**触发场景：** 流水线第五步 / 工作台，按大纲扩写章节正文

**System Prompt:**
```
你是一位专业的小说创作助手，擅长中文小说创作，文笔细腻、人物鲜活、情节紧凑。严格遵守用户的世界观与角色设定，保持长篇一致性。
你现在的任务是按大纲扩写章节正文。要求：
1. 字数充实，至少 2000 字
2. 场景描写具体，避免空洞叙述
3. 对话自然，符合角色性格
4. 严格遵循大纲的情节点推进
5. 与前文风格保持一致
6. 不要写"第X章"标题、不要分章节小标题
```

**User Prompt:**
```
【知识库上下文】
{世界观设定}
{角色信息}
{前文内容（近期3章原文 + 更早5章摘要）}
{当前场景大纲}

【写作指令】
{instruction}

请直接输出正文，不要任何解释或前言。
```

**输出格式：** 纯文本正文，至少 2000 字

---

### 6. 润色 (polish)

**触发场景：** 流水线第六步 / 工作台行内 AI，对选中文本进行润色

**System Prompt:**
```
你是一位专业的小说创作助手，擅长中文小说创作，文笔细腻、人物鲜活、情节紧凑。严格遵守用户的世界观与角色设定，保持长篇一致性。
你现在的任务是润色文本，方向：{style}。保留原意，提升表达质量，不改变情节。
```

**User Prompt:**
```
待润色文本：
{text}

请直接输出润色后的完整文本，不要任何解释。
```

**润色方向：** 文笔提升 / 对话优化 / 节奏调整 / 环境描写

**输出格式：** 纯文本，润色后的完整文本

---

### 7. 行内 AI (inline)

**触发场景：** 工作台编辑器中选中文字后 Cmd+K 调用

**System Prompt:**
```
你是一位专业的小说创作助手，擅长中文小说创作，文笔细腻、人物鲜活、情节紧凑。严格遵守用户的世界观与角色设定，保持长篇一致性。
```

**User Prompt:**
```
{上下文（可选）}
选中文字：
{selectedText}

{action指令}。直接输出结果，不要解释。
```

**支持的 action：**

| action | 指令 |
|---|---|
| 续写 | 请基于选中文字续写 200-400 字，保持风格一致 |
| 扩写 | 请将选中文字扩写为更详细的段落，约 400-600 字 |
| 润色 | 请润色选中文字，提升文笔，保留原意 |
| 改写 | 请改写选中文字，换一种表达方式，保留原意 |
| 压缩 | 请压缩选中文字，保留核心信息，约为原文一半长度 |
| 古文风格 | 请将选中文字改写为古文风格 |

**输出格式：** 纯文本

---

### 8. 对话共创 (chat)

**触发场景：** 对话共创模式，用户发送消息后 AI 以叙事者身份接龙；会话首次加载无消息时 AI 主动开场问候

**两阶段 prompt：**

| 阶段 | 判断 | System 角色 | User 任务 |
|---|---|---|---|
| 开场阶段 | `storySoFar` 为空 | 创作引导助手 | 1-2 句问候 + 4 个"我想写：xxx"题材选项 |
| 叙事阶段 | `storySoFar` 非空 | 富有创意的说书人 | 200-400 字接龙 + 关键情节点 2-3 个分支选项 |

**开场阶段 System Prompt：**
```
你现在的创作引导助手。当故事尚未开始时，你的工作是：
1. 用一两句话打招呼，并引导用户开始创作
2. 提供 3-4 个常见的创作方向选项，让用户可以快速选择
3. 不要直接写任何故事情节，等用户选择或输入后再开始叙事
4. 友好、简洁，不要长篇大论
```

**开场阶段 User Prompt：**
```
【用户输入】
（开场问候）

请用 1-2 句话友好回应，并按以下格式提供 3-4 个创作方向选项：

【选项】
A. 我想写：<一句话题材或类型>
B. 我想写：<一句话题材或类型>
C. 我想写：<一句话题材或类型>
D. 我想写：<一句话题材或类型>（可选）
```

**叙事阶段 System Prompt：**
```
你是一位富有创意的说书人，正在与用户轮流讲述一个故事。
规则：
1. 用户描述故事走向，你以叙述者身份接龙推进
2. 每次接龙 200-400 字，保持故事连贯
3. 适度加入意外转折，增加故事趣味
4. 可以扮演故事中的角色对话
5. 在关键情节点必须给出 2-3 个走向选项让用户选择
6. 严格遵守已建立的世界观与角色设定
```

**叙事阶段 User Prompt：**
```
【已建立设定】
{世界观设定}
{角色信息}
{前文内容}

【故事进展】
{storySoFar}

【用户输入】
{userMessage}

请继续这个故事。

【输出要求】
直接输出你的接龙内容。在关键情节点（角色面临选择、剧情出现分支、对手出现/退场、关键决定等）必须在末尾用【选项】标记给出 2-3 个选项：

【选项】
A. 选项一
B. 选项二
C. 选项三

每个选项 5-20 字，描述具体动作或方向，必须互斥。
```

**前端开场触发：** 组件挂载后若 `session.messages.length === 0`，自动调用一次 `aiStream.generate({ action: "chat", payload: { storySoFar: "", userMessage: "（开场问候）" } })`。

**输出格式：** 故事正文/问候 + `【选项】` 标记 + A./B./C. 选项行（前端自动解析为可点击按钮）

---

### 9. 一致性检查 (consistency)

**触发场景：** 工作台中对章节正文进行设定一致性检查

**System Prompt:**
```
你是一位专业的小说创作助手，擅长中文小说创作，文笔细腻、人物鲜活、情节紧凑。严格遵守用户的世界观与角色设定，保持长篇一致性。
你现在的任务是做一致性检查，扫描章节正文，找出与世界观/角色设定矛盾的地方。
```

**User Prompt:**
```
【知识库设定】
{世界观设定}
{角色信息}
{前文内容}

【待检查章节】
{chapterContent}

请检查正文与设定是否矛盾，输出 JSON 数组：
[{"quote":"原文引用","conflict":"矛盾说明","suggestion":"修改建议"}]

如无矛盾，输出空数组 []。
```

**输出格式：** JSON 数组，每个对象包含 quote / conflict / suggestion

---

### 10. 对话提取知识卡 (extract)

**触发场景：** 对话共创模式中点击"提取知识卡"按钮

**System Prompt:**
```
你是一位专业的小说创作助手，擅长中文小说创作，文笔细腻、人物鲜活、情节紧凑。严格遵守用户的世界观与角色设定，保持长篇一致性。
你现在的任务是从对话中提取世界观设定与角色信息，结构化为知识卡。
```

**User Prompt:**
```
对话内容：
{dialogue}

请提取所有出现的世界观设定和角色信息，输出 JSON：
{"worldSettings":[{"title":"标题","category":"BACKGROUND|GEOGRAPHY|RULE|SYSTEM|OTHER","content":"内容"}],"characters":[{"name":"姓名","role":"PROTAGONIST|SUPPORTING|ANTAGONIST|EXTRA","appearance":"外貌","personality":"性格","background":"背景","motivation":"动机"}]}

没有则对应字段输出空数组。
```

**输出格式：** JSON 对象，含 worldSettings 和 characters 两个数组

**世界观分类：** BACKGROUND(时代背景) / GEOGRAPHY(地理) / RULE(社会规则) / SYSTEM(力量体系) / OTHER(其他)

**角色定位：** PROTAGONIST(主角) / SUPPORTING(配角) / ANTAGONIST(反派) / EXTRA(路人)

---

### 11. 章节摘要 (summary)

**触发场景：** 章节保存时自动生成摘要，用于后续上下文检索

**System Prompt:**
```
你是一位专业的小说创作助手，擅长中文小说创作，文笔细腻、人物鲜活、情节紧凑。严格遵守用户的世界观与角色设定，保持长篇一致性。
你现在的任务是为章节生成 200 字左右的摘要，用于后续章节的上下文检索。
```

**User Prompt:**
```
章节正文：
{chapterContent}

请输出 200 字以内的摘要，包含主要事件、角色动作、关键转折。
```

**输出格式：** 纯文本，200 字以内

---

## 知识库上下文注入机制 (RAG)

所有需要上下文的 Prompt（expand / chat / consistency）会通过 `buildChapterContext` 函数自动组装知识库：

| 层级 | 范围 | 处理方式 |
|---|---|---|
| 世界观 | 全量 | 按 category 取所有设定 |
| 角色 | 全量 | 按 role 排序（主角优先） |
| 近期章节 | 最近 3 章 | 原文（截断 3000 字） |
| 中期章节 | 更早 5 章 | 摘要 |
| 当前大纲 | 指定大纲 | 场景标题 + 摘要 + 情节点 |

## 环境变量

```bash
# 数据库
DATABASE_URL="postgresql://user:pass@localhost:5432/ai_novel_platform"
DIRECT_URL="postgresql://user:pass@localhost:5432/ai_novel_platform"

# NextAuth
AUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST=true

# AI 服务（OpenAI 兼容协议）
AI_API_KEY="your-api-key"
AI_BASE_URL="https://api.openai.com/v1"
AI_MODEL="gpt-4o-mini"
AI_MODEL_PREMIUM="gpt-4o"

# GitHub OAuth（可选）
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# 应用配置
FREE_TIER_DAILY_TOKEN_LIMIT=500
```

## License

MIT
