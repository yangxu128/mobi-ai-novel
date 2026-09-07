/**
 * 章节切分（纯前端、不耗积分）。
 *
 * 支持的章节标记（整行 ≤40 字才认，防止把正文句子误判为标题）：
 * - 卷：第X卷 / 卷X / Volume N
 * - 章：第X章/回/节/集（中文数字/阿拉伯/混合）、Chapter N、序章/楔子/番外等特殊章、纯数字行（降级）
 * 无任何标记时按字数降级切分（空行边界优先）。
 */

import type { ImportChapterDraft } from "@/types/import";

/** 行长上限：超过则不视为章节标记（正文句子保护） */
const TITLE_MAX_LEN = 40;

/** 中文数字/阿拉伯/混合 → 整数；解析失败返回 NaN */
export function cnNumToInt(s: string): number {
  if (!s) return NaN;
  const t = s.trim();
  if (/^\d+$/.test(t)) return parseInt(t, 10);

  const digitMap: Record<string, number> = {
    零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4,
    五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
  };
  const unitMap: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };

  // 混合形式（如 "3百"）：逐段归一为纯中文数字串再解析
  let normalized = "";
  for (const ch of t) {
    if (/[0-9]/.test(ch)) {
      const d = parseInt(ch, 10);
      // 数字 → 中文（仅个位数直接映射；十位以上组合会在下一步正确累加）
      normalized +=
        d === 0 ? "零" : d === 1 ? "一" : d === 2 ? "二" : d === 3 ? "三" : d === 4 ? "四" : d === 5 ? "五" : d === 6 ? "六" : d === 7 ? "七" : d === 8 ? "八" : "九";
    } else {
      normalized += ch;
    }
  }

  let total = 0;
  let current = 0;
  let sawDigit = false;
  for (const ch of normalized) {
    if (ch in digitMap) {
      current = digitMap[ch];
      sawDigit = true;
    } else if (ch in unitMap) {
      const unit = unitMap[ch];
      if (!sawDigit) current = 1; // "十" = 一十
      total += current * unit;
      current = 0;
      sawDigit = false;
    } else {
      return NaN;
    }
  }
  if (!sawDigit && current === 0 && total === 0) return NaN;
  return total + current;
}

type SplitResult = {
  chapters: ImportChapterDraft[];
  /** 是否识别到章节标记（false = 降级切分） */
  matched: boolean;
  /** 命中的标记类型提示，如"已按「第X章」切分，共 N 章" */
  patternHint: string;
};

const NUM = "([0-9一二三四五六七八九十百千零〇两]+)";

/** 卷标记（行首）：第X卷 / 卷X / Volume N */
const VOLUME_RE = new RegExp(
  `^\\s*(?:第\\s*${NUM}\\s*卷|卷\\s*${NUM}|(?:Volume|Vol\\.?)\\s*(\\d+))\\s*[:：.．、]?\\s*(.*)$`
);

/** 章标记 P1：第X章/回/节/集 */
const CHAPTER_RE = new RegExp(
  `^\\s*第\\s*${NUM}\\s*[章回节集]\\s*[:：.．、\\s]?\\s*(.*)$`
);
/** 章标记 P2：Chapter N */
const CHAPTER_EN_RE = /^\s*(?:Chapter|CHAPTER|chap\.?)\s*(\d+)\s*[:：.．\s]?\s*(.*)$/;
/** 章标记 P3：特殊章（序章/楔子/番外等） */
const CHAPTER_SPECIAL_RE =
  /^\s*(序章|序言|楔子|引子|前言|序|尾声|终章|后记|番外\s*\d*)\s*[:：.．、\s]?\s*(.*)$/;
/** 章标记 P4：纯数字行 "1、标题"（仅 P1-P3 全无匹配时启用） */
const CHAPTER_NUM_RE = /^\s*(\d{1,4})\s*[、.．]\s*(.*)$/;

/** 中文数字串 → 阿拉伯数字标题（用于无题名时的默认标题，尽量保留原文风格） */
function chapterLabel(chapter: number, fallbackTitle: string): string {
  return fallbackTitle || `第 ${chapter} 章`;
}

/**
 * 按字数降级切分：优先在空行边界切，找不到空行才硬切。
 */
export function splitBySize(
  text: string,
  charsPerChapter: number
): ImportChapterDraft[] {
  const clean = text.trim();
  if (!clean) return [];
  if (clean.length <= charsPerChapter) {
    return [
      { volume: 1, chapter: 1, title: "第 1 章", content: clean, order: 0 },
    ];
  }

  const chapters: ImportChapterDraft[] = [];
  let rest = clean;
  let no = 1;
  while (rest.length > 0) {
    if (rest.length <= charsPerChapter) {
      chapters.push({ volume: 1, chapter: no, title: `第 ${no} 章`, content: rest, order: no - 1 });
      break;
    }
    // 在目标位置附近找最近的空行边界（向后 25% 内找，找不到就硬切）
    const window = rest.slice(charsPerChapter, Math.min(rest.length, Math.floor(charsPerChapter * 1.25)));
    const nl = window.indexOf("\n\n");
    let cut = nl >= 0 ? charsPerChapter + nl + 2 : charsPerChapter;
    // 空行找不到时退而求其次找单个换行
    if (nl < 0) {
      const nl1 = window.indexOf("\n");
      if (nl1 >= 0) cut = charsPerChapter + nl1 + 1;
    }
    chapters.push({
      volume: 1,
      chapter: no,
      title: `第 ${no} 章`,
      content: rest.slice(0, cut).trim(),
      order: no - 1,
    });
    rest = rest.slice(cut).trim();
    no++;
  }
  return chapters;
}

