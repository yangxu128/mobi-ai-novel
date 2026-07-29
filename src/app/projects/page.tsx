import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ProjectsClient } from "@/components/projects/projects-client";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/projects");

  const sp = await searchParams;

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
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

  // 序列化为可传给 client component 的数据
  const items = projects.map((p) => ({
    ...p,
    updatedAt: p.updatedAt.toISOString(),
  }));

  return <ProjectsClient initialProjects={items} newOpen={sp.new === "1"} />;
}
