"use server";

/**
 * 导入作品：向导确认后一次性落库（单事务）。
 * 创建项目 + 世界观 + 角色 + 大纲（可选）+ 章节，全部成功或全部回滚。
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { textToHtml } from "@/lib/utils";
import { z } from "zod";
import type { ImportProjectInput } from "@/types/import";

const worldCategoryEnum = z.enum([
  "BACKGROUND",
  "GEOGRAPHY",
  "RULE",
  "SYSTEM",
  "OTHER",
]);
const characterRoleEnum = z.enum([
  "PROTAGONIST",
  "SUPPORTING",
  "ANTAGONIST",
  "EXTRA",
]);

const importSchema = z.object({
  project: z.object({
    title: z.string().min(1, "标题不能为空").max(80, "标题最多 80 字"),
    genre: z.string().min(1, "题材不能为空"),
    mode: z.enum(["PIPELINE", "WORKBENCH", "CHAT"]),
    synopsis: z.string().optional(),
    styleProfile: z.any().optional(),
    targetChapters: z.coerce.number().int().min(1).max(10000).optional(),
    chapterWords: z.coerce.number().int().min(100).max(50000).optional(),
  }),
  worldSettings: z
    .array(
      z.object({
        title: z.string().min(1).max(50),
        category: worldCategoryEnum,
        content: z.string().max(2000),
      })
    )
    .max(30)
    .default([]),
  characters: z
    .array(
      z.object({
        name: z.string().min(1).max(30),
        role: characterRoleEnum,
        appearance: z.string().max(500).default(""),
        personality: z.string().max(500).default(""),
        background: z.string().max(1000).default(""),
        motivation: z.string().max(500).default(""),
      })
    )
    .max(50)
    .default([]),
  chapters: z
    .array(
      z.object({
        volume: z.number().int().min(1).max(999),
        chapter: z.number().int().min(0).max(9999),
        title: z.string().min(1).max(100),
        content: z.string().min(1),
        final: z.boolean().default(false),
      })
    )
    .max(300, "章节数最多 300 章"),
  outlineSummaries: z.record(z.string(), z.string().max(200)).default({}),
});

type ImportResult =
  | { ok: true; projectId: string }
  | { ok: false; error: string };

export async function importProjectAction(
  input: ImportProjectInput
): Promise<ImportResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const parsed = importSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }
  const data = parsed.data;

  // 免费版限制 1 个项目（与 createProjectAction 一致）
  const count = await prisma.project.count({ where: { userId: user.id } });
  if (user.role === "FREE" && count >= 1) {
    return { ok: false, error: "免费版仅可创建 1 个项目，请升级" };
  }

  // currentStep 映射：有章节→5（章节扩写）/ 有角色→4 / 有世界观→3 / 否则 1
  const currentStep = data.chapters.length
    ? 5
    : data.characters.length
      ? 4
      : data.worldSettings.length
        ? 3
        : 1;

  // 全书规模默认值：目标章节数取导入章节数，每章字数取平均
  const totalWords = data.chapters.reduce(
    (sum, c) => sum + c.content.replace(/\s/g, "").length,
    0
  );
  const targetChapters =
    data.project.targetChapters ??
    (data.chapters.length > 0 ? data.chapters.length : undefined);
  const chapterWords =
    data.project.chapterWords ??
    (data.chapters.length > 0
      ? Math.round(totalWords / data.chapters.length)
      : undefined);

  // 大纲条目：仅当有章节摘要时生成（key = chapters 下标）
  const summaryEntries = Object.entries(data.outlineSummaries).filter(
    ([, v]) => v && v.trim()
  );
  const hasOutline = data.chapters.length > 0 && summaryEntries.length > 0;

  try {
    const projectId = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          userId: user.id,
          title: data.project.title,
          genre: data.project.genre,
          mode: data.project.mode,
          synopsis: data.project.synopsis || null,
          styleProfile: data.project.styleProfile ?? null,
          targetChapters: targetChapters ?? null,
          chapterWords: chapterWords ?? null,
          currentStep,
        },
      });

      // 对话模式自动创建 chat session（与 createProjectAction 一致）
      if (data.project.mode === "CHAT") {
        await tx.chatSession.create({ data: { projectId: project.id } });
      }

      if (data.worldSettings.length > 0) {
        await tx.worldSetting.createMany({
          data: data.worldSettings.map((w) => ({
            projectId: project.id,
            title: w.title,
            category: w.category,
            content: { text: w.content },
          })),
        });
      }

      if (data.characters.length > 0) {
        await tx.character.createMany({
          data: data.characters.map((c) => ({
            projectId: project.id,
            name: c.name,
            role: c.role,
            appearance: c.appearance || null,
            personality: c.personality || null,
            background: c.background || null,
            motivation: c.motivation || null,
          })),
        });
      }

      if (data.chapters.length > 0) {
        // 大纲：每章一条，order = 0..n-1，sceneTitle 去掉"第X章/Chapter N"编号前缀
        let outlineIds: string[] = [];
        if (hasOutline) {
          const summaryByIndex = new Map(
            summaryEntries.map(([k, v]) => [Number(k), v.trim()])
          );
          await tx.outline.createMany({
            data: data.chapters.map((c, i) => ({
              projectId: project.id,
              volume: c.volume,
              chapter: c.chapter,
              sceneTitle: stripChapterPrefix(c.title) || c.title,
              sceneSummary: summaryByIndex.get(i) || "",
              plotPoints: [],
              order: i,
            })),
          });
          const outlines = await tx.outline.findMany({
            where: { projectId: project.id },
            orderBy: { order: "asc" },
            select: { id: true },
          });
          outlineIds = outlines.map((o) => o.id);
        }

        await tx.chapter.createMany({
          data: data.chapters.map((c, i) => ({
            projectId: project.id,
            outlineId: hasOutline ? outlineIds[i] : null,
            title: c.title,
            content: textToHtml(c.content),
            wordCount: c.content.replace(/\s/g, "").length,
            status: c.final ? ("final" as const) : ("draft" as const),
          })),
        });

        await tx.project.update({
          where: { id: project.id },
          data: { wordCount: totalWords },
        });
      }

      return project.id;
    });

    revalidatePath("/projects");
    return { ok: true, projectId };
  } catch (e) {
    console.error("[import] 导入失败:", e);
    return { ok: false, error: "导入失败，请重试" };
  }
}

/** 去掉章节标题的编号前缀："第一章 初入宗门" → "初入宗门"；"Chapter 1 The Beginning" → "The Beginning" */
function stripChapterPrefix(title: string): string {
  return (
    title
      .replace(/^\s*第\s*[0-9一二三四五六七八九十百千零〇两]+\s*[章回节集]\s*[:：.．、\s]?\s*/, "")
      .replace(/^\s*(?:Chapter|CHAPTER|chap\.?)\s*\d+\s*[:：.．\s]?\s*/i, "")
      .trim()
  );
}
