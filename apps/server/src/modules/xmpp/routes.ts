import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../../lib/auth.js";
import { HttpError, sendError } from "../../lib/http.js";
import { config } from "../../config.js";
import { buildXmppStatus } from "./service.js";

export const xmppRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/xmpp/status", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      if (!auth.user.canViewXmppAdmin) {
        throw new HttpError(403, "XMPP admin access required");
      }

      return buildXmppStatus(config);
    } catch (error) {
      return sendError(reply, error);
    }
  });
};
