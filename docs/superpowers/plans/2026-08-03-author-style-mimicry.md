# 作家风格模仿功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在项目级别添加作家风格档案，使所有 AI 生成步骤自动模仿指定作家笔风

**Architecture:** Prompt 注入式 — 风格以文字描述形式存储在 Project.styleProfile（Json 字段），通过 buildSystemBase() 函数动态注入到每个 prompt 的 system message 中。预设名家库为前端常量，自定义上传通过 AI 分析样本生成风格描述。

**Tech Stack:** Next.js 15 / Prisma / TipTap / SSE 流式 / Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-08-03-author-style-mimicry-design.md`

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `prisma/schema.prisma` | Project 新增 styleProfile 字段；AIAction 新增 analyzeStyle |
| `src/lib/ai/style-presets.ts` | 预设名家库常量（8 位作家风格描述） |
| `src/lib/ai/style.ts` | StyleProfile 类型 + buildStyleDirective() + buildSystemBase() |
| `src/lib/ai/prompts.ts` | 所有 prompt 函数增加 styleProfile 参数；新增 analyzeStylePrompt |
| `src/app/api/ai/generate/route.ts` | 新增 analyzeStyle handler；项目级 action 读取 styleProfile |
| `src/actions/project.ts` | 新增 updateStyleProfileAction + createProjectAction 支持 styleProfile |
| `src/components/style/style-picker.tsx` | 风格选择组件（预设卡片 + 自定义上传 + 强度选择） |
| `src/components/projects/projects-client.tsx` | 项目创建对话框集成风格选择 |
| `src/components/project-workspace.tsx` | 项目头部显示风格 + 更换/清除入口 |

---

### Task 1: 数据库 schema 变更

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 在 Project model 新增 styleProfile 字段**

在 `prisma/schema.prisma` 的 `model Project` 中，在 `synopsis` 字段下方添加：

```prisma
  styleProfile   Json?
```

- [ ] **Step 2: 在 AIAction enum 新增 analyzeStyle**

在 `enum AIAction` 的最后一个值后面添加 `analyzeStyle`：

```prisma
enum AIAction {
  inspire
  worldbuild
  character
  outline
  expand
  polish
  inline
  chat
  consistency
  extract
  summary
  analyzeStyle
}
```

- [ ] **Step 3: 生成 Prisma client**

Run: `npx prisma generate`
Expected: 输出 `Generated Prisma Client` 无错误

- [ ] **Step 4: 创建迁移文件**

手动创建迁移 SQL 文件 `prisma/migrations/20260803000001_add_style_profile/migration.sql`：

```sql
-- AlterTable
ALTER TABLE "Project" ADD COLUMN "styleProfile" JSONB;

-- AlterEnum
ALTER TYPE "AIAction" ADD VALUE 'analyzeStyle';
```

- [ ] **Step 5: 执行迁移**

Run: `npx prisma migrate deploy`
Expected: 输出 `Applied migration` 无错误

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260803000001_add_style_profile/
git commit -m "feat: add styleProfile to Project and analyzeStyle to AIAction"
```

---

### Task 2: 预设名家库

**Files:**
- Create: `src/lib/ai/style-presets.ts`

- [ ] **Step 1: 创建 style-presets.ts**

