import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// 用轻量 authConfig 初始化，middleware 在 Edge Runtime 运行
export const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // 排除静态资源、Next 内部路径、NextAuth API 路由
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
