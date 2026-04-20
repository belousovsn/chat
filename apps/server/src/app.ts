import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import formbody from "@fastify/formbody";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { config } from "./config.js";
import { loadAuth } from "./lib/auth.js";
import { authRoutes } from "./modules/auth/routes.js";
import { contactRoutes } from "./modules/contacts/routes.js";
import { conversationRoutes } from "./modules/conversations/routes.js";
import { healthRoutes } from "./modules/health/routes.js";
import { messageRoutes } from "./modules/messages/routes.js";
import { RealtimeService } from "./modules/presence/service.js";
import { sessionRoutes } from "./modules/sessions/routes.js";
import { uploadRoutes } from "./modules/uploads/routes.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(currentDir, "../../../web/dist");

export const buildApp = async () => {
  const app = Fastify({
    logger: true
  });

  await app.register(cookie, {
    secret: config.sessionSecret
  });
  await app.register(cors, {
    credentials: true,
    origin: true
  });
  await app.register(formbody);
  await app.register(multipart);
  await app.register(fastifyStatic, {
    root: webDist,
    prefix: "/"
  });

  app.decorate("loadAuth", loadAuth);
  app.addHook("preHandler", async (request) => {
    request.auth = await app.loadAuth(request);
  });

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(sessionRoutes);
  await app.register(contactRoutes);
  await app.register(conversationRoutes);
  await app.register(messageRoutes);
  await app.register(uploadRoutes);

  const realtime = new RealtimeService(app.server, app);
  await realtime.install();
  app.decorate("realtime", realtime);

  app.get("/*", async (request, reply) => {
    if (String(request.url).startsWith("/api/")) {
      return reply.status(404).send({ error: "Not found" });
    }
    return reply.sendFile("index.html");
  });

  return app;
};