```typescript
/**
 * 预设名家风格库。
 * 每位作家的 description 为 200-300 字文笔风格特征描述，
 * 涵盖语言节奏、句式偏好、对话风格、画面感、情感处理、意象偏好等维度。
 */

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  genres: string[];
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "mao-ni",
    name: "猫腻",
    genres: ["玄幻", "武侠", "权谋"],
    description:
      "文风沉稳大气，善于以平淡笔触写惊雷。长句铺陈见功力，叙事节奏不疾不徐却暗流涌动。对话含蓄机锋，常以看似随意的闲谈传递关键信息或表达人物立场。善用文言意象与古典修辞点缀，画面感极强，擅长以环境描写烘托人物心境与局势张力。情感处理克制内敛，不轻易直抒胸臆，而是通过细节与留白让读者自行体会。角色塑造注重内心独白与思想交锋，常以哲理性思辨赋予人物深度。",
  },
  {
    id: "tiancan-tudou",
    name: "天蚕土豆",
    genres: ["玄幻", "热血"],
    description:
      "文风爽快凌厉，节奏紧凑明快，擅长以短句和对话推进剧情。叙事直白有力，不拖泥带水，情节环环相扣，高潮迭起。对话热血激昂，常带霸气宣言与气势对峙。善用重复与排比增强气势，战斗描写拳拳到肉、招式华丽。画面感偏漫画式，视觉冲击力强。情感表达直接外放，喜怒哀乐毫不掩饰。角色塑造突出个性标签，配角形象鲜明易记。擅长在危机中制造反转，让主角绝境逢生。",
  },
  {
    id: "fenghuo",
    name: "烽火戏诸侯",
    genres: ["武侠", "都市"],
    description:
      "文风桀骜不羁，兼具古典韵味与现代锐感。语言凝练有力，短句如刀，长句如江河奔涌。善用冷峻白描与黑色幽默，在嬉笑怒骂间写尽江湖险恶与人间冷暖。对话精炼且极具个性，三言两语勾勒人物风骨。画面感如泼墨山水，意境苍凉辽阔。情感处理深沉厚重，以克制写深情，以洒脱写悲凉。擅长群像刻画，每个角色都有独属于自己的人生底色与命运轨迹。",
  },
  {
    id: "chen-dong",
    name: "辰东",
    genres: ["玄幻", "仙侠"],
    description:
      "文风苍茫雄浑，气势磅礴，擅长宏大叙事与史诗感营造。语言古朴厚重，常引经据典，善用四字格与文言句式。叙事节奏大开大合，善以大跨度时间与空间推进展现历史纵深。对话庄重肃穆，带神话色彩。画面感如远古壁画，苍凉壮美。情感处理含蓄深沉，以宿命感与孤独感贯穿始终。角色塑造突出神性与人性冲突，主角常背负使命与诅咒。擅长伏笔千里、前后呼应的长线布局。",
  },
  {
    id: "wang-yu",
    name: "忘语",
    genres: ["仙侠"],
    description:
      "文风朴素扎实，叙事稳健，如老僧念经般娓娓道来。语言简洁务实，不事雕琢，以白描为主，偶有精彩比喻点缀。节奏均匀，注重修炼细节与实力提升的阶段性描写。对话简洁理性，符合修仙者心境超然的特质。画面感偏写实，注重法术效果与战斗逻辑的严谨性。情感处理极为克制，主角冷静理智，少有冲动之时。角色塑造注重心性与境界变化，成长线清晰可信。",
  },
  {
    id: "fanqie",
    name: "番茄",
    genres: ["都市", "系统"],
    description:
      "文风轻松诙谐，节奏轻快，极具网感。语言口语化、接地气，善用网络梗与流行语。叙事以第一人称或贴近第一人称的限知视角为主，代入感极强。对话幽默风趣，常带自嘲与吐槽。画面感偏日常生活化，细节真实可感。情感表达直率真诚，不做作。角色塑造注重人物反差萌与性格成长。擅长系统流设定，数值与升级体系清晰，爽点密集，节奏明快不拖沓。",
  },
  {
    id: "er-gen",
    name: "耳根",
    genres: ["仙侠"],
    description:
      "文风深沉悲怆，带有浓厚的宿命感与孤独感。语言苍凉古朴，善用排比与反复咏叹，形成独特的韵律美。叙事节奏舒缓而有力，善于在平淡日常中积蓄情感力量。对话简练而意味深长，常带禅意与哲思。画面感如水墨长卷，意境悠远。情感处理深沉内敛，以执着与遗憾为主题，擅长写离别与守候。角色塑造突出执念与选择，主角常在道德与情感间挣扎。",
  },
  {
    id: "tang-jia",
    name: "唐家三少",
    genres: ["玄幻", "青春"],
    description:
      "文风温暖明亮，节奏轻快流畅，语言简洁易懂。叙事以情感驱动为主线，注重人物间的情感羁绊与成长历程。对话活泼自然，富有青春气息，角色互动趣味性强。画面感明亮，战斗描写华丽而不血腥。情感表达真挚热烈，友情、爱情、亲情并重。角色塑造注重团队协作与伙伴情谊，主角性格阳光坚韧。擅长多线叙事与伏笔布局，情节推进有条不紊，适合长篇连载。",
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/ai/style-presets.ts
git commit -m "feat: add 8 preset author style profiles"
```

---

### Task 3: 风格类型与注入工具

**Files:**
- Create: `src/lib/ai/style.ts`

- [ ] **Step 1: 创建 style.ts**

```typescript
/**
 * 风格档案类型定义与 Prompt 注入工具。
 */

export interface StyleProfile {
  type: "preset" | "custom";
  name: string;
  description: string;
  sampleText?: string;
  intensity: "low" | "medium" | "high";
  analyzedAt?: string;
}

const SYS_BASE =
  "你是一位专业的小说创作助手，擅长中文小说创作，文笔细腻、人物鲜活、情节紧凑。严格遵守用户的世界观与角色设定，保持长篇一致性。";

const INTENSITY_MAP: Record<StyleProfile["intensity"], string> = {
  low: "可适当参考以下作家的文笔风格",
  medium: "请模仿以下作家的文笔风格进行创作",
  high: "请严格模仿以下作家的文笔风格，使文本风格高度一致",
};

/**
 * 根据风格档案生成注入到 system message 的风格指令文本。
 * 无风格时返回空字符串。
 */
export function buildStyleDirective(profile: StyleProfile | null | undefined): string {
  if (!profile?.description) return "";
  return `${INTENSITY_MAP[profile.intensity]}：\n${profile.description}`;
}

/**
 * 构建 system message 的基础部分。
 * 有风格档案时在末尾追加【风格要求】段，无风格时返回 SYS_BASE 原文。
 */
export function buildSystemBase(styleProfile?: StyleProfile | null): string {
  const directive = buildStyleDirective(styleProfile);
  if (!directive) return SYS_BASE;
  return `${SYS_BASE}\n\n【风格要求】\n${directive}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/ai/style.ts
