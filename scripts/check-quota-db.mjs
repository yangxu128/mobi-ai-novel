// 诊断：管理员角色 + 今日 AI 用量明细（还原浏览器测试时发生的事）
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. 所有用户及角色
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true },
    orderBy: { createdAt: "asc" },
  });
  console.log("=== 用户列表 ===");
  users.forEach((u) => console.log(`${u.email} | ${u.name} | role=${u.role} | id=${u.id}`));

  // 2. 今日 AIUsageLog 明细（按用户+action 聚合）
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const logs = await prisma.aIUsageLog.findMany({
    where: { createdAt: { gte: start } },
    select: {
      userId: true,
      action: true,
      model: true,
      promptTokens: true,
      completionTokens: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  console.log(`\n=== 今日用量记录（${logs.length} 条）===`);
  logs.forEach((l) => {
    const email = users.find((u) => u.id === l.userId)?.email || l.userId;
    console.log(
      `${l.createdAt.toISOString().slice(11, 19)} | ${email} | ${l.action} | prompt=${l.promptTokens} completion=${l.completionTokens} | model=${l.model}`
    );
  });
}

main()
  .catch((e) => {
    console.error("查询失败:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
