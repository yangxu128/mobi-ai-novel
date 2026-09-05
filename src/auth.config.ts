import type { NextAuthConfig } from "next-auth";

/**
 * 轻量级 Auth 配置，可在 middleware（Edge Runtime）中使用。
 * 不包含 PrismaAdapter / Credentials authorize 等依赖 Node.js API 的部分。
 * 这些在 src/lib/auth.ts 中扩展。
 *
 * 关键：jwt callback 必须定义在这里（而非 lib/auth.ts），因为 middleware
 * 只使用 authConfig 中的 callbacks。如果 jwt callback 只在 lib/auth.ts 中定义，
 * middleware 解码 JWT 时 token.role 不会被映射到 auth.user.role，
 * 导致 authorized 回调中 auth?.user?.role 永远是 undefined。
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    // jwt callback 在 middleware 和 Node.js 环境都会执行
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // user.role 来自 authorize() 返回值或数据库，登录时写入 token
        // 注意：Credentials provider 的 authorize 返回值中没有 role，
        // 所以这里用 user.role（如有）或保持 token 已有值
        if (user.role) {
          token.role = user.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    // 在 middleware 中运行：决定是否允许访问
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      // 公开路由放行（官网营销页与内容页对未登录访客开放）
      const publicPaths = [
        "/",
        "/login",
        "/register",
        "/pricing",
        "/about",
        "/faq",
        "/guide",
        "/changelog",
        "/api-docs",
        "/terms",
        "/privacy",
      ];
      if (publicPaths.some((p) => pathname === p)) return true;

      // NextAuth API 路由放行
      if (pathname.startsWith("/api/auth")) return true;

      // 健康检查端点放行（生产诊断用）
      if (pathname === "/api/health") return true;

      // 静态资源放行
      if (pathname.startsWith("/_next") || pathname.includes(".")) return true;

      // 管理后台需校验 ADMIN 角色
      if (pathname.startsWith("/admin")) {
        const ok = isLoggedIn && (auth?.user?.role === "ADMIN");
        if (!ok && isLoggedIn) {
          // 临时诊断：有会话但角色不符时输出 middleware 实际看到的会话内容
          return new Response(JSON.stringify({
            debug: true,
            role: auth?.user?.role ?? null,
            userKeys: Object.keys(auth?.user ?? {}),
            id: (auth?.user as { id?: string })?.id ?? null,
          }), { status: 401, headers: { "content-type": "application/json" } });
        }
        return ok;
      }

      // 其余路由需要登录
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
