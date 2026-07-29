import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureProjectMode } from "@/lib/project-mode";
import { ProjectModeSwitcher } from "@/components/project-mode-switcher";
import { ChatCoCreateClient } from "@/components/chat/chat-cocreate-client";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, title: true, mode: true, userId: true },
  });

  if (!project || project.userId !== session.user.id) notFound();
  if (project.mode !== "CHAT") {
    // 用户主动导航到此，自动切换模式（替代 redirect 回去的双往返）
    await ensureProjectMode(projectId, session.user.id, "CHAT");
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background shrink-0">
        <div className="container py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/projects" className="text-xs text-muted-foreground hover:text-foreground">
              项目列表
            </Link>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-sm font-medium">{project.title}</span>
          </div>
          <ProjectModeSwitcher projectId={projectId} current="CHAT" />
        </div>
      </div>
      <div className="flex-1 min-h-0 container flex flex-col">
        <ChatCoCreateClient projectId={projectId} />
      </div>
    </div>
  );
}
