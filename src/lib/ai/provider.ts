import OpenAI from "openai";

/**
 * AI Provider 抽象层。
 * 兼容 OpenAI / 豆包 / DeepSeek / 智谱 等任意 OpenAI 协议接口。
 */

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIStreamChunk {
  delta: string;
  done?: boolean;
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
export const PREMIUM_MODEL = process.env.AI_MODEL_PREMIUM || "gpt-4o";

/**
 * 流式生成。返回一个异步迭代器，逐 token 输出。
 */
export async function* streamChat(opts: {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}): AsyncGenerator<AIStreamChunk, void, unknown> {
  const openai = getClient();
  const model = opts.model || DEFAULT_MODEL;

  const stream = await openai.chat.completions.create(
    {
      model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.8,
      max_tokens: opts.maxTokens,
      stream: true,
    },
    { signal: opts.signal }
  );

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || "";
    if (delta) {
      yield { delta };
    }
  }
  yield { delta: "", done: true };
}

/**
 * 非流式生成。返回完整文本。
 */
export async function chat(opts: {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const openai = getClient();
  const model = opts.model || DEFAULT_MODEL;

  const resp = await openai.chat.completions.create({
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.8,
    max_tokens: opts.maxTokens,
  });

  return resp.choices[0]?.message?.content || "";
}

/**
 * 估算 token 数（粗略：1 中文 ≈ 2 token，1 英文单词 ≈ 1.3 token）。
 */
export function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars * 2 + otherChars * 0.4);
}
