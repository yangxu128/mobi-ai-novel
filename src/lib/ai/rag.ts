/**
 * RAG 检索 + 上下文窗口管理。
 *
 * MVP 版本策略：
 * - 知识库 RAG：在 Supabase 上用 pgvector 检索（需先建好索引和触发器）；
 *   若 pgvector 不可用，自动降级为按 category 全量取世界观，按 role 取主角+反派。
 * - 上下文窗口：按设计文档的分层摘要策略——近期 2-3 章原文 + 中期 10-20 章摘要 + 知识卡。
 *
 * 性能优化：使用 React.cache 包装，同一请求内多次调用只查一次 DB。
 * 这在 route.ts 的 actionHandlers 中很重要：expand/consistency/chat 都可能
 * 在同一个请求中调用 buildChapterContext（虽然当前只有一个 action 被触发，
 * 但 cache 也能防止将来引入复合 action 时的重复查询）。
 */

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { KnowledgeContext } from "./prompts";
import { getCategoryLabel, roleLabel } from "@/lib/knowledge/labels";
import { getStoryState } from "./wiki";

/**
 * 组装章节扩写所需的上下文。
 * 使用 React.cache 包装：同一请求内多次调用同一 projectId 只查一次 DB。
 */
export const buildChapterContext = cache(
  async (opts: {
    projectId: string;
    currentOutlineId?: string;
    query?: string; // RAG 查询（如大纲摘要 + 角色名）
  }): Promise<KnowledgeContext> => {
    const [worldSettings, characters, currentOutline, project] =
      await Promise.all([
      // 世界观：限制最多 30 条，防止知识库过大时 prompt 爆 token
      prisma.worldSetting.findMany({
        where: { projectId: opts.projectId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 30,
      }),
      // 角色：限制最多 20 条
      prisma.character.findMany({
        where: { projectId: opts.projectId, deletedAt: null },
        orderBy: [{ role: "asc" }, { updatedAt: "desc" }],
        take: 20,
      }),
      // 当前大纲
      opts.currentOutlineId
        ? prisma.outline.findUnique({
            where: { id: opts.currentOutlineId },
          })
        : Promise.resolve(null),
      // 题材（用于 SYSTEM 槽位的自适应标签：力量体系 ↔ 人物关系）
      prisma.project.findUnique({
        where: { id: opts.projectId },
        select: { genre: true },
      }),
    ]);

  // 按"大纲顺序"取前文，而非 createdAt desc
  // 逻辑：
  // 1. 如果有 currentOutline，按其 order 找到前面 order 严格小于它的 8 个大纲（按 order 降序取 8 个）
  // 2. 如果没有 currentOutline（无大纲关联），退回 createdAt desc 兜底
  let chapterCandidates: Array<{
    id: string;
    title: string;
    content: string | null;
    summary: string | null;
    wordCount: number;
  }> = [];

  if (currentOutline) {
    // 1. 取紧邻的 8 个大纲（order 降序）
    const prevOutlines = await prisma.outline.findMany({
      where: {
        projectId: opts.projectId,
        order: { lt: currentOutline.order },
      },
      orderBy: { order: "desc" },
      take: 8,
      select: { id: true, sceneTitle: true, sceneSummary: true },
    });

    // 2. 通过 outlineId 反查 chapter（一个大纲可能 0 章、1 章或多章）
    if (prevOutlines.length > 0) {
      const prevOutlineIds = prevOutlines.map((o) => o.id);
      chapterCandidates = await prisma.chapter.findMany({
        where: {
          projectId: opts.projectId,
          outlineId: { in: prevOutlineIds },
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          content: true,
          summary: true,
          wordCount: true,
        },
      });
    }
  }

  // 兜底：如果按大纲顺序取不到任何章节（旧数据/无大纲关联场景），退回 createdAt desc
  if (chapterCandidates.length === 0) {
    chapterCandidates = await prisma.chapter.findMany({
      where: { projectId: opts.projectId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        content: true,
        summary: true,
        wordCount: true,
      },
    });
  }

  // 限制最多 8 章
  let recentChapters = chapterCandidates.slice(0, 8);

  // 按大纲顺序升序排序：紧邻的上一章排第 1 位，最早一章排最后
  // 保证"前 3 章用原文"中的"前 3 章"是真正的紧邻前文，而非 DB 任意顺序
  if (currentOutline && recentChapters.length > 0) {
    const candidateIds = recentChapters.map((c) => c.id);
    const chaptersWithOutline = await prisma.chapter.findMany({
      where: { id: { in: candidateIds } },
      select: { id: true, outline: { select: { order: true } } },
    });
    const orderMap = new Map(
      chaptersWithOutline.map((c) => [c.id, c.outline?.order ?? Infinity])
    );
    recentChapters = recentChapters.sort((a, b) => {
      return (orderMap.get(a.id) ?? Infinity) - (orderMap.get(b.id) ?? Infinity);
    });
  }

  // 分层：前 3 章用原文，后 5 章用摘要
  const layered = recentChapters.map((ch: { title: string; content: string | null; summary: string | null }, idx: number) => {
    if (idx < 3) {
      // 原文，但截断到 3000 字以内避免 token 爆炸
      const content = ch.content || "";
      return {
        title: ch.title,
        content: content.length > 3000 ? content.slice(0, 3000) + "..." : content,
      };
    }
    return {
      title: ch.title,
      summary: ch.summary || "(本章节暂无摘要)",
    };
  });

  // 记忆 wiki：故事状态卡（动态角色状态 + 伏笔生命周期 + 关键事件时间线）
  // 老项目无 wiki 数据时 getStoryState 返回 undefined，prompt 无该区块，零降级
  const storyState = await getStoryState(opts.projectId, {
    povCharacterId: currentOutline?.povCharacterId ?? null,
  });

  return {
    worldSettings: worldSettings.map((w: typeof worldSettings[number]) => ({
      title: w.title,
      content:
        typeof w.content === "string"
          ? w.content
          : JSON.stringify(w.content, null, 2),
      // 标签随题材模式自适应（奇设可从标题/内容中检测）
      category: getCategoryLabel(
        w.category,
        project?.genre,
        `${w.title} ${typeof w.content === "string" ? w.content : ""}`
      ),
    })),
    characters: characters.map((c: typeof characters[number]) => ({
      name: c.name,
      role: roleLabel[c.role] || c.role,
      appearance: c.appearance || undefined,
      personality: c.personality || undefined,
      background: c.background || undefined,
      motivation: c.motivation || undefined,
    })),
    recentChapters: layered,
    currentOutline: currentOutline
      ? {
          sceneTitle: currentOutline.sceneTitle,
          sceneSummary: currentOutline.sceneSummary,
          plotPoints: Array.isArray(currentOutline.plotPoints)
            ? (currentOutline.plotPoints as string[])
            : [],
        }
      : undefined,
    storyState,
  };
}
);

/**
 * 用量记账。失败不阻塞主流程。
 */
export async function logAIUsage(opts: {
  userId: string;
  projectId?: string;
  action:
    | "inspire"
    | "worldbuild"
    | "character"
    | "outline"
    | "outlineAppend"
    | "expand"
    | "polish"
    | "chat"
    | "consistency"
    | "extract"
    | "summary"
    | "analyzeStyle";
  model: string;
  promptTokens: number;
  completionTokens: number;
  cost?: number;
}) {
  try {
    await prisma.aIUsageLog.create({
      data: {
        userId: opts.userId,
        projectId: opts.projectId,
        action: opts.action,
        model: opts.model,
        promptTokens: opts.promptTokens,
        completionTokens: opts.completionTokens,
        cost: opts.cost || 0,
      },
    });
  } catch (e) {
    console.error("[logAIUsage] 记账失败（不阻塞）:", e);
  }
}
