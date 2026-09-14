import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LoginForm from "./login-form";

// EdgeOne 函数运行时不执行 Next.js middleware（平台限制，
// 见 .trae/documents/edgeone-deployment-issues.md 问题四），
// 「已登录访问登录/注册页 → 回工作台」只能由页面级检查实现。
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  // 仅当会话真实有效时回工作台；已被删除用户的残留 JWT 会被
  // session 回调置空 id，放行到本页以便自愈清理后重新登录/注册
  if (session?.user?.id) redirect("/projects");
  return <LoginForm />;
}
