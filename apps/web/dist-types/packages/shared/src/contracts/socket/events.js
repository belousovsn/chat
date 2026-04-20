import { z } from "zod";
export const presenceSnapshotSchema = z.object({
    userId: z.string().uuid(),
    presence: z.enum(["online", "afk", "offline"]),
    updatedAt: z.string()
});
export const unreadUpdateSchema = z.object({
    conversationId: z.string().uuid(),
    unreadCount: z.number().int().nonnegative()
});
export const socketMessageEnvelopeSchema = z.object({
    type: z.enum([
        "message.created",
        "message.updated",
        "message.deleted",
        "presence.updated",
        "conversation.updated",
        "unread.updated"
    ]),
    payload: z.unknown()
});
export const activityPingSchema = z.object({
    tabId: z.string().min(8),
    conversationId: z.string().uuid().nullable().optional(),
    active: z.boolean(),
    timestamp: z.string()
});
//# sourceMappingURL=events.js.map