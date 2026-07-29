"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { chat as aiChat } from "@/lib/ai/provider";
import { summaryPrompt } from "@/lib/ai/prompts";

/**
 * 章节相关 Server Actions。
 */

export async function saveChapterContentAction(chapterId: string, content: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { project: { select: { userId: true } } },
  });
  if (!chapter || chapter.project.userId !== user.id) {
    return { ok: false, error: "章节不存在或无权限" };
  }

  const wordCount = content.replace(/\s/g, "").length;
  await prisma.chapter.update({
    where: { id: chapterId },
    data: { content, wordCount },
  });

  // 更新项目总字数
  await prisma.$executeRaw`
    UPDATE projects SET "wordCount" = (
      SELECT COALESCE(SUM("wordCount"), 0) FROM chapters WHERE "projectId" = ${chapter.projectId}
    ), "updatedAt" = NOW()
    WHERE id = ${chapter.projectId}
  `;

  return { ok: true, wordCount };
}

export async function createChapterAction(opts: {
  projectId: string;
  title: string;
  outlineId?: string;
}) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const project = await prisma.project.findUnique({
    where: { id: opts.projectId },
    select: { userId: true },
  });
  if (!project || project.userId !== user.id) {
    return { ok: false, error: "项目不存在或无权限" };
  }

  const chapter = await prisma.chapter.create({
    data: {
      projectId: opts.projectId,
      title: opts.title,
      outlineId: opts.outlineId || null,
    },
  });

  revalidatePath(`/editor/${opts.projectId}`);
  return { ok: true, chapter };
}

export async function deleteChapterAction(chapterId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { project: { select: { userId: true, id: true } } },
  });
  if (!chapter || chapter.project.userId !== user.id) {
    return { ok: false, error: "章节不存在或无权限" };
  }

  await prisma.chapter.delete({ where: { id: chapterId } });
  revalidatePath(`/editor/${chapter.project.id}`);
  return { ok: true };
}

export async function renameChapterAction(chapterId: string, title: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  await prisma.chapter.update({
    where: { id: chapterId },
    data: { title },
  });
  return { ok: true };
}

export async function markChapterFinalAction(chapterId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { project: { select: { userId: true, id: true } } },
  });
  if (!chapter || chapter.project.userId !== user.id) {
    return { ok: false, error: "无权限" };
  }

  await prisma.chapter.update({
    where: { id: chapterId },
    data: { status: "final" },
  });

  // 异步生成摘要
  if (chapter.content && !chapter.summary) {
    try {
      const summary = await aiChat({
        messages: summaryPrompt(chapter.content),
        temperature: 0.3,
        maxTokens: 500,
      });
      await prisma.chapter.update({
        where: { id: chapterId },
        data: { summary: summary.trim() },
      });
    } catch (e) {
      console.error("[summary] 生成摘要失败:", e);
    }
  }

  revalidatePath(`/editor/${chapter.project.id}`);
  revalidatePath(`/pipeline/${chapter.project.id}`);
  return { ok: true };
}

/**
 * 保存版本快照。
 */
export async function saveVersionAction(opts: {
  entityType: "chapter" | "worldsetting" | "character";
  entityId: string;
  snapshot: unknown;
  label?: string;
}) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  await prisma.version.create({
    data: {
      entityType: opts.entityType,
      entityId: opts.entityId,
      snapshot: opts.snapshot as object,
      label: opts.label,
    },
  });
  return { ok: true };
}

export async function listVersionsAction(opts: {
  entityType: "chapter" | "worldsetting" | "character";
  entityId: string;
}) {
  const user = await getCurrentUser();
  if (!user) return [];

  return prisma.version.findMany({
    where: { entityType: opts.entityType, entityId: opts.entityId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}
