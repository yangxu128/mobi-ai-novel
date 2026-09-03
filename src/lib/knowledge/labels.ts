/**
 * 知识库枚举值的中文标签映射。
 * 提取到共享模块，避免在 rag.ts、knowledge-sidebar-compact.tsx 等多处重复定义。
 */

import { getSystemSlotLabel } from "@/lib/genre";

export const categoryLabel: Record<string, string> = {
  BACKGROUND: "时代背景",
  GEOGRAPHY: "地理",
  RULE: "社会规则",
  SYSTEM: "力量体系",
  OTHER: "其他",
};

/**
 * 按题材获取分类标签。
 * SYSTEM 槽位随题材模式切换：奇幻类"力量体系"、现实类"人物关系"、
 * 日常+奇设类"核心奇设"（奇设可从题材标签或设定内容文本中检测）。
 */
export function getCategoryLabel(
  category: string,
  genre?: string | null,
  contentText?: string | null
): string {
  if (category === "SYSTEM") return getSystemSlotLabel(genre, contentText);
  return categoryLabel[category] || category;
}

export const roleLabel: Record<string, string> = {
  PROTAGONIST: "主角",
  SUPPORTING: "配角",
  ANTAGONIST: "反派",
  EXTRA: "路人",
};

export const foreshadowStatusLabel: Record<string, string> = {
  open: "待回收",
  resolved: "已回收",
  abandoned: "已放弃",
};
