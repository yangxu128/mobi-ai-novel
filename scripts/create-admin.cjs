const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  const email = "admin@mobi.com";
  const password = "admin123456";
  const name = "管理员";

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { email },
        data: { role: "ADMIN" },
      });
      console.log(`用户已存在，已提升为 ADMIN: ${email}`);
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: "ADMIN",
          subscription: { create: { plan: "PRO", status: "active" } },
        },
      });
      console.log(`已创建管理员账号: ${email} / ${password}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
