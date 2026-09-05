import OpenAI from "openai";

/**
 * AI Provider 抽象层。
 * 兼容 OpenAI / 豆包 / DeepSeek / 智谱 等任意 OpenAI 协议接口。
 *
 * 内置重试机制：
 * - 请求错误：对可重试错误（429 限流、500/502/503 服务端错误、连接超时/断连）自动重试 2 次，指数退避
 * - 流式挂起：chunk 空闲超时监控 —— 首 chunk 超时 / chunk 间隔超时自动 abort；
 *   尚无输出时直接重试；已有输出时抛 AIStreamStalledError 交由上层重跑
 * - 内容审查等 4xx 错误不重试
 */

/** 首个 chunk 等待上限（模型排队、长 prompt 处理，TTFB 偏长是正常的） */
const STREAM_FIRST_CHUNK_TIMEOUT_MS = 120_000;
/** 相邻 chunk 间隔上限（一旦开始输出 token 应连续，静默过久即视为挂起） */
const STREAM_IDLE_TIMEOUT_MS = 60_000;
/** 非流式请求整体超时 */
const CHAT_TIMEOUT_MS = 180_000;

/**
 * 流式输出中途挂起（长时间无新 chunk）时抛出。
 * partialText 为中断前已输出的正文（上层可提示用户或整体重跑）。
 */
export class AIStreamStalledError extends Error {
  readonly partialText: string;
  constructor(partialText = "") {
    super("AI 输出长时间无响应，已中断");
    this.name = "AIStreamStalledError";
    this.partialText = partialText;
  }
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIStreamChunk {
  delta: string;
  done?: boolean;
  /** DeepSeek 等推理模型的思考内容（reasoning_content），非正文 */
  reasoning?: boolean;
}

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (client) return client;
  if (!process.env.AI_API_KEY) {
    throw new Error("AI_API_KEY 未配置");
  }
  client = new OpenAI({
    apiKey: process.env.AI_API_KEY,
    baseURL: process.env.AI_BASE_URL || "https://api.openai.com/v1",
  });
  return client;
}

export const DEFAULT_MODEL = process.env.AI_MODEL || "gpt-4o-mini";

/**
 * 判断错误是否值得重试（服务端错误、限流、连接异常）。
 */
function isRetryable(err: unknown): boolean {
  const e = err as { status?: number; error?: { code?: string } };
  if (e.status === 429 || e.status === 500 || e.status === 502 || e.status === 503) {
    return true;
  }
  if (e.error?.code === "rate_limit_exceeded") return true;
  // 网络层异常：连接超时、连接被重置等（SDK 的 timeout/网络错误无 status）
  if (err instanceof OpenAI.APIConnectionTimeoutError) return true;
  if (err instanceof OpenAI.APIConnectionError) return true;
  return false;
}

/**
 * 指数退避延迟。
 */
