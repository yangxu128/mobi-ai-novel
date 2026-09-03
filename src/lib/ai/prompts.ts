/**
 * Prompt 模板库。
 * 结构: [系统角色] + [知识库上下文] + [当前任务] + [用户指令] + [输出要求]
 */

import type { AIMessage } from "./provider";
import { buildSystemBase } from "./style";
import type { StyleProfile } from "./style";
import { getWorldbuildSlots, getGenreMode, isRelationshipStory } from "@/lib/genre";

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
      content: `用户的一句话点子：${idea}\n题材：${genre}\n\n【重要】用户点子中的核心设定（如性转/变身/穿越/重生/奇遇等）是故事灵魂：必须原样保留并强化，不得替换、弱化或删除。\n\n请生成 3 张灵感卡，每张包含：故事内核（一句话）、核心冲突、目标读者、情绪基调、参考作品。严格用如下 JSON 数组格式输出，不要任何额外文字：\n\n[{"core":"故事内核","conflict":"核心冲突","audience":"目标读者","mood":"情绪基调","reference":"类似作品参考"}]`,
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
  // 题材自适应框架：现实类不生成"力量体系"，日常+奇设类生成"核心奇设"
  const slots = getWorldbuildSlots(genre, inspiration);
  const slotDesc = slots.map((s) => `${s.title}（${s.hint}）`).join("；");
  const jsonExample = slots.map((s) => `"${s.key}":"${s.title}"`).join(",");
  const mode = getGenreMode(genre, inspiration);
  let genreNote = "";
  if (mode === "high-concept") {
    genreNote = `\n【重要】这是"日常背景+单一奇设"型小说：故事发生在真实可信的现实环境（校园/都市等），用户点子中的核心奇设（如性转/变身/重生等）是全文唯一的超常要素，必须完整保留并细化——起因、过程、限制条件、复原可能、知情范围、对当事人身心的具体影响，不得删除或弱化。除该奇设外，禁止虚构任何其他超自然力量。世界观要重点回答：这个奇设如何搅动人物关系与当事人的日常生活。`;
  } else if (mode === "realistic") {
    genreNote = `\n【重要】这是现实题材小说（都市/校园/言情等），不存在超凡力量。禁止虚构任何修仙、魔法、异能、超自然设定，世界观必须立足真实的社会环境与人物关系。`;
  } else {
    // 奇幻类：力量体系设计铁律（源自番茄官方"升级体系与成长路径"教程）
    genreNote = `\n【重要】这是奇幻类题材，"力量体系"决定全文可信度，按以下铁律设计（核心不是"怎么升更爽"，而是"为什么能升、为什么不能乱升、升了有什么代价"）：\n1. 底层能源只选 1 个主因 + 1 个次因（如灵气为主、悟性为次），禁止"灵气+血脉+神器+气运"多来源叠加\n2. 等级阶梯 4-7 个大阶为宜，每阶必须有清晰"质变"而非数值膨胀（初期身体/能量积累→中期技巧/体系成形→后期法则/领域/权限）\n3. 升级与社会结构绑定：高阶资源被谁掌握、普通人天花板在哪、升级后社会地位如何变化——个人变强路径必须与社会资源分配一致\n4. 主角例外机制四问：来源、优势、代价、边界（至少写代价或边界其一，防金手指失控挤压其他角色）\n5. 越强的能力越要附带成本（消耗/反噬/冷却/社会后果），力量与代价绑定，每次动用才有分量\n6. 资源三定：稀缺度、获取渠道、使用门槛，全书前后一致`;
  }
  return [
    {
      role: "system",
      content: `${buildSystemBase(styleProfile)}\n你现在的任务是构建小说世界观，需要结构化、可扩展、自洽。`,
    },
    {
      role: "user",
      content: `灵感来源：${inspiration}\n题材：${genre}\n${existingSettings ? `\n已有设定：\n${formatKnowledge(existingSettings)}\n` : ""}\n请生成完整的世界观框架，包含：${slotDesc}。每个部分要具体、有特色、能服务于剧情。${genreNote}\n\n用 JSON 对象输出：\n{${jsonExample}}`,
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
  // 奇设类题材（世界观已写入"核心奇设"设定）：角色必须围绕奇设与关系演变设计
  const conceptNote =
    getGenreMode(genre, worldSummary) === "high-concept"
      ? `\n\n【奇设角色要求】本故事含核心奇设设定（见世界观），角色设计必须围绕奇设展开：
1. 经历奇设的角色：写出旧身份与新身份的撕裂感、适应过程的具体阶段（抗拒→试探→逐步接受）、如何面对旧关系，这些写入 background 与 arc
2. 周围角色：每人对奇设的态度弧线必须有差异（震惊回避/好奇靠近/本能保护/渐生好感），禁止所有人反应雷同
3. 人物弧光（arc）必须写关系动态演变：从兄弟情谊到心动的每一步转变，以及触发该转变的具体事件，关系不能一夜突变`
      : "";
  return [
    {
      role: "system",
      content: `${buildSystemBase(styleProfile)}\n你现在的任务是创建立体的角色，每个角色都要有内在矛盾与成长弧光。`,
    },
    {
      role: "user",
      content: `世界观：${worldSummary}\n题材：${genre}\n${existingCharacters ? `\n已有角色：\n${formatKnowledge(existingCharacters)}\n` : ""}\n\n请生成主角 1 名 + 核心配角 3-4 名，每名角色包含：姓名、角色定位、外貌、性格、背景故事、核心动机、人物弧光。性格字段必须写清该角色的说话方式（用词习惯/句式长短/口头禅/语气），确保对话有辨识度——检验标准：把台词遮住名字也能认出是谁说的。配角必须有自己的立场与利益诉求，禁止设计成只会衬托主角的工具人。${conceptNote}\n\n角色定位字段 role 必须是以下英文枚举值之一：\n- PROTAGONIST（主角/男主/女主）\n- SUPPORTING（配角）\n- ANTAGONIST（反派）\n- EXTRA（路人）\n\n用 JSON 数组输出，不要任何额外文字：\n[{"name":"姓名","role":"PROTAGONIST","appearance":"外貌","personality":"性格","background":"背景","motivation":"动机","arc":"人物弧光"}]`,
    },
  ];
}

// ============ 大纲 ============

/** 全书规模目标（立项时设定，可选） */
export interface BookTargets {
  targetChapters?: number | null;
  chapterWords?: number | null;
}

/** 全书规模提示块：让 AI 先立整体观，再落当前卷 */
function bookScaleGuide(
  targets: BookTargets | undefined,
  opts?: { lastChapter?: number }
): string {
  if (!targets) return "";
  const { targetChapters, chapterWords } = targets;
  if (!targetChapters && !chapterWords) return "";
  const parts: string[] = [];
  if (targetChapters) {
    parts.push(`全书目标约 ${targetChapters} 章`);
  }
  if (chapterWords) {
    const total = targetChapters
      ? `（全书体量约 ${((targetChapters * chapterWords) / 10000).toFixed(1)} 万字）`
      : "";
    parts.push(`每章约 ${chapterWords} 字${total}`);
  }
  let line = `

【全书规模——先立整体观再落笔】
${parts.join("，")}。`;
  if (opts?.lastChapter == null) {
    line += `
本次只生成第一卷，但你必须先在心中铺完全书弧线：明确中段大高潮的位置、结局走向与各卷功能划分，再落到第一卷的章节设计上；第一卷结尾要停在全书节奏的正确位置，伏笔与主线钩子要为后续各卷预留空间。`;
  }
  if (targetChapters && opts?.lastChapter != null) {
    const done = opts.lastChapter;
    const remaining = Math.max(0, targetChapters - done);
    const pct = Math.min(100, Math.round((done / targetChapters) * 100));
    if (remaining <= 8) {
      line += `
当前已完成 ${done}/${targetChapters} 章（进度 ${pct}%，剩余 ${remaining} 章）——本次是收官续写：请直接规划出结局，完成主线兑现与所有重要伏笔的回收，把故事推向终章，不要再开新坑。`;
    } else {
      const stage = pct < 35 ? "前期（铺垫与钩子期，大招不要提前泄完）" : pct < 70 ? "中期（冲突升级与阶段性高潮期）" : "后期（向终局冲刺期）";
      line += `
当前已完成 ${done}/${targetChapters} 章（进度 ${pct}%，处于${stage}）——本次续写请对齐全书进度：高潮与反转的烈度要符合当前阶段，为后续章节留出上升空间。`;
    }
  }
  return line;
}

export function outlinePrompt(
  worldSummary: string,
  characterSummary: string,
  genre: string,
  template: string = "三幕式",
  styleProfile?: StyleProfile | null,
  targets?: BookTargets
): AIMessage[] {
  // 关系推进型故事（情感向/含核心奇设）：用"关系升温节奏"替代打脸节奏
  const relationship = isRelationshipStory(genre, worldSummary, characterSummary);
  const pacingGuide = relationship
    ? `【关系推进节奏蓝图——每 3 章一个"事件-涟漪-升温"循环】\n这类题材的读者要的是关系升温的渐进张力与日常喜剧/暧昧氛围，不是打脸复仇。以 3 章为一个关系单元循环推进（亲密度逐轮上升）：\n- 第 1 章（事件）：一个具体事件让关系被迫靠近一步（意外接触/秘密共享/身份暴露风险/奇设新状况）\n- 第 2 章（涟漪）：事件后的心理余波，某人开始"不对劲"（多看一眼/心跳加速/刻意回避/夜不能寐）\n- 第 3 章（升温+新钩子）：关系出现可见的变化，同时埋下新变量（秘密暴露风险/第三人察觉/奇设规则突变）\n每个关系单元的落点：第 3 章结尾必须是暧昧张力、秘密倒计时、误会或心动瞬间，让读者必须追下一章。\n\n【每章大纲的设计要求】\n1. 章节摘要（sceneSummary）中标注本章的关系阶段（靠近/试探/升温/波折/确认）\n2. plotPoints 的最后一个情节点必须是本章结尾钩子设计，注明钩子类型（暧昧张力/秘密暴露倒计时/误会加深/第三人介入/奇设突变/身份坦白危机/意外发现/心动瞬间定格），相邻章节钩子类型不重复\n3. 每章必须有至少一个不可删除的核心事件（删掉会影响理解的才算核心事件）\n4. 悬念管理：每章回收一个旧悬念或推进旧悬念，同时埋下新悬念，foreshadowing 字段记录伏笔内容\n5. 关系是波浪式推进："靠近→退却→更近一步"，每次升温后伴随一次退却或小危机；禁止强行插入打脸复仇/豪门恩怨/商战碾压等与主线无关的冲突升级`
    : `【番茄节奏蓝图——每 3 章一个"压-小扬-压-爆"情绪循环】\n以 3 章为一个情绪单元，循环推进（爆点规模逐轮扩大）：\n- 第 1 章（压）：主角陷入困境/被压迫，建立读者共情，暗示主角有独特之处\n- 第 2 章（小扬）：主角获得小胜利或关键信息，但不解决根本问题\n- 第 3 章（压→爆预告）：对手变本加厉，主角获得反击筹码，章末暗示即将爆发\n每个情绪单元的落点：第 3 章结尾必须有窒息感或期待感，让读者必须追下一章。\n\n【每章大纲的设计要求】\n1. 章节摘要（sceneSummary）中标注本章的情绪阶段（压/小扬/爆）\n2. plotPoints 的最后一个情节点必须是本章结尾钩子设计，注明钩子类型（突然揭示/紧急危机/未完成的动作/身份反转/两难选择/神秘线索/时间限制/威胁承诺/离奇消失/言外之意），相邻章节钩子类型不重复\n3. 每章必须有至少一个不可删除的核心事件（删掉会影响理解的才算核心事件）\n4. 悬念管理：每章回收一个旧悬念或推进旧悬念，同时埋下新悬念，foreshadowing 字段记录伏笔内容\n5. 主角章节遵循"压→反击→代价"循环，主角的每次胜利都伴随新麻烦`;
  // 主线骨架与黄金节奏点（源自番茄官方"起承转合"+"黄金节奏点"教程，两种题材通用）
  const structureGuide = `\n\n【主线先行——设计前先拟主线句】\n主线句格式："谁+在什么困境下+为了达成什么目标+必须对抗什么力量+最终获得或失去什么"。所有章节必须服务这条主线，悬念、冲突、高潮的安排都不许偏离。\n\n【起承转合骨架】\n- 起（开篇）：快速交代主角处境与眼前危机，只留 1 个贯穿全卷的大悬念 + 1 个眼前危机，禁止开局抛多个悬念让读者抓不住重点\n- 承（主体）：持续加码，安排多个阶段性高潮，冲突一轮比一轮难\n- 转与合：转折必须前文埋过伏笔（对应 foreshadowing 字段），不能凭空出现；收尾预留伏笔回收篇幅，不能只打不收\n\n【阶段高潮公式】每个阶段性高潮按"目标→阻碍→代价→收获→新问题"设计：主角每次达成阶段目标都必须付出代价，同时引出更大矛盾；每个阶段结束时局势必须有实质改变（新信息/新关系/新资源/新敌人），禁止原地打转。\n\n【黄金节奏点】每 3-5 章预设一组四要素：阶段目标、爽点、小危机、读者期待。爽点落地后要安排发酵余波（旁人态度变化/对手挫败/引出新机会），不能刚爽完就翻篇；小危机有压力但可控，不能把主角逼到无法翻身。\n\n【设定事件化】世界观设定必须放进冲突场景带出（人物在事件中撞上规则、在对话中暴露关系），禁止说明书式交代设定。`;
  return [
    {
      role: "system",
      content: `${buildSystemBase(styleProfile)}\n你现在的任务是生成结构化大纲，遵循${template}结构，卷→章。大纲面向番茄等网文平台，核心目标是高完读率和追读率。`,
    },
    {
      role: "user",
      content: `世界观：${worldSummary}\n角色：${characterSummary}\n题材：${genre}\n大纲模板：${template}\n\n${pacingGuide}${structureGuide}${bookScaleGuide(targets)}\n\n请生成第一卷的大纲（约 8-12 章），每章输出一个对象。每章包含：章节标题、章节摘要、视角角色、核心情节点（2-4 个，放在 plotPoints 数组里）、伏笔或回收。\n\n重要：每章只输出一个对象，不要为同一章生成多个对象。情节点放在 plotPoints 数组里，不要拆成多个章节对象。\n\n用 JSON 数组输出，不要任何额外文字：\n[{"volume":1,"chapter":1,"sceneTitle":"章节标题","sceneSummary":"章节摘要（含关系/情绪阶段）","povCharacter":"视角角色名","plotPoints":["情节点1","情节点2","结尾钩子：类型+具体内容"],"foreshadowing":"伏笔或回收"}]`,
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
  styleProfile?: StyleProfile | null,
  targets?: BookTargets
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

  const relationship = isRelationshipStory(genre, worldSummary, characterSummary);
  const pacingRule = relationship
    ? `1. 根据最后一章的剧情判断当前关系阶段，按"事件-涟漪-升温"每 3 章一个循环继续推进（亲密度逐轮上升），关系波浪式推进："靠近→退却→更近一步"
2. 章节摘要标注关系阶段（靠近/试探/升温/波折/确认）；plotPoints 的最后一个情节点必须是本章结尾钩子设计，注明钩子类型（暧昧张力/秘密暴露倒计时/误会加深/第三人介入/奇设突变/身份坦白危机/意外发现/心动瞬间定格），且不能与最后一章已用的钩子类型相同
3. 悬念管理：优先回收已有伏笔（已有大纲中埋的伏笔若无回收计划必须在续写中回收），同时埋新伏笔；每章回收一个旧悬念再埋一个新悬念
4. 关系升温靠具体事件触发，不能一夜突变；禁止强行插入打脸复仇/豪门恩怨等与主线无关的冲突升级`
    : `1. 根据最后一章的剧情判断当前情绪阶段，按"压-小扬-压-爆"每 3 章一个循环继续推进，爆点规模逐轮扩大
2. 章节摘要标注情绪阶段（压/小扬/爆）；plotPoints 的最后一个情节点必须是本章结尾钩子设计，注明钩子类型（突然揭示/紧急危机/未完成的动作/身份反转/两难选择/神秘线索/时间限制/威胁承诺/离奇消失/言外之意），且不能与最后一章已用的钩子类型相同
3. 悬念管理：优先回收已有伏笔（已有大纲中埋的伏笔若无回收计划必须在续写中回收），同时埋新伏笔；每章回收一个旧悬念再埋一个新悬念
4. 主角的每次胜利都伴随新麻烦，推动故事向更大高潮发展`;
  return [
    {
      role: "system",
      content: `${buildSystemBase(styleProfile)}\n你现在的任务是续写小说大纲，遵循${template}结构，卷→章。已有 ${existingOutlines.length} 章大纲，需要在此基础上继续推进剧情，必须与最后一章的情节自然衔接。`,
    },
    {
      role: "user",
      content: `世界观：${worldSummary}\n角色：${characterSummary}\n题材：${genre}\n大纲模板：${template}${bookScaleGuide(targets, { lastChapter })}\n\n已有大纲（${existingOutlines.length} 章，含情节点和伏笔）：\n${existingDetail}\n\n${lastDetail}\n\n【续写节奏要求】\n${pacingRule}\n5. 每章结束时局势必须有实质改变（新信息/新关系/新资源/新风险），禁止原地打转；爽点落地后的章节要安排余波发酵（旁人态度变化/对手挫败/引出新机会），不能刚爽完就翻篇\n\n请紧接最后一章续写后续 6-8 章的大纲。要求：\n1. chapter 编号从 ${lastChapter + 1} 开始，连续递增\n2. 【关键】第一章续写必须直接承接最后一章的情节走向和未解决的冲突，不要重新开场或跳过时间线\n3. 回收已有伏笔或埋下新伏笔，保持剧情连贯\n4. 不要重复已有情节，推动故事向高潮发展\n5. 每章输出一个对象，包含：章节标题、章节摘要、视角角色、核心情节点（2-4 个）、伏笔或回收\n6. 每章只输出一个对象，情节点放在 plotPoints 数组里，不要拆成多个章节对象\n\n用 JSON 数组输出，不要任何额外文字。注意：foreshadowing 必须是对象的独立字段，绝不能写进 plotPoints 数组里；请直接输出结果，思考过程尽量精简：\n[{"volume":1,"chapter":${lastChapter + 1},"sceneTitle":"章节标题","sceneSummary":"章节摘要（含关系/情绪阶段）","povCharacter":"视角角色名","plotPoints":["情节点1","情节点2","结尾钩子：类型+具体内容"],"foreshadowing":"伏笔或回收"}]`,
    },
  ];
}

// ============ 章节扩写 ============

export function expandPrompt(
  instruction: string,
  ctx: KnowledgeContext | undefined,
  styleProfile?: StyleProfile | null,
  chapterWords?: number | null
): AIMessage[] {
  // 题材节奏适配：情感向/奇设类故事用"关系推进"替代打脸节奏
  // 检测依据：知识库世界观文本（世界观步骤会把"核心奇设"写入 SYSTEM 槽位）
  const wsText =
    ctx?.worldSettings.map((w) => `${w.title}\n${w.content}`).join("\n") || "";
  const pacingNote = isRelationshipStory(undefined, wsText)
    ? `\n\n【题材节奏适配——本段优先级最高，覆盖上方番茄打脸节奏与"压→反击→代价"循环】\n检测到本故事为日常情感向或含核心奇设：\n- 章节推进靠"关系变化/新信息/喜剧误会/暧昧事件"，不靠冲突压迫与打脸复仇\n- "压→反击→代价"改为"靠近→退却→更近一步"的波浪式关系推进\n- 高潮取情感高潮（心动瞬间/秘密将泄/身份坦白），不是动作或碾压\n- 结尾钩子偏暧昧张力、误会、悬念、心动定格，保持喜剧与暧昧氛围\n- 严格保持知识库中奇设的规则一致（起因/限制/知情范围），不得擅自新增其他超自然要素`
    : "";

const wordRule = chapterWords
    ? `1. 本章目标字数约 ${chapterWords} 字（可在 ±15% 内浮动，明显不足需扩充内容，超出过多需精简）`
    : `1. 字数 2200-2800 字（番茄小说最佳阅读长度，低于 2200 需扩充内容，高于 2800 需精简）`;
  return [
    {
      role: "system",
      content: `${buildSystemBase(styleProfile)}\n你现在的任务是按大纲扩写章节正文。要求：\n${wordRule}\n2. 场景描写具体，避免空洞叙述\n3. 对话自然，符合角色性格\n4. 严格遵循大纲的情节点推进\n5. 与前文风格保持一致\n6. 不要写"第X章"标题、不要分章节小标题\n7. 【关键】必须紧接上一章结尾自然续写，开篇即从上一章结束的那一刻写起，不要重新介绍人物/地点/状态/背景，不要"且说"/"话说"/"时间来到"等重新开场的套话\n8. 如果知识库中没有"上一章结尾"内容（说明这是第一篇），则按大纲自由开篇，但要符合题材和风格\n\n【番茄章节结构——必须严格遵守】\n读者在前 20% 决定去留，章节结尾决定追读。按四段式结构写：\n■ 开头钩子（前 20%，约 450-550 字）：必须有即时冲突、重大事件或情感冲击，前 50 字是书架页展示位，直接以动作或对话切入\n■ 发展推进（中 50-60%）：核心内容靠"新信息揭示/关系变化/问题升级/角色成长"至少一项推进，禁止纯场景描写和与剧情无关的互动\n■ 高潮时刻（后 15-20%）：本章情感或动作的最高点（动作高潮/情感高潮/心理高潮三选一）\n■ 结尾钩子（最后 5-10%）：留强悬念收尾，让读者必须点开下一章\n\n【结尾钩子设计——10 种类型，与上一章不同类型】\n突然揭示（抛出改变一切的信息）/ 紧急危机（迫在眉睫的危险）/ 未完成的动作（动作被打断+新变量出现）/ 身份反转（某人不是我们以为的那样）/ 两难选择（艰难抉择悬而未决）/ 神秘线索（意义不明的重要物品）/ 时间限制（截止时间+资源不足）/ 威胁承诺（某人的宣告改变预期）/ 离奇消失（不可能的消失留下谜团）/ 言外之意（表面正常实则暗示深意）\n钩子禁忌：虚假悬念（紧张结果是误会一场，如"脚步声原来是猫"）、机械降神（解决方案凭空出现）、低风险钩子（结尾事件无关痛痒）、过度留白（疑问太多一个都不答）。原则：每章至少回应一个旧悬念，再提出一个新悬念，悬念强度总体递增。\n\n【情绪曲线——单章至少 3 次情绪变化】\n开头 50-250 字：快速建立本章情绪基调\n中间部分：情绪逐步升级，至少一次小起伏\n结尾 450-650 字：情绪到达本章峰值后急转，留下钩子\n情绪拐点示例："他低着头，嘴角却上扬——他们还不知道自己惹了谁"（憋屈→暗爽）；"门锁转动的声音响起时，她握紧了水果刀。但进来的，是那张熟悉的脸"（绝望→希望）\n\n【评论区诱导留白——网文平台特色】\n适度使用：两难选择（两个选项都有道理，章末不写决定）/ 信息差（让读者比主角多知道一点，但不全知道）/ 误解不解释（主角被误解时不立刻辩解）。不要每章都用，穿插进行。\n\n【文笔风格——去AI味强化】\n- 开篇直接进入动作或对话，禁止用环境描写开场（"天色阴沉"、"阳光明媚"开头一律禁止）\n- 每段不超过 4 句话，段落长短交错\n- 对话标签节制：不要每句都带神态描写（"他笑着说"、"她怒道"），部分对话直接给出，让读者自己判断语气。对话标签密度不超过30%\n- 动作描写用短句推进："他站起来。走到窗边。推开了窗。"而不是"他缓缓地从椅子上站起身来，迈着沉稳的步伐走向窗边，伸出手将窗户推了开去"\n- 禁止使用以下AI高频词："仿佛"、"宛如"、"犹如"、"不禁"、"缓缓"、"静静"、"默默"、"深深"、"淡淡"、"微微"、"猛地"——用具体动作替代\n- 禁止"不是A而是B"三毒：假靶子（否定没人做过的判断）、同义替换（A=B硬凑转折）、无关硬凑。直接说B，或真有递进用"不仅是A更是B"\n- 禁止自问自答老师腔："这叫什么？这叫XX。""说明了什么？"——直接陈述\n- 禁止莫名比喻：喻体必须与本体有真实逻辑关联，禁止表面词语相似性拼接\n- 禁止数字伪精确："0.3秒内"这类假严谨——删数字或换正常表达\n- 严格遵循知识库角色设定，禁止角色性格突变(OOC)、私加人设、刻板印象\n\n【人味细则——番茄官方写作教程精华，与去AI味规则同等优先级】\n■ 语言具体化：砍掉空泛大词（倾国倾城/杀意凛然/气场强大/执行力强这类悬浮形容词），用具体动作画面替代——"执行力强"→"闹钟响的瞬间他就坐了起来"\n■ 生理代偿写情绪：禁止替读者总结情绪（"他很愤怒""她很委屈"），用身体反应和动作写："她垂下头，眼睫颤得飞快，泪水在眼眶里打转，却强忍着不让它落下"。情绪点到为止，一两句具体动作就够，篇幅一长反而稀释情绪重量\n■ 修辞克制：一个名词最多带一个修饰成分，多余的形容词砍掉；比喻每章不超过 2 处且喻体不重复\n■ 细节三问筛选：每段细节至少满足其一才保留——①能让读者对某个角色产生情感偏向（讨厌/心疼/崇拜）②能让角色更立体 ③能让后面的反转更合理。三问全否的细节果断删（例：老师批评学生后"叹气走人"是废笔；"四下张望确认没人，把两个热鸡蛋塞进贫困生课桌"才是好细节）\n■ 叙事手法多样化：一章内交叉使用动作、对话、环境细节、心理活动、旁观者反应（写旁人吓得大气不敢喘，用"气氛组"侧写紧张），禁止整章只剩一种手法。中后段尤其注意：打斗太久、独白绕圈，读者产生"这段我懂了但它还在写"的感觉就失败了\n■ 对话辨识度测试：每句对话自问"换另一个角色说这句话成立吗"——成立就重写。每个角色要有专属说话方式（用词习惯/句式长短/口头禅），遮住名字也能认出是谁说的\n■ 角色不降智：聪明角色的每个决策必须符合其已有逻辑，禁止为制造冲突让高智商角色犯低级错误；配角要有自己的立场与利益，不是只会捧主角的工具人\n■ 爽点余波：主角赢了一件事后，写出影响的发酵（旁人的震惊/对手的挫败/周围人态度变化/引出的新机会），不能刚爽完就翻篇\n\n【反面案例——以下写法必被判为AI生成，严禁模仿】\n错误示例1（8连排比，致命AI标记）："目光穿过九重花瓣的界壁，穿过云海，穿过星辉，穿过炎阳，穿过翠微，穿过沧海，穿过荒原，穿过尘寰"\n错误示例2（3连排比）："像她曾经见过它无数次，像她曾经把它捧在手心里，像她曾经为它哭过"\n错误示例3（3连排比）："隔着九重花瓣，隔着万年的时光，隔着生与死的距离"\n错误示例4（反应词重复）："她愣住了。""青莲愣住了。""青莲呆住了。"——同一段反复"愣住"\n错误示例5（副词堆砌）："微微晃""微微透明""微微发烫""微微发热"——"微微"出现4次\n错误示例6（结尾升华）："遥远的九重天之上，琉璃瓣的宫殿深处，一个银白长发的身影睁开了眼睛"——结尾突然切到宏大视角\n错误示例7（"不是而是"三毒）："她不是在演风，而是在演一种失控感"——风就是失控感，同义替换\n正确写法：结尾落在具体的人/动作/物件上。如"她攥着一截空茎秆，站在岸边，看那片莲花。风过来，花瓣落了一肩。"${pacingNote}`,
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
- 空泛大词具体化：倾国倾城/杀意凛然/气场强大/执行力强这类悬浮词→拆成具体动作画面。"极度绝望、无以复加的委屈"→"她垂下头，眼睫颤得飞快，泪水在眼眶里打转，却强忍着不让它落下"
- 修辞克制：一个名词最多保留一个修饰成分；比喻全文不超过 2 处，喻体重复的删掉
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
- 细节三问抽查：抽 3 处细节自问"能否让读者对角色产生情感偏向/让角色更立体/让反转更合理"，三问全否的废笔细节删除
- 对话辨识度抽查：抽 3 句对话，"换另一个角色说也成立"的句子改写出该角色的说话方式（用词习惯/句式长短/口头禅）
- 重复表达检查：同一情绪/同一信息在前文已写过→只保留最有力的一处，其余删除；只有热闹没有新信息（新信息/关系变化/冲突升级均无）的段落压缩

【番茄网文保护规则——润色时严禁破坏】
- 章节结尾的悬念钩子必须保留且更锋利，禁止把钩子当"升华"磨平。钩子与升华的区别：钩子落在具体的悬念上（新信息/新危机/未完成动作），升华是拔高总结（"命运齿轮转动"）
- 开篇的即时冲突/动作/对话必须保留，禁止改成环境铺垫开场
- 单章的情绪拐点（憋屈→暗爽、绝望→希望等转折处）必须保留，且转折要干脆
- 对话中的潜台词保留，不要把"言外之意"改成直白陈述

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
