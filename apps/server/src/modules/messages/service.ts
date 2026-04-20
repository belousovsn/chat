import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { attachments, conversations, messages, readCursors } from "../../db/schema.js";
import type { AuthSession } from "../../lib/auth.js";
import { deleteAttachmentsByMessageIds, deleteOrphanAttachments } from "../../lib/attachments.js";
import { HttpError } from "../../lib/http.js";
import { ensureConversationAccess } from "../conversations/service.js";

const hydrateMessages = async (conversationId: string, limit: number, cursor?: string) => {
  const cursorFilter = cursor ? sql`and m.created_at < ${cursor}` : sql``;
  const messageRows = await db.execute(sql`
    select
      m.id,
      m.conversation_id,
      m.author_id,
      u.username,
      u.presence,
      m.body,
      m.is_edited,
      m.created_at,
      m.updated_at,
      m.reply_to_message_id,
      reply.body as reply_body,
      reply_author.username as reply_author_username
    from messages m
    join users u on u.id = m.author_id
    left join messages reply on reply.id = m.reply_to_message_id
    left join users reply_author on reply_author.id = reply.author_id
    where m.conversation_id = ${conversationId}
      and m.deleted_at is null
      ${cursorFilter}
    order by m.created_at desc
    limit ${limit + 1}
  `);

  const rows = messageRows.rows as Array<{
    id: string;
    conversation_id: string;
    author_id: string;
    username: string;
    presence: "online" | "afk" | "offline";
    body: string | null;
    is_edited: boolean;
    created_at: string;
    updated_at: string;
    reply_to_message_id: string | null;
    reply_body: string | null;
    reply_author_username: string | null;
  }>;

  const page = rows.slice(0, limit);
  const messageIds = page.map((row) => row.id);
  const attachmentRows = messageIds.length === 0
    ? []
    : await db.select().from(attachments).where(inArray(attachments.messageId, messageIds));

  const nextCursorRow = rows.length > limit ? page[page.length - 1] : undefined;

  return {
    items: page.reverse().map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      author: {
        id: row.author_id,
        username: row.username,
        presence: row.presence
      },
      body: row.body,
      isEdited: row.is_edited,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      replyTo: row.reply_to_message_id ? {
        id: row.reply_to_message_id,
        authorUsername: row.reply_author_username ?? "unknown",
        body: row.reply_body
      } : null,
      attachments: attachmentRows
        .filter((attachment) => attachment.messageId === row.id)
        .map((attachment) => ({
          id: attachment.id,
          kind: attachment.kind,
          originalName: attachment.originalName,
          storedName: attachment.storedName,
          mimeType: attachment.mimeType,
          byteSize: attachment.byteSize,
          comment: attachment.comment,
          downloadUrl: `/api/uploads/${attachment.id}/download`,
          uploadedAt: attachment.createdAt.toISOString()
        }))
    })),
    nextCursor: nextCursorRow
      ? new Date(nextCursorRow.created_at).toISOString()
      : null
  };
};

const mapAttachment = (attachment: typeof attachments.$inferSelect) => ({
  id: attachment.id,
  kind: attachment.kind,
  originalName: attachment.originalName,
  storedName: attachment.storedName,
  mimeType: attachment.mimeType,
  byteSize: attachment.byteSize,
  comment: attachment.comment,
  downloadUrl: `/api/uploads/${attachment.id}/download`,
  uploadedAt: attachment.createdAt.toISOString()
});

export const listMessages = async (auth: AuthSession, conversationId: string, cursor?: string, limit = 30) => {
  await ensureConversationAccess(conversationId, auth.user.id);
  return hydrateMessages(conversationId, limit, cursor);
};

