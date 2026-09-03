"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { extractChapterWiki } from "@/lib/ai/wiki";

/**
 * 章节相关 Server Actions。
 */

export async function saveChapterContentAction(chapterId: string, content: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      project: { select: { userId: true, id: true, autoMemory: true } },
    },
  });
  if (!chapter || chapter.project.userId !== user.id) {
    return { ok: false, error: "章节不存在或无权限" };
  }

  const wordCount = content.replace(/\s/g, "").length;
  await prisma.chapter.update({
    where: { id: chapterId },
    data: { content, wordCount },
  });

  // 更新项目总字数（用 Prisma 聚合 + update 避免 raw query 的 uuid/text 类型问题）
  const agg = await prisma.chapter.aggregate({
    where: { projectId: chapter.projectId, deletedAt: null },
    _sum: { wordCount: true },
  });
  await prisma.project.update({
    where: { id: chapter.projectId },
    data: { wordCount: agg._sum.wordCount ?? 0 },
  });

  // 静默刷新 SSR 数据，不触发客户端 fetch abort
  revalidatePath(`/project/${chapter.projectId}`);

  // 记忆 wiki：保存后异步提取（节流 + 配额不足时静默跳过）
  if (chapter.project.autoMemory) {
    after(async () => {
      try {
        const res = await extractChapterWiki(chapterId);
        if (!res.ok && res.skipped && res.skipped !== "throttled" && res.skipped !== "inflight" && res.skipped !== "empty") {
          console.warn("[wiki] 自动提取跳过:", res.skipped);
        }
      } catch (e) {
        console.error("[wiki] 自动提取失败:", e);
      }
    });
  }

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

  revalidatePath(`/project/${opts.projectId}`);
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

  // 软删除：标记 deletedAt
  await prisma.chapter.update({
    where: { id: chapterId },
    data: { deletedAt: new Date() },
  });
  revalidatePath(`/project/${chapter.project.id}`);
  return { ok: true };
}

export async function renameChapterAction(chapterId: string, title: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { project: { select: { userId: true, id: true } } },
  });
  if (!chapter || chapter.project.userId !== user.id) {
    return { ok: false, error: "章节不存在或无权限" };
  }

  await prisma.chapter.update({
    where: { id: chapterId },
    data: { title },
  });
  revalidatePath(`/project/${chapter.project.id}`);
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

  // 定稿强制重提取记忆 wiki（绕过节流；覆盖旧摘要，修复"改稿后摘要停留在初版"缺陷）
  after(async () => {
    try {
      const res = await extractChapterWiki(chapterId, { force: true });
      if (!res.ok) {
        console.warn("[wiki] 定稿提取未完成:", res.skipped || res.error);
      }
    } catch (e) {
      console.error("[wiki] 定稿提取失败:", e);
    }
  });

  revalidatePath(`/project/${chapter.project.id}`);
  return { ok: true };
}

/**
 * 校验实体归属当前用户。
 * chapter/worldsetting/character 均通过 projectId 关联到 Project.userId。
 */
async function ensureEntityOwned(
  entityType: "chapter" | "worldsetting" | "character",
  entityId: string,
  userId: string
): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
  if (entityType === "chapter") {
    const ch = await prisma.chapter.findUnique({
      where: { id: entityId },
      include: { project: { select: { userId: true, id: true } } },
    });
    if (!ch || ch.project.userId !== userId) {
      return { ok: false, error: "实体不存在或无权限" };
    }
    return { ok: true, projectId: ch.project.id };
  }
  if (entityType === "worldsetting") {
    const ws = await prisma.worldSetting.findUnique({
      where: { id: entityId },
      include: { project: { select: { userId: true, id: true } } },
    });
    if (!ws || ws.project.userId !== userId) {
      return { ok: false, error: "实体不存在或无权限" };
    }
    return { ok: true, projectId: ws.project.id };
  }
  // character
  const c = await prisma.character.findUnique({
    where: { id: entityId },
    include: { project: { select: { userId: true, id: true } } },
  });
  if (!c || c.project.userId !== userId) {
    return { ok: false, error: "实体不存在或无权限" };
  }
  return { ok: true, projectId: c.project.id };
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

  const check = await ensureEntityOwned(opts.entityType, opts.entityId, user.id);
  if (!check.ok) return check;

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

  const check = await ensureEntityOwned(opts.entityType, opts.entityId, user.id);
  if (!check.ok) return [];

  return prisma.version.findMany({
    where: {
      entityType: opts.entityType,
      entityId: opts.entityId,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}
