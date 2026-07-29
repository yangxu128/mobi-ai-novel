/**
 * RAG 检索 + 上下文窗口管理。
 *
 * MVP 版本策略：
 * - 知识库 RAG：在 Supabase 上用 pgvector 检索（需先建好索引和触发器）；
 *   若 pgvector 不可用，自动降级为按 category 全量取世界观，按 role 取主角+反派。
 * - 上下文窗口：按设计文档的分层摘要策略——近期 2-3 章原文 + 中期 10-20 章摘要 + 知识卡。
 */

import { prisma } from "@/lib/prisma";
import type { KnowledgeContext } from "./prompts";

const categoryLabel: Record<string, string> = {
  BACKGROUND: "时代背景",
  GEOGRAPHY: "地理",
  RULE: "社会规则",
  SYSTEM: "力量体系",
  OTHER: "其他",
};

const roleLabel: Record<string, string> = {
  PROTAGONIST: "主角",
  SUPPORTING: "配角",
  ANTAGONIST: "反派",
  EXTRA: "路人",
};

/**
 * 组装章节扩写所需的上下文。
 */
export async function buildChapterContext(opts: {
  projectId: string;
  currentOutlineId?: string;
  query?: string; // RAG 查询（如大纲摘要 + 角色名）
}): Promise<KnowledgeContext> {
  const [worldSettings, characters, recentChapters, currentOutline] =
    await Promise.all([
      // 世界观全量（MVP 不做向量检索，全量返回，单项目通常不超过 20 张）
      prisma.worldSetting.findMany({
        where: { projectId: opts.projectId },
        orderBy: { updatedAt: "desc" },
      }),
      // 角色全量
      prisma.character.findMany({
        where: { projectId: opts.projectId },
        orderBy: [{ role: "asc" }, { updatedAt: "desc" }],
      }),
      // 最近 3 章原文 + 更早 5 章摘要
      prisma.chapter.findMany({
        where: { projectId: opts.projectId },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          title: true,
          content: true,
          summary: true,
          wordCount: true,
        },
      }),
      // 当前大纲
      opts.currentOutlineId
        ? prisma.outline.findUnique({
            where: { id: opts.currentOutlineId },
          })
        : Promise.resolve(null),
    ]);

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

  return {
    worldSettings: worldSettings.map((w: typeof worldSettings[number]) => ({
      title: w.title,
      content:
        typeof w.content === "string"
          ? w.content
          : JSON.stringify(w.content, null, 2),
      category: categoryLabel[w.category] || w.category,
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
  };
}

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
    | "expand"
    | "polish"
    | "chat";
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
