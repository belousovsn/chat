import type { FastifyPluginAsync } from "fastify";
import { revokeSessionInputSchema } from "@chat/shared";
import { requireAuth } from "../../lib/auth.js";
import { sendError } from "../../lib/http.js";
import { buildSessionPayload, revokeUserSession } from "../auth/service.js";

export const sessionRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/sessions", async (request, reply) => {
    try {
      return buildSessionPayload(requireAuth(request));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/sessions/revoke", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const input = revokeSessionInputSchema.parse(request.body);
      await revokeUserSession(auth, input.sessionId);
      return buildSessionPayload(auth);
    } catch (error) {
      return sendError(reply, error);
    }
  });
};