git commit -m "feat: add StyleProfile type and buildSystemBase injection utility"
```

---

### Task 4: 修改 prompts.ts — 所有 prompt 函数增加 styleProfile 参数

**Files:**
- Modify: `src/lib/ai/prompts.ts`

- [ ] **Step 1: 添加 import 并移除旧的 SYS_BASE 常量**

在文件顶部 import 区添加：

```typescript
import { buildSystemBase } from "./style";
import type { StyleProfile } from "./style";
```

删除文件中的 `const SYS_BASE = "你是一位专业的小说创作助手..."` 常量声明（第 75-76 行），因为已移入 `style.ts`。

- [ ] **Step 2: 修改 inspirePrompt**

将函数签名和 system content 改为：

```typescript
export function inspirePrompt(
  idea: string,
  genre: string,
  styleProfile?: StyleProfile | null
): AIMessage[] {
  return [
    {
      role: "system",
      content: `${buildSystemBase(styleProfile)}\n你现在的任务是生成灵感卡，帮助用户从一句话点子扩展成可落地的故事雏形。`,
    },
    {
      role: "user",
      content: `用户的一句话点子：${idea}\n题材：${genre}\n\n请生成 3 张灵感卡，每张包含：故事内核（一句话）、核心冲突、目标读者、情绪基调、参考作品。严格用如下 JSON 数组格式输出，不要任何额外文字：\n\n[{"core":"故事内核","conflict":"核心冲突","audience":"目标读者","mood":"情绪基调","reference":"类似作品参考"}]`,
    },
  ];
}
```

- [ ] **Step 3: 修改 worldbuildPrompt**

```typescript
export function worldbuildPrompt(
  inspiration: string,
  genre: string,
  existingSettings?: KnowledgeContext,
  styleProfile?: StyleProfile | null
): AIMessage[] {
  return [
    {
      role: "system",
      content: `${buildSystemBase(styleProfile)}\n你现在的任务是构建小说世界观，需要结构化、可扩展、自洽。`,
    },
    {
      role: "user",
      content: `灵感来源：${inspiration}\n题材：${genre}\n${existingSettings ? `\n已有设定：\n${formatKnowledge(existingSettings)}\n` : ""}\n请生成完整的世界观框架，包含：时代背景、地理设定、社会规则、力量体系（修仙等级/科技水平/魔法体系等）、核心矛盾。每个部分要具体、有特色、能服务于剧情。\n\n用 JSON 对象输出：\n{"background":"时代背景","geography":"地理设定","rules":"社会规则","system":"力量体系","conflict":"核心矛盾"}`,
    },
  ];
}
```

- [ ] **Step 4: 修改 characterPrompt**

```typescript
export function characterPrompt(
  worldSummary: string,
  genre: string,
  existingCharacters?: KnowledgeContext,
  styleProfile?: StyleProfile | null
): AIMessage[] {
  return [
    {
      role: "system",
      content: `${buildSystemBase(styleProfile)}\n你现在的任务是创建立体的角色，每个角色都要有内在矛盾与成长弧光。`,
    },
    {
      role: "user",
      content: `世界观：${worldSummary}\n题材：${genre}\n${existingCharacters ? `\n已有角色：\n${formatKnowledge(existingCharacters)}\n` : ""}\n\n请生成主角 1 名 + 核心配角 3-4 名，每名角色包含：姓名、角色定位、外貌、性格、背景故事、核心动机、人物弧光。\n\n角色定位字段 role 必须是以下英文枚举值之一：\n- PROTAGONIST（主角/男主/女主）\n- SUPPORTING（配角）\n- ANTAGONIST（反派）\n- EXTRA（路人）\n\n用 JSON 数组输出，不要任何额外文字：\n[{"name":"姓名","role":"PROTAGONIST","appearance":"外貌","personality":"性格","background":"背景","motivation":"动机","arc":"人物弧光"}]`,
    },
  ];
}
```

- [ ] **Step 5: 修改 outlinePrompt**

```typescript
export function outlinePrompt(
  worldSummary: string,
  characterSummary: string,
  genre: string,
  template: string = "三幕式",
  styleProfile?: StyleProfile | null
): AIMessage[] {
  return [
    {
      role: "system",
      content: `${buildSystemBase(styleProfile)}\n你现在的任务是生成结构化大纲，遵循${template}结构，卷→章。`,
    },
    {
      role: "user",
      content: `世界观：${worldSummary}\n角色：${characterSummary}\n题材：${genre}\n大纲模板：${template}\n\n请生成第一卷的大纲（约 8-12 章），每章输出一个对象。每章包含：章节标题、章节摘要、视角角色、核心情节点（2-4 个，放在 plotPoints 数组里）、伏笔或回收。\n\n重要：每章只输出一个对象，不要为同一章生成多个对象。情节点放在 plotPoints 数组里，不要拆成多个章节对象。\n\n用 JSON 数组输出，不要任何额外文字：\n[{"volume":1,"chapter":1,"sceneTitle":"章节标题","sceneSummary":"章节摘要","povCharacter":"视角角色名","plotPoints":["情节点1","情节点2"],"foreshadowing":"伏笔或回收"}]`,
    },
  ];
}
```

- [ ] **Step 6: 修改 expandPrompt**

```typescript
export function expandPrompt(
  instruction: string,
  ctx: KnowledgeContext | undefined,
  styleProfile?: StyleProfile | null
): AIMessage[] {
  return [
    {
      role: "system",
      content: `${buildSystemBase(styleProfile)}\n你现在的任务是按大纲扩写章节正文。要求：\n1. 字数充实，至少 2000 字\n2. 场景描写具体，避免空洞叙述\n3. 对话自然，符合角色性格\n4. 严格遵循大纲的情节点推进\n5. 与前文风格保持一致\n6. 不要写"第X章"标题、不要分章节小标题`,
    },
    {
      role: "user",
      content: `${ctx ? `【知识库上下文】\n${formatKnowledge(ctx)}\n\n` : ""}【写作指令】\n${instruction}\n\n请直接输出正文，不要任何解释或前言。`,
    },
  ];
}
```

- [ ] **Step 7: 修改 polishPrompt**

```typescript
export function polishPrompt(
  text: string,
  style: "文笔提升" | "对话优化" | "节奏调整" | "环境描写" = "文笔提升",
  styleProfile?: StyleProfile | null
): AIMessage[] {
  return [
    {
      role: "system",
      content: `${buildSystemBase(styleProfile)}\n你现在的任务是润色文本，方向：${style}。保留原意，提升表达质量，不改变情节。`,
    },
    {
      role: "user",
      content: `待润色文本：\n${text}\n\n请直接输出润色后的完整文本，不要任何解释。`,
    },
  ];
}
```

- [ ] **Step 8: 修改 inlineAIPrompt**

```typescript
export function inlineAIPrompt(
  selectedText: string,
  action: "续写" | "扩写" | "润色" | "改写" | "压缩" | "古文风格",
  context?: string,
  styleProfile?: StyleProfile | null
): AIMessage[] {
  const actionMap: Record<string, string> = {
    续写: "请基于选中文字续写 200-400 字，保持风格一致",
    扩写: "请将选中文字扩写为更详细的段落，约 400-600 字",
    润色: "请润色选中文字，提升文笔，保留原意",
    改写: "请改写选中文字，换一种表达方式，保留原意",
    压缩: "请压缩选中文字，保留核心信息，约为原文一半长度",
    古文风格: "请将选中文字改写为古文风格",
  };
  return [
    {
      role: "system",
      content: buildSystemBase(styleProfile),
    },
    {
      role: "user",
      content: `${context ? `上下文：\n${context}\n\n` : ""}选中文字：\n${selectedText}\n\n${actionMap[action]}。直接输出结果，不要解释。`,
    },
  ];
}
```

- [ ] **Step 9: 修改 chatCoCreatePrompt**

在函数签名末尾添加 `styleProfile?: StyleProfile | null` 参数，并将 systemContent 中的 `SYS_BASE` 替换为 `buildSystemBase(styleProfile)`：

```typescript
export function chatCoCreatePrompt(
  storySoFar: string,
  userMessage: string,
  ctx?: KnowledgeContext,
  styleProfile?: StyleProfile | null
): AIMessage[] {
  const isOpeningPhase = !storySoFar || storySoFar.trim().length === 0;

  const systemContent = `${buildSystemBase(styleProfile)}\n${isOpeningPhase
    ? `你现在是创作引导助手。当故事尚未开始时，你的工作是：
1. 用一两句话打招呼，并引导用户开始创作
2. 提供 3-4 个常见的创作方向选项，让用户可以快速选择
3. 不要直接写任何故事情节，等用户选择或输入后再开始叙事
4. 友好、简洁，不要长篇大论`
    : `你是一位富有创意的说书人，正在与用户轮流讲述一个故事。
规则：
1. 用户描述故事走向，你以叙述者身份接龙推进
2. 每次接龙 200-400 字，保持故事连贯
3. 适度加入意外转折，增加故事趣味
4. 可以扮演故事中的角色对话
5. 在关键情节点必须给出 2-3 个走向选项让用户选择
6. 严格遵守已建立的世界观与角色设定`}`;

  // userContent 部分不变，保持原有逻辑
  const userContent = isOpeningPhase
    ? `${ctx ? `【已建立设定】\n${formatKnowledge(ctx)}\n\n` : ""}【用户输入】\n${userMessage}\n\n请用 1-2 句话友好回应，并按以下格式提供 3-4 个创作方向选项：\n\n【选项】\nA. 我想写：<一句话题材或类型>\nB. 我想写：<一句话题材或类型>\nC. 我想写：<一句话题材或类型>\nD. 我想写：<一句话题材或类型>（可选）\n\n每个选项是不同类型的创作方向（如：都市言情、悬疑推理、玄幻仙侠、科幻未来、历史穿越、校园青春、恐怖灵异、冒险探险等），用 "我想写：" 开头。`
    : `${ctx ? `【已建立设定】\n${formatKnowledge(ctx)}\n\n` : ""}${storySoFar ? `【故事进展】\n${storySoFar}\n\n` : ""}【用户输入】\n${userMessage}\n\n请继续这个故事。\n\n【输出要求】\n直接输出你的接龙内容。在关键情节点（角色面临选择、剧情出现分支、对手出现/退场、关键决定等）必须在末尾用【选项】标记给出 2-3 个选项：\n\n【选项】\nA. 选项一\nB. 选项二\nC. 选项三\n\n每个选项 5-20 字，描述具体动作或方向，必须互斥。`;

  return [
    { role: "system", content: systemContent },
    { role: "user", content: userContent },
  ];
}
```

- [ ] **Step 10: 修改 consistencyCheckPrompt**

```typescript
export function consistencyCheckPrompt(
  chapterContent: string,
  ctx: KnowledgeContext,
  styleProfile?: StyleProfile | null
): AIMessage[] {
  return [
    {
      role: "system",
      content: `${buildSystemBase(styleProfile)}\n你现在的任务是做一致性检查，扫描章节正文，找出与世界观/角色设定矛盾的地方。`,
    },
    {
      role: "user",
      content: `【知识库设定】\n${formatKnowledge(ctx)}\n\n【待检查章节】\n${chapterContent}\n\n请检查正文与设定是否矛盾，输出 JSON 数组：\n[{"quote":"原文引用","conflict":"矛盾说明","suggestion":"修改建议"}]\n\n如无矛盾，输出空数组 []。`,
    },
  ];
}
```

- [ ] **Step 11: 修改 extractCardsPrompt**

```typescript
export function extractCardsPrompt(
  dialogue: string,
  styleProfile?: StyleProfile | null
): AIMessage[] {
  return [
    {
      role: "system",
      content: `${buildSystemBase(styleProfile)}\n你现在的任务是从对话中提取世界观设定与角色信息，结构化为知识卡。`,
    },
    {
      role: "user",
      content: `对话内容：\n${dialogue}\n\n请提取所有出现的世界观设定和角色信息，输出 JSON：\n{"worldSettings":[{"title":"标题","category":"BACKGROUND|GEOGRAPHY|RULE|SYSTEM|OTHER","content":"内容"}],"characters":[{"name":"姓名","role":"PROTAGONIST|SUPPORTING|ANTAGONIST|EXTRA","appearance":"外貌","personality":"性格","background":"背景","motivation":"动机"}]}\n\n没有则对应字段输出空数组。`,
    },
  ];
}
```

- [ ] **Step 12: 修改 summaryPrompt**

```typescript
export function summaryPrompt(
  chapterContent: string,
  styleProfile?: StyleProfile | null
): AIMessage[] {
  return [
    {
      role: "system",
      content: `${buildSystemBase(styleProfile)}\n你现在的任务是为章节生成 200 字左右的摘要，用于后续章节的上下文检索。`,
    },
    {
      role: "user",
      content: `章节正文：\n${chapterContent}\n\n请输出 200 字以内的摘要，包含主要事件、角色动作、关键转折。`,
    },
  ];
}
```

- [ ] **Step 13: 新增 analyzeStylePrompt**

在文件末尾添加：

```typescript
// ============ 风格分析 ============

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

