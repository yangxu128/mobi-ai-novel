/**
 * 流水线各步骤的未确认产物草稿（localStorage 持久化）。
 *
 * 步骤 1-4 遵循「AI 生成 → 人工编辑 → 确认流转」：生成结果在用户确认前
 * 不写知识库（避免重复生成产生重复记录），但纯内存保存意味着刷新即丢。
 * 这里按 项目+步骤 维度把草稿存入 localStorage，确认落库成功后清除，
 * DB 恢复为唯一事实来源。
 */

const keyOf = (projectId: string, step: string | number) =>
  `mb-pipeline-draft:${projectId}:${step}`;

export function readPipelineDraft<T>(projectId: string, step: string | number): T | null {
  try {
    const raw = localStorage.getItem(keyOf(projectId, step));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writePipelineDraft(
  projectId: string,
  step: string | number,
  value: unknown
) {
  try {
    localStorage.setItem(keyOf(projectId, step), JSON.stringify(value));
  } catch {
    // 存储满/隐私模式：静默失败，不影响主流程
  }
}

export function clearPipelineDraft(projectId: string, step: string | number) {
  try {
    localStorage.removeItem(keyOf(projectId, step));
  } catch {
    // ignore
  }
}
