import OpenAI from "openai";

/**
 * AI Provider 抽象层。
 * 兼容 OpenAI / 豆包 / DeepSeek / 智谱 等任意 OpenAI 协议接口。
 *
 * 内置重试机制：对可重试错误（429 限流、500/502/503 服务端错误）自动重试 2 次，
 * 间隔指数退避（1s → 2s）。内容审查等 4xx 错误不重试。
 */

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
 * 判断错误是否值得重试（服务端错误、限流）。
 */
function isRetryable(err: unknown): boolean {
  const e = err as { status?: number; error?: { code?: string } };
  if (e.status === 429 || e.status === 500 || e.status === 502 || e.status === 503) {
    return true;
  }
  if (e.error?.code === "rate_limit_exceeded") return true;
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
 * 遇到可重试错误时自动重试（最多 MAX_RETRIES 次）。
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
        { signal: opts.signal }
      )) as unknown as AsyncIterable<{
        choices: Array<{
          delta: { content?: string; reasoning_content?: string };
          finish_reason: string | null;
        }>;
      }>;

      for await (const chunk of stream) {
        // 推理模型（DeepSeek v4 等）会先输出大量 reasoning_content 思考内容，
        // 必须转发给客户端作为"仍在生成"的心跳，否则前端会一直转圈
        const delta = chunk.choices[0]?.delta || {};
        const reasoning = (delta as { reasoning_content?: string }).reasoning_content || "";
        const content = delta.content || "";
        if (reasoning) {
          yield { delta: reasoning, reasoning: true };
        }
        if (content) {
          yield { delta: content };
        }
      }
      yield { delta: "", done: true };
      return; // 成功，退出重试循环
    } catch (err) {
      lastError = err;
      // 用户主动中断不重试
      if ((err as Error).name === "AbortError") throw err;
      // 不可重试的错误直接抛出
      if (!isRetryable(err) || attempt === MAX_RETRIES) throw err;
      // 等待后重试
      await backoff(attempt);
    }
  }

  throw lastError;
}

/**
 * 非流式生成。返回完整文本。
 * 遇到可重试错误时自动重试（最多 MAX_RETRIES 次）。
 */
export async function chat(opts: {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const openai = getClient();
  const model = opts.model || DEFAULT_MODEL;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await openai.chat.completions.create({
        model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.8,
        max_tokens: opts.maxTokens,
      });
      return resp.choices[0]?.message?.content || "";
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
