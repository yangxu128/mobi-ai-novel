import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureProjectMode } from "@/lib/project-mode";
import { ProjectWorkspace } from "@/components/project-workspace";
import type { ViewMode } from "@/components/project-mode-switcher";
import type {
  CharacterStateCurrent,
  StoryMemoryView,
} from "@/types/memory";

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
        targetChapters: true,
        chapterWords: true,
        autoMemory: true,
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
            characterStates: { select: { current: true } },
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
                volume: true,
                sceneTitle: true,
                sceneSummary: true,
                plotPoints: true,
              },
            },
          },
        },
        // 记忆 wiki 三表（知识库"记忆"页签）
        foreshadows: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            title: true,
            content: true,
            status: true,
            plantedChapterNo: true,
            resolvedChapterNo: true,
          },
        },
        storyEvents: {
          where: { deletedAt: null },
          orderBy: [{ chapterNo: "asc" }, { order: "asc" }],
          take: 150,
          select: {
            id: true,
            chapterNo: true,
            content: true,
            characters: true,
            key: true,
            source: true,
          },
        },
      },
    }),
  ]);

  if (!project) notFound();

  // 组装记忆视图（供知识库侧边栏"记忆"页签）
  const memory: StoryMemoryView = {
    autoMemory: project.autoMemory,
    characterStates: project.characters
      .filter((c) => (c.characterStates?.length || 0) > 0)
      .map((c) => ({
        characterId: c.id,
        characterName: c.name,
        role: c.role,
        current:
          (c.characterStates[0]?.current as CharacterStateCurrent | null) ?? {},
      })),
    foreshadows: project.foreshadows.map((f) => ({
      id: f.id,
      title: f.title,
      content: f.content,
      status: f.status,
      plantedChapterNo: f.plantedChapterNo,
      resolvedChapterNo: f.resolvedChapterNo,
    })),
    events: project.storyEvents.map((e) => ({
      id: e.id,
      chapterNo: e.chapterNo,
      content: e.content,
      characters: Array.isArray(e.characters)
        ? (e.characters as string[])
        : [],
      key: e.key,
      source: e.source,
    })),
  };

  const { foreshadows: _fs, storyEvents: _ev, ...projectData } = project;

  return (
    <ProjectWorkspace
      project={projectData as unknown as React.ComponentProps<typeof ProjectWorkspace>["project"]}
      memory={memory}
      initialView={initialView}
    />
  );
}