function backoff(attempt: number): Promise<void> {
  const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

const MAX_RETRIES = 2;

/**
 * 流式生成。返回一个异步迭代器，逐 token 输出。
 *
 * 重试策略：
 * - 请求错误（可重试类）：自动重试最多 MAX_RETRIES 次
 * - 挂起（chunk 静默超时）：尚未输出任何内容时自动重试；
 *   已输出部分内容时抛 AIStreamStalledError（内部静默重发会导致内容重复，交上层处理）
 */
export async function* streamChat(opts: {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  /** DeepSeek v4 等推理模型：disabled 可关闭思考，省 token 且大幅提速 */
  thinking?: "enabled" | "disabled";
}): AsyncGenerator<AIStreamChunk, void, unknown> {
  const openai = getClient();
  const model = opts.model || DEFAULT_MODEL;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // 内部 abort：挂起超时触发；同时联动用户 signal
    const internal = new AbortController();
    const onUserAbort = () => internal.abort();
    if (opts.signal) {
      if (opts.signal.aborted) throw new DOMException("Aborted", "AbortError");
      opts.signal.addEventListener("abort", onUserAbort);
    }

    // chunk 空闲计时器：收到 chunk 重置；超时触发 internal.abort
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let stalled = false;
    const armIdle = (ms: number) => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        stalled = true;
        internal.abort();
      }, ms);
    };
    const clearIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = null;
    };

    let yieldedAny = false; // 本轮 attempt 是否已对外 yield 过内容
    let partialText = ""; // 本轮已 yield 的正文（供 stall 错误携带）
    let iterator: AsyncIterator<unknown> | null = null;

    try {
      const body = {
        model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.8,
        max_tokens: opts.maxTokens,
        stream: true,
        ...(opts.thinking ? { thinking: { type: opts.thinking } } : {}),
      };
      const stream = (await openai.chat.completions.create(
        body as unknown as Parameters<typeof openai.chat.completions.create>[0],
        { signal: internal.signal }
      )) as unknown as AsyncIterable<{
        choices: Array<{
          delta: { content?: string; reasoning_content?: string };
          finish_reason: string | null;
        }>;
      }>;

      // 连接已建立：开始监控 chunk 间隔（首 chunk 宽限更长）
      armIdle(STREAM_FIRST_CHUNK_TIMEOUT_MS);
      iterator = stream[Symbol.asyncIterator]();

      while (true) {
        const result = await iterator.next();
        armIdle(STREAM_IDLE_TIMEOUT_MS);
        if (result.done) break;
        const chunk = result.value as {
          choices: Array<{
            delta: { content?: string; reasoning_content?: string };
            finish_reason: string | null;
          }>;
        };
        // 推理模型（DeepSeek v4 等）会先输出大量 reasoning_content 思考内容，
        // 必须转发给客户端作为"仍在生成"的心跳，否则前端会一直转圈
        const delta = chunk.choices[0]?.delta || {};
        const reasoning = (delta as { reasoning_content?: string }).reasoning_content || "";
        const content = delta.content || "";
        if (reasoning) {
          yieldedAny = true;
          yield { delta: reasoning, reasoning: true };
        }
        if (content) {
          yieldedAny = true;
          partialText += content;
          yield { delta: content };
        }
      }
      clearIdle();
      yield { delta: "", done: true };
      return; // 成功，退出重试循环
    } catch (err) {
      lastError = err;

      // 挂起超时：内部主动 abort
      if (stalled) {
        if (yieldedAny) {
          // 已输出部分内容，静默重发会重复 —— 交上层整体重跑
          throw new AIStreamStalledError(partialText);
        }
        // 尚无任何输出：安全的原地重试
        if (attempt === MAX_RETRIES) {
          throw new AIStreamStalledError("");
        }
        await backoff(attempt);
        continue;
      }

      // 用户主动中断不重试
      if ((err as Error).name === "AbortError") throw err;
      // 不可重试的错误直接抛出
      if (!isRetryable(err) || attempt === MAX_RETRIES) throw err;
      // 等待后重试
      await backoff(attempt);
    } finally {
      clearIdle();
      // 主动关闭底层流（abort/错误路径下释放连接资源）
      try {
        await iterator?.return?.();
      } catch {
        // 忽略清理错误
      }
      opts.signal?.removeEventListener("abort", onUserAbort);
    }
  }

  throw lastError;
}

/**
 * 非流式生成。返回完整文本。
 * 请求错误自动重试（最多 MAX_RETRIES 次）；整请求超时（CHAT_TIMEOUT_MS）视为可重试。
 * 混合推理模型（DeepSeek v4 等）若把输出预算烧在思考上导致正文为空，也视为可重试。
 */
export async function chat(opts: {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** DeepSeek v4 等推理模型：disabled 可关闭思考，省 token 且防止思考烧掉 max_tokens 导致正文截断 */
  thinking?: "enabled" | "disabled";
}): Promise<string> {
  const openai = getClient();
  const model = opts.model || DEFAULT_MODEL;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const body = {
        model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.8,
        max_tokens: opts.maxTokens,
        ...(opts.thinking ? { thinking: { type: opts.thinking } } : {}),
      };
      const resp = (await openai.chat.completions.create(
        body as unknown as Parameters<typeof openai.chat.completions.create>[0],
        { timeout: CHAT_TIMEOUT_MS }
      )) as unknown as {
        choices: Array<{ message?: { content?: string } }>;
      };
      const content = resp.choices[0]?.message?.content || "";
      // 推理模型偶尔全部预算耗在 reasoning 上、content 为空：退避后重试
      if (!content.trim() && attempt < MAX_RETRIES) {
        await backoff(attempt);
        continue;
      }
      return content;
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === MAX_RETRIES) throw err;
      await backoff(attempt);
    }
  }

  throw lastError;
}

/**
 * 估算 token 数。
 *
 * 改进算法：基于 BPE 分词的统计经验值，比纯字符数更准确。
 * - 中文：每字 ≈ 1.5-2 token（取决于编码，CJK 统一表意文字通常 1 token/字 + BPE 开销）
 * - 英文：约 4 字符 ≈ 1 token（单词边界处 BPE 会切分）
 * - 标点/空白：英文标点 ≈ 0.5 token，中文标点 ≈ 1 token
 * - 数字/符号：每 3 个字符 ≈ 1 token
 *
 * 整体误差在 ±15% 以内，足以用于配额估算。
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const chineseChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  const chinesePunctuation = (text.match(/[\u3000-\u303f\uff00-\uffef]/g) || []).length;
  const asciiWords = (text.match(/[a-zA-Z]+/g) || []).length;
  const digits = (text.match(/\d/g) || []).length;
  const otherChars = text.length - chineseChars - chinesePunctuation - asciiWords * 4 - digits;

  return Math.ceil(
    chineseChars * 1.8 +      // 中文
    chinesePunctuation * 1.0 + // 中文标点
    asciiWords * 1.3 +         // 英文单词
    digits * 0.33 +            // 数字
    otherChars * 0.3           // 其他字符
  );
}