- [ ] **Step 14: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 15: Commit**

```bash
git add src/lib/ai/prompts.ts
git commit -m "feat: add styleProfile param to all prompt functions + analyzeStylePrompt"
```

---

### Task 5: 修改 route.ts — 新增 analyzeStyle handler + 项目级 action 读取 styleProfile

**Files:**
- Modify: `src/app/api/ai/generate/route.ts`

- [ ] **Step 1: 添加 import**

在文件顶部的 import 区添加：

```typescript
import { analyzeStylePrompt } from "@/lib/ai/prompts";
import type { StyleProfile } from "@/lib/ai/style";
```

- [ ] **Step 2: 修改 inspire handler — 从 payload 读取 styleProfile**

```typescript
  async inspire({ payload }) {
    const idea = String(payload.idea || "");
    const genre = String(payload.genre || "都市");
    if (!idea) throw new Error("缺少 idea");
    const styleProfile = (payload.styleProfile as StyleProfile | null) ?? null;
    return inspirePrompt(idea, genre, styleProfile);
  },
```

- [ ] **Step 3: 修改 worldbuild handler**

```typescript
  async worldbuild({ payload }) {
    const inspiration = String(payload.inspiration || "");
    const genre = String(payload.genre || "都市");
    const styleProfile = (payload.styleProfile as StyleProfile | null) ?? null;
    return worldbuildPrompt(inspiration, genre, undefined, styleProfile);
  },
```

