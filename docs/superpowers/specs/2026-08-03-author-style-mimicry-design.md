# 作家风格模仿功能设计

> 日期: 2026-08-03
> 状态: 已确认

## 概述

为 AI 写小说平台新增"模仿著名网文作家笔风"功能。用户在项目级别选择或自定义一个作家风格档案，后续所有 AI 生成步骤（灵感卡、世界观、角色卡、大纲、扩写、润色、对话共创、一致性检查等）自动套用该风格。

采用 Prompt 注入式方案：风格以文字描述形式注入到每个 prompt 的 system message 中，不涉及 few-shot 范文或模型微调。后续可扩展为蒸馏作家风格（few-shot / 向量检索）。

## 需求

1. **预设名家库**：平台内置 8 位知名网文作家的风格档案，用户一键选用
2. **自定义上传**：用户粘贴 100-10000 字文本样本（推荐 500-5000 字效果最佳），AI 分析提取风格特征，生成风格档案
3. **项目级设置**：每个项目绑定一个风格档案，所有 AI 生成都自动套用
4. **全部步骤生效**：风格影响所有 AI 生成步骤（灵感/世界观/角色/大纲/扩写/润色/对话/一致性检查）
5. **强度调节**：三档（轻微 / 中等 / 强烈），控制风格模仿浓度

## 数据模型

### Project 表新增字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `styleProfile` | `Json?` | 风格档案对象，null 表示未设置 |

### styleProfile 结构

```typescript
interface StyleProfile {
  type: "preset" | "custom";           // 预设名家 / 自定义上传
  name: string;                         // 作家名或自定义标签
  description: string;                  // 风格特征描述（注入 prompt 用，200-300 字）
  sampleText?: string;                  // 原始上传样本（仅 custom 类型，保留用于后续蒸馏功能）
  intensity: "low" | "medium" | "high"; // 强度
  analyzedAt?: string;                  // AI 分析时间（仅 custom 类型，ISO 字符串）
}
```

不需要新建表，仅在 Project 表加一个可空 Json 字段。迁移文件: `prisma/migrations/<timestamp>_add_style_profile/migration.sql`。

## 预设名家库

文件: `src/lib/ai/style-presets.ts`

首批 8 位，覆盖主流网文类型：

| ID | 作家 | 擅长类型 |
|---|---|---|
| mao-ni | 猫腻 | 玄幻、武侠、权谋 |
| tiancan-tudou | 天蚕土豆 | 玄幻、热血 |
| fenghuo | 烽火戏诸侯 | 武侠、都市 |
| chen-dong | 辰东 | 玄幻、仙侠 |
| wang-yu | 忘语 | 仙侠 |
| fanqie | 番茄 | 都市、系统 |
| er-gen | 耳根 | 仙侠 |
| tang-jia | 唐家三少 | 玄幻、青春 |

每位作家的 `description` 字段为 200-300 字的文笔风格特征描述，涵盖：语言节奏、句式偏好、对话风格、画面感、情感处理、意象偏好等维度。

数据结构：

```typescript
interface StylePreset {
  id: string;
  name: string;
  description: string;
  genres: string[];
}
```

## 类型定义与风格注入

### 文件: `src/lib/ai/style.ts`

```typescript
import type { StylePreset } from "./style-presets";

export interface StyleProfile {
  type: "preset" | "custom";
  name: string;
  description: string;
  sampleText?: string;
  intensity: "low" | "medium" | "high";
  analyzedAt?: string;
}

// 根据强度返回注入到 system message 的风格指令文本
export function buildStyleDirective(profile: StyleProfile): string {
  const intensityMap = {
    low: "可适当参考以下作家的文笔风格",
    medium: "请模仿以下作家的文笔风格进行创作",
    high: "请严格模仿以下作家的文笔风格，使文本风格高度一致",
  };
  return `${intensityMap[profile.intensity]}：\n${profile.description}`;
}
```

### prompts.ts 修改

当前所有 prompt 函数共用一个常量 `SYS_BASE`。改为：

1. `SYS_BASE` 保留为无风格的基础版本
2. 新增 `buildSystemBase(styleProfile?: StyleProfile | null): string` 函数
3. 所有 prompt 函数增加可选参数 `styleProfile?: StyleProfile | null`
4. 函数内部将 `SYS_BASE` 替换为 `buildSystemBase(styleProfile)` 调用

注入位置：system message 的 content 末尾追加 `【风格要求】\n{buildStyleDirective(profile)}`。

示例（以 expandPrompt 为例）：

```typescript
export function expandPrompt(
  instruction: string,
  ctx: KnowledgeContext | undefined,
  styleProfile?: StyleProfile | null
): AIMessage[] {
  return [
    {
      role: "system",
      content: buildSystemBase(styleProfile) + "\n你现在的任务是按大纲扩写章节正文。要求：...",
    },
    { role: "user", content: "..." },
  ];
}
```

涉及的 prompt 函数清单（全部 11 个）：
- `inspirePrompt`
- `worldbuildPrompt`
- `characterPrompt`
- `outlinePrompt`
- `expandPrompt`
- `polishPrompt`
- `inlineAIPrompt`
- `chatCoCreatePrompt`
- `consistencyCheckPrompt`
- `extractCardsPrompt`
- `summaryPrompt`

## 新增 action: analyzeStyle

在 `route.ts` 的 `actionHandlers` 中新增：

```typescript
async analyzeStyle({ payload }) {
  const sampleText = String(payload.sampleText || "");
  if (!sampleText || sampleText.length < 100) throw new Error("样本文本过短，至少需要 100 字");
  if (sampleText.length > 10000) throw new Error("样本文本过长，最多 10000 字");
  return analyzeStylePrompt(sampleText);
}
```

