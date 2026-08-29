import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureProjectMode } from "@/lib/project-mode";
import { ProjectWorkspace } from "@/components/project-workspace";
import type { ViewMode } from "@/components/project-mode-switcher";

const VIEW_TO_MODE: Record<string, ViewMode> = {
  pipeline: "PIPELINE",
  workbench: "WORKBENCH",
  chat: "CHAT",
};

const MODE_TO_VIEW: Record<ViewMode, string> = {
  PIPELINE: "pipeline",
  WORKBENCH: "workbench",
  CHAT: "chat",
};

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id: projectId } = await params;
  const { view: viewQuery } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // 解析初始视图：URL ?view=pipeline|workbench|chat
  let initialView: ViewMode = "PIPELINE";
  if (viewQuery && VIEW_TO_MODE[viewQuery]) {
    initialView = VIEW_TO_MODE[viewQuery];
  }

  // 一次 SSR：模式更新 + 完整项目数据（覆盖三个视图所需的所有字段）
  // 三个视图共享同一份数据，避免路由切换时重新查询
  const [, project] = await Promise.all([
    ensureProjectMode(projectId, session.user.id, initialView).catch(() => null),
    prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      select: {
        id: true,
        title: true,
        genre: true,
        mode: true,
        currentStep: true,
        synopsis: true,
        model: true,
        // 流水线 + 工作台 + 对话共创所需的所有字段
        worldSettings: {
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            category: true,
            title: true,
            content: true,
          },
        },
        characters: {
          orderBy: [{ role: "asc" }, { updatedAt: "desc" }],
          select: {
            id: true,
            name: true,
            role: true,
            appearance: true,
            personality: true,
            background: true,
            motivation: true,
            arc: true,
          },
        },
        outlines: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            volume: true,
            chapter: true,
            sceneTitle: true,
            sceneSummary: true,
            povCharacterId: true,
            plotPoints: true,
            foreshadowing: true,
            order: true,
          },
        },
        chapters: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            title: true,
            content: true,
            wordCount: true,
            status: true,
            outline: {
              select: {
                id: true,
                order: true,
                sceneTitle: true,
                sceneSummary: true,
                plotPoints: true,
              },
            },
          },
        },
      },
    }),
  ]);

  if (!project) notFound();

  return (
    <ProjectWorkspace
      project={project as unknown as React.ComponentProps<typeof ProjectWorkspace>["project"]}
      initialView={initialView}
    />
  );
}