- [ ] **Step 4: 修改 character handler**

```typescript
  async character({ payload }) {
    const worldSummary = String(payload.worldSummary || "");
    const genre = String(payload.genre || "都市");
    const styleProfile = (payload.styleProfile as StyleProfile | null) ?? null;
    return characterPrompt(worldSummary, genre, undefined, styleProfile);
  },
```

- [ ] **Step 5: 修改 outline handler**

```typescript
  async outline({ payload }) {
    const worldSummary = String(payload.worldSummary || "");
    const characterSummary = String(payload.characterSummary || "");
    const genre = String(payload.genre || "都市");
    const template = String(payload.template || "三幕式");
    const styleProfile = (payload.styleProfile as StyleProfile | null) ?? null;
    return outlinePrompt(worldSummary, characterSummary, genre, template, styleProfile);
  },
```

- [ ] **Step 6: 修改 expand handler — 从数据库读取 styleProfile**

```typescript
  async expand({ projectId, payload }) {
    if (!projectId) throw new Error("缺少 projectId");
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { styleProfile: true },
    });
    const outlineId = payload.outlineId ? String(payload.outlineId) : undefined;
    const instruction = String(payload.instruction || "请按大纲扩写本章");
    const ctx = await buildChapterContext({ projectId, currentOutlineId: outlineId });
    const styleProfile = (project?.styleProfile as StyleProfile | null) ?? null;
    return expandPrompt(instruction, ctx, styleProfile);
  },
```

- [ ] **Step 7: 修改 polish handler**

```typescript
  async polish({ projectId, payload }) {
    const text = String(payload.text || "");
    if (!text) throw new Error("缺少 text");
    const style = (payload.style as "文笔提升" | "对话优化" | "节奏调整" | "环境描写") || "文笔提升";
    let styleProfile: StyleProfile | null = null;
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { styleProfile: true },
      });
      styleProfile = (project?.styleProfile as StyleProfile | null) ?? null;
    }
    return polishPrompt(text, style, styleProfile);
  },
```

- [ ] **Step 8: 修改 inline handler — 从数据库读取 styleProfile**

```typescript
  async inline({ projectId, payload }) {
    const selectedText = String(payload.selectedText || "");
    const act = payload.action as "续写" | "扩写" | "润色" | "改写" | "压缩" | "古文风格";
    const context = payload.context ? String(payload.context) : undefined;
    if (!selectedText || !act) throw new Error("缺少 selectedText 或 action");
    let styleProfile: StyleProfile | null = null;
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { styleProfile: true },
      });
      styleProfile = (project?.styleProfile as StyleProfile | null) ?? null;
    }
    return inlineAIPrompt(selectedText, act, context, styleProfile);
  },
```

- [ ] **Step 9: 修改 chat handler**

