import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: string;
};

/**
 * 在 Server Component / Server Action 中获取当前登录用户。
 * 未登录返回 null，不抛错，由调用方决定如何处理。
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;
    return session.user as SessionUser;
  } catch {
    // 环境变量缺失/数据库不可达等情况下视同未登录，
    // 避免整站 server action 因 auth() 抛错而 500
    return null;
  }
}

/**
 * 在 Server Component / Server Action 中要求登录。
 * 未登录抛错，由调用方 catch 或重定向。
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

/**
 * 要求当前用户是管理员。返回管理员用户对象，否则返回 null。
 * 角色以数据库为准（session/JWT 里的 role 是登录时的缓存），
 * 降权后的前管理员即使 JWT 未过期也无法再调用管理操作。
 */
export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (!dbUser || dbUser.role !== "ADMIN") return null;
  return user;
}
