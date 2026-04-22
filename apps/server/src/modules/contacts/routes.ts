import type { FastifyPluginAsync } from "fastify";
import { friendRequestInputSchema } from "@chat/shared";
import { requireAuth } from "../../lib/auth.js";
import { sendError } from "../../lib/http.js";
import {
  acceptFriendRequest,
  blockUser,
  listContacts,
  removeFriend,
  sendFriendRequest,
  unblockUser
} from "./service.js";

export const contactRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/contacts", async (request, reply) => {
    try {
      return listContacts(requireAuth(request));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/contacts/requests", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const input = friendRequestInputSchema.parse(request.body);
      await sendFriendRequest(auth, input.username, input.message);
      return listContacts(auth);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/contacts/requests/:id/accept", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      await acceptFriendRequest(auth, String((request.params as { id: string }).id));
      return listContacts(auth);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.delete("/api/contacts/:userId", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const targetUserId = String((request.params as { userId: string }).userId);
      await removeFriend(auth, targetUserId);
      await Promise.all([
        app.realtime.syncUserConversationMembership(auth.user.id),
        app.realtime.syncUserConversationMembership(targetUserId)
      ]);
      return listContacts(auth);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/contacts/:userId/block", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const targetUserId = String((request.params as { userId: string }).userId);
      await blockUser(auth, targetUserId);
      await Promise.all([
        app.realtime.syncUserConversationMembership(auth.user.id),
        app.realtime.syncUserConversationMembership(targetUserId)
      ]);
      return listContacts(auth);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.delete("/api/contacts/:userId/block", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const targetUserId = String((request.params as { userId: string }).userId);
      await unblockUser(auth, targetUserId);
      await Promise.all([
        app.realtime.syncUserConversationMembership(auth.user.id),
        app.realtime.syncUserConversationMembership(targetUserId)
      ]);
      return listContacts(auth);
    } catch (error) {
      return sendError(reply, error);
    }
  });
};
