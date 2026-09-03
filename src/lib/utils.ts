import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | number) {
  const d = new Date(date);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatDateTime(date: Date | string | number) {
  const d = new Date(date);
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatWordCount(count: number) {
  if (count < 10000) return `${count} 字`;
  return `${(count / 10000).toFixed(1)} 万字`;
}

/** 千分位整数（卡片字数展示用：42,587 字） */
export function formatCount(count: number) {
  return count.toLocaleString("zh-CN");
}

/** 相对更新时间：今天/昨天带时刻，同年 MM/DD，跨年带年份 */
export function formatUpdatedAt(date: Date | string | number) {
  const d = new Date(date);
  const now = new Date();
  const hm = d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `今天 ${hm}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `昨天 ${hm}`;
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("zh-CN", sameYear
    ? { month: "2-digit", day: "2-digit" }
    : { year: "numeric", month: "2-digit", day: "2-digit" });
}

/** 预计阅读时长（分钟），按 400 字/分钟估算 */
export function readingMinutes(chars: number) {
  return Math.max(1, Math.round(chars / 400));
}

export function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * HTML → 纯文本：用于将 TipTap 保存的 HTML 在 Textarea 中友好显示。
 * - 块级元素（p/div/li/h1-h6/br）转换为换行
 * - 去除所有其他标签
 * - 合并连续空行
 * - 去除首尾空白
 */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  let s = String(html);
  // 自闭合/单行块元素转换行
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(p|div|li|h[1-6]|blockquote|pre|tr)>/gi, "\n");
  s = s.replace(/<li[^>]*>/gi, "• ");
  // 去除剩余标签
  s = s.replace(/<[^>]+>/g, "");
  // 解码常见 HTML 实体
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  // 合并连续空行
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

/**
 * 纯文本 → HTML：流水线编辑器的回写。
 * - 按双换行分段，每段用 <p> 包裹
 * - 段内单换行替换为 <br/>
 * - 转义 HTML 特殊字符防止 XSS
 */
export function textToHtml(text: string | null | undefined): string {
  if (!text) return "";
  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  return text
    .split(/\n{2,}/)
    .map((para) => {
      const inner = escape(para).replace(/\n/g, "<br/>");
      return `<p>${inner}</p>`;
    })
    .join("");
}
