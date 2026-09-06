"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { z } from "zod";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/ai/rate-limit";

const registerSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(6, "密码至少 6 位"),
  name: z.string().min(1, "昵称不能为空").max(32, "昵称最多 32 字"),
});

export async function registerAction(formData: FormData) {
  // 限流：每 IP 每小时最多 5 次注册请求，防刷注册
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  const rl = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return { ok: false, error: "注册请求过于频繁，请稍后再试" };
  }

  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const { email, password, name } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return { ok: false, error: "该邮箱已注册" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  let user;
  try {
    user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        // 新用户默认基础套餐（BASIC：1000 积分/月），积分按 role 读取须同步设置
        role: "BASIC",
        subscription: { create: { plan: "BASIC", status: "active" } },
      },
    });
  } catch {
    // 并发注册同一邮箱触发唯一约束
    return { ok: false, error: "该邮箱已注册" };
  }

  // 自动登录
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch {
    // 忽略，让用户手动登录
  }

  revalidatePath("/");
  return { ok: true, userId: user.id };
}
