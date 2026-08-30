"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthArtworkPanel } from "@/components/auth/auth-artwork-panel";
import { registerAction } from "@/actions/auth";
import { toast } from "@/components/ui/toast";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await registerAction(fd);
    setLoading(false);
    if (!res.ok) {
      setError(res.error || "注册失败");
      return;
    }
    toast({ title: "注册成功", description: "正在进入工作台", type: "success" });
    router.push("/projects");
    router.refresh();
  }

  return (
    <div className="flex min-h-full bg-white">
      <AuthArtworkPanel />
      <div className="flex min-h-full flex-1 items-center justify-center px-8 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold tracking-tight text-text-default">创建墨笔账号</h1>
          <p className="mt-2.5 text-text-secondary">1 个项目 + 每日 500 字 AI 续写，永久免费</p>

          <form onSubmit={onSubmit} className="mt-10 space-y-4">
            <input
              id="name"
              name="name"
              required
              maxLength={32}
              placeholder="你的笔名"
              autoComplete="nickname"
              className="auth-input"
            />
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="请输入邮箱"
              autoComplete="email"
              className="auth-input"
            />
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="请设置密码（至少 6 位）"
              autoComplete="new-password"
              className="auth-input"
            />
            {error && <p className="text-sm text-status-error">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="btn-cta h-[3.25rem] w-full rounded-full bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60"
            >
              {loading ? "注册中..." : "注册并开始"}
            </button>
          </form>

          <p className="mt-8 text-sm text-text-tertiary">
            已有账号？{" "}
            <Link href="/login" className="text-text-default underline underline-offset-4 hover:text-text-brand">
              直接登录
            </Link>
          </p>

          <p className="mt-16 text-xs text-text-tertiary">© 2026 墨笔 AI · 让 AI 与你共写一本小说</p>
        </div>
      </div>
    </div>
  );
}
