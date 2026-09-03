"use client";

import { useState, useEffect, useRef, useMemo, memo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Sparkles, Wand2, ArrowRight, Check, AlertCircle, GitBranch } from "lucide-react";
import { useAIStream } from "@/hooks/use-ai-stream";
import {
  getChatSessionAction,
  appendChatMessageAction,
  extractCardsFromChatAction,
  commitExtractedCardsAction,
  convertChatToProjectAction,
} from "@/actions/chat";
import { toast } from "@/components/ui/toast";
import { ChatMarkdown } from "./chat-markdown";

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

/**
 * 开场问候：写死内容，不再调大模型生成。
 * - 节省首次进入对话页的等待时间（约 3-8s）和 token
 * - 引导内容稳定可控，不会因模型波动出现奇怪的开场
 * - 仍走 appendChatMessageAction 持久化到数据库，刷新页面后仍存在
 */
const OPENING_GREETING = `你好呀！很高兴能与你一起开启一段新的故事旅程。无论你想写什么题材，我都非常期待能陪你将那些奇思妙想变成生动的文字。

先选一个方向开始吧（也可以直接描述你自己的想法）：

【选项】
A. 我想写：一段关于古城神秘传说的奇幻冒险故事，主角因一本旧书踏入平行时空
B. 我想写：一个发生在现代都市中的悬疑推理故事，主角是个能听见物品记忆的失忆侦探
C. 我想写：未来星际时代的科幻故事，一位机械师意外唤醒了一艘有自我意识的远古战舰
D. 我想写：校园日常背景下的青春成长故事，几个好友在社团活动中发现彼此深藏的秘密
E. 其他（自由输入）`;

// module-level chat session 缓存：让 ProjectWorkspace 的预取和 ChatCoCreateClient
// 的 mount fetch 共享同一份 in-flight Promise，避免对同一项目并发请求两次
type SessionResult = Awaited<ReturnType<typeof getChatSessionAction>>;
const inflightSession = new Map<string, Promise<SessionResult>>();

/**
 * 共享 chat session fetcher：同一项目在浏览器 session 内只发一次请求。
 * ProjectWorkspace 在 idle 时调用预取，ChatCoCreateClient 在 mount 时复用。
 * appendChatMessageAction 后不需要 invalidate，因为消息已通过 props/state 同步。
 */
export function getOrFetchChatSession(projectId: string): Promise<SessionResult> {
  const existing = inflightSession.get(projectId);
  if (existing) return existing;
  const p = getChatSessionAction(projectId).finally(() => {
    // 完成后立即清理，下次需要时重新获取（保证数据新鲜）
    inflightSession.delete(projectId);
  });
  inflightSession.set(projectId, p);
  return p;
}

/** 解析 AI 消息中的【选项】段，返回正文与选项 */
function parseStoryContent(raw: string): { body: string; choices: string[] } {
  // 匹配 "【选项】" 及其后的 A./B./C. 行
  const marker = "【选项】";
  const idx = raw.indexOf(marker);
  if (idx === -1) return { body: raw.trim(), choices: [] };

  const body = raw.slice(0, idx).trim();
  const after = raw.slice(idx + marker.length);
  const choices: string[] = [];
  const lines = after.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*[A-D][\.\)、:：]\s*(.+?)\s*$/);
    if (m) choices.push(m[1]);
    else if (choices.length > 0 && line.trim() === "") continue; // 允许空行
    else if (choices.length > 0 && line.trim() !== "") break; // 非选项行停止
  }
  return { body, choices };
}

