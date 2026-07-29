import type { NextAuthConfig } from "next-auth";

/**
 * 轻量级 Auth 配置，可在 middleware（Edge Runtime）中使用。
 * 不包含 PrismaAdapter / Credentials authorize 等依赖 Node.js API 的部分。
 * 这些在 src/lib/auth.ts 中扩展。
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    // 在 middleware 中运行：决定是否允许访问
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      // 公开路由放行
      const publicPaths = ["/", "/login", "/register", "/pricing"];
      if (publicPaths.some((p) => pathname === p)) return true;

      // NextAuth API 路由放行
      if (pathname.startsWith("/api/auth")) return true;

      // 静态资源放行
      if (pathname.startsWith("/_next") || pathname.includes(".")) return true;

      // 管理后台需额外校验角色（这里只做登录校验，角色在页面里判）
      // 其余路由需要登录
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
