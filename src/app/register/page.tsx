"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="container py-12 flex items-center justify-center">
      <Card className="w-full max-w-md rounded-2xl border-neutral-100 shadow-sm bg-white">
        <CardHeader>
          <CardTitle>免费注册</CardTitle>
          <CardDescription>1 个项目 + 每日 500 字 AI 续写，永久免费</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="name">昵称</Label>
              <Input id="name" name="name" required maxLength={32} placeholder="你的笔名" className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" name="email" type="email" required placeholder="you@example.com" className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">密码</Label>
              <Input id="password" name="password" type="password" required minLength={6} placeholder="至少 6 位" className="rounded-xl" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full bg-neutral-900 text-white hover:bg-neutral-800" disabled={loading}>
              {loading ? "注册中..." : "注册并开始"}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-4">
            已有账号？{" "}
            <Link href="/login" className="text-foreground underline">
              直接登录
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
