import type { FastifyPluginAsync } from "fastify";
import {
  changePasswordInputSchema,
  forgotPasswordInputSchema,
  loginInputSchema,
  registerInputSchema,
  resetPasswordInputSchema
} from "@chat/shared";
import { clearSessionCookie, getAuthSessionById, requireAuth, setSessionCookie } from "../../lib/auth.js";
import { sendError } from "../../lib/http.js";
import {
  buildSessionPayload,
  changePassword,
  deleteAccount,
  issuePasswordReset,
  loginUser,
  logoutCurrentSession,
  registerUser,
  resetPassword
} from "./service.js";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/auth/register", async (request, reply) => {
    try {
      const input = registerInputSchema.parse(request.body);
      const sessionId = await registerUser(input, request);
      await setSessionCookie(reply, sessionId);
      request.auth = await getAuthSessionById(sessionId);
      return buildSessionPayload(requireAuth(request));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/auth/login", async (request, reply) => {
    try {
      const input = loginInputSchema.parse(request.body);
      const sessionId = await loginUser(input, request);
      await setSessionCookie(reply, sessionId);
      request.auth = await getAuthSessionById(sessionId);
      return buildSessionPayload(requireAuth(request));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/auth/logout", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      await logoutCurrentSession(auth, { clear: () => clearSessionCookie(reply) });
      return { ok: true };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/auth/forgot-password", async (request, reply) => {
    try {
      const input = forgotPasswordInputSchema.parse(request.body);
      await issuePasswordReset(input.email);
      return { ok: true };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/auth/reset-password", async (request, reply) => {
    try {
      const input = resetPasswordInputSchema.parse(request.body);
      await resetPassword(input.token, input.password);
      return { ok: true };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/auth/change-password", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const input = changePasswordInputSchema.parse(request.body);
      await changePassword(auth, input.currentPassword, input.newPassword);
      return { ok: true };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/me", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      return buildSessionPayload(auth);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.delete("/api/me", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      await deleteAccount(auth);
      clearSessionCookie(reply);
      return { ok: true };
    } catch (error) {
      return sendError(reply, error);
    }
  });
};
