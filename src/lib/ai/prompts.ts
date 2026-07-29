/**
 * Prompt 模板库。
 * 结构: [系统角色] + [知识库上下文] + [当前任务] + [用户指令] + [输出要求]
 */

import type { AIMessage } from "./provider";

export interface KnowledgeContext {
  worldSettings: Array<{ title: string; content: string; category: string }>;
  characters: Array<{
    name: string;
    role: string;
    appearance?: string;
    personality?: string;
    background?: string;
    motivation?: string;
  }>;
  recentChapters: Array<{ title: string; summary?: string; content?: string }>;
  currentOutline?: {
    sceneTitle: string;
    sceneSummary: string;
    plotPoints: string[];
  };
}

function formatKnowledge(ctx: KnowledgeContext | undefined): string {
  if (!ctx) return "";
  const parts: string[] = [];

  if (ctx.worldSettings.length > 0) {
    parts.push("## 世界观设定");
    for (const w of ctx.worldSettings) {
      parts.push(`### ${w.title}（${w.category}）\n${w.content}`);
    }
  }

  if (ctx.characters.length > 0) {
    parts.push("\n## 角色信息");
    for (const c of ctx.characters) {
      const lines = [`### ${c.name}（${c.role}）`];
      if (c.appearance) lines.push(`外貌：${c.appearance}`);
      if (c.personality) lines.push(`性格：${c.personality}`);
      if (c.background) lines.push(`背景：${c.background}`);
      if (c.motivation) lines.push(`动机：${c.motivation}`);
      parts.push(lines.join("\n"));
    }
  }

  if (ctx.recentChapters.length > 0) {
    parts.push("\n## 前文内容");
    for (const ch of ctx.recentChapters) {
      if (ch.content) {
        parts.push(`### ${ch.title}\n${ch.content}`);
      } else if (ch.summary) {
        parts.push(`### ${ch.title}（摘要）\n${ch.summary}`);
      }
    }
  }

  if (ctx.currentOutline) {
    parts.push("\n## 当前场景大纲");
    parts.push(`场景：${ctx.currentOutline.sceneTitle}`);
    parts.push(`摘要：${ctx.currentOutline.sceneSummary}`);
    if (ctx.currentOutline.plotPoints.length > 0) {
      parts.push("情节点：");
      ctx.currentOutline.plotPoints.forEach((p, i) =>
        parts.push(`  ${i + 1}. ${p}`)
      );
    }
  }

  return parts.join("\n\n");
}

const SYS_BASE =
  "你是一位专业的小说创作助手，擅长中文小说创作，文笔细腻、人物鲜活、情节紧凑。严格遵守用户的世界观与角色设定，保持长篇一致性。";

// ============ 灵感卡 ============

export function inspirePrompt(idea: string, genre: string): AIMessage[] {
  return [
    {
      role: "system",
      content: `${SYS_BASE}\n你现在的任务是生成灵感卡，帮助用户从一句话点子扩展成可落地的故事雏形。`,
    },
    {
      role: "user",
      content: `用户的一句话点子：${idea}\n题材：${genre}\n\n请生成 3 张灵感卡，每张包含：故事内核（一句话）、核心冲突、目标读者、情绪基调、参考作品。严格用如下 JSON 数组格式输出，不要任何额外文字：\n\n[{"core":"故事内核","conflict":"核心冲突","audience":"目标读者","mood":"情绪基调","reference":"类似作品参考"}]`,
    },
  ];
}

// ============ 世界观 ============

export function worldbuildPrompt(
  inspiration: string,
  genre: string,
  existingSettings?: KnowledgeContext
): AIMessage[] {
  return [
    {
      role: "system",
      content: `${SYS_BASE}\n你现在的任务是构建小说世界观，需要结构化、可扩展、自洽。`,
    },
    {
      role: "user",
      content: `灵感来源：${inspiration}\n题材：${genre}\n${existingSettings ? `\n已有设定：\n${formatKnowledge(existingSettings)}\n` : ""}\n请生成完整的世界观框架，包含：时代背景、地理设定、社会规则、力量体系（修仙等级/科技水平/魔法体系等）、核心矛盾。每个部分要具体、有特色、能服务于剧情。\n\n用 JSON 对象输出：\n{"background":"时代背景","geography":"地理设定","rules":"社会规则","system":"力量体系","conflict":"核心矛盾"}`,
    },
  ];
}

// ============ 角色卡 ============

export function characterPrompt(
  worldSummary: string,
  genre: string,
  existingCharacters?: KnowledgeContext
): AIMessage[] {
  return [
    {
      role: "system",
      content: `${SYS_BASE}\n你现在的任务是创建立体的角色，每个角色都要有内在矛盾与成长弧光。`,
    },
    {
      role: "user",
      content: `世界观：${worldSummary}\n题材：${genre}\n${existingCharacters ? `\n已有角色：\n${formatKnowledge(existingCharacters)}\n` : ""}\n\n请生成主角 1 名 + 核心配角 3-4 名，每名角色包含：姓名、角色定位、外貌、性格、背景故事、核心动机、人物弧光。\n\n角色定位字段 role 必须是以下英文枚举值之一：\n- PROTAGONIST（主角/男主/女主）\n- SUPPORTING（配角）\n- ANTAGONIST（反派）\n- EXTRA（路人）\n\n用 JSON 数组输出，不要任何额外文字：\n[{"name":"姓名","role":"PROTAGONIST","appearance":"外貌","personality":"性格","background":"背景","motivation":"动机","arc":"人物弧光"}]`,
    },
  ];
}

// ============ 大纲 ============

