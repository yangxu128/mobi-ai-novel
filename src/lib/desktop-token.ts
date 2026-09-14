/**
 * 桌面版绑定凭证（DesktopToken）工具：签发哈希、Bearer 校验。
 * 明文 token 仅签发时返回一次，云端只存 sha256。
 */

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export interface DesktopTokenUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
}

/**
 * 校验桌面 token，返回对应云端用户。
 * 过期或已吊销返回 null；顺带异步更新 lastUsedAt。
 */
export async function resolveDesktopToken(
  token: string
): Promise<DesktopTokenUser | null> {
  const record = await prisma.desktopToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { id: true, email: true, name: true, role: true } } },
  });
  if (!record || record.revokedAt) return null;
  if (record.expiresAt.getTime() < Date.now()) return null;
  if (!record.user) return null;

  prisma.desktopToken
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return record.user;
}
