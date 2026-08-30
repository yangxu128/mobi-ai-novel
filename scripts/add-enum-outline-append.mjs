// 直接执行 ALTER TYPE（绕过 migrate deploy 的基线问题）
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 检查是否已存在该枚举值
  const rows = await prisma.$queryRawUnsafe(
    `SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'AIAction'`
  );
  const labels = rows.map((r) => r.enumlabel);
  console.log("当前 AIAction 枚举值:", labels.join(", "));
  if (labels.includes("outlineAppend")) {
    console.log("outlineAppend 已存在，跳过");
    return;
  }
  await prisma.$executeRawUnsafe(`ALTER TYPE "AIAction" ADD VALUE 'outlineAppend'`);
  console.log("已添加 outlineAppend");
}

main()
  .catch((e) => {
    console.error("失败:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
