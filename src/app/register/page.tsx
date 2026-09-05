import { RegisterForm } from "./register-form";

// Server Action 的 POST 目标是页面自身路径（/register）。
// 若本页静态预渲染，EdgeOne CDN 会直接以静态 HTML 响应 POST，
// 请求进不了函数运行时（Next-Action 头丢失 → 返回整页 HTML → 注册失败）。
// force-dynamic 让该路径所有请求都走函数运行时。
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return <RegisterForm />;
}
