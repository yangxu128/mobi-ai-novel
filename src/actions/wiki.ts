"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { extractChapterWiki } from "@/lib/ai/wiki";

/**
 * 记忆 wiki 相关 Server Actions。
 * - 手动更新单章记忆（force）
 * - 游标式重建项目记忆（每次 1 章，客户端循环推进）
 * - 伏笔状态手动切换
 * - 自动记忆开关
 */

/** 手动强制重提单章记忆 */
export async function updateChapterWikiAction(chapterId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { project: { select: { userId: true, id: true } } },
  });
  if (!chapter || chapter.project.userId !== user.id) {
    return { ok: false, error: "章节不存在或无权限" };
  }

  const res = await extractChapterWiki(chapterId, { force: true });
  if (!res.ok) {
    if (res.skipped === "quota") {
      return { ok: false, error: "今日 AI 配额不足，无法提取记忆" };
    }
    if (res.skipped === "empty") {
      return { ok: false, error: "正文太短（少于 200 字），暂无可提取记忆" };
    }
    return { ok: false, error: res.error || "提取失败" };
  }

  revalidatePath(`/project/${chapter.project.id}`);
  return { ok: true };
}

/**
 * 游标式重建项目记忆：每次调用处理 1 章，客户端循环直到 done。
 * cursor=0 时清空章节提取产物（chat 对话阶段的记忆事件保留）。
 */
export async function rebuildProjectMemoryAction(
  projectId: string,
  cursor: number
): Promise<{
  ok: boolean;
  done?: boolean;
  processed: number;
  total: number;
  error?: string;
  skipped?: string;
}> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, processed: cursor, total: 0, error: "未登录" };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });
  if (!project || project.userId !== user.id) {
    return { ok: false, processed: cursor, total: 0, error: "项目不存在或无权限" };
  }

  // 重置：清空章节提取产物（伏笔只删章节埋设/回收的，chat 阶段埋的保留）
  if (cursor <= 0) {
    await prisma.$transaction([
      prisma.storyEvent.deleteMany({
        where: { projectId, chapterId: { not: null } },
      }),
      prisma.foreshadow.deleteMany({
        where: {
          projectId,
          OR: [
            { plantedChapterId: { not: null } },
            { resolvedChapterId: { not: null } },
          ],
        },
      }),
      prisma.characterState.deleteMany({ where: { projectId } }),
    ]);
  }

  // 按时间线顺序取全部章节（大纲 order 优先）
  const chapters = await prisma.chapter.findMany({
    where: { projectId, deletedAt: null },
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

  if (cursor >= sorted.length) {
    return { ok: true, done: true, processed: cursor, total: sorted.length };
  }

  const target = sorted[cursor];
  const res = await extractChapterWiki(target.id, { force: true });

  // 配额不足时停止推进（明日可从当前 cursor 继续）
  if (!res.ok && res.skipped === "quota") {
    return {
      ok: false,
      processed: cursor,
      total: sorted.length,
      error: "今日 AI 配额不足，可明日从当前进度继续重建",
    };
  }

  // 其它失败（空章节/解析失败）跳过继续
  revalidatePath(`/project/${projectId}`);
  return {
    ok: true,
    done: cursor + 1 >= sorted.length,
    processed: cursor + 1,
    total: sorted.length,
    skipped: res.ok ? undefined : res.skipped || res.error,
  };
}

/** 伏笔状态手动切换（待回收/已回收/已放弃） */
export async function setForeshadowStatusAction(
  foreshadowId: string,
  status: "open" | "resolved" | "abandoned"
) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const foreshadow = await prisma.foreshadow.findUnique({
    where: { id: foreshadowId },
    include: { project: { select: { userId: true, id: true } } },
  });
  if (!foreshadow || foreshadow.project.userId !== user.id) {
    return { ok: false, error: "伏笔不存在或无权限" };
  }

  await prisma.foreshadow.update({
    where: { id: foreshadowId },
    data: { status },
  });

  revalidatePath(`/project/${foreshadow.project.id}`);
  return { ok: true };
}

/** 自动记忆开关（保存章节后是否自动提取） */
export async function toggleAutoMemoryAction(
  projectId: string,
  enabled: boolean
) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });
  if (!project || project.userId !== user.id) {
    return { ok: false, error: "项目不存在或无权限" };
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { autoMemory: enabled },
  });

  revalidatePath(`/project/${projectId}`);
  return { ok: true };
}