/**
 * 章节切分主入口。
 */
export function splitChapters(text: string): SplitResult {
  const clean = text.replace(/\r\n?/g, "\n").trim();
  if (!clean) return { chapters: [], matched: false, patternHint: "" };

  const lines = clean.split("\n");

  /** 单遍行扫描。numericFallback：P1-P3 全无匹配时启用纯数字行（"1、标题"） */
  function scan(numericFallback: boolean) {
    type Draft = { volume: number; chapter: number; title: string; lines: string[] };
    const drafts: Draft[] = [];
    let currentVolume = 1;
    let cur: Draft | null = null;
    let hasChapterMark = false;
    let patternName = "";
    let maxChapter = 0;
    /** 正文（非番外）最大章号：尾声/终章的顺位基准，不受番外 900+ 编号污染 */
    let maxMainChapter = 0;
    let extraNo = 900; // 番外起始编号，避免与正文冲突

    const push = (d: Draft | null) => {
      if (d && d.lines.join("").trim()) drafts.push(d);
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        if (cur) cur.lines.push("");
        continue;
      }

      // 卷标记
      const vm = line.length <= TITLE_MAX_LEN ? line.match(VOLUME_RE) : null;
      if (vm) {
        const numStr = vm[1] || vm[2] || vm[3] || "";
        const v = cnNumToInt(numStr);
        currentVolume = Number.isFinite(v) && v >= 1 ? v : currentVolume + 1;
        continue;
      }

      // 章标记（行长保护）
      if (line.length <= TITLE_MAX_LEN) {
        let matched = false;
        let chapterNo = 0;
        let title = "";

        const m1 = line.match(CHAPTER_RE);
        const m2 = line.match(CHAPTER_EN_RE);
        const m3 = line.match(CHAPTER_SPECIAL_RE);

        if (m1) {
          const n = cnNumToInt(m1[1]);
          chapterNo = Number.isFinite(n) ? n : maxChapter + 1;
          title = (m1[2] || "").trim();
          patternName = "第X章";
          matched = true;
        } else if (m2) {
          chapterNo = parseInt(m2[1], 10);
          title = (m2[2] || "").trim();
          patternName = "Chapter N";
          matched = true;
        } else if (m3) {
          const kind = m3[1].trim();
          const sub = (m3[2] || "").trim();
          if (/^(序章|序言|楔子|引子|前言|序)/.test(kind)) {
            chapterNo = 0;
          } else if (/^番外/.test(kind)) {
            chapterNo = extraNo++;
          } else {
            chapterNo = maxMainChapter + 1; // 尾声/终章/后记
          }
          title = sub || kind;
          patternName = "特殊章节（序章/楔子等）";
          matched = true;
        } else if (numericFallback) {
          const m4 = line.match(CHAPTER_NUM_RE);
          if (m4) {
            chapterNo = parseInt(m4[1], 10);
            title = (m4[2] || "").trim();
            patternName = "数字编号";
            matched = true;
          }
        }

        if (matched) {
          push(cur);
          maxChapter = Math.max(maxChapter, chapterNo);
          if (chapterNo < 900) maxMainChapter = Math.max(maxMainChapter, chapterNo);
          cur = {
            volume: currentVolume,
            chapter: chapterNo,
            title: chapterLabel(chapterNo, title),
            lines: [],
          };
          hasChapterMark = true;
          continue;
        }
      }

      if (cur) {
        cur.lines.push(line);
      } else {
        // 首个章标记之前的内容：可能是简介/设定，单独成章（预览可删）
        cur = {
          volume: currentVolume,
          chapter: 0,
          title: "开篇前文",
          lines: [line],
        };
      }
    }
    push(cur);

    return { drafts, hasChapterMark, patternName };
  }

  // 第一遍：标准标记；全无匹配时第二遍启用纯数字行
  let { drafts, hasChapterMark, patternName } = scan(false);
  if (!hasChapterMark) {
    const r2 = scan(true);
    if (r2.hasChapterMark && r2.drafts.length >= 2) {
      drafts = r2.drafts;
      hasChapterMark = true;
      patternName = r2.patternName;
    }
  }

  // 误匹配保护：仅 1 个章标记且全文超 2 万字 → 大概率正文里偶发了一行"第X章"式句子
  const isLikelyFalseMatch =
    hasChapterMark && drafts.filter((d) => d.chapter !== 0).length <= 1 && clean.length > 20000;

  if (!hasChapterMark || isLikelyFalseMatch) {
    const chapters = splitBySize(clean, 4000);
    return {
      chapters,
      matched: false,
      patternHint: hasChapterMark
        ? "章节标记过少，已按每章约 4000 字切分"
        : "未识别到章节标记，已按每章约 4000 字切分",
    };
  }

  const chapters: ImportChapterDraft[] = drafts.map((d, i) => ({
    volume: d.volume,
    chapter: d.chapter,
    title: d.title,
    content: d.lines.join("\n").trim(),
    order: i,
  }));

  const volumes = new Set(chapters.map((c) => c.volume)).size;
  const hint =
    `已按「${patternName}」切分，共 ${chapters.length} 章` +
    (volumes > 1 ? ` ${volumes} 卷` : "");

  return { chapters, matched: true, patternHint: hint };
}
