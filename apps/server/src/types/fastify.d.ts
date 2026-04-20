import type { AuthSession } from "../lib/auth.js";
import type { RealtimeService } from "../modules/presence/service.js";
import type { FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    loadAuth: (request: FastifyRequest) => Promise<AuthSession | null>;
    realtime: RealtimeService;
  }

  interface FastifyRequest {
    auth: AuthSession | null;
  }
}

export {};
