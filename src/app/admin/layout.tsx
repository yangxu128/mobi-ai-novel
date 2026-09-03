import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

/**
 * 管理后台 layout：
 * - 一次性完成 session 校验（子页面不再重复 redirect 逻辑）
 * - 共享 AdminSidebar，路由切换时不再卸载/重建侧边栏 → 消除闪烁
 * - 子页面只负责数据加载与内容渲染
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin");
  // 角色以数据库为准，JWT 里的 role 可能过期（降权立即生效）
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (dbUser?.role !== "ADMIN") redirect("/projects");

  return (
    <div className="container py-6">
      <div className="flex flex-col md:flex-row gap-6">
        <AdminSidebar />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
