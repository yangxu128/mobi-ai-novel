import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { RegisterForm } from "./register-form";

// Server Action 的 POST 目标是页面自身路径（/register）。
// 若本页静态预渲染，EdgeOne CDN 会直接以静态 HTML 响应 POST，
// 请求进不了函数运行时（Next-Action 头丢失 → 返回整页 HTML → 注册失败）。
// force-dynamic 让该路径所有请求都走函数运行时。
export const dynamic = "force-dynamic";

// EdgeOne 函数运行时不执行 Next.js middleware（平台限制，
// 见 .trae/documents/edgeone-deployment-issues.md 问题四），
// 「已登录访问登录/注册页 → 回工作台」只能由页面级检查实现。
export default async function RegisterPage() {
  const session = await auth();
  // 仅当会话真实有效时回工作台；已删除用户的残留 JWT id 为空，
  // 放行到本页以便重新注册恢复账号
  if (session?.user?.id) redirect("/projects");
  return <RegisterForm />;
}
