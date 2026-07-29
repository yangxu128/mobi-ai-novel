import { auth } from "@/lib/auth";

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
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user as SessionUser;
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
 */
export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}
