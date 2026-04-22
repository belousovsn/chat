import type { FastifyPluginAsync } from "fastify";
import { editMessageInputSchema, markReadInputSchema, sendMessageInputSchema } from "@chat/shared";
import { requireAuth } from "../../lib/auth.js";
import { sendError } from "../../lib/http.js";
import { queueAssistantReply } from "../assistant/service.js";
import { createMessage, deleteMessage, editMessage, listMessages, markConversationRead } from "./service.js";

export const messageRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/conversations/:id/messages", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const params = request.params as { id: string };
      const query = request.query as { cursor?: string; limit?: string };
      return listMessages(auth, params.id, query.cursor, query.limit ? Number(query.limit) : 30);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/conversations/:id/messages", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const params = request.params as { id: string };
      const input = sendMessageInputSchema.parse(request.body);
      const message = await createMessage(auth, params.id, {
        body: input.body,
        replyToMessageId: input.replyToMessageId ?? null,
        attachmentIds: input.attachmentIds
      });
      await app.realtime.emitConversationUpdate(params.id, "message.created", message);
      void queueAssistantReply({
        logger: app.log,
        message,
        realtime: app.realtime,
        sender: auth.user
      });
      return message;
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/api/messages/:id", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const params = request.params as { id: string };
      const input = editMessageInputSchema.parse(request.body);
      const message = await editMessage(auth, params.id, input.body);
      await app.realtime.emitConversationUpdate(message.conversationId, "message.updated", message);
      return message;
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.delete("/api/messages/:id", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const params = request.params as { id: string };
      const result = await deleteMessage(auth, params.id);
      await app.realtime.emitConversationUpdate(result.conversationId, "message.deleted", { messageId: params.id });
      return { ok: true };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/conversations/:id/read", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const params = request.params as { id: string };
      const input = markReadInputSchema.parse(request.body);
      await markConversationRead(auth, params.id, input.messageId);
      app.realtime.emitUserUpdate(auth.user.id, "unread.updated", {
        conversationId: params.id,
        unreadCount: 0,
        unreadMentionCount: 0
      });
      return { ok: true };
    } catch (error) {
      return sendError(reply, error);
    }
  });
};
