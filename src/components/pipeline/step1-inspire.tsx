"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, Check, RefreshCw } from "lucide-react";
import { useAIStream } from "@/hooks/use-ai-stream";
import { updateProjectSynopsisSelected } from "@/actions/project";

interface InspirationCard {
  core: string;
  conflict: string;
  audience: string;
  mood: string;
  reference: string;
}

export function Step1Inspire({ projectId, genre }: { projectId: string; genre: string }) {
  const [idea, setIdea] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const { generate, isStreaming, text, error, stop } = useAIStream();

  async function onGenerate() {
    if (!idea.trim()) return;
    setSelected(null);
    await generate({
      action: "inspire",
      projectId,
      payload: { idea, genre },
    });
  }

  // 解析流式返回的 JSON（兼容中文字段名、代码块包裹、前后说明文字）
  const parsed = useMemo<InspirationCard[] | null>(() => {
    if (!text) return null;
    return tryParseCards(text);
  }, [text]);

  function tryParseCards(raw: string): InspirationCard[] | null {
    // 去掉 markdown 代码块标记
    const cleaned = raw.replace(/```json|```/g, "").trim();

    // 尝试直接解析
    let arr: unknown = null;
    try {
      arr = JSON.parse(cleaned);
    } catch {
      // 提取首个 [ ... ] 段
      const m = cleaned.match(/\[[\s\S]*\]/);
      if (m) {
        try {
          arr = JSON.parse(m[0]);
        } catch {
          arr = null;
        }
      }
    }
    if (!Array.isArray(arr)) return null;

    // 字段名映射（兼容中英文）
    const fieldMap: Record<string, keyof InspirationCard> = {
      core: "core",
      故事内核: "core",
      核心: "core",
      conflict: "conflict",
      核心冲突: "conflict",
      冲突: "conflict",
      audience: "audience",
      目标读者: "audience",
      读者: "audience",
      mood: "mood",
      情绪基调: "mood",
      基调: "mood",
      reference: "reference",
      参考作品: "reference",
      参考: "reference",
      类似作品参考: "reference",
    };

    const cards: InspirationCard[] = [];
    for (const item of arr) {
      if (typeof item !== "object" || item === null) continue;
      const obj = item as Record<string, unknown>;
      const card: InspirationCard = {
        core: "",
        conflict: "",
        audience: "",
        mood: "",
        reference: "",
      };
      let hasAny = false;
      for (const [k, v] of Object.entries(obj)) {
        const target = fieldMap[k] || fieldMap[k.toLowerCase()];
        if (target && typeof v === "string") {
          card[target] = v;
          hasAny = true;
        }
      }
      if (hasAny) cards.push(card);
    }
    return cards.length > 0 ? cards : null;
  }

  // 是否显示原始文本：有文本且未成功解析出卡片
  const showRaw = text && !parsed;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">第一步：灵感卡生成</h2>
        <p className="text-sm text-muted-foreground">
          输入一句话点子，AI 生成 3 张灵感卡，每张包含故事内核、核心冲突、目标读者、情绪基调、参考作品
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">你的灵感</CardTitle>
          <CardDescription>一句话描述你想写的故事</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="例如：一个能听到死者遗言的殡葬师，被卷入一桩十年前的悬案"
            rows={2}
            disabled={isStreaming}
          />
          <div className="flex gap-2">
            <Button onClick={onGenerate} disabled={isStreaming || !idea.trim()}>
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isStreaming ? "生成中..." : "生成灵感卡"}
            </Button>
            {isStreaming && (
              <Button variant="outline" onClick={stop}>
                停止
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {/* 原始文本：流式过程中或解析失败时显示 */}
      {showRaw && (
        <Card>
          <CardContent className="py-4">
            <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground stream-cursor">
              {text}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* 灵感卡展示 */}
      {parsed && parsed.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              选择一张灵感卡作为后续创作的基础
            </p>
            <Button variant="ghost" size="sm" onClick={onGenerate} disabled={isStreaming}>
              <RefreshCw className="h-3.5 w-3.5" />
              重新生成
            </Button>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {parsed.map((c, i) => (
              <Card
                key={i}
                className={`cursor-pointer transition-all ${
                  selected === i ? "border-primary ring-2 ring-primary/20" : "hover:border-foreground/20"
                }`}
                onClick={() => setSelected(i)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">灵感 {i + 1}</CardTitle>
                    {selected === i && <Check className="h-4 w-4 text-primary" />}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">故事内核：</span>
                    <span>{c.core}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">核心冲突：</span>
                    <span>{c.conflict}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">目标读者：</span>
                    <span>{c.audience}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">情绪基调：</span>
                    <span>{c.mood}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">参考作品：</span>
                    <span>{c.reference}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selected !== null && (
            <div className="flex justify-end">
              <Button
                onClick={async () => {
                  const card = parsed[selected];
                  const summary = `${card.core}\n核心冲突：${card.conflict}\n情绪基调：${card.mood}`;
                  await updateProjectSynopsisSelected(projectId, summary);
                  window.dispatchEvent(new CustomEvent("pipeline-step-next"));
                }}
              >
                确认并进入下一步
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
