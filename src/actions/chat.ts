"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { chat as aiChat } from "@/lib/ai/provider";
import { extractCardsPrompt } from "@/lib/ai/prompts";
import { extractChatWiki } from "@/lib/ai/wiki";

/**
 * 对话共创相关 Server Actions。
 * ChatMessage 现在是独立表，不再用 JSON 列存储。
 */

interface ChatMessageInput {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function getChatSessionAction(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      chatSessions: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          messages: { orderBy: { timestamp: "asc" } },
        },
      },
    },
  });
  if (!project || project.userId !== user.id) {
    return { ok: false, error: "项目不存在或无权限" };
  }

  let session = project.chatSessions[0];
  if (!session) {
    session = await prisma.chatSession.create({
      data: { projectId },
      include: { messages: { orderBy: { timestamp: "asc" } } },
    });
  }

  return { ok: true, session };
}

export async function appendChatMessageAction(opts: {
  sessionId: string;
  message: ChatMessageInput;
}) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const session = await prisma.chatSession.findUnique({
    where: { id: opts.sessionId },
    include: { project: { select: { userId: true } } },
  });
  if (!session || session.project.userId !== user.id) {
    return { ok: false, error: "无权限" };
  }

  const msg = await prisma.chatMessage.create({
    data: {
      sessionId: opts.sessionId,
      role: opts.message.role,
      content: opts.message.content,
    },
  });

  return { ok: true, message: msg };
}

/**
 * 批量获取会话消息（供客户端初始化用）。
 */
export async function getChatMessagesAction(sessionId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { project: { select: { userId: true } } },
  });
  if (!session || session.project.userId !== user.id) {
    return { ok: false, error: "无权限" };
  }

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { timestamp: "asc" },
  });

  return { ok: true, messages };
}

/**
 * 提取对话中的知识卡并保存到 extractedCards。
 */
export async function extractCardsFromChatAction(sessionId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { project: { select: { userId: true, id: true } } },
  });
  if (!session || session.project.userId !== user.id) {
    return { ok: false, error: "无权限" };
  }

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { timestamp: "asc" },
  });

  const dialogue = messages
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role === "user" ? "用户" : "AI"}：${m.content}`)
    .join("\n\n");

  if (!dialogue) return { ok: false, error: "对话为空" };

  try {
    const resp = await aiChat({
      messages: extractCardsPrompt(dialogue),
      temperature: 0.2,
      maxTokens: 2000,
    });
    const cleaned = resp.replace(/```json|```/g, "").trim();
    const cards = JSON.parse(cleaned);
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { extractedCards: cards },
    });
    return { ok: true, cards };
  } catch (e) {
    console.error("[extractCards] 提取失败:", e);
    return { ok: false, error: "提取失败，请重试" };
  }
}

/**
 * 把提取出的知识卡回填到正式知识库。
 */
export async function commitExtractedCardsAction(sessionId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { project: { select: { userId: true, id: true } } },
  });
  if (!session || session.project.userId !== user.id) {
    return { ok: false, error: "无权限" };
  }

  const cards = (session.extractedCards as {
    worldSettings?: Array<{ title: string; category: string; content: string }>;
    characters?: Array<{
      name: string;
      role: string;
      appearance?: string;
      personality?: string;
      background?: string;
      motivation?: string;
    }>;
  }) || { worldSettings: [], characters: [] };

  const projectId = session.project.id;

  if (cards.worldSettings?.length) {
    await prisma.worldSetting.createMany({
      data: cards.worldSettings.map((w) => ({
        projectId,
        title: w.title,
        category: (["BACKGROUND", "GEOGRAPHY", "RULE", "SYSTEM", "OTHER"].includes(
          w.category
        )
          ? w.category
          : "OTHER") as "BACKGROUND" | "GEOGRAPHY" | "RULE" | "SYSTEM" | "OTHER",
        content: { text: w.content },
      })),
    });
  }

  if (cards.characters?.length) {
    await prisma.character.createMany({
      data: cards.characters.map((c) => ({
        projectId,
        name: c.name,
        role: (["PROTAGONIST", "SUPPORTING", "ANTAGONIST", "EXTRA"].includes(c.role)
          ? c.role
          : "SUPPORTING") as "PROTAGONIST" | "SUPPORTING" | "ANTAGONIST" | "EXTRA",
        appearance: c.appearance || null,
        personality: c.personality || null,
        background: c.background || null,
        motivation: c.motivation || null,
      })),
    });
  }

  revalidatePath(`/project/${projectId}`);
  return { ok: true };
}

/**
 * 把对话项目转成正式项目（WORKBENCH 模式）。
 */
export async function convertChatToProjectAction(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "未登录" };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });
  if (!project || project.userId !== user.id) {
    return { ok: false, error: "项目不存在或无权限" };
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { mode: "WORKBENCH" },
  });

  await prisma.chatSession.updateMany({
    where: { projectId },
    data: { status: "converted" },
  });

  // 转化后异步提取对话阶段记忆（事件/角色状态/伏笔，source=chat）
  const latestSession = await prisma.chatSession.findFirst({
    where: { projectId, status: "converted" },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (latestSession) {
    after(async () => {
      try {
        const res = await extractChatWiki(projectId, latestSession.id);
        if (!res.ok) {
          console.warn("[wiki] 对话记忆提取未完成:", res.skipped || res.error);
        }
      } catch (e) {
        console.error("[wiki] 对话记忆提取失败:", e);
      }
    });
  }

  revalidatePath(`/project/${projectId}`);
  return { ok: true };
}
