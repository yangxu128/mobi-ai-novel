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
import { PenLine } from "lucide-react";

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
    <div className="container py-12 flex items-center justify-center page-wash">
      <Card className="w-full max-w-md shadow-[var(--shadow-card-hover)] border-border-neutral-l1">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl brand-gradient text-text-onbrand shadow-[var(--shadow-glow)]">
            <PenLine className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">免费注册</CardTitle>
          <CardDescription>1 个项目 + 每日 500 字 AI 续写，永久免费</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">昵称</Label>
              <Input id="name" name="name" required maxLength={32} placeholder="你的笔名" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" name="email" type="email" required placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">密码</Label>
              <Input id="password" name="password" type="password" required minLength={6} placeholder="至少 6 位" />
            </div>
            {error && <p className="text-sm text-status-error">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "注册中..." : "注册并开始"}
            </Button>
          </form>
          <p className="text-sm text-text-tertiary text-center mt-4">
            已有账号？{" "}
            <Link href="/login" className="text-text-default underline underline-offset-2">
              直接登录
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
