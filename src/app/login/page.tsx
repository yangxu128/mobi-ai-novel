"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Github } from "lucide-react";

function LoginForm() {
  const router = useRouter();
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
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <Card className="w-full max-w-md rounded-2xl border-neutral-100 shadow-sm bg-white">
      <CardHeader>
        <CardTitle>登录墨笔</CardTitle>
        <CardDescription>输入你的账号信息继续创作</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="outline"
          className="w-full border-neutral-200 hover:bg-neutral-50"
          onClick={() => signIn("github", { callbackUrl })}
          disabled={loading}
        >
          <Github className="h-4 w-4" />
          使用 GitHub 登录
        </Button>

        <div className="relative">
          <Separator className="bg-neutral-100" />
          <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground bg-white px-2 mx-auto w-fit">
            或
          </span>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              className="rounded-xl"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full bg-neutral-900 text-white hover:bg-neutral-800" disabled={loading}>
            {loading ? "登录中..." : "登录"}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground text-center">
          还没账号？{" "}
          <Link href="/register" className="text-foreground underline">
            免费注册
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="container py-12 flex items-center justify-center">
      <Suspense fallback={<div className="w-full max-w-md h-96 animate-pulse bg-neutral-100 rounded-2xl" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
