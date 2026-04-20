import { z } from "zod";

const attachmentSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(["image", "file"]),
  originalName: z.string(),
  storedName: z.string(),
  mimeType: z.string(),
  byteSize: z.number().int().nonnegative(),
  comment: z.string().nullable(),
  downloadUrl: z.string(),
  uploadedAt: z.string()
});

const messageAuthorSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  presence: z.enum(["online", "afk", "offline"])
});

const messageReplySchema = z.object({
  id: z.string().uuid(),
  authorUsername: z.string(),
  body: z.string().nullable()
});

export const memberSchema = z.object({
  userId: z.string().uuid(),
  username: z.string(),
  role: z.enum(["owner", "admin", "member"]),
  presence: z.enum(["online", "afk", "offline"]),
  joinedAt: z.string()
});

export const roomSummarySchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(["room", "direct"]),
  name: z.string(),
  description: z.string().nullable(),
  visibility: z.enum(["public", "private"]).nullable(),
  unreadCount: z.number().int().nonnegative(),
  memberCount: z.number().int().nonnegative(),
  lastMessageAt: z.string().nullable(),
  directPeer: z.object({
    id: z.string().uuid(),
    username: z.string(),
    presence: z.enum(["online", "afk", "offline"])
  }).nullable()
});

export const roomDetailsSchema = roomSummarySchema.extend({
  ownerId: z.string().uuid().nullable(),
  members: z.array(memberSchema)
});

export const chatMessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  author: messageAuthorSchema,
  body: z.string().nullable(),
  isEdited: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  replyTo: messageReplySchema.nullable(),
  attachments: z.array(attachmentSchema)
});

export const paginatedMessagesSchema = z.object({
  items: z.array(chatMessageSchema),
  nextCursor: z.string().nullable()
});

export const createRoomInputSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).nullable().optional(),
  visibility: z.enum(["public", "private"])
});

export const updateRoomInputSchema = createRoomInputSchema.partial().extend({
  visibility: z.enum(["public", "private"]).optional()
});

export const inviteUserInputSchema = z.object({
  username: z.string().min(3).max(24)
});

export const friendRequestInputSchema = z.object({
  username: z.string().min(3).max(24),
  message: z.string().max(280).nullable().optional()
});

export const sendMessageInputSchema = z.object({
  body: z.string().max(3072).nullable(),
  replyToMessageId: z.string().uuid().nullable().optional(),
  attachmentIds: z.array(z.string().uuid()).default([])
}).refine((value) => Boolean(value.body?.trim()) || value.attachmentIds.length > 0, {
  message: "Message needs body or attachment"
});

export const editMessageInputSchema = z.object({
  body: z.string().max(3072)
});

export const markReadInputSchema = z.object({
  messageId: z.string().uuid()
});

export type Member = z.infer<typeof memberSchema>;
export type RoomSummary = z.infer<typeof roomSummarySchema>;
export type RoomDetails = z.infer<typeof roomDetailsSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type PaginatedMessages = z.infer<typeof paginatedMessagesSchema>;
export type CreateRoomInput = z.infer<typeof createRoomInputSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomInputSchema>;
export type InviteUserInput = z.infer<typeof inviteUserInputSchema>;
export type FriendRequestInput = z.infer<typeof friendRequestInputSchema>;
export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;
export type EditMessageInput = z.infer<typeof editMessageInputSchema>;
export type MarkReadInput = z.infer<typeof markReadInputSchema>;
