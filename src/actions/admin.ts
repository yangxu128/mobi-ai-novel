"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import type { Prisma } from "@prisma/client";

type ActionResult = { ok: true } | { ok: false; error: string };

// ============ 查询 ============

/** 仪表盘统计 */
export async function getAdminStatsAction() {
  const admin = await requireAdmin();
  if (!admin) return { ok: false as const, error: "无权限" };

  const [userCount, projectCount, chapterCount, todayLogs] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.chapter.count(),
    prisma.aIUsageLog.findMany({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      select: { promptTokens: true, completionTokens: true },
    }),
  ]);

  const todayTokens = todayLogs.reduce(
    (sum, l) => sum + (l.promptTokens || 0) + (l.completionTokens || 0),
    0
  );

  // 近 7 天每日 AI Token 数
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const recentLogs = await prisma.aIUsageLog.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true, promptTokens: true, completionTokens: true },
  });
  const dailyTokens: { date: string; tokens: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    const tokens = recentLogs
      .filter((l) => {
        const ld = new Date(l.createdAt);
        return ld.getFullYear() === d.getFullYear() &&
          ld.getMonth() === d.getMonth() &&
          ld.getDate() === d.getDate();
      })
      .reduce((s, l) => s + (l.promptTokens || 0) + (l.completionTokens || 0), 0);
    dailyTokens.push({ date: key, tokens });
  }

  return {
    ok: true as const,
    stats: {
      userCount,
      projectCount,
      chapterCount,
      todayTokens,
      dailyTokens,
    },
  };
}

/** 用户列表 */
export async function getAdminUsersAction(opts?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const admin = await requireAdmin();
  if (!admin) return { ok: false as const, error: "无权限" };

  const page = Math.max(1, opts?.page || 1);
  const pageSize = Math.min(100, Math.max(1, opts?.pageSize || 20));
  const where: Prisma.UserWhereInput = {};
  if (opts?.search) {
    where.OR = [
      { email: { contains: opts.search, mode: "insensitive" } },
      { name: { contains: opts.search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true,
        _count: { select: { projects: true, aiUsageLogs: true } },
        subscription: { select: { plan: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return { ok: true as const, users, total, page, pageSize };
}

/** 项目列表 */
export async function getAdminProjectsAction(opts?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const admin = await requireAdmin();
  if (!admin) return { ok: false as const, error: "无权限" };

  const page = Math.max(1, opts?.page || 1);
  const pageSize = Math.min(100, Math.max(1, opts?.pageSize || 20));
  const where: Prisma.ProjectWhereInput = {};
  if (opts?.search) {
    where.OR = [
      { title: { contains: opts.search, mode: "insensitive" } },
      { user: { email: { contains: opts.search, mode: "insensitive" } } },
    ];
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      select: {
        id: true,
        title: true,
        genre: true,
        mode: true,
        status: true,
        wordCount: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, email: true, name: true } },
        _count: { select: { chapters: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.project.count({ where }),
  ]);

  return { ok: true as const, projects, total, page, pageSize };
}

/** AI 用量日志 */
export async function getAdminAiLogsAction(opts?: {
  page?: number;
  pageSize?: number;
}) {
  const admin = await requireAdmin();
  if (!admin) return { ok: false as const, error: "无权限" };

  const page = Math.max(1, opts?.page || 1);
  const pageSize = Math.min(100, Math.max(1, opts?.pageSize || 20));

  const [logs, total] = await Promise.all([
    prisma.aIUsageLog.findMany({
      select: {
        id: true,
        action: true,
        model: true,
        promptTokens: true,
        completionTokens: true,
        createdAt: true,
        user: { select: { email: true, name: true } },
        project: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.aIUsageLog.count(),
  ]);

  return { ok: true as const, logs, total, page, pageSize };
}

// ============ 操作 ============

/** 修改用户角色 */
export async function updateUserRoleAction(userId: string, role: "ADMIN" | "FREE" | "BASIC" | "PRO"): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "无权限" };
  if (admin.id === userId && role !== "ADMIN") {
    return { ok: false, error: "不能取消自己的管理员权限" };
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
  return { ok: true };
}

/** 删除用户 */
export async function deleteUserAction(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "无权限" };
  if (admin.id === userId) {
    return { ok: false, error: "不能删除自己" };
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
  return { ok: true };
}

/** 删除项目（管理员） */
export async function deleteProjectAdminAction(projectId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "无权限" };

  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/admin/projects");
  return { ok: true };
}
