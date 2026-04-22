import type { FastifyPluginAsync } from "fastify";
import { xmppProvisionInputSchema } from "@chat/shared";
import { requireAuth } from "../../lib/auth.js";
import { HttpError, sendError } from "../../lib/http.js";
import { config } from "../../config.js";
import { buildXmppAccount, buildXmppStatus, provisionXmppAccountForUser } from "./service.js";

export const xmppRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/xmpp/account", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      return buildXmppAccount(config, auth.user.username);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/xmpp/provision", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const input = xmppProvisionInputSchema.parse(request.body);
      return provisionXmppAccountForUser(config, auth, input.currentPassword);
    } catch (error) {
      return sendError(reply, error);
    }
  });

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
