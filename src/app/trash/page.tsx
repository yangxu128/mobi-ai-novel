import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { TrashClient } from "@/components/projects/trash-client";

export const metadata = { title: "回收站 - 墨笔 AI 写作平台" };

export default async function TrashPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/trash");

  const projects = await prisma.project.findMany({
    where: { userId: user.id, deletedAt: { not: null } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      genre: true,
      mode: true,
      wordCount: true,
      synopsis: true,
      deletedAt: true,
    },
  });

  const items = projects.map((p) => ({
    ...p,
    deletedAt: p.deletedAt!.toISOString(),
  }));

  return <TrashClient initialProjects={items} />;
}
