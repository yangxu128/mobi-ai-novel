"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/**
 * 知识库（世界观 / 角色卡 / 大纲）相关 Server Actions。
 */

type EnsureResult =
  | { ok: true; user: { id: string; email: string; name?: string | null; role: string } }
  | { ok: false; error: string };

type ActionResult = { ok: true } | { ok: false; error: string };

async function ensureProjectOwner(projectId: string): Promise<EnsureResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });
  if (!project || project.userId !== user.id) {
    return { ok: false, error: "项目不存在或无权限" };
  }
  return { ok: true, user };
}

// ============ 世界观 ============

export async function saveWorldSettingAction(opts: {
  projectId: string;
  id?: string;
  title: string;
  category: "BACKGROUND" | "GEOGRAPHY" | "RULE" | "SYSTEM" | "OTHER";
  content: unknown;
}): Promise<ActionResult> {
  const check = await ensureProjectOwner(opts.projectId);
  if (!check.ok) return check;

  if (opts.id) {
    await prisma.worldSetting.update({
      where: { id: opts.id },
      data: { title: opts.title, category: opts.category, content: opts.content as object },
    });
  } else {
    await prisma.worldSetting.create({
      data: {
        projectId: opts.projectId,
        title: opts.title,
        category: opts.category,
        content: opts.content as object,
      },
    });
  }
  revalidatePath(`/pipeline/${opts.projectId}`);
  revalidatePath(`/editor/${opts.projectId}`);
  return { ok: true };
}

export async function deleteWorldSettingAction(id: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const ws = await prisma.worldSetting.findUnique({
    where: { id },
    include: { project: { select: { userId: true, id: true } } },
  });
  if (!ws || ws.project.userId !== user.id) return { ok: false, error: "无权限" };

  await prisma.worldSetting.delete({ where: { id } });
  revalidatePath(`/pipeline/${ws.project.id}`);
  revalidatePath(`/editor/${ws.project.id}`);
  return { ok: true };
}

// ============ 角色卡 ============

export async function saveCharacterAction(opts: {
  projectId: string;
  id?: string;
  name: string;
  role: "PROTAGONIST" | "SUPPORTING" | "ANTAGONIST" | "EXTRA";
  appearance?: string;
  personality?: string;
  background?: string;
  motivation?: string;
  arc?: string;
  relationships?: unknown;
}): Promise<ActionResult> {
  const check = await ensureProjectOwner(opts.projectId);
  if (!check.ok) return check;

  if (opts.id) {
    await prisma.character.update({
      where: { id: opts.id },
      data: {
        name: opts.name,
        role: opts.role,
        appearance: opts.appearance || null,
        personality: opts.personality || null,
        background: opts.background || null,
        motivation: opts.motivation || null,
        arc: opts.arc || null,
        relationships: (opts.relationships as object) || [],
      },
    });
  } else {
    await prisma.character.create({
      data: {
        projectId: opts.projectId,
        name: opts.name,
        role: opts.role,
        appearance: opts.appearance || null,
        personality: opts.personality || null,
        background: opts.background || null,
        motivation: opts.motivation || null,
        arc: opts.arc || null,
        relationships: (opts.relationships as object) || [],
      },
    });
  }
  revalidatePath(`/pipeline/${opts.projectId}`);
  revalidatePath(`/editor/${opts.projectId}`);
  return { ok: true };
}

export async function deleteCharacterAction(id: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const ch = await prisma.character.findUnique({
    where: { id },
    include: { project: { select: { userId: true, id: true } } },
  });
  if (!ch || ch.project.userId !== user.id) return { ok: false, error: "无权限" };

  await prisma.character.delete({ where: { id } });
  revalidatePath(`/pipeline/${ch.project.id}`);
  revalidatePath(`/editor/${ch.project.id}`);
  return { ok: true };
}

// ============ 大纲 ============

export async function saveOutlineAction(opts: {
  projectId: string;
  outlines: Array<{
    id?: string;
    volume: number;
    chapter: number;
    sceneTitle: string;
    sceneSummary: string;
    povCharacterId?: string;
    plotPoints: string[];
    foreshadowing?: string;
    order: number;
  }>;
}): Promise<ActionResult> {
  const check = await ensureProjectOwner(opts.projectId);
  if (!check.ok) return check;

  // 简化策略：删除全部后重新创建（MVP）
  await prisma.outline.deleteMany({ where: { projectId: opts.projectId } });
  await prisma.outline.createMany({
    data: opts.outlines.map((o) => ({
      projectId: opts.projectId,
      volume: o.volume,
      chapter: o.chapter,
      sceneTitle: o.sceneTitle,
      sceneSummary: o.sceneSummary,
      povCharacterId: o.povCharacterId || null,
      plotPoints: o.plotPoints,
      foreshadowing: o.foreshadowing || null,
      order: o.order,
    })),
  });

  revalidatePath(`/pipeline/${opts.projectId}`);
  revalidatePath(`/editor/${opts.projectId}`);
  return { ok: true };
}

/**
 * 根据大纲批量创建空章节。
 */
export async function createChaptersFromOutlinesAction(projectId: string): Promise<ActionResult> {
  const check = await ensureProjectOwner(projectId);
  if (!check.ok) return check;

  const outlines = await prisma.outline.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });

  for (const o of outlines) {
    const exists = await prisma.chapter.findUnique({ where: { outlineId: o.id } });
    if (!exists) {
      await prisma.chapter.create({
        data: {
          projectId,
          outlineId: o.id,
          title: `第${o.chapter}章 ${o.sceneTitle}`,
        },
      });
    }
  }

  revalidatePath(`/editor/${projectId}`);
  revalidatePath(`/pipeline/${projectId}`);
  return { ok: true };
}
