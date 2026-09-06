/**
 * 记忆 wiki：保存章节后自动提取（摘要 + 事件 + 角色状态增量 + 伏笔增减），
 * 扩写/一致性检查时通过 getStoryState 注入"故事状态卡"。
 *
 * 设计要点：
 * - 一次 LLM 调用合并提取（摘要/事件/角色状态/伏笔），降低 token 成本
 * - 节流：inflight 防重 + 字数变化阈值，防 tiptap 自动保存风暴
 * - 幂等：重提时硬删重建该章数据（软删会堆积重复行）
 * - 旧章重提只追加关系变化，不回退角色状态（防止旧提取覆盖新状态）
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { chat as aiChat, estimateTokens, DEFAULT_MODEL } from "./provider";
import { wikiExtractPrompt } from "./prompts";
import { checkQuota } from "./quota";
import { logAIUsage } from "./rag";
import { htmlToText } from "@/lib/utils";
import type {
  WikiExtractResult,
  StoryStateContext,
  CharacterStateCurrent,
} from "@/types/memory";

/** CharacterStateCurrent → Prisma JSON 输入（接口无索引签名，需断言桥接） */
function stateToJson(v: CharacterStateCurrent): Prisma.InputJsonObject {
  return v as unknown as Prisma.InputJsonObject;
}

export type ExtractResult = {
  ok: boolean;
  skipped?: "throttled" | "quota" | "empty" | "inflight" | "auto-memory-off";
  error?: string;
};

// ============ 节流（模块级 Map，同 rate-limit 模式） ============

const lastExtract = new Map<string, { wordCount: number; at: number }>();
const inflight = new Set<string>();

/** 字数变化 < 100 跳过（打字补字级别） */
const MIN_DELTA_WORDS = 100;
/** 60s 内且变化 < 300 跳过（自动保存风暴保护） */
const THROTTLE_WINDOW_MS = 60_000;
const THROTTLE_DELTA_WORDS = 300;

// ============ 模糊匹配工具 ============

/** 标准化标题：去空白/标点，转小写 */
function normalizeTitle(s: string): string {
  return (s || "").replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();
}

/** bigram Dice 系数（0-1，越大越相似） */
function diceBigram(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const grams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) || 0) + 1);
    }
    return m;
  };
  const ma = grams(a);
  const mb = grams(b);
  let overlap = 0;
  for (const [g, n] of ma) {
    const n2 = mb.get(g);
    if (n2) overlap += Math.min(n, n2);
  }
  return (2 * overlap) / (a.length - 1 + b.length - 1);
}

/** 伏笔标题模糊匹配：精确 → 双向 includes → bigram Dice ≥ 0.45 */
export function matchForeshadowTitle(
  title: string,
  candidates: Array<{ id: string; title: string }>
): { id: string; title: string } | undefined {
  const norm = normalizeTitle(title);
  if (!norm) return undefined;
  let hit = candidates.find((c) => normalizeTitle(c.title) === norm);
  if (hit) return hit;
  hit = candidates.find((c) => {
    const n = normalizeTitle(c.title);
    return !!n && (n.includes(norm) || norm.includes(n));
  });
  if (hit) return hit;
  let best: { c: { id: string; title: string }; score: number } | undefined;
  for (const c of candidates) {
    const n = normalizeTitle(c.title);
    if (!n) continue;
    const score = diceBigram(norm, n);
    if (!best || score > best.score) best = { c, score };
  }
  if (best && best.score >= 0.45) return best.c;
  return undefined;
}

/** 角色名容错匹配：精确 → 剥括号注释（张野（化名：张妍）→张野）→ 双向 includes */
function matchCharacter(
  name: string,
  characters: Array<{ id: string; name: string }>
): { id: string; name: string } | undefined {
  if (!name) return undefined;
  const norm = (s: string) => s.replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();
  const target = norm(name);
  if (!target) return undefined;
  const stripParen = (s: string) => s.replace(/[（(【\[].*?[)）】\]]/g, "");
  // 1. 标准化后精确
  let hit = characters.find((c) => norm(c.name) === target);
  if (hit) return hit;
  // 2. 剥括号注释后精确
  hit = characters.find((c) => norm(stripParen(c.name)) === target);
  if (hit) return hit;
  // 3. 双向 includes（短名长卡："张野" ⊂ "张野（化名：张妍）"）
  hit = characters.find((c) => {
    const n = norm(c.name);
    const sp = norm(stripParen(c.name));
    return (
      (n.includes(target) || sp.includes(target) || target.includes(n) || target.includes(sp)) &&
      sp.length > 0
    );
  });
  return hit;
}