export function ChatCoCreateClientImpl({ projectId }: { projectId: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const aiStream = useAIStream();

  useEffect(() => {
    let cancelled = false;
    getOrFetchChatSession(projectId).then((res) => {
      if (cancelled) return;
      if (res.ok && res.session) {
        // ChatMessage 独立表返回的是对象数组，映射到客户端接口
        const rawMessages = (res.session.messages as unknown as Array<{ role: string; content: string; timestamp: string | Date }>) || [];
        const messages: ChatMessage[] = rawMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: typeof m.timestamp === "string" ? m.timestamp : m.timestamp.toISOString(),
        }));
        setSession({
          id: res.session.id,
          messages,
          extractedCards: (res.session.extractedCards as unknown as Session["extractedCards"]) || {},
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // 开场问候：会话首次加载且无消息时，直接插入一条静态 AI 消息
  // （不再调大模型输出首条消息，省时省 token，且固定内容可保证引导稳定）
  const greetedRef = useRef(false);
  useEffect(() => {
    if (!session) return;
    if (greetedRef.current) return;
    if (session.messages.length > 0) {
      greetedRef.current = true;
      return;
    }
    greetedRef.current = true;

    const greetingMsg: ChatMessage = {
      role: "assistant",
      content: OPENING_GREETING,
      timestamp: new Date().toISOString(),
    };
    setSession({ ...session, messages: [greetingMsg] });
    appendChatMessageAction({ sessionId: session.id, message: greetingMsg });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

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
    const updatedSession = {
      ...session,
      messages: [...session.messages, userMsg],
    };
    setSession(updatedSession);
    await appendChatMessageAction({ sessionId: session.id, message: userMsg });

    // 调用 AI
    await aiStream.generate({
      action: "chat",
      projectId,
      payload: { storySoFar, userMessage: userMsg.content },
    });
    setSending(false);
  }

  /** 点击选项：将选项内容填入输入框，等待用户确认后发送 */
  function onPickChoice(choice: string) {
    if (aiStream.isStreaming) return;
    setInput(choice);
  }

  // 流式结束后保存 AI 消息
  useEffect(() => {
    if (aiStream.isStreaming) return;
    if (!aiStream.text || !session) return;

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
    // 清理流式状态，避免重复触发
    aiStream.reset();
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
      window.location.href = `/project/${projectId}?view=workbench`;
    } else {
      toast({ title: "转换失败", description: res.error, type: "error" });
    }
  }

  if (!session) {
    return <div className="container py-8 text-center text-sm text-text-tertiary">加载中...</div>;
  }

  const messages = session.messages;
  const cards = session.extractedCards;

  return (
    <div className="flex flex-1 min-h-0 gap-3">
      {/* 主聊天区（卡片式） */}
      <div className="flex-1 flex flex-col rounded-2xl border border-border-neutral-l1 bg-bg-base-default shadow-[var(--shadow-card)] overflow-hidden px-4 lg:px-8">
        <div className="border-b border-border-neutral-l1 py-3 flex items-center justify-between">
          <div className="text-sm text-text-tertiary">
            共 {messages.filter((m) => m.role === "user").length} 轮对话
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onExtract} disabled={extracting || messages.length < 2} className="border-border-neutral-l2 hover:bg-bg-overlay-l1">
              {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              提取知识卡
            </Button>
            <Button size="sm" onClick={onConvert} className="bg-bg-brand text-text-onbrand hover:bg-bg-brand-hover">
              <ArrowRight className="h-3.5 w-3.5" />
              转为正式项目
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div ref={scrollRef} className="py-6 space-y-4">
            {messages.length === 0 && !aiStream.isStreaming && (
              <div className="text-center py-12">
                <Sparkles className="h-10 w-10 text-text-tertiary/40 mx-auto mb-3" />
                <p className="text-sm text-text-tertiary mb-1">开始你的聊天式创作</p>
                <p className="text-xs text-text-tertiary">描述故事开头，AI 会以叙事者身份接龙推进</p>
              </div>
            )}
            {messages.map((m, i) => {
              if (m.role === "user") {
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm bg-bg-brand text-text-onbrand">
                      <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                    </div>
                  </div>
                );
              }
              // assistant: 解析正文与选项
              const { body, choices } = parseStoryContent(m.content);
              return (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm bg-bg-overlay-l1 text-text-default">
                    <ChatMarkdown content={body} />
                    {choices.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border-neutral-l2/60 space-y-1.5">
                        <div className="flex items-center gap-1 text-xs text-text-tertiary mb-1">
                          <GitBranch className="h-3 w-3" />
                          <span>选择故事走向</span>
                        </div>
                        {choices.map((c, idx) => {
                          const letter = String.fromCharCode(65 + idx); // A/B/C
                          return (
                            <button
                              key={idx}
                              onClick={() => onPickChoice(c)}
                              className="w-full text-left px-3 py-2 rounded-lg bg-bg-base-default border border-border-neutral-l2 hover:border-border-contrast hover:bg-bg-overlay-l1 text-xs transition-colors"
                            >
                              <span className="font-medium mr-1.5">{letter}.</span>
                              {c}
                            </button>
                          );
                        })}
                        {/* 其他：让用户自由输入 */}
                        <button
                          onClick={() => inputRef.current?.focus()}
                          className="w-full text-left px-3 py-2 rounded-lg bg-bg-base-default border border-dashed border-border-neutral-l2 hover:border-border-contrast hover:bg-bg-overlay-l1 text-xs text-text-tertiary transition-colors"
                        >
                          <span className="font-medium mr-1.5">
                            {String.fromCharCode(65 + choices.length)}.
                          </span>
                          其他（自由输入）
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {/* 流式输出中 */}
            {aiStream.isStreaming && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm bg-bg-overlay-l1 text-text-default">
                  {(() => {
                    const { body, choices } = parseStoryContent(aiStream.text);
                    return (
                      <>
                        {aiStream.text ? (
                          <div className="stream-cursor">
                            <ChatMarkdown content={body} />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-text-tertiary">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span className="text-xs">AI 正在思考...</span>
                          </div>
                        )}
                        {choices.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border-neutral-l2/60 space-y-1.5">
                            <div className="flex items-center gap-1 text-xs text-text-tertiary mb-1">
                              <GitBranch className="h-3 w-3" />
                              <span>选择故事走向</span>
                            </div>
                            {choices.map((c, idx) => (
                              <button
                                key={idx}
                                onClick={() => onPickChoice(c)}
                                className="w-full text-left px-3 py-2 rounded-lg bg-bg-base-default border border-border-neutral-l2 text-xs opacity-60"
                                disabled
                              >
                                <span className="font-medium mr-1.5">
                                  {String.fromCharCode(65 + idx)}.
                                </span>
                                {c}
                              </button>
                            ))}
                            <button
                              className="w-full text-left px-3 py-2 rounded-lg bg-bg-base-default border border-dashed border-border-neutral-l2 text-xs text-text-tertiary opacity-60"
                              disabled
                            >
                              <span className="font-medium mr-1.5">
                                {String.fromCharCode(65 + choices.length)}.
                              </span>
                              其他（自由输入）
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
            {/* 错误提示 */}
            {aiStream.error && !aiStream.isStreaming && (
              <div className="flex justify-center">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-status-error/10 border border-status-error/30 text-sm text-status-error max-w-[80%]">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{aiStream.error}</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border-neutral-l1 py-4 bg-bg-base-default">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={inputRef}
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
              className="flex-1 resize-none rounded-xl border-border-neutral-l2"
              disabled={aiStream.isStreaming}
            />
            <Button onClick={onSend} disabled={!input.trim() || aiStream.isStreaming || sending} className="bg-bg-brand text-text-onbrand hover:bg-bg-brand-hover h-10 w-10 p-0">
              {aiStream.isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* 右侧已提取卡片 */}
      <aside className="hidden w-80 shrink-0 flex-col rounded-2xl border border-border-neutral-l1 bg-bg-base-default shadow-[var(--shadow-card)] overflow-hidden lg:flex">
        <div className="p-3 border-b border-border-neutral-l1 flex items-center justify-between">
          <h3 className="text-sm font-semibold">已识别设定</h3>
          {cards.worldSettings?.length || cards.characters?.length ? (
            <Button size="sm" variant="outline" onClick={onCommit} className="border-border-neutral-l2 hover:bg-bg-overlay-l1">
              <Check className="h-3 w-3" />
              回填
            </Button>
          ) : null}
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            <div>
              <div className="text-xs font-medium text-text-tertiary mb-2">世界观</div>
              {cards.worldSettings?.length ? (
                cards.worldSettings.map((w, i) => (
                  <Card key={i} className="mb-2 rounded-2xl border-border-neutral-l1 shadow-sm bg-bg-base-default">
                    <CardContent className="p-2 text-xs">
                      <div className="flex items-center gap-1 mb-1">
                        <Badge variant="secondary" className="text-[10px]">{w.category}</Badge>
                        <span className="font-medium">{w.title}</span>
                      </div>
                      <p className="text-text-tertiary line-clamp-3">{w.content}</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-xs text-text-tertiary">点击右上角&ldquo;提取知识卡&rdquo;自动识别</p>
              )}
            </div>
            <div>
              <div className="text-xs font-medium text-text-tertiary mb-2">角色</div>
              {cards.characters?.length ? (
                cards.characters.map((c, i) => (
                  <Card key={i} className="mb-2 rounded-2xl border-border-neutral-l1 shadow-sm bg-bg-base-default">
                    <CardContent className="p-2 text-xs">
                      <div className="flex items-center gap-1 mb-1">
                        <Badge variant="secondary" className="text-[10px]">{c.role}</Badge>
                        <span className="font-medium">{c.name}</span>
                      </div>
                      {c.personality && <p className="text-text-tertiary">性格：{c.personality}</p>}
                      {c.motivation && <p className="text-text-tertiary">动机：{c.motivation}</p>}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-xs text-text-tertiary">暂未识别角色</p>
              )}
            </div>
          </div>
        </ScrollArea>
      </aside>
    </div>
  );
}

// memo 包裹：projectId 不变时不重渲染
export const ChatCoCreateClient = memo(ChatCoCreateClientImpl);
