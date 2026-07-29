"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(6, "密码至少 6 位"),
  name: z.string().min(1, "昵称不能为空").max(32, "昵称最多 32 字"),
});

export async function registerAction(formData: FormData) {
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
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      subscription: { create: { plan: "FREE", status: "active" } },
    },
  });

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