// ============ 工具 ============

/** 计算章节在项目时间线上的序号（1 起）：按大纲 order，无大纲的排后按 createdAt */
async function getChapterNo(chapter: {
  id: string;
  projectId: string;
  createdAt: Date;
}): Promise<number> {
  const chapters = await prisma.chapter.findMany({
    where: { projectId: chapter.projectId, deletedAt: null },
    select: { id: true, createdAt: true, outline: { select: { order: true } } },
  });
  const sorted = chapters.sort((a, b) => {
    const oa = a.outline?.order;
    const ob = b.outline?.order;
    if (oa != null && ob != null && oa !== ob) return oa - ob;
    if (oa != null && ob == null) return -1;
    if (oa == null && ob != null) return 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  return sorted.findIndex((c) => c.id === chapter.id) + 1;
}

/**
 * 结构标点归一：LLM 偶尔在 JSON 结构位置输出全角标点（，：；），
 * 用扫描器只替换 ASCII 双引号之外的字符，字符串值内容不受影响。
 */
function normalizeStructuralPunctuation(text: string): string {
  const map: Record<string, string> = {
    "，": ",",
    "：": ":",
    "；": ";",
  };
  let out = "";
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      out += ch;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    out += map[ch] ?? ch;
  }
  return out;
}

/**
 * 截断修复：生成被 max_tokens 截断时，补齐未闭合的字符串与括号，
 * 尽量保住已完整输出的部分（如 summary 和前几条 events）。
 */
function repairTruncatedJson(text: string): string | null {
  let inString = false;
  let escaped = false;
  const stack: string[] = [];
  for (const ch of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }
  if (stack.length === 0) return null;
  let t = text;
  if (inString) t += '"'; // 字符串被截断：补闭合引号
  t = t.replace(/[,:\s]+$/, ""); // 去掉悬挂的逗号/冒号
  const closers = stack
    .reverse()
    .map((c) => (c === "{" ? "}" : "]"))
    .join("");
  return t + closers;
}

/** 容错解析 LLM 输出的 JSON（剥代码块/截首尾大括号/全角标点归一/截断修复） */
function parseWikiJson(raw: string): WikiExtractResult | null {
  if (!raw) return null;
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  // 逐级容错：原文 → 全角归一 → 截断修复
  let obj: Record<string, unknown> | null = null;
  try {
    obj = JSON.parse(text) as Record<string, unknown>;
  } catch {
    try {
      obj = JSON.parse(normalizeStructuralPunctuation(text)) as Record<
        string,
        unknown
      >;
    } catch {
      const repaired = repairTruncatedJson(
        normalizeStructuralPunctuation(text)
      );
      if (repaired) {
        try {
          obj = JSON.parse(repaired) as Record<string, unknown>;
        } catch {
          obj = null;
        }
      }
    }
  }
  if (!obj) return null;
  {
    const fs = (obj.foreshadows || {}) as Record<string, unknown>;
    return {
      summary: typeof obj.summary === "string" ? obj.summary.trim() : "",
      events: (Array.isArray(obj.events) ? obj.events : [])
        .filter(
          (e): e is Record<string, unknown> =>
            !!e && typeof (e as Record<string, unknown>).content === "string"
        )
        .slice(0, 8)
        .map((e) => ({
          content: String(e.content).trim(),
          characters: Array.isArray(e.characters)
            ? (e.characters as unknown[])
                .filter((n): n is string => typeof n === "string")
                .slice(0, 10)
            : [],
          key: e.key === true,
        })),
      characterUpdates: (Array.isArray(obj.characterUpdates)
        ? obj.characterUpdates
        : []
      )
        .filter(
          (u): u is Record<string, unknown> =>
            !!u && typeof (u as Record<string, unknown>).name === "string"
        )
        .slice(0, 10)
        .map((u) => ({
          name: String(u.name),
          location: typeof u.location === "string" ? u.location : "",
          status: typeof u.status === "string" ? u.status : "",
          goal: typeof u.goal === "string" ? u.goal : "",
          relationChanges: Array.isArray(u.relationChanges)
            ? (u.relationChanges as Array<Record<string, unknown>>)
                .filter(
                  (r) =>
                    typeof r.target === "string" &&
                    typeof r.change === "string" &&
                    r.change.trim()
                )
                .slice(0, 6)
                .map((r) => ({
                  target: String(r.target),
                  change: String(r.change),
                }))
            : [],
        })),
      foreshadows: {
        new: (Array.isArray(fs.new) ? fs.new : [])
          .filter(
            (f): f is Record<string, unknown> =>
              !!f && typeof (f as Record<string, unknown>).title === "string"
          )
          .slice(0, 6)
          .map((f) => ({
            title: String(f.title).trim().slice(0, 24),
            content:
              typeof f.content === "string" ? f.content.trim().slice(0, 200) : "",
          })),
        resolved: (Array.isArray(fs.resolved) ? fs.resolved : [])
          .filter((t): t is string => typeof t === "string" && !!t.trim())
          .slice(0, 6)
          .map((t) => t.trim()),
      },
    };
  }
}

/** 合并关系变化：同 target 保留最近 3 条，整体取最近 8 条 */
function mergeRelations(
  prev: CharacterStateCurrent["relations"],
  changes: Array<{ target: string; change: string }> | undefined,
  chapterNo: number
): CharacterStateCurrent["relations"] {
  const list = [...(prev || [])];
  for (const rc of changes || []) {
    if (!rc.target || !rc.change) continue;
    list.push({ target: rc.target, change: rc.change, chapterNo });
  }
  const byTarget = new Map<
    string,
    NonNullable<CharacterStateCurrent["relations"]>
  >();
  for (const r of list) {
    const arr = byTarget.get(r.target) || [];
    arr.push(r);
    byTarget.set(r.target, arr);
  }
  const merged: NonNullable<CharacterStateCurrent["relations"]> = [];
  for (const arr of byTarget.values()) {
    merged.push(...arr.slice(-3));
  }
  merged.sort((a, b) => (a.chapterNo ?? 0) - (b.chapterNo ?? 0));
  return merged.slice(-8);
}

// ============ 章节提取 ============

/**
 * 提取单章记忆 wiki。
 * - 自动链路（保存触发）：节流 + 配额不足静默跳过
 * - force（定稿/手动/重建）：绕过节流，仍受配额约束，但配额不足返回 skipped 而非抛错
 */
export async function extractChapterWiki(
  chapterId: string,
  opts?: { force?: boolean }
): Promise<ExtractResult> {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      project: { select: { userId: true, autoMemory: true, model: true } },
    },
  });
  if (!chapter || chapter.deletedAt) {
    return { ok: false, error: "章节不存在" };
  }
  if (!opts?.force && !chapter.project.autoMemory) {
    return { ok: false, skipped: "auto-memory-off" };
  }

  const plain = htmlToText(chapter.content || "");
  if (plain.trim().length < 200) {
    return { ok: false, skipped: "empty" };
  }

  // 节流（force 绕过）
  if (!opts?.force) {
    if (inflight.has(chapterId)) return { ok: false, skipped: "inflight" };
    const last = lastExtract.get(chapterId);
    if (last) {
      const delta = Math.abs(chapter.wordCount - last.wordCount);
      const elapsed = Date.now() - last.at;
      if (delta < MIN_DELTA_WORDS) return { ok: false, skipped: "throttled" };
      if (elapsed < THROTTLE_WINDOW_MS && delta < THROTTLE_DELTA_WORDS) {
        return { ok: false, skipped: "throttled" };
      }
    }
  }
  if (inflight.has(chapterId)) return { ok: false, skipped: "inflight" };
  inflight.add(chapterId);

  try {
    // 配额预检
    const usage = await checkQuota(chapter.project.userId);
    const estimatedPrompt = estimateTokens(plain) + 800;
    if (!usage.unlimited && usage.available < estimatedPrompt + 1600) {
      console.warn(
        `[wiki] 配额不足，跳过记忆提取（剩余 ${usage.available}）`
      );
      return { ok: false, skipped: "quota" };
    }

    const [chapterNo, characters, openForeshadows] = await Promise.all([
      getChapterNo(chapter),
      prisma.character.findMany({
        where: { projectId: chapter.projectId, deletedAt: null },
        select: { id: true, name: true },
      }),
      prisma.foreshadow.findMany({
        where: { projectId: chapter.projectId, status: "open", deletedAt: null },
        select: { id: true, title: true, content: true },
      }),
    ]);

    const messages = wikiExtractPrompt({
      chapterNo,
      chapterTitle: chapter.title,
      chapterContent: plain,
      characterNames: characters.map((c) => c.name),
      openForeshadows: openForeshadows.map((f) => ({
        title: f.title,
        content: f.content,
      })),
    });

    const model = chapter.project.model || DEFAULT_MODEL;
    const raw = await aiChat({
      messages,
      temperature: 0.2,
      maxTokens: 2000,
      model,
      // 结构化提取无需思考；防推理烧掉 max_tokens 导致正文截断/为空
      thinking: "disabled",
    });

    const parsed = parseWikiJson(raw);
    if (!parsed) {
      console.error("[wiki] LLM 输出解析失败:", raw.slice(0, 3000));
      return { ok: false, error: "提取结果解析失败" };
    }

    // 记账（失败不阻塞）
    await logAIUsage({
      userId: chapter.project.userId,
      projectId: chapter.projectId,
      action: "extract",
      model,
      promptTokens: messages.reduce((s, m) => s + estimateTokens(m.content), 0),
      completionTokens: estimateTokens(raw),
    });

    await prisma.$transaction(async (tx) => {
      // 1. 摘要（修复"定稿后改稿摘要不更新"缺陷：每次重提都覆盖）
      if (parsed.summary) {
        await tx.chapter.update({
          where: { id: chapterId },
          data: { summary: parsed.summary },
        });
      }

      // 2. 事件：硬删重建（幂等）
      await tx.storyEvent.deleteMany({ where: { chapterId } });
      if (parsed.events.length > 0) {
        await tx.storyEvent.createMany({
          data: parsed.events.map((e, i) => ({
            projectId: chapter.projectId,
            chapterId,
            chapterNo,
            source: "chapter",
            content: e.content,
            characters: e.characters,
            key: e.key,
            order: i,
          })),
        });
      }

      // 3. 伏笔生命周期
      // 3a. resolved：基于提取前的 open 快照模糊匹配
      for (const title of parsed.foreshadows.resolved) {
        const hit = matchForeshadowTitle(title, openForeshadows);
        if (hit) {
          await tx.foreshadow.update({
            where: { id: hit.id },
            data: {
              status: "resolved",
              resolvedChapterId: chapterId,
              resolvedChapterNo: chapterNo,
            },
          });
        }
      }
      // 3b. 幂等：删除本章此前埋设且仍 open 的
      await tx.foreshadow.deleteMany({
        where: { plantedChapterId: chapterId, status: "open" },
      });
      // 3c. new：跳过与现存 open 重复的
      const currentOpen = await tx.foreshadow.findMany({
        where: { projectId: chapter.projectId, status: "open", deletedAt: null },
        select: { id: true, title: true },
      });
      for (const nf of parsed.foreshadows.new) {
        if (!nf.title) continue;
        if (matchForeshadowTitle(nf.title, currentOpen)) continue;
        await tx.foreshadow.create({
          data: {
            projectId: chapter.projectId,
            title: nf.title,
            content: nf.content,
            status: "open",
            plantedChapterId: chapterId,
            plantedChapterNo: chapterNo,
          },
        });
      }

      // 4. 角色状态卡 upsert
      for (const cu of parsed.characterUpdates) {
        const char = matchCharacter(cu.name, characters);
        if (!char) continue; // 名单外角色忽略
        const existing = await tx.characterState.findUnique({
          where: { characterId: char.id },
        });
        const prev = (existing?.current as CharacterStateCurrent) || {};

        // 旧章重提：只追加关系变化，不回退状态（防止重建记忆时覆盖新状态）
        const isOlder =
          prev.lastSeenChapterNo != null && prev.lastSeenChapterNo > chapterNo;

        const current: CharacterStateCurrent = isOlder
          ? {
              ...prev,
              relations: mergeRelations(
                prev.relations,
                cu.relationChanges,
                chapterNo
              ),
            }
          : {
              ...prev,
              location: cu.location || prev.location,
              status: cu.status || prev.status,
              goal: cu.goal || prev.goal,
              lastSeenChapterNo: chapterNo,
              relations: mergeRelations(
                prev.relations,
                cu.relationChanges,
                chapterNo
              ),
            };

        await tx.characterState.upsert({
          where: { characterId: char.id },
          create: {
            projectId: chapter.projectId,
            characterId: char.id,
            current: stateToJson(current),
          },
          update: { current: stateToJson(current) },
        });
      }
    });

    lastExtract.set(chapterId, {
      wordCount: chapter.wordCount,
      at: Date.now(),
    });
    return { ok: true };
  } catch (e) {
    console.error("[wiki] 记忆提取失败:", e);
    return { ok: false, error: e instanceof Error ? e.message : "提取失败" };
  } finally {
    inflight.delete(chapterId);
  }
}

