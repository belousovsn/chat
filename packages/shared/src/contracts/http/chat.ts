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

const messageMentionSchema = z.object({
  userId: z.string().uuid(),
  username: z.string(),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative()
});

export const contactFriendSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  presence: z.enum(["online", "afk", "offline"]),
  since: z.string()
});

export const contactBlockedSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  presence: z.enum(["online", "afk", "offline"]),
  blockedAt: z.string()
});

export const contactRequestSchema = z.object({
  id: z.string().uuid(),
  message: z.string().nullable(),
  created_at: z.string(),
  requester_username: z.string(),
  receiver_username: z.string(),
  requester_id: z.string().uuid(),
  receiver_id: z.string().uuid()
});

export const contactsResponseSchema = z.object({
  blocked: z.array(contactBlockedSchema),
  friends: z.array(contactFriendSchema),
  requests: z.array(contactRequestSchema)
});

export const publicRoomSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  member_count: z.number().int().nonnegative(),
  is_member: z.boolean()
});

export const roomBanSchema = z.object({
  user_id: z.string().uuid(),
  username: z.string(),
  banned_by_id: z.string().uuid(),
  banned_by_username: z.string(),
  created_at: z.string()
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
  ownerId: z.string().uuid().nullable(),
  unreadCount: z.number().int().nonnegative(),
  unreadMentionCount: z.number().int().nonnegative(),
  memberCount: z.number().int().nonnegative(),
  lastMessageAt: z.string().nullable(),
  isFrozen: z.boolean(),
  directPeer: z.object({
    id: z.string().uuid(),
    username: z.string(),
    presence: z.enum(["online", "afk", "offline"])
  }).nullable()
});

export const roomDetailsSchema = roomSummarySchema.extend({
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
  mentions: z.array(messageMentionSchema),
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
export type ContactFriend = z.infer<typeof contactFriendSchema>;
export type ContactBlocked = z.infer<typeof contactBlockedSchema>;
export type ContactRequest = z.infer<typeof contactRequestSchema>;
export type ContactsResponse = z.infer<typeof contactsResponseSchema>;
export type PublicRoom = z.infer<typeof publicRoomSchema>;
export type RoomBan = z.infer<typeof roomBanSchema>;
export type RoomSummary = z.infer<typeof roomSummarySchema>;
export type RoomDetails = z.infer<typeof roomDetailsSchema>;
export type MessageMention = z.infer<typeof messageMentionSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type PaginatedMessages = z.infer<typeof paginatedMessagesSchema>;
export type CreateRoomInput = z.infer<typeof createRoomInputSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomInputSchema>;
export type InviteUserInput = z.infer<typeof inviteUserInputSchema>;
export type FriendRequestInput = z.infer<typeof friendRequestInputSchema>;
export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;
export type EditMessageInput = z.infer<typeof editMessageInputSchema>;
export type MarkReadInput = z.infer<typeof markReadInputSchema>;
