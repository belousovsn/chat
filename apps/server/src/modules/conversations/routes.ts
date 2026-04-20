import type { FastifyPluginAsync } from "fastify";
import { createRoomInputSchema, inviteUserInputSchema, updateRoomInputSchema } from "@chat/shared";
import { requireAuth } from "../../lib/auth.js";
import { sendError } from "../../lib/http.js";
import {
  acceptInvite,
  banMember,
  createRoom,
  deleteRoom,
  getConversationDetails,
  getOrCreateDirectConversation,
  inviteToPrivateRoom,
  joinPublicRoom,
  leaveRoom,
  listBans,
  listConversations,
  listPublicRooms,
  setAdminRole,
  unbanUser,
  updateRoom
} from "./service.js";

export const conversationRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/conversations", async (request, reply) => {
    try {
      return listConversations(requireAuth(request));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/conversations/:id", async (request, reply) => {
    try {
      return getConversationDetails(requireAuth(request), String((request.params as { id: string }).id));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/rooms/public", async (request, reply) => {
    try {
      const search = typeof request.query === "object" && request.query ? (request.query as { search?: string }).search : undefined;
      return listPublicRooms(requireAuth(request), search);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/rooms", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const input = createRoomInputSchema.parse(request.body);
      const id = await createRoom(auth, {
        name: input.name,
        description: input.description ?? null,
        visibility: input.visibility
      });
      return getConversationDetails(auth, id);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/api/rooms/:id", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const input = updateRoomInputSchema.parse(request.body);
      const id = String((request.params as { id: string }).id);
      const payload: { name?: string; description?: string | null; visibility?: "public" | "private" } = {};
      if (input.name !== undefined) {
        payload.name = input.name;
      }
      if (input.description !== undefined) {
        payload.description = input.description;
      }
      if (input.visibility !== undefined) {
        payload.visibility = input.visibility;
      }
      await updateRoom(auth, id, payload);
      return getConversationDetails(auth, id);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/rooms/:id/join", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const id = String((request.params as { id: string }).id);
      await joinPublicRoom(auth, id);
      return getConversationDetails(auth, id);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/rooms/:id/leave", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      await leaveRoom(auth, String((request.params as { id: string }).id));
      return listConversations(auth);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.delete("/api/rooms/:id", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      await deleteRoom(auth, String((request.params as { id: string }).id));
      return listConversations(auth);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/rooms/:id/invite", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const input = inviteUserInputSchema.parse(request.body);
      const id = String((request.params as { id: string }).id);
      await inviteToPrivateRoom(auth, id, input.username);
      return { ok: true };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/invites/:id/accept", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      await acceptInvite(auth, String((request.params as { id: string }).id));
      return listConversations(auth);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/rooms/:id/admins/:userId", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const params = request.params as { id: string; userId: string };
      await setAdminRole(auth, params.id, params.userId, true);
      return getConversationDetails(auth, params.id);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.delete("/api/rooms/:id/admins/:userId", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const params = request.params as { id: string; userId: string };
      await setAdminRole(auth, params.id, params.userId, false);
      return getConversationDetails(auth, params.id);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/rooms/:id/remove-member/:userId", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const params = request.params as { id: string; userId: string };
      await banMember(auth, params.id, params.userId);
      return getConversationDetails(auth, params.id);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/rooms/:id/bans", async (request, reply) => {
    try {
      return listBans(requireAuth(request), String((request.params as { id: string }).id));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.delete("/api/rooms/:id/bans/:userId", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const params = request.params as { id: string; userId: string };
      await unbanUser(auth, params.id, params.userId);
      return listBans(auth, params.id);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/directs/:userId", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const id = await getOrCreateDirectConversation(auth, String((request.params as { userId: string }).userId));
      return getConversationDetails(auth, id);
    } catch (error) {
      return sendError(reply, error);
    }
  });
};
