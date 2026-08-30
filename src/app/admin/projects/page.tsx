import { prisma } from "@/lib/prisma";
import { AdminProjectsClient } from "@/components/admin/admin-projects-client";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FolderOpen } from "lucide-react";

// 注：session 校验已下沉到 admin/layout.tsx
export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; mode?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const search = sp.search || "";
  const mode = sp.mode || "";
  const page = Math.max(1, parseInt(sp.page || "1", 10));
  const pageSize = 20;

  const AND: Record<string, unknown>[] = [];
  if (search) {
    AND.push({
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { user: { email: { contains: search, mode: "insensitive" as const } } },
      ],
    });
  }
  if (mode) AND.push({ mode });
  const where = AND.length ? { AND } : {};

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
      <AdminPageHeader
        icon={FolderOpen}
        chipClass="chip-amber"
        title="项目管理"
        description="全平台小说项目总览与治理"
        meta={`共 ${total} 个项目`}
      />

      <AdminProjectsClient
        projects={projects.map((p) => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        }))}
        page={page}
        totalPages={totalPages}
        search={search}
        mode={mode}
      />
    </div>
  );
}
