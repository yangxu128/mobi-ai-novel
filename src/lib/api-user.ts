/**
 * API 请求用户解析（浏览器 session + 桌面版 Bearer token 双通道）。
 *
 * 优先解析 Authorization: Bearer <token>（桌面版绑定平台账号的凭证，
 * 见 /api/desktop/bind）；无该头或 token 无效时回退 NextAuth session。
 * 云端 AI 接口（generate/models）用本 helper 认证，
 * 后续 checkQuota/deductCredits 对解析出的 userId 照常执行（云端计费）。
 */

import { auth } from "@/lib/auth";
import { resolveDesktopToken, type DesktopTokenUser } from "@/lib/desktop-token";

export type ApiUser = DesktopTokenUser & {
  /** 桌面 token 请求为 true（日志/审计可区分来源） */
  viaDesktopToken?: boolean;
};

/**
 * 从请求解析用户：优先 Bearer token（桌面版），否则 NextAuth session。
 */
export async function resolveApiUser(req: Request): Promise<ApiUser | null> {
  const authz = req.headers.get("authorization") || "";
  const match = authz.match(/^Bearer\s+(.+)$/i);
  if (match) {
    const user = await resolveDesktopToken(match[1].trim());
    if (!user) return null;
    return { ...user, viaDesktopToken: true };
  }

  try {
    const session = await auth();
    if (!session?.user?.id) return null;
    return session.user as ApiUser;
  } catch {
    return null;
  }
}
