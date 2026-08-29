import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * 在 Server Component 渲染时确保项目处于目标模式。
 * 若 mode 不匹配，直接更新 DB（含 CHAT 模式自动建 session），返回更新后的 mode。
 *
 * 关键：使用 React.cache 包装查询，确保同一个请求中多次调用只查一次 DB。
 * 这在以下场景很重要：layout/page 各自调用 prisma 时（如后续引入项目 layout），
 * 不会产生重复查询。
 */
export const ensureProjectMode = cache(
  async (
    projectId: string,
    userId: string,
    targetMode: "PIPELINE" | "WORKBENCH" | "CHAT"
  ): Promise<"PIPELINE" | "WORKBENCH" | "CHAT" | null> => {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true, mode: true, _count: { select: { chatSessions: true } } },
    });

    if (!project || project.userId !== userId) return null;

    if (project.mode === targetMode) return targetMode;

    await prisma.project.update({
      where: { id: projectId },
      data: { mode: targetMode },
    });

    // 切换到 CHAT 时若没有 session 则创建
    if (targetMode === "CHAT" && project._count.chatSessions === 0) {
      await prisma.chatSession.create({ data: { projectId } });
    }

    return targetMode;
  }
);
