/**
 * 知识库枚举值的中文标签映射。
 * 提取到共享模块，避免在 rag.ts、knowledge-sidebar-compact.tsx 等多处重复定义。
 */

export const categoryLabel: Record<string, string> = {
  BACKGROUND: "时代背景",
  GEOGRAPHY: "地理",
  RULE: "社会规则",
  SYSTEM: "力量体系",
  OTHER: "其他",
};

export const roleLabel: Record<string, string> = {
  PROTAGONIST: "主角",
  SUPPORTING: "配角",
  ANTAGONIST: "反派",
  EXTRA: "路人",
};
