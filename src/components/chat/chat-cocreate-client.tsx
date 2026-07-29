"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Sparkles, Wand2, ArrowRight, Check } from "lucide-react";
import { useAIStream } from "@/hooks/use-ai-stream";
import {
  getChatSessionAction,
  appendChatMessageAction,
  extractCardsFromChatAction,
  commitExtractedCardsAction,
  convertChatToProjectAction,
} from "@/actions/chat";
import { toast } from "@/components/ui/toast";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface Session {
  id: string;
  messages: ChatMessage[];
  extractedCards: {
    worldSettings?: Array<{ title: string; category: string; content: string }>;
    characters?: Array<{ name: string; role: string; appearance?: string; personality?: string; background?: string; motivation?: string }>;
  };
}

export function ChatCoCreateClient({ projectId }: { projectId: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const aiStream = useAIStream();

  useEffect(() => {
    getChatSessionAction(projectId).then((res) => {
      if (res.ok && res.session) {
        setSession({
          id: res.session.id,
          messages: (res.session.messages as unknown as ChatMessage[]) || [],
          extractedCards: (res.session.extractedCards as unknown as Session["extractedCards"]) || {},
        });
      }
    });
  }, [projectId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.messages, aiStream.text]);

  async function onSend() {
    if (!input.trim() || !session || aiStream.isStreaming) return;
    const userMsg: ChatMessage = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };
    const storySoFar = session.messages.map((m) => m.content).join("\n\n");
    setInput("");
    setSending(true);

    // 乐观更新
    setSession({
      ...session,
      messages: [...session.messages, userMsg],
    });
    await appendChatMessageAction({ sessionId: session.id, message: userMsg });

    // 调用 AI
    await aiStream.generate({
      action: "chat",
      projectId,
      payload: { storySoFar, userMessage: userMsg.content },
    });
    setSending(false);
  }

  // 流式结束后保存 AI 消息
  useEffect(() => {
    if (!aiStream.text && !aiStream.isStreaming && session) {
      return;
    }
    if (!aiStream.isStreaming && aiStream.text && session) {
      const aiMsg: ChatMessage = {
        role: "assistant",
        content: aiStream.text,
        timestamp: new Date().toISOString(),
      };
      const exists = session.messages.some(
        (m) => m.role === "assistant" && m.content === aiMsg.content
      );
      if (!exists) {
        setSession({
          ...session,
          messages: [...session.messages, aiMsg],
        });
        appendChatMessageAction({ sessionId: session.id, message: aiMsg });
      }
    }
  }, [aiStream.isStreaming, aiStream.text]);

  async function onExtract() {
    if (!session) return;
    setExtracting(true);
    const res = await extractCardsFromChatAction(session.id);
    setExtracting(false);
    if (res.ok && res.cards) {
      setSession({ ...session, extractedCards: res.cards });
      toast({ title: "已提取知识卡", type: "success" });
    } else {
      toast({ title: "提取失败", description: res.error, type: "error" });
    }
  }

  async function onCommit() {
    if (!session) return;
    const res = await commitExtractedCardsAction(session.id);
    if (res.ok) {
      toast({ title: "已回填到知识库", type: "success" });
    } else {
      toast({ title: "回填失败", description: res.error, type: "error" });
    }
  }

  async function onConvert() {
    const res = await convertChatToProjectAction(projectId);
    if (res.ok) {
      toast({ title: "已转为工作台项目", type: "success" });
      window.location.href = `/editor/${projectId}`;
    } else {
      toast({ title: "转换失败", description: res.error, type: "error" });
    }
  }

  if (!session) {
    return <div className="container py-8 text-center text-sm text-muted-foreground">加载中...</div>;
  }

  const messages = session.messages;
  const cards = session.extractedCards;

  return (
    <div className="flex flex-1 min-h-0 -mx-4 lg:-mx-8">
      {/* 主聊天区 */}
      <div className="flex-1 flex flex-col px-4 lg:px-8">
        <div className="border-b border-neutral-100 py-3 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            共 {messages.filter((m) => m.role === "user").length} 轮对话
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onExtract} disabled={extracting || messages.length < 2} className="border-neutral-200 hover:bg-neutral-50">
              {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              提取知识卡
            </Button>
            <Button size="sm" onClick={onConvert} className="bg-neutral-900 text-white hover:bg-neutral-800">
              <ArrowRight className="h-3.5 w-3.5" />
              转为正式项目
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div ref={scrollRef} className="py-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <Sparkles className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-1">开始你的聊天式创作</p>
                <p className="text-xs text-muted-foreground">描述故事开头，AI 会以叙事者身份接龙推进</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-foreground"
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                </div>
              </div>
            ))}
            {aiStream.isStreaming && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm bg-neutral-100 text-foreground">
                  <div className="whitespace-pre-wrap leading-relaxed stream-cursor">{aiStream.text}</div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-neutral-100 py-4 bg-white">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder="描述故事走向，AI 会接龙推进。Enter 发送，Shift+Enter 换行"
              rows={2}
              className="flex-1 resize-none rounded-xl border-neutral-200"
              disabled={aiStream.isStreaming}
            />
            <Button onClick={onSend} disabled={!input.trim() || aiStream.isStreaming || sending} className="bg-neutral-900 text-white hover:bg-neutral-800 h-10 w-10 p-0">
              {aiStream.isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* 右侧已提取卡片 */}
      <aside className="w-80 border-l border-neutral-100 bg-white hidden lg:flex flex-col">
        <div className="p-3 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold">已识别设定</h3>
          {cards.worldSettings?.length || cards.characters?.length ? (
            <Button size="sm" variant="outline" onClick={onCommit} className="border-neutral-200 hover:bg-neutral-50">
              <Check className="h-3 w-3" />
              回填
            </Button>
          ) : null}
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">世界观</div>
              {cards.worldSettings?.length ? (
                cards.worldSettings.map((w, i) => (
                  <Card key={i} className="mb-2 rounded-2xl border-neutral-100 shadow-sm bg-white">
                    <CardContent className="p-2 text-xs">
                      <div className="flex items-center gap-1 mb-1">
                        <Badge variant="secondary" className="text-[10px]">{w.category}</Badge>
                        <span className="font-medium">{w.title}</span>
                      </div>
                      <p className="text-muted-foreground line-clamp-3">{w.content}</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">点击右上角&ldquo;提取知识卡&rdquo;自动识别</p>
              )}
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">角色</div>
              {cards.characters?.length ? (
                cards.characters.map((c, i) => (
                  <Card key={i} className="mb-2 rounded-2xl border-neutral-100 shadow-sm bg-white">
                    <CardContent className="p-2 text-xs">
                      <div className="flex items-center gap-1 mb-1">
                        <Badge variant="secondary" className="text-[10px]">{c.role}</Badge>
                        <span className="font-medium">{c.name}</span>
                      </div>
                      {c.personality && <p className="text-muted-foreground">性格：{c.personality}</p>}
                      {c.motivation && <p className="text-muted-foreground">动机：{c.motivation}</p>}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">暂未识别角色</p>
              )}
            </div>
          </div>
        </ScrollArea>
      </aside>
    </div>
  );
}
