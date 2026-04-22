import type { FastifyBaseLogger } from "fastify";
import type { ChatMessage } from "@chat/shared";
import { and, eq } from "drizzle-orm";
import { config } from "../../config.js";
import { db } from "../../db/client.js";
import { conversationMembers, conversations, users } from "../../db/schema.js";
import { hashPassword, type AuthSession } from "../../lib/auth.js";
import { HttpError } from "../../lib/http.js";
import { createAutomatedMessage } from "../messages/service.js";
import type { RealtimeService } from "../presence/service.js";

const mentionBoundaryPattern = "A-Za-z0-9_.-";
const messageBodyLimit = 3072;

type AssistantTrigger = {
  prompt: string | null;
};

type QueueAssistantReplyArgs = {
  logger: FastifyBaseLogger;
  message: ChatMessage;
  realtime: RealtimeService;
  sender: AuthSession["user"];
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildMentionRegex = (assistantUsername: string) => new RegExp(
  `(^|[^${mentionBoundaryPattern}])@${escapeRegex(assistantUsername)}(?![${mentionBoundaryPattern}])`,
  "ig"
);

const normalizePromptWhitespace = (value: string) => value
  .replace(/\s+/g, " ")
  .replace(/\s+([,.;!?])/g, "$1")
  .replace(/^[\s,.;:!?-]+/g, "")
  .trim();

const describeAttachments = (attachments: ChatMessage["attachments"]) => {
  if (!attachments.length) {
    return null;
  }

  return attachments.map((attachment) => attachment.originalName).join(", ");
};

const clampMessageBody = (value: string) => value.length <= messageBodyLimit
  ? value
  : `${value.slice(0, messageBodyLimit - 3).trimEnd()}...`;

const extractCompletionText = (payload: unknown) => {
  const choice = (payload as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ text?: string; type?: string }>;
      };
    }>;
  }).choices?.[0];

  if (!choice?.message?.content) {
    return "";
  }

  if (typeof choice.message.content === "string") {
    return choice.message.content.trim();
  }

  return choice.message.content
    .map((part) => part.type === "text" || !part.type ? part.text ?? "" : "")
    .join("")
    .trim();
};

const assistantSystemPrompt = (assistantUsername: string) => [
  `You are ${assistantUsername}, an AI assistant inside a multi-user chat room.`,
  "Reply in plain text.",
  "Be concise, helpful, and specific.",
  "If the user replied to another message, treat that referenced message as important context.",
  "If the user included extra text with the mention, prioritize that instruction.",
  "If the request is unclear and there is no useful context, ask one short clarifying question."
].join(" ");

const getAssistantEndpoint = () => new URL(
  "chat/completions",
  config.assistantApiBaseUrl.endsWith("/") ? config.assistantApiBaseUrl : `${config.assistantApiBaseUrl}/`
).toString();

