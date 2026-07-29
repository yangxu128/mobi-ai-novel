import { prisma } from "@/lib/prisma";

/**
 * 在 Server Component 渲染时确保项目处于目标模式。
 * 若 mode 不匹配，直接更新 DB（含 CHAT 模式自动建 session），返回更新后的 mode。
 * 用于替代"mode 不匹配时 redirect 回去"的双往返模式。
 */
export async function ensureProjectMode(
  projectId: string,
  userId: string,
  targetMode: "PIPELINE" | "WORKBENCH" | "CHAT"
): Promise<"PIPELINE" | "WORKBENCH" | "CHAT" | null> {
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
