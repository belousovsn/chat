import { randomUUID } from "node:crypto";
import { and, eq, isNull, ne, or } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import {
  attachments,
  conversationMembers,
  conversations,
  friendships,
  messages,
  passwordResetTokens,
  readCursors,
  sessions,
  userBlocks,
  users
} from "../../db/schema.js";
import { deleteStoredFile } from "../../lib/files.js";
import { HttpError } from "../../lib/http.js";
import { createMailer } from "../../lib/mailer.js";
import {
  createToken,
  hashPassword,
  setSessionCookie,
  verifyPassword,
  clearSessionCookie,
  type AuthSession
} from "../../lib/auth.js";
import { config } from "../../config.js";

export const buildSessionPayload = async (auth: AuthSession) => {
  const activeSessions = await db.select({
    id: sessions.id,
    userAgent: sessions.userAgent,
    ipAddress: sessions.ipAddress,
    createdAt: sessions.createdAt,
    lastSeenAt: sessions.lastSeenAt
  }).from(sessions).where(eq(sessions.userId, auth.user.id));

  return {
    user: auth.user,
    sessions: activeSessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      isCurrent: session.id === auth.sessionId,
      createdAt: session.createdAt.toISOString(),
      lastSeenAt: session.lastSeenAt.toISOString()
    }))
  };
};

export const registerUser = async (input: { email: string; username: string; password: string }, request: FastifyRequest) => {
  const existing = await db.select({ id: users.id }).from(users).where(or(eq(users.email, input.email), eq(users.username, input.username)));
  if (existing.length > 0) {
    throw new HttpError(409, "Email or username already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const [user] = await db.insert(users).values({
    email: input.email.toLowerCase(),
    username: input.username,
    passwordHash
  }).returning();

  if (!user) {
    throw new HttpError(500, "Failed to create user");
  }

  return createSession(user.id, request);
};

export const loginUser = async (input: { email: string; password: string }, request: FastifyRequest) => {
  const [user] = await db.select().from(users).where(eq(users.email, input.email.toLowerCase()));
  if (!user) {
    throw new HttpError(401, "Invalid credentials");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new HttpError(401, "Invalid credentials");
  }

  return createSession(user.id, request);
};

const createSession = async (userId: string, request: FastifyRequest) => {
  const [session] = await db.insert(sessions).values({
    id: randomUUID(),
    userId,
    userAgent: request.headers["user-agent"] ?? "unknown",
    ipAddress: request.ip
  }).returning();

  if (!session) {
    throw new HttpError(500, "Failed to create session");
  }

  return session.id;
};

export const logoutCurrentSession = async (auth: AuthSession, reply: { clear: () => void }) => {
  await db.delete(sessions).where(eq(sessions.id, auth.sessionId));
  reply.clear();
};

export const revokeUserSession = async (auth: AuthSession, sessionId: string) => {
  await db.delete(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.userId, auth.user.id)));
};

export const issuePasswordReset = async (email: string) => {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  if (!user) {
    return;
  }

  const token = createToken();
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60)
  });

  const mailer = createMailer();
  await mailer.sendMail({
    from: config.mailFrom,
    to: email,
    subject: "Reset your classic chat password",
    text: `Reset link: ${config.appUrl}/reset-password?token=${token}`
  });
};

export const resetPassword = async (token: string, password: string) => {
  const [row] = await db.select().from(passwordResetTokens).where(and(eq(passwordResetTokens.token, token), isNull(passwordResetTokens.usedAt)));
  if (!row || row.expiresAt.getTime() < Date.now()) {
    throw new HttpError(400, "Invalid or expired reset token");
  }

  await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, row.userId));
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id));
};

export const changePassword = async (auth: AuthSession, currentPassword: string, newPassword: string) => {
  const [user] = await db.select().from(users).where(eq(users.id, auth.user.id));
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new HttpError(400, "Current password is incorrect");
  }
  await db.update(users).set({ passwordHash: await hashPassword(newPassword) }).where(eq(users.id, auth.user.id));
};

export const deleteAccount = async (auth: AuthSession) => {
  const ownedRooms = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.ownerId, auth.user.id), eq(conversations.kind, "room")));

  for (const room of ownedRooms) {
    const roomAttachments = await db.select({ storedName: attachments.storedName }).from(attachments).where(eq(attachments.conversationId, room.id));
    for (const attachment of roomAttachments) {
      await deleteStoredFile(attachment.storedName);
    }
  }

  await db.delete(friendships).where(or(eq(friendships.userAId, auth.user.id), eq(friendships.userBId, auth.user.id)));
  await db.delete(userBlocks).where(or(eq(userBlocks.blockerId, auth.user.id), eq(userBlocks.blockedId, auth.user.id)));
  await db.delete(readCursors).where(eq(readCursors.userId, auth.user.id));
  await db.delete(conversationMembers).where(and(eq(conversationMembers.userId, auth.user.id), ne(conversationMembers.role, "owner")));
  await db.delete(messages).where(eq(messages.authorId, auth.user.id));
  await db.delete(users).where(eq(users.id, auth.user.id));
};

export const attachSessionCookie = async (reply: { native: unknown; clearCookie: typeof clearSessionCookie }, sessionId: string) => {
  await setSessionCookie(reply as never, sessionId);
};
