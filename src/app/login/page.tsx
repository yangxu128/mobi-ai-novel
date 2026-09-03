"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Github } from "lucide-react";
import { AuthArtworkPanel } from "@/components/auth/auth-artwork-panel";

/** 只允许站内跳转，防开放重定向（如 ?callbackUrl=https://evil.com）。
 * 相对路径直接放行；绝对地址仅当与当前站点同源时放行
 * （middleware 的登录回跳会带同源绝对地址）。 */
function safeCallbackUrl(url: string | null): string {
  try {
    if (!url) return "/projects";
    if (
      url.startsWith("/") &&
      !url.startsWith("//") &&
      !url.startsWith("/\\")
    ) {
      return url;
    }
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin === window.location.origin) {
      return parsed.pathname + parsed.search + parsed.hash;
    }
    return "/projects";
  } catch {
    return "/projects";
  }
}

function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = safeCallbackUrl(params.get("callbackUrl"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("邮箱或密码错误");
    } else {
      // 用 window.location.href 代替 router.push：触发完整页面导航，
      // 确保 NextAuth 的 session cookie 已写入浏览器后再走 middleware 校验。
      // router.push + router.refresh 存在时序竞争：cookie 未写入时
      // middleware 判定未登录，会把 /admin 等受保护页面重定向回 /login。
      window.location.href = callbackUrl;
    }
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="text-3xl font-bold tracking-tight text-text-default">欢迎使用墨笔</h1>
      <p className="mt-2.5 text-text-secondary">使用邮箱账号密码登录</p>

      <form onSubmit={onSubmit} className="mt-10 space-y-4">
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="请输入邮箱"
          autoComplete="email"
          className="auth-input"
        />
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="请输入密码（至少 6 位）"
          autoComplete="current-password"
          className="auth-input"
        />
        {error && <p className="text-sm text-status-error">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="btn-cta h-[3.25rem] w-full rounded-full bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60"
        >
          {loading ? "登录中..." : "登录"}
        </button>
      </form>

      <div className="mt-9 flex items-center gap-4">
        <span className="h-px flex-1 bg-bg-overlay-l3" />
        <span className="text-xs text-text-tertiary">其他方式</span>
        <span className="h-px flex-1 bg-bg-overlay-l3" />
      </div>

      <button
        onClick={() => signIn("github", { callbackUrl })}
        disabled={loading}
        className="mt-6 flex h-[3.25rem] w-full items-center justify-center gap-2.5 rounded-full border border-border-neutral-l2 bg-white text-sm text-text-default transition-colors hover:bg-neutral-50 disabled:opacity-60"
      >
        <Github className="h-4 w-4" />
        使用 GitHub 登录
      </button>

      <p className="mt-8 text-sm text-text-tertiary">
        还没有账号？{" "}
        <Link href="/register" className="text-text-default underline underline-offset-4 hover:text-text-brand">
          免费注册
        </Link>
      </p>

      <p className="mt-16 text-xs text-text-tertiary">© 2026 墨笔 AI · 让 AI 与你共写一本小说</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-full bg-white">
      <AuthArtworkPanel />
      <div className="flex min-h-full flex-1 items-center justify-center px-8 py-12">
        <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-3xl bg-bg-overlay-l1" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
