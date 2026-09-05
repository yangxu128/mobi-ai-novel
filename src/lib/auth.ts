import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { rateLimit } from "@/lib/ai/rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      // 允许与同邮箱的密码账号关联：否则先邮箱注册再用 GitHub 登录
      // 会报 OAuthAccountNotLinked，用户被无提示地挡在登录外
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "邮箱密码",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials, request) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        // 限流：按 IP + 邮箱，5 分钟内最多 10 次，防暴力破解
        const ip =
          request?.headers
            ?.get("x-forwarded-for")
            ?.split(",")[0]
            ?.trim() || "unknown";
        const rl = rateLimit(
          `login:${ip}:${email.toLowerCase()}`,
          10,
          5 * 60 * 1000
        );
        if (!rl.ok) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    // jwt/authorized 回调沿用 authConfig 中的 Edge 兼容版本
    authorized: authConfig.callbacks.authorized,
    jwt: authConfig.callbacks.jwt,
    // session 回调在 Node 运行时执行：每次读取会话都从数据库核对最新角色，
    // 使「管理员降权/封禁」立即生效（JWT 里的 role 只是登录时的缓存）。
    // 用户记录已被删除时清空 id，视同未登录。
    session: async ({ session, token }) => {
      if (!session.user) return session;
      const id = (token.id as string) || (token.sub as string);
      if (!id) return session;
      session.user.id = id;
      session.user.role = (token.role as string) ?? "FREE";
      let dbUser;
      try {
        dbUser = await prisma.user.findUnique({
          where: { id },
          select: { role: true },
        });
      } catch {
        // 数据库暂不可达时退回 JWT 缓存的角色，不让全站会话读取失败
        return session;
      }
      if (!dbUser) {
        session.user.id = "";
        return session;
      }
      session.user.role = dbUser.role;
      return session;
    },
  },
});

// 类型扩展
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
    };
  }
  interface User {
    role?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}
