/**
 * Prompt 模板库。
 * 结构: [系统角色] + [知识库上下文] + [当前任务] + [用户指令] + [输出要求]
 */

import type { AIMessage } from "./provider";
import { buildSystemBase } from "./style";
import type { StyleProfile } from "./style";

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
    // 紧邻的上一章（idx === 0）单独提取"结尾 500 字"作为高亮块，确保 AI 必须从这里续写
    const lastChapter = ctx.recentChapters[0];
    if (lastChapter.content) {
      const tail = lastChapter.content.length > 500
        ? "…" + lastChapter.content.slice(-500)
        : lastChapter.content;
      parts.push("\n## ⚠️ 上一章结尾（必须从此处自然续写，开篇即承接此场景）");
      parts.push(`《${lastChapter.title}》末尾 500 字：\n${tail}`);
    }

    // 完整前文作为背景参考
    parts.push("\n## 前文内容（按时间顺序，最近的在前）");
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

// ============ 灵感卡 ============

export function inspirePrompt(idea: string, genre: string, styleProfile?: StyleProfile | null): AIMessage[] {
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

// ============ 世界观 ============

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

// ============ 角色卡 ============

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

// ============ 大纲 ============

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

// ============ 大纲续写（追加生成） ============

export function outlineAppendPrompt(
  worldSummary: string,
  characterSummary: string,
  genre: string,
  template: string,
  existingOutlines: Array<{
    chapter: number;
    sceneTitle: string;
    sceneSummary: string;
    povCharacter?: string;
    plotPoints?: string[];
    foreshadowing?: string;
  }>,
  styleProfile?: StyleProfile | null
): AIMessage[] {
  const lastChapter = existingOutlines.reduce((m, o) => Math.max(m, o.chapter), 0);
  // 完整展示已有大纲，含情节点和伏笔，让 AI 掌握完整剧情脉络
  const existingDetail = existingOutlines
    .map((o) => {
      const lines = [`第${o.chapter}章 ${o.sceneTitle}：${o.sceneSummary}`];
      if (o.povCharacter) lines.push(`  视角：${o.povCharacter}`);
      if (o.plotPoints && o.plotPoints.length > 0) {
        lines.push(`  情节点：${o.plotPoints.join("；")}`);
      }
      if (o.foreshadowing) lines.push(`  伏笔：${o.foreshadowing}`);
      return lines.join("\n");
    })
    .join("\n");
  // 单独提取最后一章的完整信息，要求 AI 必须从这里接着写
  const last = existingOutlines.find((o) => o.chapter === lastChapter);
  const lastDetail = last
    ? `最后一章（第${last.chapter}章 ${last.sceneTitle}）：\n  摘要：${last.sceneSummary}\n  情节点：${(last.plotPoints || []).join("；")}\n  伏笔：${last.foreshadowing || "无"}`
    : "";

  return [
    {
      role: "system",
      content: `${buildSystemBase(styleProfile)}\n你现在的任务是续写小说大纲，遵循${template}结构，卷→章。已有 ${existingOutlines.length} 章大纲，需要在此基础上继续推进剧情，必须与最后一章的情节自然衔接。`,
    },
    {
      role: "user",
      content: `世界观：${worldSummary}\n角色：${characterSummary}\n题材：${genre}\n大纲模板：${template}\n\n已有大纲（${existingOutlines.length} 章，含情节点和伏笔）：\n${existingDetail}\n\n${lastDetail}\n\n请紧接最后一章续写后续 6-8 章的大纲。要求：\n1. chapter 编号从 ${lastChapter + 1} 开始，连续递增\n2. 【关键】第一章续写必须直接承接最后一章的情节走向和未解决的冲突，不要重新开场或跳过时间线\n3. 回收已有伏笔或埋下新伏笔，保持剧情连贯\n4. 不要重复已有情节，推动故事向高潮发展\n5. 每章输出一个对象，包含：章节标题、章节摘要、视角角色、核心情节点（2-4 个）、伏笔或回收\n6. 每章只输出一个对象，情节点放在 plotPoints 数组里，不要拆成多个章节对象\n\n用 JSON 数组输出，不要任何额外文字：\n[{"volume":1,"chapter":${lastChapter + 1},"sceneTitle":"章节标题","sceneSummary":"章节摘要","povCharacter":"视角角色名","plotPoints":["情节点1","情节点2"],"foreshadowing":"伏笔或回收"}]`,
    },
  ];
}

// ============ 章节扩写 ============

export function expandPrompt(
  instruction: string,
  ctx: KnowledgeContext | undefined,
  styleProfile?: StyleProfile | null
): AIMessage[] {
  return [
    {
      role: "system",
      content: `${buildSystemBase(styleProfile)}\n你现在的任务是按大纲扩写章节正文。要求：\n1. 字数充实，至少 2000 字\n2. 场景描写具体，避免空洞叙述\n3. 对话自然，符合角色性格\n4. 严格遵循大纲的情节点推进\n5. 与前文风格保持一致\n6. 不要写"第X章"标题、不要分章节小标题\n7. 【关键】必须紧接上一章结尾自然续写，开篇即从上一章结束的那一刻写起，不要重新介绍人物/地点/状态/背景，不要"且说"/"话说"/"时间来到"等重新开场的套话\n8. 如果知识库中没有"上一章结尾"内容（说明这是第一篇），则按大纲自由开篇，但要符合题材和风格\n\n【文笔风格——去AI味强化】\n- 开篇直接进入动作或对话，禁止用环境描写开场（"天色阴沉"、"阳光明媚"开头一律禁止）\n- 每段不超过 4 句话，段落长短交错\n- 对话标签节制：不要每句都带神态描写（"他笑着说"、"她怒道"），部分对话直接给出，让读者自己判断语气。对话标签密度不超过30%\n- 动作描写用短句推进："他站起来。走到窗边。推开了窗。"而不是"他缓缓地从椅子上站起身来，迈着沉稳的步伐走向窗边，伸出手将窗户推了开去"\n- 禁止使用以下AI高频词："仿佛"、"宛如"、"犹如"、"不禁"、"缓缓"、"静静"、"默默"、"深深"、"淡淡"、"微微"、"猛地"——用具体动作替代\n- 禁止"不是A而是B"三毒：假靶子（否定没人做过的判断）、同义替换（A=B硬凑转折）、无关硬凑。直接说B，或真有递进用"不仅是A更是B"\n- 禁止自问自答老师腔："这叫什么？这叫XX。""说明了什么？"——直接陈述\n- 禁止莫名比喻：喻体必须与本体有真实逻辑关联，禁止表面词语相似性拼接\n- 禁止数字伪精确："0.3秒内"这类假严谨——删数字或换正常表达\n- 严格遵循知识库角色设定，禁止角色性格突变(OOC)、私加人设、刻板印象\n\n【反面案例——以下写法必被判为AI生成，严禁模仿】\n错误示例1（8连排比，致命AI标记）："目光穿过九重花瓣的界壁，穿过云海，穿过星辉，穿过炎阳，穿过翠微，穿过沧海，穿过荒原，穿过尘寰"\n错误示例2（3连排比）："像她曾经见过它无数次，像她曾经把它捧在手心里，像她曾经为它哭过"\n错误示例3（3连排比）："隔着九重花瓣，隔着万年的时光，隔着生与死的距离"\n错误示例4（反应词重复）："她愣住了。""青莲愣住了。""青莲呆住了。"——同一段反复"愣住"\n错误示例5（副词堆砌）："微微晃""微微透明""微微发烫""微微发热"——"微微"出现4次\n错误示例6（结尾升华）："遥远的九重天之上，琉璃瓣的宫殿深处，一个银白长发的身影睁开了眼睛"——结尾突然切到宏大视角\n错误示例7（"不是而是"三毒）："她不是在演风，而是在演一种失控感"——风就是失控感，同义替换\n正确写法：结尾落在具体的人/动作/物件上。如"她攥着一截空茎秆，站在岸边，看那片莲花。风过来，花瓣落了一肩。"`,
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
  style: "文笔提升" | "对话优化" | "节奏调整" | "环境描写" = "文笔提升",
  styleProfile?: StyleProfile | null
): AIMessage[] {
  return [
    {
      role: "system",
      content: `${buildSystemBase(styleProfile)}

你现在的任务是深度润色文本，方向：${style}。保留原意，提升表达质量，不改变情节。
核心目标：去除AI味，让文字像人写的。润色是让文字更像人写的，不是更"文学化"——削减冗余修辞，而非增加。

【处理流程——按以下三遍逐步处理】

■ Pass 1：去泛化
- 禁用词替换为具体动作/细节
- 心理描写外化："他很紧张"→"他的手在抖"；"心里涌起酸楚"→"我赶紧拭干了泪"
- 连续排比打断：保留1-2个，其余改写为不同句式。例："穿过云海，穿过星辉，穿过炎阳，穿过沧海"→保留"穿过云海"，其余改为"再往远处，是星辉和炎阳，一直到沧海尽头"
- 对话标签用动作/上下文替代，标签密度控制在30%以下
- 标点修复：冒号→逗号，破折号一段不超过1处

■ Pass 2：去书面化
- "不是A，而是B"三毒处理：先判定——(a)假靶子（前半句否定的是不存在的观点）→删前半句只留B；(b)同义替换（A=B同一意思）→合并成一句删掉"不是而是"脚手架；(c)无关硬凑→直接删。真有递进关系改"不仅是A更是B"
- 连接词精简："此外""然而""因此"超过2处→删到2处或换隐性连接
- 修饰词清扫：一次只用一个形容词，不连用不堆砌
- 系动词恢复：用"是/有/在"替代"作为/充当/拥有"
- 高频副词清扫："极其""猛地""死死""微微""缓缓"等，一段内重复→删到只剩最必要的一处，全篇各不超过2次
- 莫名其妙的比喻拆除：喻体与本体无逻辑关联→白描或直接删
- 数字去伪精确："0.3秒内""跨了49cm"这类假严谨→删数字或换正常表达

■ Pass 3：回自然感
- 节奏打碎：长短句交错，段落参差，一句话自成一段制造重点
- 对话去腔调：加入口语化表达，部分对话直接给出不带标签
- 结尾去升华：用动作/场景/物件收尾，不用总结/感慨/宏大视角
- 补具体感官细节
- 允许一些不完美：跑题、题外话、半成型想法
- 句式断裂：在情绪高点或转折点用极短句独立成段

【自检——输出前必须检查】
L1 硬性规则（任一不通过必须修复）：
- 禁用词扫描："仿佛""宛如""犹如""不禁"等是否还残留
- "不是而是"三毒扫描：是否还有假靶子/同义替换/无关硬凑
- 高频堆叠副词扫描："极其/猛地/死死/微微/缓缓"一段内是否重复
- 连续排比扫描：是否还有3个及以上相同句式
- 反应词重复扫描："愣住/呆住/怔住"是否同段重复
- 结尾升华扫描：结尾是否切到宏大视角
- 主语句式扫描：是否连续3句同一主语开头

L2 风格一致性：
- 开头是否从具体、当下事件切入
- 是否有长短句交替
- 是否有极短句独立成段的断裂效果

【改最少，效果最大】能改一个词就不改一句，能删一句就不重写一段。没问题的句子尽量保留。只改"怎么说"，不改"说什么"。`,
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
  context?: string,
  styleProfile?: StyleProfile | null
): AIMessage[] {
  const actionMap: Record<string, string> = {
    续写: "请基于选中文字续写 200-400 字，保持风格一致。用动作和对话推进，不要抒情铺垫，禁止使用'仿佛'/'宛如'/'不禁'/'缓缓'等AI高频词",
    扩写: "请将选中文字扩写为更详细的段落，约 400-600 字。扩写靠增加具体动作、对话、细节，不要靠增加形容词和比喻",
    润色: "请润色选中文字，让文字更像人写的而非AI生成的。削减冗余修辞，用短句，删除'仿佛'/'宛如'/'不禁'/'缓缓'等词，保留原意",
    改写: "请改写选中文字，换一种表达方式，保留原意。句式更口语化，少用形容词",
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

// ============ 对话共创 ============

export function chatCoCreatePrompt(
  storySoFar: string,
  userMessage: string,
  ctx?: KnowledgeContext,
  styleProfile?: StyleProfile | null
): AIMessage[] {
  // 判断是否处于"开场"阶段：故事进展为空或仅 1-2 轮对话
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
6. 严格遵守已建立的世界观与角色设定
7. 文笔要像人写的：用动作和对话推进，少用形容词和比喻，禁止"仿佛"/"宛如"/"不禁"/"缓缓"等AI高频词，句式长短错落`}`;

  const userContent = isOpeningPhase
    ? `${ctx ? `【已建立设定】\n${formatKnowledge(ctx)}\n\n` : ""}【用户输入】\n${userMessage}

请用 1-2 句话友好回应，并按以下格式提供 3-4 个创作方向选项：

【选项】
A. 我想写：<一句话题材或类型>
B. 我想写：<一句话题材或类型>
C. 我想写：<一句话题材或类型>
D. 我想写：<一句话题材或类型>（可选）

每个选项是不同类型的创作方向（如：都市言情、悬疑推理、玄幻仙侠、科幻未来、历史穿越、校园青春、恐怖灵异、冒险探险等），用 "我想写：" 开头。`
    : `${ctx ? `【已建立设定】\n${formatKnowledge(ctx)}\n\n` : ""}${storySoFar ? `【故事进展】\n${storySoFar}\n\n` : ""}【用户输入】\n${userMessage}

请继续这个故事。

【输出要求】
直接输出你的接龙内容。在关键情节点（角色面临选择、剧情出现分支、对手出现/退场、关键决定等）必须在末尾用【选项】标记给出 2-3 个选项：

【选项】
A. 选项一
B. 选项二
C. 选项三

每个选项 5-20 字，描述具体动作或方向，必须互斥。`;

  return [
    { role: "system", content: systemContent },
    { role: "user", content: userContent },
  ];
}

// ============ 一致性检查 ============

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

// ============ 对话自动提取知识卡 ============

export function extractCardsPrompt(dialogue: string, styleProfile?: StyleProfile | null): AIMessage[] {
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

// ============ 章节摘要 ============

export function summaryPrompt(chapterContent: string, styleProfile?: StyleProfile | null): AIMessage[] {
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
