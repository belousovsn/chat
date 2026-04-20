import { z } from "zod";
import { chatMessageSchema, roomDetailsSchema, roomSummarySchema } from "../http/chat.js";

export const presenceSnapshotSchema = z.object({
  userId: z.string().uuid(),
  presence: z.enum(["online", "afk", "offline"]),
  updatedAt: z.string()
});

export const unreadUpdateSchema = z.object({
  conversationId: z.string().uuid(),
  unreadCount: z.number().int().nonnegative()
});

export const messageDeletedSchema = z.object({
  messageId: z.string().uuid()
});

export const conversationUpdatedSchema = z.union([roomSummarySchema, roomDetailsSchema]);

export const socketMessageEnvelopeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message.created"),
    payload: chatMessageSchema
  }),
  z.object({
    type: z.literal("message.updated"),
    payload: chatMessageSchema
  }),
  z.object({
    type: z.literal("message.deleted"),
    payload: messageDeletedSchema
  }),
  z.object({
    type: z.literal("presence.updated"),
    payload: presenceSnapshotSchema
  }),
  z.object({
    type: z.literal("conversation.updated"),
    payload: conversationUpdatedSchema
  }),
  z.object({
    type: z.literal("unread.updated"),
    payload: unreadUpdateSchema
  })
]);

export const activityPingSchema = z.object({
  tabId: z.string().min(8),
  conversationId: z.string().uuid().nullable().optional(),
  active: z.boolean(),
  timestamp: z.string()
});

export type PresenceSnapshot = z.infer<typeof presenceSnapshotSchema>;
export type UnreadUpdate = z.infer<typeof unreadUpdateSchema>;
export type MessageDeleted = z.infer<typeof messageDeletedSchema>;
export type ConversationUpdated = z.infer<typeof conversationUpdatedSchema>;
export type SocketMessageEnvelope = z.infer<typeof socketMessageEnvelopeSchema>;
export type ActivityPing = z.infer<typeof activityPingSchema>;

export type ServerToClientEvents = {
  "chat:event": (event: SocketMessageEnvelope) => void;
};

export type ClientToServerEvents = {
  "presence.activity": (payload: ActivityPing) => void;
};
