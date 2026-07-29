import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureProjectMode } from "@/lib/project-mode";
import { Button } from "@/components/ui/button";
import { ProjectModeSwitcher } from "@/components/project-mode-switcher";
import { PipelineFlow } from "@/components/pipeline/pipeline-flow";

const STEP_LABELS = [
  "灵感卡",
  "世界观",
  "角色卡",
  "大纲",
  "章节扩写",
  "润色定稿",
];

export default async function PipelinePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      worldSettings: { orderBy: { updatedAt: "desc" } },
      characters: { orderBy: [{ role: "asc" }, { updatedAt: "desc" }] },
      outlines: {
        orderBy: { order: "asc" },
        include: { chapterRecord: true },
      },
      chapters: {
        orderBy: { createdAt: "asc" },
        include: { outline: true },
      },
    },
  });

  if (!project || project.userId !== session.user.id) notFound();
  if (project.mode !== "PIPELINE") {
    // 用户主动导航到此，自动切换模式（替代 redirect 回去的双往返）
    await ensureProjectMode(projectId, session.user.id, "PIPELINE");
  }

  // 摘要
  const worldSummary = project.worldSettings
    .map((w: { title: string; content: unknown }) => `【${w.title}】${typeof w.content === "string" ? w.content : JSON.stringify(w.content)}`)
    .join("\n");
  const characterSummary = project.characters
    .map(
      (c: { name: string; role: string; personality?: string | null; background?: string | null; motivation?: string | null }) =>
        `${c.name}(${c.role})：${c.personality || ""} ${c.background || ""} ${c.motivation ? "动机：" + c.motivation : ""}`
    )
    .join("\n");

  return (
    <div className="h-full flex flex-col">
      <div className="container py-4 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Link href="/projects" className="hover:text-foreground">
                我的项目
              </Link>
              <span>/</span>
              <span>流水线</span>
            </div>
            <h1 className="text-2xl font-bold">{project.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {project.genre} · 第 {project.currentStep}/6 步 · {STEP_LABELS[project.currentStep - 1]}
            </p>
          </div>
          <ProjectModeSwitcher projectId={projectId} current="PIPELINE" />
        </div>
      </div>

      <div className="flex-1 min-h-0 container pb-4 flex flex-col">
        <PipelineFlow
          project={JSON.parse(JSON.stringify(project))}
          worldSummary={worldSummary}
          characterSummary={characterSummary}
        />
      </div>
    </div>
  );
}
