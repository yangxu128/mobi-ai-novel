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
  // 显式固定 cookie 名（与 HTTPS 默认名一致）。
  // EdgeOne 传给函数运行时的 x-forwarded-proto 是 http，NextAuth 在 RSC 等
  // 合成请求上下文中据此推断"非安全连接"，去读不带 __Secure- 前缀的
  // authjs.session-token，与浏览器实际持有的 __Secure- 前缀 cookie 不匹配，
  // 导致登录后所有受保护页面的 auth() 均解析不到会话、被弹回登录页。
  // 固定名称后各上下文（middleware / API / RSC）读写同一 cookie，不再依赖协议推断。
  // 本地 http://localhost 是安全上下文，浏览器同样接受这些 cookie。
  cookies: {
    sessionToken: {
      name: "__Secure-authjs.session-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
    },
    callbackUrl: {
      name: "__Secure-authjs.callback-url",
      options: { sameSite: "lax", path: "/", secure: true },
    },
    csrfToken: {
      name: "__Host-authjs.csrf-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
    },
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
