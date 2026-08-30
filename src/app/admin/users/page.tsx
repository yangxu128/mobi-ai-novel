import { prisma } from "@/lib/prisma";
import { AdminUsersClient } from "@/components/admin/admin-users-client";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Users } from "lucide-react";

// 注：session 校验已下沉到 admin/layout.tsx
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; role?: string; plan?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const search = sp.search || "";
  const role = sp.role || "";
  const plan = sp.plan || "";
  const page = Math.max(1, parseInt(sp.page || "1", 10));
  const pageSize = 20;

  // AND 组合：搜索 + 角色 + 订阅（FREE 含无订阅记录的用户）
  const AND: Record<string, unknown>[] = [];
  if (search) {
    AND.push({
      OR: [
        { email: { contains: search, mode: "insensitive" as const } },
        { name: { contains: search, mode: "insensitive" as const } },
      ],
    });
  }
  if (role) AND.push({ role });
  if (plan === "FREE") {
    AND.push({ OR: [{ subscription: null }, { subscription: { plan: "FREE" } }] });
  } else if (plan) {
    AND.push({ subscription: { plan } });
  }
  const where = AND.length ? { AND } : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true,
        _count: { select: { projects: true, aiUsageLogs: true } },
        subscription: { select: { plan: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <AdminPageHeader
        icon={Users}
        chipClass="chip-indigo"
        title="用户管理"
        description="管理平台注册用户、角色与订阅"
        meta={`共 ${total} 个用户`}
      />

      <AdminUsersClient
        users={users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        }))}
        page={page}
        totalPages={totalPages}
        search={search}
        role={role}
        plan={plan}
      />
    </div>
  );
}
