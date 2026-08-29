/**
 * 返回可用 AI 模型列表。
 * GET /api/ai/models
 */

import { getAvailableModels } from "@/lib/ai/models";
import { DEFAULT_MODEL } from "@/lib/ai/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    models: getAvailableModels(),
    defaultModel: DEFAULT_MODEL,
  });
}
