-- AIAction 枚举新增 wikiExtract（记忆提取）：
-- 记忆提取此前误记为 extract（卡片提取），语义混淆且用量明细无法区分
ALTER TYPE "AIAction" ADD VALUE 'wikiExtract';