// ============ 对话提取 ============

/**
 * 对话共创转正式项目时，从 assistant 消息提取记忆（source=chat）。
 * 幂等键：projectId + source=chat 全删重建。
 */
export async function extractChatWiki(
  projectId: string,
  sessionId: string
): Promise<ExtractResult> {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { project: { select: { userId: true, model: true } } },
  });
  if (!session) return { ok: false, error: "会话不存在" };

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId, deletedAt: null, role: "assistant" },
    orderBy: { timestamp: "asc" },
    select: { content: true },
  });
  const dialogue = messages
    .map((m) => m.content)
    .filter((c) => c && c.trim())
    .join("\n\n");
  if (dialogue.trim().length < 500) {
    return { ok: false, skipped: "empty" };
  }

  const usage = await checkQuota(session.project.userId);
  const estimatedPrompt = estimateTokens(dialogue) + 800;
  if (!usage.unlimited && usage.available < estimatedPrompt + 1600) {
    console.warn("[wiki] 配额不足，跳过对话记忆提取");
    return { ok: false, skipped: "quota" };
  }

  const characters = await prisma.character.findMany({
    where: { projectId, deletedAt: null },
    select: { id: true, name: true },
  });

  const promptMessages = wikiExtractPrompt({
    chapterNo: 0,
    chapterTitle: "对话共创阶段",
    chapterContent:
      dialogue.length > 8000 ? dialogue.slice(0, 8000) : dialogue,
    characterNames: characters.map((c) => c.name),
    openForeshadows: [],
  });

  const model = session.project.model || DEFAULT_MODEL;
  const raw = await aiChat({
    messages: promptMessages,
    temperature: 0.2,
    maxTokens: 2000,
    model,
    // 结构化提取无需思考；防推理烧掉 max_tokens 导致正文截断/为空
    thinking: "disabled",
  });
  const parsed = parseWikiJson(raw);
  if (!parsed) {
    console.error("[wiki] 对话提取解析失败:", raw.slice(0, 200));
    return { ok: false, error: "提取结果解析失败" };
  }

  await logAIUsage({
    userId: session.project.userId,
    projectId,
    action: "extract",
    model,
    promptTokens: promptMessages.reduce(
      (s, m) => s + estimateTokens(m.content),
      0
    ),
    completionTokens: estimateTokens(raw),
  });

  await prisma.$transaction(async (tx) => {
    // 幂等：chat 来源全删重建
    await tx.storyEvent.deleteMany({ where: { projectId, source: "chat" } });
    if (parsed.events.length > 0) {
      await tx.storyEvent.createMany({
        data: parsed.events.map((e, i) => ({
          projectId,
          chapterId: null,
          chapterNo: 0,
          source: "chat",
          content: e.content,
          characters: e.characters,
          key: e.key,
          order: i,
        })),
      });
    }

    // chat 阶段埋的伏笔（plantedChapterId=null 且 open）幂等重建
    await tx.foreshadow.deleteMany({
      where: { projectId, plantedChapterId: null, status: "open" },
    });
    const currentOpen = await tx.foreshadow.findMany({
      where: { projectId, status: "open", deletedAt: null },
      select: { id: true, title: true },
    });
    for (const nf of parsed.foreshadows.new) {
      if (!nf.title) continue;
      if (matchForeshadowTitle(nf.title, currentOpen)) continue;
      await tx.foreshadow.create({
        data: {
          projectId,
          title: nf.title,
          content: nf.content,
          status: "open",
          plantedChapterId: null,
          plantedChapterNo: null,
        },
      });
    }

    // 角色状态（chat 阶段 lastSeenChapterNo=0）
    for (const cu of parsed.characterUpdates) {
      const char = matchCharacter(cu.name, characters);
      if (!char) continue;
      const existing = await tx.characterState.findUnique({
        where: { characterId: char.id },
      });
      const prev = (existing?.current as CharacterStateCurrent) || {};
      const isOlder =
        prev.lastSeenChapterNo != null && prev.lastSeenChapterNo > 0;
      const current: CharacterStateCurrent = isOlder
        ? { ...prev }
        : {
            ...prev,
            location: cu.location || prev.location,
            status: cu.status || prev.status,
            goal: cu.goal || prev.goal,
            lastSeenChapterNo: 0,
            relations: mergeRelations(prev.relations, cu.relationChanges, 0),
          };
      await tx.characterState.upsert({
        where: { characterId: char.id },
        create: {
          projectId,
          characterId: char.id,
          current: stateToJson(current),
        },
        update: { current: stateToJson(current) },
      });
    }
  });

  return { ok: true };
}