```typescript
  async chat({ projectId, payload }) {
    if (!projectId) throw new Error("缺少 projectId");
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { styleProfile: true },
    });
    const storySoFar = String(payload.storySoFar || "");
    const userMessage = String(payload.userMessage || "");
    if (!userMessage) throw new Error("缺少 userMessage");
    const ctx = await buildChapterContext({ projectId });
    const styleProfile = (project?.styleProfile as StyleProfile | null) ?? null;
    return chatCoCreatePrompt(storySoFar, userMessage, ctx, styleProfile);
  },
```

- [ ] **Step 10: 修改 consistency handler**

```typescript
  async consistency({ projectId, payload }) {
    if (!projectId) throw new Error("缺少 projectId");
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { styleProfile: true },
    });
    const chapterContent = String(payload.chapterContent || "");
    if (!chapterContent) throw new Error("缺少 chapterContent");
    const ctx = await buildChapterContext({ projectId });
    const styleProfile = (project?.styleProfile as StyleProfile | null) ?? null;
    return consistencyCheckPrompt(chapterContent, ctx, styleProfile);
  },
```

- [ ] **Step 11: 修改 extract handler — 从数据库读取 styleProfile（如有 projectId）**

```typescript
  async extract({ projectId, payload }) {
    const dialogue = String(payload.dialogue || "");
    if (!dialogue) throw new Error("缺少 dialogue");
    let styleProfile: StyleProfile | null = null;
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { styleProfile: true },
      });
      styleProfile = (project?.styleProfile as StyleProfile | null) ?? null;
    }
    return extractCardsPrompt(dialogue, styleProfile);
  },
```

- [ ] **Step 12: 修改 summary handler**

```typescript
  async summary({ projectId, payload }) {
    const chapterContent = String(payload.chapterContent || "");
    if (!chapterContent) throw new Error("缺少 chapterContent");
    let styleProfile: StyleProfile | null = null;
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { styleProfile: true },
      });
      styleProfile = (project?.styleProfile as StyleProfile | null) ?? null;
    }
    return summaryPrompt(chapterContent, styleProfile);
  },
```

- [ ] **Step 13: 新增 analyzeStyle handler**

在 `actionHandlers` 对象末尾（`summary` handler 之后）添加：

```typescript
  async analyzeStyle({ payload }) {
    const sampleText = String(payload.sampleText || "");
    if (!sampleText || sampleText.length < 100) throw new Error("样本文本过短，至少需要 100 字");
    if (sampleText.length > 10000) throw new Error("样本文本过长，最多 10000 字");
    return analyzeStylePrompt(sampleText);
  },
```

- [ ] **Step 14: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 15: Commit**

```bash
git add src/app/api/ai/generate/route.ts
git commit -m "feat: wire styleProfile into all action handlers + add analyzeStyle"
```

---

### Task 6: Server Action — updateStyleProfileAction + createProjectAction 支持 styleProfile

**Files:**
- Modify: `src/actions/project.ts`

- [ ] **Step 1: 添加 import**

在文件顶部 import 区添加：

```typescript
import type { StyleProfile } from "@/lib/ai/style";
```

- [ ] **Step 2: 修改 createProjectAction — 支持 styleProfile**

在 `createSchema` 中添加 `styleProfile` 字段（可选，接受原始对象）：

```typescript
const createSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(80, "标题最多 80 字"),
  genre: z.string().min(1),
  mode: z.enum(["PIPELINE", "WORKBENCH", "CHAT"]),
  synopsis: z.string().optional(),
  styleProfile: z.any().optional(),
});
```

在 `prisma.project.create` 的 `data` 中添加 `styleProfile` 字段：

```typescript
  const project = await prisma.project.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      genre: parsed.data.genre,
      mode: parsed.data.mode,
      synopsis: parsed.data.synopsis || null,
      styleProfile: parsed.data.styleProfile ?? null,
    },
  });
```

同时在 `createProjectAction` 中从 formData 读取 styleProfile：

```typescript
  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    genre: formData.get("genre"),
    mode: formData.get("mode"),
    synopsis: formData.get("synopsis") || undefined,
    styleProfile: formData.get("styleProfile") ? JSON.parse(formData.get("styleProfile") as string) : undefined,
  });
```

- [ ] **Step 3: 新增 updateStyleProfileAction**

在文件末尾（`updateProjectSynopsisSelected` 之后）添加：

```typescript
export async function updateStyleProfileAction(
  projectId: string,
  profile: StyleProfile | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id, deletedAt: null },
  });
  if (!project) return { ok: false, error: "项目不存在或无权限" };

  await prisma.project.update({
    where: { id: projectId },
    data: { styleProfile: profile },
  });

  return { ok: true };
}
```

