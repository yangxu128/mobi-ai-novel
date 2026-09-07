/**
 * AI 智能解析的输入采样（前端构造，控制 payload 体积与 token 成本）。
 *
 * 结构：【设定资料】全文（≤8000 字截断）+【章节目录】（≤100 条）
 *      +【正文采样】前 3 章各 800 字 + 中段 2 章各 500 字 + 末章 500 字
 * 总长硬上限 12000 字。
 */

import type { ImportChapterDraft } from "@/types/import";

const SETTINGS_LIMIT = 8000;
const TITLES_LIMIT = 100;
const TOTAL_LIMIT = 12000;

/** 章节正文采样配置：前 3 章各 800 字 + 中段 2 章各 500 字 + 末章 500 字 */
const SAMPLE_PLAN: Array<{ take: number; slice: number }> = [
  { take: 3, slice: 800 },
  { take: 2, slice: 500 },
  { take: 1, slice: 500 },
];

export function buildSampleText(
  settingsText: string,
  chapters: ImportChapterDraft[]
): string {
  const parts: string[] = [];

  const settings = (settingsText || "").trim();
  if (settings) {
    parts.push(
      `【设定资料】\n${
        settings.length > SETTINGS_LIMIT
          ? settings.slice(0, SETTINGS_LIMIT) + "\n（设定资料过长，已截断）"
          : settings
      }`
    );
  }

  if (chapters.length > 0) {
    const titles = chapters
      .slice(0, TITLES_LIMIT)
      .map((c) => `第${c.order + 1}章（order=${c.order}） ${c.title}`);
    parts.push(
      `【章节目录】\n${titles.join("\n")}${
        chapters.length > TITLES_LIMIT ? `\n（共 ${chapters.length} 章，仅列前 ${TITLES_LIMIT} 章）` : ""
      }`
    );

    // 采样章节选择：前 3 + 中段 2 + 末 1
    const n = chapters.length;
    const picked = new Map<number, number>(); // order -> slice
    const front = SAMPLE_PLAN[0].take;
    const mid = SAMPLE_PLAN[1].take;
    const endTake = SAMPLE_PLAN[2].take;

    for (let i = 0; i < Math.min(front, n); i++) {
      picked.set(i, SAMPLE_PLAN[0].slice);
    }
    if (n > front + endTake) {
      const midStart = Math.floor((front + (n - endTake)) / 2);
      for (let i = 0; i < mid; i++) {
        const idx = midStart + i;
        if (idx < n - endTake) picked.set(idx, SAMPLE_PLAN[1].slice);
      }
    }
    for (let i = Math.max(0, n - endTake); i < n; i++) {
      picked.set(i, SAMPLE_PLAN[2].slice);
    }

    const samples = [...picked.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([order, sliceLen]) => {
        const ch = chapters[order];
        const body =
          ch.content.length > sliceLen
            ? ch.content.slice(0, sliceLen) + "…"
            : ch.content;
        return `◆ 第${order + 1}章 ${ch.title}\n${body}`;
      });
    parts.push(`【正文采样】\n${samples.join("\n\n")}`);
  }

  let out = parts.join("\n\n");
  if (out.length > TOTAL_LIMIT) out = out.slice(0, TOTAL_LIMIT);
  return out;
}

/** 需要 AI 生成摘要的章节 order 列表（前 30 章） */
export function summaryChapterOrders(chapters: ImportChapterDraft[]): number[] {
  return chapters.slice(0, 30).map((c) => c.order);
}
