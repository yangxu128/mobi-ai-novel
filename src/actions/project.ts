"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { z } from "zod";
import type { StyleProfile } from "@/lib/ai/style";

export type ProjectListItem = {
  id: string;
  title: string;
  genre: string;
  mode: string;
  status: string;
  currentStep: number;
  wordCount: number;
  synopsis: string | null;
  coverImage: string | null;
  updatedAt: Date;
};

export async function listProjectsAction(): Promise<ProjectListItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const projects = await prisma.project.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      genre: true,
      mode: true,
      status: true,
      currentStep: true,
      wordCount: true,
      synopsis: true,
      coverImage: true,
      updatedAt: true,
    },
  });
  return projects;
}

const createSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(80, "标题最多 80 字"),
  genre: z.string().min(1),
  mode: z.enum(["PIPELINE", "WORKBENCH", "CHAT"]),
  synopsis: z.string().optional(),
  styleProfile: z.any().optional(),
});

export async function createProjectAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    genre: formData.get("genre"),
    mode: formData.get("mode"),
    synopsis: formData.get("synopsis") || undefined,
    styleProfile: formData.get("styleProfile") ? JSON.parse(formData.get("styleProfile") as string) : undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  // 免费版限制 1 个项目
  const count = await prisma.project.count({ where: { userId: user.id } });
  if (user.role === "FREE" && count >= 1) {
    return { ok: false, error: "免费版仅可创建 1 个项目，请升级" };
  }

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      genre: parsed.data.genre,
      mode: parsed.data.mode,
      synopsis: parsed.data.synopsis || null,
      styleProfile: parsed.data.styleProfile ?? null,
    },
  });

  // 对话模式自动创建一个 chat session
  if (parsed.data.mode === "CHAT") {
    await prisma.chatSession.create({
      data: { projectId: project.id },
    });
  }

  revalidatePath("/projects");
  return { ok: true, projectId: project.id };
}

export async function deleteProjectAction(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== user.id) {
    return { ok: false, error: "项目不存在或无权限" };
  }

  // 软删除：标记 deletedAt，不物理删除
  await prisma.project.update({
    where: { id: projectId },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/projects");
  return { ok: true };
}

export async function getProjectAction(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id, deletedAt: null },
    include: {
      worldSettings: { where: { deletedAt: null }, orderBy: { updatedAt: "desc" } },
      characters: { where: { deletedAt: null }, orderBy: [{ role: "asc" }, { updatedAt: "desc" }] },
      outlines: { orderBy: { order: "asc" } },
      chapters: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      chatSessions: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!project || project.userId !== user.id) {
    return { ok: false, error: "项目不存在或无权限" };
  }
  return { ok: true, project };
}

export async function updateProjectModeAction(projectId: string, mode: "PIPELINE" | "WORKBENCH" | "CHAT") {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id, deletedAt: null },
    include: { _count: { select: { chatSessions: true } } },
  });
  if (!project || project.userId !== user.id) {
    return { ok: false, error: "项目不存在或无权限" };
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { mode },
  });

  // 切换到 CHAT 时若没有 session 则创建
  if (mode === "CHAT" && project._count.chatSessions === 0) {
    await prisma.chatSession.create({ data: { projectId } });
  }

  // 不调用 revalidatePath：mode 切换不改变任何已加载的页面数据，
  // 重新刷新反而会让 ProjectPage 重新执行 prisma 查询（且 chapters.content 可能很大），
  // 造成切换卡顿。mode 状态仅在下次完整加载项目时由 SSR 读取生效。
  return { ok: true };
}

export async function updateProjectStepAction(projectId: string, step: number) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  await prisma.project.update({
    where: { id: projectId, userId: user.id },
    data: { currentStep: step },
  });
  // currentStep 变化不影响当前视图已渲染的内容，避免刷新整页
  return { ok: true };
}

export async function updateProjectSynopsisSelected(projectId: string, synopsis: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  await prisma.project.update({
    where: { id: projectId, userId: user.id },
    data: { synopsis },
  });
  revalidatePath(`/project/${projectId}`);
  return { ok: true };
}

export async function updateStyleProfileAction(
  projectId: string,
  profile: StyleProfile | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id, deletedAt: null },
  });
  if (!project) return { ok: false, error: "项目不存在或无权限" };

  await prisma.project.update({
    where: { id: projectId },
    data: { styleProfile: profile === null ? Prisma.JsonNull : (profile as unknown as Prisma.InputJsonValue) },
  });

  return { ok: true };
}

/**
 * 更新项目级 AI 模型。
 * model 传 null 表示回退到默认模型。
 */
export async function updateProjectModelAction(
  projectId: string,
  model: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id, deletedAt: null },
  });
  if (!project) return { ok: false, error: "项目不存在或无权限" };

  await prisma.project.update({
    where: { id: projectId },
    data: { model },
  });

  return { ok: true };
}
