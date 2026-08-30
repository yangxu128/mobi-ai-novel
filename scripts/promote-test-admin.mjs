// 提升测试账号为 ADMIN，验证管理员不限额
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.update({
    where: { email: "test-outline-888@test.com" },
    data: { role: "ADMIN" },
    select: { email: true, role: true },
  });
  console.log("已提升:", u.email, "→", u.role);
}

main()
  .catch((e) => {
    console.error("失败:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