export const createMessage = async (
  auth: AuthSession,
  conversationId: string,
  input: { body: string | null; replyToMessageId?: string | null; attachmentIds: string[] }
) => {
  await ensureConversationAccess(conversationId, auth.user.id);
  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
  if (!conversation) {
    throw new HttpError(404, "Conversation not found");
  }
  if (conversation.isFrozen) {
    throw new HttpError(403, "Conversation is frozen");
  }

  const body = input.body?.trim() ? input.body.trim() : null;

  if (input.replyToMessageId) {
    const [replyTarget] = await db.select({ id: messages.id }).from(messages).where(
      and(
        eq(messages.id, input.replyToMessageId),
        eq(messages.conversationId, conversationId),
        sql`${messages.deletedAt} is null`
      )
    );
    if (!replyTarget) {
      throw new HttpError(400, "Reply target not found in conversation");
    }
  }

  const [message] = await db.insert(messages).values({
    conversationId,
    authorId: auth.user.id,
    body,
    replyToMessageId: input.replyToMessageId ?? null
  }).returning();

  if (!message) {
    throw new HttpError(500, "Failed to create message");
  }

  if (input.attachmentIds.length > 0) {
    await db.update(attachments)
      .set({ messageId: message.id })
      .where(and(inArray(attachments.id, input.attachmentIds), eq(attachments.conversationId, conversationId), eq(attachments.uploaderId, auth.user.id)));
  }
  await deleteOrphanAttachments(conversationId, auth.user.id);

  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));
  return getMessageById(message.id, auth.user.id);
};

export const editMessage = async (auth: AuthSession, messageId: string, body: string) => {
  const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
  if (!message || message.authorId !== auth.user.id) {
    throw new HttpError(404, "Message not found");
  }
  await ensureConversationAccess(message.conversationId, auth.user.id);
  await db.update(messages).set({ body, isEdited: true, updatedAt: new Date() }).where(eq(messages.id, messageId));
  return getMessageById(messageId, auth.user.id);
};

export const deleteMessage = async (auth: AuthSession, messageId: string) => {
  const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
  if (!message) {
    throw new HttpError(404, "Message not found");
  }
  const membership = await ensureConversationAccess(message.conversationId, auth.user.id);
  if (message.authorId !== auth.user.id && membership.role === "member") {
    throw new HttpError(403, "Not allowed to delete this message");
  }
  await deleteAttachmentsByMessageIds([message.id]);
  await db.update(messages).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(messages.id, messageId));
  return { ok: true, conversationId: message.conversationId };
};

export const markConversationRead = async (auth: AuthSession, conversationId: string, messageId: string) => {
  await ensureConversationAccess(conversationId, auth.user.id);
  const [message] = await db.select({ id: messages.id }).from(messages).where(
    and(
      eq(messages.id, messageId),
      eq(messages.conversationId, conversationId),
      sql`${messages.deletedAt} is null`
    )
  );
  if (!message) {
    throw new HttpError(400, "Read cursor target not found in conversation");
  }
  await db.insert(readCursors).values({
    conversationId,
    userId: auth.user.id,
    lastReadMessageId: messageId,
    updatedAt: new Date()
  }).onConflictDoUpdate({
    target: [readCursors.conversationId, readCursors.userId],
    set: { lastReadMessageId: messageId, updatedAt: new Date() }
  });
};

export const getMessageById = async (messageId: string, userId: string) => {
  const rows = await db.execute(sql`
    select
      m.id,
      m.conversation_id,
      m.author_id,
      u.username,
      u.presence,
      m.body,
      m.is_edited,
      m.created_at,
      m.updated_at,
      m.reply_to_message_id,
      reply.body as reply_body,
      reply_author.username as reply_author_username
    from messages m
    join conversation_members cm
      on cm.conversation_id = m.conversation_id
     and cm.user_id = ${userId}
     and cm.status = 'active'
    join users u on u.id = m.author_id
    left join messages reply on reply.id = m.reply_to_message_id
    left join users reply_author on reply_author.id = reply.author_id
    where m.id = ${messageId}
      and m.deleted_at is null
  `);
  const row = rows.rows[0] as {
    id: string;
    conversation_id: string;
    author_id: string;
    username: string;
    presence: "online" | "afk" | "offline";
    body: string | null;
    is_edited: boolean;
    created_at: string;
    updated_at: string;
    reply_to_message_id: string | null;
    reply_body: string | null;
    reply_author_username: string | null;
  } | undefined;

  if (!row) {
    throw new HttpError(404, "Message not visible");
  }

  await ensureConversationAccess(row.conversation_id, userId);

  const attachmentRows = await db.select().from(attachments).where(eq(attachments.messageId, messageId));
  return {
    id: row.id,
    conversationId: row.conversation_id,
    author: {
      id: row.author_id,
      username: row.username,
      presence: row.presence
    },
    body: row.body,
    isEdited: row.is_edited,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    replyTo: row.reply_to_message_id ? {
      id: row.reply_to_message_id,
      authorUsername: row.reply_author_username ?? "unknown",
      body: row.reply_body
    } : null,
    attachments: attachmentRows.map(mapAttachment)
  };
};
