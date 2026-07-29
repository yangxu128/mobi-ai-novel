/**
 * 设置管理员脚本
 *
 * 用法：
 *   npx tsx scripts/set-admin.ts <email>
 *
 * 示例：
 *   npx tsx scripts/set-admin.ts admin@example.com
 *
 * 将指定邮箱用户的角色设为 ADMIN。
 * 若用户不存在，会提示先注册。
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("用法: npx tsx scripts/set-admin.ts <email>");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`用户 ${email} 不存在，请先注册该账号。`);
      process.exit(1);
    }

    await prisma.user.update({
      where: { email },
      data: { role: "ADMIN" },
    });

    console.log(`已将 ${email} 设为管理员 (ADMIN)`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