const requestAssistantReply = async (prompt: string) => {
  const response = await fetch(getAssistantEndpoint(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.assistantApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.assistantModel,
      messages: [
        {
          role: "system",
          content: assistantSystemPrompt(config.assistantUsername)
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = (payload as { error?: { message?: string } } | null)?.error?.message
      ?? `Assistant provider request failed with ${response.status}`;
    throw new Error(message);
  }

  const content = extractCompletionText(payload);
  if (!content) {
    throw new Error("Assistant provider returned empty response");
  }

  return clampMessageBody(content);
};

const getOrCreateAssistantUser = async () => {
  const [existingByEmail] = await db.select().from(users).where(eq(users.email, config.assistantEmail));
  if (existingByEmail) {
    if (existingByEmail.username !== config.assistantUsername) {
      throw new Error(`Assistant email ${config.assistantEmail} belongs to ${existingByEmail.username}.`);
    }
    return existingByEmail;
  }

  const [existingByUsername] = await db.select().from(users).where(eq(users.username, config.assistantUsername));
  if (existingByUsername) {
    throw new Error(`Assistant username ${config.assistantUsername} already exists on another account.`);
  }

  const [assistantUser] = await db.insert(users).values({
    email: config.assistantEmail,
    username: config.assistantUsername,
    passwordHash: await hashPassword(`assistant-${Date.now()}`)
  }).returning();

  if (!assistantUser) {
    throw new Error("Failed to create assistant user");
  }

  return assistantUser;
};

const isAssistantEnabledForConversation = async (conversationId: string, assistantUserId: string) => {
  const [conversation] = await db.select({
    id: conversations.id,
    kind: conversations.kind
  }).from(conversations).where(eq(conversations.id, conversationId));

  if (!conversation || conversation.kind !== "room") {
    return false;
  }

  const [membership] = await db.select({
    conversationId: conversationMembers.conversationId
  }).from(conversationMembers).where(and(
    eq(conversationMembers.conversationId, conversationId),
    eq(conversationMembers.userId, assistantUserId),
    eq(conversationMembers.status, "active")
  ));

  return Boolean(membership);
};

export const extractAssistantTrigger = (body: string | null, assistantUsername: string): AssistantTrigger | null => {
  if (!body) {
    return null;
  }

  const mentionRegex = buildMentionRegex(assistantUsername);
  if (!mentionRegex.test(body)) {
    return null;
  }

  mentionRegex.lastIndex = 0;
  const prompt = normalizePromptWhitespace(body.replace(mentionRegex, (_match, prefix: string) => prefix ?? ""));

  return {
    prompt: prompt || null
  };
};

export const buildAssistantUserPrompt = (
  message: Pick<ChatMessage, "attachments" | "author" | "body" | "replyTo">,
  assistantUsername: string
) => {
  const trigger = extractAssistantTrigger(message.body, assistantUsername);
  if (!trigger) {
    return null;
  }

  const triggerAttachments = describeAttachments(message.attachments);
  const lines = [
    `Sender username: ${message.author.username}`,
    trigger.prompt
      ? `User request: ${trigger.prompt}`
      : `User mentioned @${assistantUsername} without extra instruction.`,
    message.replyTo
      ? `Referenced message from ${message.replyTo.authorUsername}: ${message.replyTo.body ?? "Attachment only message."}`
      : null,
    triggerAttachments ? `Trigger message attachments: ${triggerAttachments}` : null,
    !trigger.prompt && message.replyTo ? "Respond mainly about the referenced message." : null
  ];

  return lines.filter(Boolean).join("\n");
};

export const addAssistantToRoom = async (auth: AuthSession, conversationId: string) => {
  const [conversation] = await db.select({
    id: conversations.id,
    kind: conversations.kind
  }).from(conversations).where(eq(conversations.id, conversationId));

  if (!conversation || conversation.kind !== "room") {
    throw new HttpError(404, "Room not found");
  }

  const { ensureRoomAdmin, getConversationDetails } = await import("../conversations/service.js");
  await ensureRoomAdmin(conversationId, auth.user.id);

  const assistantUser = await getOrCreateAssistantUser();
  await db.insert(conversationMembers).values({
    conversationId,
    userId: assistantUser.id,
    role: "member",
    status: "active"
  }).onConflictDoUpdate({
    target: [conversationMembers.conversationId, conversationMembers.userId],
    set: {
      role: "member",
      status: "active",
      joinedAt: new Date()
    }
  });

  return {
    assistantUser,
    room: await getConversationDetails(auth, conversationId)
  };
};

export const queueAssistantReply = async (args: QueueAssistantReplyArgs) => {
  if (!config.assistantEnabled) {
    return;
  }

  const prompt = buildAssistantUserPrompt(args.message, config.assistantUsername);
  if (!prompt) {
    return;
  }

  const assistantUser = await getOrCreateAssistantUser();
  const enabledForRoom = await isAssistantEnabledForConversation(args.message.conversationId, assistantUser.id);
  if (!enabledForRoom) {
    return;
  }

  try {
    const replyBody = await requestAssistantReply(prompt);
    const assistantMessage = await createAutomatedMessage(
      args.message.conversationId,
      assistantUser.id,
      args.sender.id,
      {
        body: replyBody,
        replyToMessageId: args.message.id
      }
    );
    await args.realtime.emitConversationUpdate(args.message.conversationId, "message.created", assistantMessage);
  } catch (error) {
    args.logger.error({
      conversationId: args.message.conversationId,
      error,
      messageId: args.message.id
    }, "Assistant reply failed");
  }
};
