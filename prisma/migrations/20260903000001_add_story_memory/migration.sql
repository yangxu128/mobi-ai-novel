-- 记忆 wiki：故事事件 / 伏笔生命周期 / 角色状态卡 三表 + 项目自动记忆开关
-- 本地已通过 db push 应用；生产库执行本迁移（幂等性依赖 IF NOT EXISTS 由部署脚本保证，或首次执行）

-- CreateEnum
CREATE TYPE "StoryEventSource" AS ENUM ('chapter', 'chat');

-- CreateEnum
CREATE TYPE "ForeshadowStatus" AS ENUM ('open', 'resolved', 'abandoned');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN "autoMemory" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "story_events" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "chapterId" UUID,
    "chapterNo" INTEGER NOT NULL DEFAULT 0,
    "source" "StoryEventSource" NOT NULL DEFAULT 'chapter',
    "content" TEXT NOT NULL,
    "characters" JSONB NOT NULL DEFAULT '[]',
    "key" BOOLEAN NOT NULL DEFAULT false,
    "order" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "foreshadows" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "status" "ForeshadowStatus" NOT NULL DEFAULT 'open',
    "plantedChapterId" UUID,
    "plantedChapterNo" INTEGER,
    "resolvedChapterId" UUID,
    "resolvedChapterNo" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "foreshadows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_states" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "characterId" UUID NOT NULL,
    "current" JSONB NOT NULL DEFAULT '{}',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "story_events_projectId_chapterNo_idx" ON "story_events"("projectId", "chapterNo");

-- CreateIndex
CREATE INDEX "story_events_chapterId_idx" ON "story_events"("chapterId");

-- CreateIndex
CREATE INDEX "foreshadows_projectId_status_idx" ON "foreshadows"("projectId", "status");

-- CreateIndex
CREATE INDEX "foreshadows_plantedChapterId_idx" ON "foreshadows"("plantedChapterId");

-- CreateIndex
CREATE UNIQUE INDEX "character_states_characterId_key" ON "character_states"("characterId");

-- CreateIndex
CREATE INDEX "character_states_projectId_idx" ON "character_states"("projectId");

-- AddForeignKey
ALTER TABLE "story_events" ADD CONSTRAINT "story_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_events" ADD CONSTRAINT "story_events_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foreshadows" ADD CONSTRAINT "foreshadows_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foreshadows" ADD CONSTRAINT "foreshadows_plantedChapterId_fkey" FOREIGN KEY ("plantedChapterId") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foreshadows" ADD CONSTRAINT "foreshadows_resolvedChapterId_fkey" FOREIGN KEY ("resolvedChapterId") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_states" ADD CONSTRAINT "character_states_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_states" ADD CONSTRAINT "character_states_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