export function outlinePrompt(
  worldSummary: string,
  characterSummary: string,
  genre: string,
  template: string = "三幕式"
): AIMessage[] {
  return [
    {
      role: "system",
      content: `${SYS_BASE}\n你现在的任务是生成结构化大纲，遵循${template}结构，卷→章。`,
    },
    {
      role: "user",
      content: `世界观：${worldSummary}\n角色：${characterSummary}\n题材：${genre}\n大纲模板：${template}\n\n请生成第一卷的大纲（约 8-12 章），每章输出一个对象。每章包含：章节标题、章节摘要、视角角色、核心情节点（2-4 个，放在 plotPoints 数组里）、伏笔或回收。\n\n重要：每章只输出一个对象，不要为同一章生成多个对象。情节点放在 plotPoints 数组里，不要拆成多个章节对象。\n\n用 JSON 数组输出，不要任何额外文字：\n[{"volume":1,"chapter":1,"sceneTitle":"章节标题","sceneSummary":"章节摘要","povCharacter":"视角角色名","plotPoints":["情节点1","情节点2"],"foreshadowing":"伏笔或回收"}]`,
    },
  ];
}

// ============ 章节扩写 ============

export function expandPrompt(
  instruction: string,
  ctx: KnowledgeContext | undefined
): AIMessage[] {
  return [
    {
      role: "system",
      content: `${SYS_BASE}\n你现在的任务是按大纲扩写章节正文。要求：\n1. 字数充实，至少 2000 字\n2. 场景描写具体，避免空洞叙述\n3. 对话自然，符合角色性格\n4. 严格遵循大纲的情节点推进\n5. 与前文风格保持一致\n6. 不要写"第X章"标题、不要分章节小标题`,
    },
    {
      role: "user",
      content: `${ctx ? `【知识库上下文】\n${formatKnowledge(ctx)}\n\n` : ""}【写作指令】\n${instruction}\n\n请直接输出正文，不要任何解释或前言。`,
    },
  ];
}

// ============ 润色 ============

export function polishPrompt(
  text: string,
  style: "文笔提升" | "对话优化" | "节奏调整" | "环境描写" = "文笔提升"
): AIMessage[] {
  return [
    {
      role: "system",
      content: `${SYS_BASE}\n你现在的任务是润色文本，方向：${style}。保留原意，提升表达质量，不改变情节。`,
    },
    {
      role: "user",
      content: `待润色文本：\n${text}\n\n请直接输出润色后的完整文本，不要任何解释。`,
    },
  ];
}

// ============ 行内 AI ============

export function inlineAIPrompt(
  selectedText: string,
  action: "续写" | "扩写" | "润色" | "改写" | "压缩" | "古文风格",
  context?: string
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
      content: SYS_BASE,
    },
    {
      role: "user",
      content: `${context ? `上下文：\n${context}\n\n` : ""}选中文字：\n${selectedText}\n\n${actionMap[action]}。直接输出结果，不要解释。`,
    },
  ];
}

// ============ 对话共创 ============

export function chatCoCreatePrompt(
  storySoFar: string,
  userMessage: string,
  ctx?: KnowledgeContext
): AIMessage[] {
  return [
    {
      role: "system",
      content: `${SYS_BASE}\n你现在的角色是叙事者，与用户交替推进故事。要求：\n1. 每次回复 200-400 字，不要写太长\n2. 推进情节，留出钩子让用户回应\n3. 严格遵守已建立的世界观与角色设定\n4. 不要替用户做决定，关键选择交给用户`,
    },
    {
      role: "user",
      content: `${ctx ? `【已建立设定】\n${formatKnowledge(ctx)}\n\n` : ""}【故事进展】\n${storySoFar}\n\n【用户输入】\n${userMessage}\n\n请以叙事者身份接龙推进故事。`,
    },
  ];
}

// ============ 一致性检查 ============

export function consistencyCheckPrompt(
  chapterContent: string,
  ctx: KnowledgeContext
): AIMessage[] {
  return [
    {
      role: "system",
      content: `${SYS_BASE}\n你现在的任务是做一致性检查，扫描章节正文，找出与世界观/角色设定矛盾的地方。`,
    },
    {
      role: "user",
      content: `【知识库设定】\n${formatKnowledge(ctx)}\n\n【待检查章节】\n${chapterContent}\n\n请检查正文与设定是否矛盾，输出 JSON 数组：\n[{"quote":"原文引用","conflict":"矛盾说明","suggestion":"修改建议"}]\n\n如无矛盾，输出空数组 []。`,
    },
  ];
}

// ============ 对话自动提取知识卡 ============

export function extractCardsPrompt(dialogue: string): AIMessage[] {
  return [
    {
      role: "system",
      content: `${SYS_BASE}\n你现在的任务是从对话中提取世界观设定与角色信息，结构化为知识卡。`,
    },
    {
      role: "user",
      content: `对话内容：\n${dialogue}\n\n请提取所有出现的世界观设定和角色信息，输出 JSON：\n{"worldSettings":[{"title":"标题","category":"BACKGROUND|GEOGRAPHY|RULE|SYSTEM|OTHER","content":"内容"}],"characters":[{"name":"姓名","role":"PROTAGONIST|SUPPORTING|ANTAGONIST|EXTRA","appearance":"外貌","personality":"性格","background":"背景","motivation":"动机"}]}\n\n没有则对应字段输出空数组。`,
    },
  ];
}

// ============ 章节摘要 ============

export function summaryPrompt(chapterContent: string): AIMessage[] {
  return [
    {
      role: "system",
      content: `${SYS_BASE}\n你现在的任务是为章节生成 200 字左右的摘要，用于后续章节的上下文检索。`,
    },
    {
      role: "user",
      content: `章节正文：\n${chapterContent}\n\n请输出 200 字以内的摘要，包含主要事件、角色动作、关键转折。`,
    },
  ];
}