- [ ] **Step 4: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/actions/project.ts
git commit -m "feat: add updateStyleProfileAction + support styleProfile in createProject"
```

---

### Task 7: 前端 — 风格选择组件

**Files:**
- Create: `src/components/style/style-picker.tsx`

- [ ] **Step 1: 创建 style-picker.tsx**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { STYLE_PRESETS } from "@/lib/ai/style-presets";
import type { StyleProfile } from "@/lib/ai/style";
import { useAIStream } from "@/lib/ai/use-stream";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const INTENSITY_OPTIONS = [
  { value: "low" as const, label: "轻微" },
  { value: "medium" as const, label: "中等" },
  { value: "high" as const, label: "强烈" },
];

export interface StylePickerProps {
  /** 当前已选风格（null 表示未设置） */
  value: StyleProfile | null;
  /** 选择/清除回调，返回完整的 StyleProfile 或 null */
  onChange: (profile: StyleProfile | null) => void;
  /** 是否显示强度选择器，默认 true */
  showIntensity?: boolean;
}

export function StylePicker({ value, onChange, showIntensity = true }: StylePickerProps) {
  const [mode, setMode] = useState<"preset" | "custom" | null>(
    value ? (value.type === "preset" ? "preset" : "custom") : null
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    value?.type === "preset" ? STYLE_PRESETS.find((p) => p.name === value.name)?.id ?? null : null
  );
  const [intensity, setIntensity] = useState<StyleProfile["intensity"]>(value?.intensity ?? "medium");
  const [sampleText, setSampleText] = useState("");
  const [customName, setCustomName] = useState(value?.type === "custom" ? value.name : "");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");

  const { generate, isStreaming, text, stop } = useAIStream({
    onDone: (full) => {
      setAnalysisResult(full);
      setAnalyzing(false);
    },
    onError: (err) => {
      toast({ title: "分析失败", description: err, type: "error" });
      setAnalyzing(false);
    },
  });

  function handlePresetSelect(presetId: string) {
    setSelectedPresetId(presetId);
    const preset = STYLE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    onChange({
      type: "preset",
      name: preset.name,
      description: preset.description,
      intensity,
    });
  }

  function handleIntensityChange(level: StyleProfile["intensity"]) {
    setIntensity(level);
    if (value) {
      onChange({ ...value, intensity: level });
    }
  }

  function handleAnalyze() {
    if (sampleText.length < 100) {
      toast({ title: "样本过短", description: "至少需要 100 字", type: "warning" });
      return;
    }
    setAnalyzing(true);
    setAnalysisResult("");
    generate({ action: "analyzeStyle", payload: { sampleText } });
  }

  function handleConfirmCustom() {
    if (!analysisResult.trim()) {
      toast({ title: "请先分析样本", type: "warning" });
      return;
    }
    onChange({
      type: "custom",
      name: customName.trim() || "自定义风格",
      description: analysisResult,
      sampleText,
      intensity,
      analyzedAt: new Date().toISOString(),
    });
  }

  function handleClear() {
    onChange(null);
    setSelectedPresetId(null);
    setMode(null);
    setSampleText("");
    setAnalysisResult("");
    setCustomName("");
  }

  return (
    <div className="space-y-4">
      {/* 模式切换 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("preset")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs border transition-colors",
            mode === "preset"
              ? "border-neutral-900 bg-neutral-50 text-neutral-900 font-medium"
              : "border-neutral-200 text-muted-foreground hover:bg-neutral-50"
          )}
        >
          预设名家
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs border transition-colors",
            mode === "custom"
              ? "border-neutral-900 bg-neutral-50 text-neutral-900 font-medium"
              : "border-neutral-200 text-muted-foreground hover:bg-neutral-50"
          )}
        >
          自定义上传
        </button>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            清除风格
          </button>
        )}
      </div>

      {/* 预设名家卡片区 */}
      {mode === "preset" && (
        <div className="grid grid-cols-2 gap-2">
          {STYLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset.id)}
              className={cn(
                "text-left p-3 rounded-xl border transition-colors",
                selectedPresetId === preset.id
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-200 hover:bg-neutral-50"
              )}
            >
              <div className="text-sm font-medium text-neutral-900">{preset.name}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {preset.genres.map((g) => (
                  <span key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500">
                    {g}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 自定义上传区 */}
      {mode === "custom" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">风格名称（可选）</Label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="如：某作家风格"
              maxLength={20}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-400"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">文本样本（100-10000 字）</Label>
            <Textarea
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              placeholder="粘贴你想模仿的作家文本片段..."
              rows={6}
              maxLength={10000}
            />
            <div className="text-xs text-muted-foreground text-right">{sampleText.length} / 10000</div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              disabled={analyzing || sampleText.length < 100}
              className="border-neutral-200 hover:bg-neutral-50"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  分析中...
                </>
              ) : (
                "AI 分析风格"
              )}
            </Button>
            {analyzing && (
              <Button type="button" variant="ghost" size="sm" onClick={stop}>
                停止
              </Button>
            )}
          </div>
          {(analysisResult || isStreaming) && (
            <div className="space-y-1">
              <Label className="text-xs">分析结果（可编辑）</Label>
              <Textarea
                value={analysisResult}
                onChange={(e) => setAnalysisResult(e.target.value)}
                rows={5}
                placeholder="AI 分析的风格特征将显示在这里..."
              />
              {!analyzing && analysisResult && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmCustom}
                  className="bg-neutral-900 text-white hover:bg-neutral-800"
                >
                  确认使用此风格
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 强度选择 */}
      {showIntensity && value && (
        <div className="space-y-1">
          <Label className="text-xs">模仿强度</Label>
          <div className="flex gap-2">
            {INTENSITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleIntensityChange(opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                  intensity === opt.value
                    ? "border-neutral-900 bg-neutral-50 text-neutral-900 font-medium"
                    : "border-neutral-200 text-muted-foreground hover:bg-neutral-50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 当前风格摘要 */}
      {value && (
        <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-neutral-900">{value.name}</span>
            <span className="px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-500">
              {value.type === "preset" ? "预设" : "自定义"}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-500">
              {INTENSITY_OPTIONS.find((o) => o.value === value.intensity)?.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{value.description}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 验证 useAIStream hook 的接口**

检查 `src/lib/ai/use-stream.ts` 的 `useAIStream` 返回值是否包含 `generate`、`isStreaming`、`text`、`stop` 以及 `onDone`/`onError` 回调。如果接口名称不同，调整 StylePicker 中的调用。

Run: 搜索 `export function useAIStream` 或 `export const useAIStream` 确认接口签名。

- [ ] **Step 3: Commit**

```bash
git add src/components/style/style-picker.tsx
git commit -m "feat: create StylePicker component with preset + custom upload"
```

---

### Task 8: 前端 — 项目创建对话框集成风格选择

**Files:**
- Modify: `src/components/projects/projects-client.tsx`

- [ ] **Step 1: 添加 import**

在文件顶部添加：

```typescript
import { StylePicker } from "@/components/style/style-picker";
import type { StyleProfile } from "@/lib/ai/style";
```

- [ ] **Step 2: 添加风格状态**

在 `projects-client.tsx` 的 `handleCreate` 函数上方，`synopsis` state 之后添加：

```typescript
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
```

- [ ] **Step 3: 修改 handleCreate — 传递 styleProfile 到 FormData**

在 `handleCreate` 函数中，在 `fd.set("synopsis", synopsis)` 之后添加：

```typescript
    if (styleProfile) {
      fd.set("styleProfile", JSON.stringify(styleProfile));
    }
