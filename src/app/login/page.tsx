"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Github, PenLine } from "lucide-react";

function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/projects";

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
    <Card className="w-full max-w-md shadow-[var(--shadow-card-hover)] border-border-neutral-l1">
      <CardHeader className="items-center text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl brand-gradient text-text-onbrand shadow-[var(--shadow-glow)]">
          <PenLine className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl">登录墨笔</CardTitle>
        <CardDescription>输入你的账号信息继续创作</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => signIn("github", { callbackUrl })}
          disabled={loading}
        >
          <Github className="h-4 w-4" />
          使用 GitHub 登录
        </Button>

        <div className="relative flex items-center justify-center">
          <Separator className="absolute inset-x-0" />
          <span className="relative bg-bg-base-default px-2 text-xs text-text-tertiary">
            或
          </span>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
            />
          </div>
          {error && <p className="text-sm text-status-error">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "登录中..." : "登录"}
          </Button>
        </form>

        <p className="text-sm text-text-tertiary text-center">
          还没账号？{" "}
          <Link href="/register" className="text-text-default underline underline-offset-2">
            免费注册
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="container py-12 flex items-center justify-center page-wash">
      <Suspense fallback={<div className="w-full max-w-md h-96 animate-pulse rounded-2xl bg-bg-overlay-l1" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
