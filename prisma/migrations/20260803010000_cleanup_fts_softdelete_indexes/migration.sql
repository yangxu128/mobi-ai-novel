-- 清理 FTS 死代码 + 补齐软删除 + 复合索引
--
-- 1. 删除 chapters_content_tsv_idx 索引和 content_tsv 列（死代码：
--    schema 无此字段、无触发器维护、无代码使用 FTS 查询）
-- 2. ChatMessage、Version 补齐 deletedAt 字段，与其他实体软删除策略一致
-- 3. AIUsageLog 加 (userId, createdAt) 复合索引，优化配额聚合查询
-- 4. Chapter 加 (projectId, createdAt) 复合索引，优化 RAG 查询

-- DropIndex
DROP INDEX "chapters_content_tsv_idx";

-- AlterTable
ALTER TABLE "chapters" DROP COLUMN "content_tsv";

-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "versions" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ai_usage_logs_userId_createdAt_idx" ON "ai_usage_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "chapters_projectId_createdAt_idx" ON "chapters"("projectId", "createdAt");
