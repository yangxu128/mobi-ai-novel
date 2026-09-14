/**
 * 自定义模型服务商内置预设（OpenAI 协议）。
 *
 * 设置页添加 Provider 时可选预设自动带出 baseUrl 与常用模型清单，
 * 也可完全自定义。模型清单仅为常用快捷项，实际以「拉取模型列表」为准。
 */

export interface ProviderPreset {
  /** 预设 key（"custom" 表示纯自定义） */
  key: string;
  name: string;
  baseUrl: string;
  /** OpenAI 协议兼容的模型清单（id 即 API model 参数） */
  models: { modelId: string; name: string }[];
  /** 是否需要 API Key（Ollama 本地服务不需要） */
  requiresKey: boolean;
  /** 备注提示（如需要开通的服务/endpoint 说明） */
  hint?: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    key: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    requiresKey: true,
    models: [
      { modelId: "gpt-4o", name: "GPT-4o" },
      { modelId: "gpt-4o-mini", name: "GPT-4o mini" },
      { modelId: "gpt-4.1", name: "GPT-4.1" },
      { modelId: "gpt-4.1-mini", name: "GPT-4.1 mini" },
    ],
  },
  {
    key: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    requiresKey: true,
    models: [
      { modelId: "deepseek-chat", name: "DeepSeek Chat" },
      { modelId: "deepseek-reasoner", name: "DeepSeek Reasoner" },
    ],
  },
  {
    key: "dashscope",
    name: "阿里云百炼",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    requiresKey: true,
    hint: "需在阿里云百炼开通模型服务",
    models: [
      { modelId: "qwen-max", name: "Qwen Max" },
      { modelId: "qwen-plus", name: "Qwen Plus" },
      { modelId: "qwen-turbo", name: "Qwen Turbo" },
      { modelId: "qwen-long", name: "Qwen Long" },
    ],
  },
  {
    key: "volcengine",
    name: "火山方舟（豆包）",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    requiresKey: true,
    hint: "需在火山方舟开通对应模型推理接入点",
    models: [
      { modelId: "doubao-seed-1-6-250615", name: "Doubao Seed 1.6" },
      { modelId: "doubao-1-5-pro-32k-250115", name: "Doubao 1.5 Pro 32k" },
      { modelId: "doubao-1-5-pro-256k", name: "Doubao 1.5 Pro 256k" },
    ],
  },
  {
    key: "zhipu",
    name: "智谱 GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    requiresKey: true,
    models: [
      { modelId: "glm-4.6", name: "GLM-4.6" },
      { modelId: "glm-4.5", name: "GLM-4.5" },
      { modelId: "glm-4.5-air", name: "GLM-4.5 Air" },
      { modelId: "glm-4-flash", name: "GLM-4 Flash" },
    ],
  },
  {
    key: "moonshot",
    name: "月之暗面 Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    requiresKey: true,
    models: [
      { modelId: "kimi-k2-0905-preview", name: "Kimi K2" },
      { modelId: "moonshot-v1-8k", name: "Moonshot V1 8k" },
      { modelId: "moonshot-v1-32k", name: "Moonshot V1 32k" },
      { modelId: "moonshot-v1-128k", name: "Moonshot V1 128k" },
    ],
  },
  {
    key: "siliconflow",
    name: "硅基流动",
    baseUrl: "https://api.siliconflow.cn/v1",
    requiresKey: true,
    models: [
      { modelId: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3" },
      { modelId: "deepseek-ai/DeepSeek-R1", name: "DeepSeek R1" },
      { modelId: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen2.5 72B" },
    ],
  },
  {
    key: "xai",
    name: "xAI Grok",
    baseUrl: "https://api.x.ai/v1",
    requiresKey: true,
    models: [
      { modelId: "grok-4", name: "Grok 4" },
      { modelId: "grok-3", name: "Grok 3" },
      { modelId: "grok-3-mini", name: "Grok 3 mini" },
    ],
  },
  {
    key: "ollama",
    name: "Ollama（本地）",
    baseUrl: "http://localhost:11434/v1",
    requiresKey: false,
    hint: "需本地运行 Ollama；API Key 可留空",
    models: [
      { modelId: "qwen2.5:7b", name: "Qwen2.5 7B" },
      { modelId: "llama3.1:8b", name: "Llama 3.1 8B" },
      { modelId: "deepseek-r1:7b", name: "DeepSeek R1 7B" },
    ],
  },
  {
    key: "custom",
    name: "自定义（OpenAI 协议）",
    baseUrl: "",
    requiresKey: true,
    models: [],
    hint: "任何 OpenAI 协议兼容接口，填写 BaseURL 与 Key 即可",
  },
];
