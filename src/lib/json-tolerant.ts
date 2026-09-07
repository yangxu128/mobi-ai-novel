/**
 * 通用容错 JSON 解析（客户端/服务端同构）。
 *
 * LLM 输出的 JSON 常见问题：markdown 代码块包裹、前后夹杂说明文字、
 * 全角标点（，：；）、max_tokens 截断。这里做逐级容错：
 * 原文 → 全角归一 → 截断修复，尽量保住已完整输出的部分。
 */

/** 结构性全角标点归一为半角（只处理字符串字面量之外的部分，避免破坏正文内容） */
export function normalizeStructuralPunctuation(text: string): string {
  const map: Record<string, string> = {
    "，": ",",
    "：": ":",
    "；": ";",
  };
  let out = "";
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      out += ch;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    out += map[ch] ?? ch;
  }
  return out;
}

/**
 * 截断修复：生成被 max_tokens 截断时，补齐未闭合的字符串与括号，
 * 尽量保住已完整输出的部分。结构完好时返回 null（无需修复）。
 */
export function repairTruncatedJson(text: string): string | null {
  let inString = false;
  let escaped = false;
  const stack: string[] = [];
  for (const ch of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }
  if (stack.length === 0) return null;
  let t = text;
  if (inString) t += '"'; // 字符串被截断：补闭合引号
  t = t.replace(/[,:\s]+$/, ""); // 去掉悬挂的逗号/冒号
  const closers = stack
    .reverse()
    .map((c) => (c === "{" ? "}" : "]"))
    .join("");
  return t + closers;
}

/**
 * 容错解析 LLM 输出的 JSON 对象。
 * 剥代码块 → 截首尾大括号 → 逐级容错解析（原文 → 全角归一 → 截断修复）。
 * 解析失败返回 null。
 */
export function parseJsonLoose(
  raw: string
): Record<string, unknown> | null {
  if (!raw) return null;
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    try {
      return JSON.parse(normalizeStructuralPunctuation(text)) as Record<
        string,
        unknown
      >;
    } catch {
      const repaired = repairTruncatedJson(
        normalizeStructuralPunctuation(text)
      );
      if (repaired) {
        try {
          return JSON.parse(repaired) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
      return null;
    }
  }
}
