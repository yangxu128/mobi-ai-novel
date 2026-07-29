import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminProjectsClient } from "@/components/admin/admin-projects-client";

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/projects");
  if (session.user.role !== "ADMIN") redirect("/projects");

  const sp = await searchParams;
  const search = sp.search || "";
  const page = Math.max(1, parseInt(sp.page || "1", 10));
  const pageSize = 20;

  const where = search
    ? {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { user: { email: { contains: search, mode: "insensitive" as const } } },
        ],
      }
    : {};

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

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="container py-6">
      <div className="flex gap-6">
        <AdminSidebar active="projects" />

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold mb-1">项目管理</h1>
          <p className="text-sm text-muted-foreground mb-6">共 {total} 个项目</p>

          <AdminProjectsClient
            projects={projects.map((p) => ({
              ...p,
              createdAt: p.createdAt.toISOString(),
              updatedAt: p.updatedAt.toISOString(),
            }))}
            page={page}
            totalPages={totalPages}
            search={search}
          />
        </div>
      </div>
    </div>
  );
}