```

在创建成功后的 reset 逻辑中添加：

```typescript
    setStyleProfile(null);
```

- [ ] **Step 4: 在创建对话框表单中添加风格选择区**

在 `<DialogFooter>` 之前、`synopsis` 输入框之后添加：

```tsx
            <div className="space-y-2">
              <Label>写作风格（可选）</Label>
              <StylePicker value={styleProfile} onChange={setStyleProfile} />
            </div>
```

- [ ] **Step 5: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add src/components/projects/projects-client.tsx
git commit -m "feat: integrate style picker into project creation dialog"
```

---

### Task 9: 前端 — 项目工作台显示风格 + 更换/清除

**Files:**
- Modify: `src/components/project-workspace.tsx`

- [ ] **Step 1: 添加 import**

在文件顶部添加：

```typescript
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StylePicker } from "@/components/style/style-picker";
import { updateStyleProfileAction } from "@/actions/project";
import type { StyleProfile } from "@/lib/ai/style";
import { toast } from "@/components/ui/toast";
```

- [ ] **Step 2: 在 ProjectData 接口添加 styleProfile 字段**

在 `ProjectData` 接口的 `synopsis` 字段之后添加：

```typescript
  styleProfile: StyleProfile | null;
```

- [ ] **Step 3: 在组件内添加风格管理状态和弹窗**

在 `ProjectWorkspaceImpl` 组件中，`tipTapLoadedRef` 之后添加：

```typescript
  const [styleDialogOpen, setStyleDialogOpen] = useState(false);
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(
    (project.styleProfile as StyleProfile | null) ?? null
  );

  async function handleStyleChange(profile: StyleProfile | null) {
    setStyleProfile(profile);
    const res = await updateStyleProfileAction(project.id, profile);
    if (res.ok) {
      toast({ title: profile ? "风格已更新" : "风格已清除", type: "success" });
      setStyleDialogOpen(false);
    } else {
      toast({ title: "更新失败", description: res.error, type: "error" });
    }
  }
```

- [ ] **Step 4: 在流水线头部区域显示风格信息**

在流水线视图的头部 `<div>` 中（`project.title` 的 `<h1>` 下方的 `<p>` 之后），添加风格标签：

```tsx
              {styleProfile && (
                <button
                  onClick={() => setStyleDialogOpen(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 transition-colors text-xs"
                >
                  <span className="font-medium text-neutral-700">{styleProfile.name}</span>
                  <span className="text-neutral-400">
                    {styleProfile.intensity === "low" ? "轻微" : styleProfile.intensity === "medium" ? "中等" : "强烈"}
                  </span>
                  <span className="text-neutral-300">|</span>
                  <span className="text-neutral-400">更换</span>
                </button>
              )}
              {!styleProfile && (
                <button
                  onClick={() => setStyleDialogOpen(true)}
                  className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-md border border-neutral-200 hover:bg-neutral-50 transition-colors text-xs text-muted-foreground"
                >
                  + 设置写作风格
                </button>
              )}
```

- [ ] **Step 5: 在组件末尾添加风格选择弹窗**

在 `</div>` 闭合根标签之前添加：

```tsx
      {/* 风格选择弹窗 */}
      <Dialog open={styleDialogOpen} onOpenChange={setStyleDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>写作风格</DialogTitle>
          </DialogHeader>
          <StylePicker value={styleProfile} onChange={handleStyleChange} />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setStyleDialogOpen(false)}
              className="border-neutral-200 hover:bg-neutral-50"
            >
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
```

- [ ] **Step 6: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 7: Commit**

```bash
git add src/components/project-workspace.tsx
git commit -m "feat: show style badge in project header + style picker dialog"
```

---

### Task 10: 构建验证

- [ ] **Step 1: TypeScript 全量编译检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 2: 构建生产版**

Run: `npm run build`
Expected: 构建成功，无编译错误

- [ ] **Step 3: 启动生产服务并手动验证**

Run: `PORT=3001 npm run start`

验证清单：
1. 打开 `/projects`，点击"新建项目"，对话框中应出现"写作风格"选择区
2. 点击"预设名家"，应展示 8 位作家卡片
3. 选择一位作家（如"猫腻"），应显示风格摘要和强度选择
4. 创建项目，进入流水线视图，头部应显示风格标签
5. 点击风格标签，弹出风格选择弹窗，可更换或清除
6. 点击"自定义上传"，粘贴文本，点击"AI 分析风格"，应流式返回分析结果
7. 确认使用后，风格标签更新为自定义名称

- [ ] **Step 4: Commit 最终版本**

```bash
git add -A
git commit -m "feat: complete author style mimicry feature"
```
