import argon2 from "argon2";
import crypto from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { sessions, users } from "../db/schema.js";
import { config } from "../config.js";
import { HttpError } from "./http.js";

export const sessionCookieName = "chat_session";

export type AuthSession = {
  sessionId: string;
  user: {
    canViewXmppAdmin: boolean;
    id: string;
    email: string;
    username: string;
    presence: "online" | "afk" | "offline";
    createdAt: string;
  };
};

export const hashPassword = async (password: string) => argon2.hash(password);
export const verifyPassword = async (password: string, hash: string) => argon2.verify(hash, password);
export const createToken = () => crypto.randomBytes(24).toString("hex");

export const setSessionCookie = async (reply: FastifyReply, sessionId: string) => {
  const signed = reply.server.signCookie(sessionId);
  reply.setCookie(sessionCookieName, signed, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: config.appUrl.startsWith("https://"),
    signed: false,
    maxAge: 60 * 60 * 24 * 30
  });
};

export const clearSessionCookie = (reply: FastifyReply) => {
  reply.clearCookie(sessionCookieName, { path: "/" });
};

const canViewXmppAdmin = (username: string) => config.xmppAdminUsers.includes(username);

export const parseSessionCookie = async (request: FastifyRequest) => {
  const raw = request.cookies[sessionCookieName];
  if (!raw) {
    return null;
  }
  const unsigned = request.unsignCookie(raw);
  if (!unsigned.valid) {
    return null;
  }
  return unsigned.value;
};

export const loadAuth = async (request: FastifyRequest): Promise<AuthSession | null> => {
  const sessionId = await parseSessionCookie(request);
  if (!sessionId) {
    return null;
  }

  const rows = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      email: users.email,
      username: users.username,
      presence: users.presence,
      createdAt: users.createdAt
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId));

  const row = rows[0];
  if (!row) {
    return null;
  }

  await db.update(sessions).set({ lastSeenAt: new Date() }).where(and(eq(sessions.id, row.sessionId), eq(sessions.userId, row.userId)));

  return {
    sessionId: row.sessionId,
    user: {
      canViewXmppAdmin: canViewXmppAdmin(row.username),
      id: row.userId,
      email: row.email,
      username: row.username,
      presence: row.presence,
      createdAt: row.createdAt.toISOString()
    }
  };
};

export const requireAuth = (request: FastifyRequest): AuthSession => {
  if (!request.auth) {
    throw new HttpError(401, "Authentication required");
  }
  return request.auth;
};

export const getAuthSessionById = async (sessionId: string): Promise<AuthSession | null> => {
  const rows = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      email: users.email,
      username: users.username,
      presence: users.presence,
      createdAt: users.createdAt
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId));

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    sessionId: row.sessionId,
    user: {
      canViewXmppAdmin: canViewXmppAdmin(row.username),
      id: row.userId,
      email: row.email,
      username: row.username,
      presence: row.presence,
      createdAt: row.createdAt.toISOString()
    }
  };
};
