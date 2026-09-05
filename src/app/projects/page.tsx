import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ProjectsClient } from "@/components/projects/projects-client";

const SORTS = ["updatedAt", "createdAt", "title"] as const;
type Sort = (typeof SORTS)[number];

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; sort?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/projects");

  const sp = await searchParams;
  const sort: Sort = (SORTS as readonly string[]).includes(sp.sort ?? "")
    ? (sp.sort as Sort)
    : "updatedAt";

  const projects = await prisma.project.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy:
      sort === "createdAt"
        ? { createdAt: "desc" }
        : sort === "title"
          ? { title: "asc" }
          : { updatedAt: "desc" },
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

  return (
    <ProjectsClient
      initialProjects={items}
      newOpen={sp.new === "1"}
      initialSort={sort}
    />
  );
}