// ============ 查询注入 ============

/**
 * 查询故事状态卡（注入生成上下文）。
 * 老项目零数据时返回 undefined，prompt 不渲染记忆区块。
 */
export async function getStoryState(
  projectId: string,
  opts?: { povCharacterId?: string | null }
): Promise<StoryStateContext | undefined> {
  const [states, foreshadows, keyEvents] = await Promise.all([
    prisma.characterState.findMany({
      where: { projectId, deletedAt: null },
      include: { character: { select: { name: true } } },
    }),
    prisma.foreshadow.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: {
        title: true,
        content: true,
        status: true,
        plantedChapterNo: true,
        resolvedChapterNo: true,
      },
    }),
    prisma.storyEvent.findMany({
      where: { projectId, key: true, deletedAt: null },
      orderBy: { chapterNo: "desc" },
      take: 12,
      select: { chapterNo: true, content: true },
    }),
  ]);

  if (states.length === 0 && foreshadows.length === 0 && keyEvents.length === 0) {
    return undefined;
  }

  // 角色状态：POV 角色优先 + 最近出场优先，截 10
  const sortedStates = [...states].sort((a, b) => {
    const aPov = opts?.povCharacterId && a.characterId === opts.povCharacterId ? 1 : 0;
    const bPov = opts?.povCharacterId && b.characterId === opts.povCharacterId ? 1 : 0;
    if (aPov !== bPov) return bPov - aPov;
    const aNo = (a.current as CharacterStateCurrent)?.lastSeenChapterNo ?? -1;
    const bNo = (b.current as CharacterStateCurrent)?.lastSeenChapterNo ?? -1;
    return bNo - aNo;
  });
  const characterStates = sortedStates.slice(0, 10).map((s) => {
    const cur = (s.current as CharacterStateCurrent) || {};
    return {
      name: s.character.name,
      location: cur.location,
      status: cur.status,
      goal: cur.goal,
      relationChanges: (cur.relations || []).slice(-4),
      lastSeenChapterNo: cur.lastSeenChapterNo,
    };
  });

  // 伏笔分流：open 截 15（content 截 60 字），resolved 最近 5
  const openForeshadows = foreshadows
    .filter((f) => f.status === "open")
    .slice(0, 15)
    .map((f) => ({
      title: f.title,
      content: f.content.length > 60 ? f.content.slice(0, 60) : f.content,
      plantedChapterNo: f.plantedChapterNo,
    }));
  const resolvedForeshadows = foreshadows
    .filter((f) => f.status === "resolved")
    .sort((a, b) => (b.resolvedChapterNo ?? 0) - (a.resolvedChapterNo ?? 0))
    .slice(0, 5)
    .map((f) => ({
      title: f.title,
      plantedChapterNo: f.plantedChapterNo,
      resolvedChapterNo: f.resolvedChapterNo,
    }));

  // 关键事件：倒序取 12 后反转回时间正序（时间线展示）
  const events = keyEvents.map((e) => ({
    chapterNo: e.chapterNo,
    content: e.content.length > 80 ? e.content.slice(0, 80) : e.content,
  }));
  events.reverse();

  return { characterStates, openForeshadows, resolvedForeshadows, keyEvents: events };
}