对应 prompt 函数 `analyzeStylePrompt`（在 prompts.ts 中新增）：

```typescript
export function analyzeStylePrompt(sampleText: string): AIMessage[] {
  return [
    {
      role: "system",
      content: "你是一位文学评论专家，擅长分析网文作家的文笔风格特征。",
    },
    {
      role: "user",
      content: `请分析以下文本的文笔风格特征，从语言节奏、句式偏好、对话风格、画面感、情感处理、意象偏好等维度进行描述，输出 200-300 字的风格特征摘要。\n\n文本样本：\n${sampleText}\n\n直接输出风格特征描述，不要任何解释或前言。`,
    },
  ];
}
```

同时需要在 `AIAction` enum 中新增 `analyzeStyle` 值。

## API 层改动

### route.ts

所有项目级 action handler（expand、polish、chat、consistency 等需要 projectId 的）修改为：从数据库查询 Project.styleProfile，传给 prompt 函数。

非项目级 action（inspire、worldbuild、character、outline 等在项目创建前调用的）：前端在 payload 中直接携带 `styleProfile` 对象（仅 description + name + intensity，不含 sampleText 以减少传输）。route.ts 从 `payload.styleProfile` 读取并传给 prompt 函数。

具体改法：

```typescript
// 项目级 action 示例
async expand({ projectId, payload }) {
  if (!projectId) throw new Error("缺少 projectId");
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { styleProfile: true },
  });
  const outlineId = payload.outlineId ? String(payload.outlineId) : undefined;
  const instruction = String(payload.instruction || "请按大纲扩写本章");
  const ctx = await buildChapterContext({ projectId, currentOutlineId: outlineId });
  return expandPrompt(instruction, ctx, project?.styleProfile as StyleProfile | null);
},
```

### AIAction enum

在 `schema.prisma` 的 `AIAction` enum 中新增 `analyzeStyle`。

## Server Action: updateStyleProfileAction

文件: `src/actions/project.ts`

```typescript
export async function updateStyleProfileAction(
  projectId: string,
  profile: StyleProfile | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  // 校验项目归属权
  // 更新 Project.styleProfile
}
```

## 前端交互

### 项目创建页（projects-client.tsx）

在项目创建表单中新增"写作风格"选择区：
- 卡片网格展示 8 位预设名家（名称 + 擅长类型标签）
- 点击选中后高亮，底部显示风格简介
- 另有一张"自定义上传"卡片，点击展开 Textarea
- 强度选择：三档 radio 按钮（轻微 / 中等 / 强烈），默认"中等"
- 可选择"不设置风格"，跳过此步

### 项目设置（project-workspace.tsx）

在项目工作台的设置区/侧边栏底部：
- 显示当前风格名称 + 强度 + 类型标签
- "更换风格"按钮 → 弹出风格选择弹窗（复用创建页的卡片网格）
- "清除风格"按钮 → 清空 styleProfile

### 自定义上传流程

1. 用户在风格选择区点击"自定义上传"
2. 展开文本框，用户粘贴 100-10000 字样本
3. 选择强度
4. 点击"AI 分析风格"
5. 调用 `POST /api/ai/generate { action: "analyzeStyle", payload: { sampleText } }`
6. 流式返回风格描述文本
7. 用户可编辑描述（确认后保存）
8. 调用 `updateStyleProfileAction` 写入 Project

## 数据流

```
用户选择预设 / 上传样本
        │
        ├── 预设: 直接从 style-presets.ts 取 description
        │
        └── 自定义: POST /api/ai/generate {action: "analyzeStyle", payload: {sampleText}}
                          │
                          ▼
                    AI 流式返回风格描述
                          │
                          ▼
        updateStyleProfileAction → 写入 Project.styleProfile
                          │
                          ▼
        后续所有 AI 生成请求 → route.ts 读取 Project.styleProfile
                          │
                          ▼
        buildSystemBase(styleProfile) → 注入到每个 prompt 的 system message
```

## 改动文件清单

| 文件 | 类型 | 说明 |
|---|---|---|
| `prisma/schema.prisma` | 修改 | Project 新增 styleProfile 字段；AIAction 新增 analyzeStyle |
| `prisma/migrations/<ts>_add_style_profile/migration.sql` | 新建 | 迁移脚本 |
| `src/lib/ai/style-presets.ts` | 新建 | 预设名家库常量 |
| `src/lib/ai/style.ts` | 新建 | StyleProfile 类型 + buildStyleDirective() + buildSystemBase() |
| `src/lib/ai/prompts.ts` | 修改 | 所有 prompt 函数增加 styleProfile 参数；新增 analyzeStylePrompt |
| `src/app/api/ai/generate/route.ts` | 修改 | 新增 analyzeStyle handler；项目级 action 读取 styleProfile |
| `src/actions/project.ts` | 修改 | 新增 updateStyleProfileAction |
| `src/components/projects/projects-client.tsx` | 修改 | 项目创建流程加入风格选择 |
| `src/components/project-workspace.tsx` | 修改 | 项目设置区加入风格管理 |

## 边界与约束

1. **styleProfile 为 null 时的行为**：完全等同于当前无风格行为，`buildSystemBase(null)` 返回 `SYS_BASE` 原文
2. **配额**：`analyzeStyle` 消耗用户当日 AI token 配额，与其他 action 一致计入 AIUsageLog
3. **样本长度限制**：100-10000 字，前端和后端双重校验
4. **预设名家库不可编辑**：纯常量，后续如需管理后台维护可迁移到数据库
5. **风格描述缓存**：custom 类型的 description 在 AI 分析后固定存储，不会每次生成重新分析
6. **不改变的**：现有 action handler 策略表结构、SSE 流式协议、配额/限流机制
