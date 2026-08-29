/**
 * 简单内存限流器（滑动窗口）。
 *
 * 生产环境建议替换为 Redis，但 MVP 阶段用内存版足够防止单用户刷接口。
 * 在 serverless 环境中每个实例各自计数，实际限制是 maxPerWindow × 实例数，
 * 但对防滥用已经够用。
 */

const windows = new Map<string, number[]>();

/**
 * @param key       限流维度（如 userId）
 * @param maxCount  窗口内最大请求数
 * @param windowMs  窗口大小（毫秒）
 * @returns { ok: boolean }
 */
export function rateLimit(
  key: string,
  maxCount: number,
  windowMs: number
): { ok: boolean } {
  const now = Date.now();
  const cutoff = now - windowMs;

  // 取出该 key 的请求时间戳列表
  let timestamps = windows.get(key) || [];

  // 移除窗口外的旧时间戳
  timestamps = timestamps.filter((t) => t > cutoff);

  if (timestamps.length >= maxCount) {
    return { ok: false };
  }

  timestamps.push(now);
  windows.set(key, timestamps);

  // 定期清理过期 key（每 1000 次调用清理一次）
  if (windows.size > 5000) {
    for (const [k, ts] of windows) {
      const valid = ts.filter((t) => t > Date.now() - windowMs);
      if (valid.length === 0) {
        windows.delete(k);
      } else {
        windows.set(k, valid);
      }
    }
  }

  return { ok: true };
}
