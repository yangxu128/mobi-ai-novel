import { prisma } from "@/lib/prisma";
import { AdminProjectsClient } from "@/components/admin/admin-projects-client";

// 注：session 校验已下沉到 admin/layout.tsx
export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
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
    <div>
      <h1 className="text-2xl font-bold mb-1 text-text-default">项目管理</h1>
      <p className="text-sm text-text-secondary mb-6">共 {total} 个项目</p>

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
  );
}
