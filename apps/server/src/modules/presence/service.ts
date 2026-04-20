import type { Server as HttpServer } from "node:http";
import type { FastifyInstance } from "fastify";
import { Server, type Socket } from "socket.io";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { users } from "../../db/schema.js";
import { sessionCookieName } from "../../lib/auth.js";
import { listAccessibleConversationIds, listRealtimeRecipientUserIds } from "../conversations/service.js";

type PresenceValue = "online" | "afk" | "offline";
type SocketState = {
  socketId: string;
  tabId: string;
  lastActiveAt: number;
  active: boolean;
};

const parseCookieValue = (cookieHeader: string | undefined, name: string) => {
  if (!cookieHeader) {
    return null;
  }
  const parts = cookieHeader.split(";").map((item) => item.trim());
  const match = parts.find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
};

export class RealtimeService {
  public readonly io: Server;
  private readonly connections = new Map<string, Map<string, SocketState>>();

  public constructor(server: HttpServer, private readonly app: FastifyInstance) {
    this.io = new Server(server, {
      cors: {
        origin: true,
        credentials: true
      }
    });
  }

  public async install() {
    this.io.use(async (socket, next) => {
      const rawCookie = parseCookieValue(socket.handshake.headers.cookie, sessionCookieName);
      if (!rawCookie) {
        return next(new Error("Authentication required"));
      }
      const unsigned = this.app.unsignCookie(rawCookie);
      if (!unsigned.valid || !unsigned.value) {
        return next(new Error("Invalid session"));
      }
      const fakeRequest = {
        cookies: { [sessionCookieName]: rawCookie },
        unsignCookie: this.app.unsignCookie.bind(this.app),
        headers: {},
        ip: socket.handshake.address
      } as never;
      const auth = await this.app.loadAuth(fakeRequest);
      if (!auth) {
        return next(new Error("Session not found"));
      }
      socket.data.auth = auth;
      return next();
    });

    this.io.on("connection", async (socket) => {
      const auth = socket.data.auth as Awaited<ReturnType<FastifyInstance["loadAuth"]>>;
      if (!auth) {
        socket.disconnect();
        return;
      }
      socket.join(`user:${auth.user.id}`);
      const accessibleConversationIds = await listAccessibleConversationIds(auth.user.id);
      this.syncSocketConversationRooms(socket, accessibleConversationIds);

      socket.on("presence.activity", async (payload: { tabId: string; active: boolean; timestamp: string }) => {
        await this.trackActivity(auth.user.id, socket.id, payload.tabId, payload.active, payload.timestamp);
      });

      socket.on("disconnect", async () => {
        await this.dropSocket(auth.user.id, socket.id);
      });

      await this.trackActivity(auth.user.id, socket.id, socket.id, true, new Date().toISOString());
    });
  }

  private computePresence(userId: string): PresenceValue {
    const states = this.connections.get(userId);
    if (!states || states.size === 0) {
      return "offline";
    }
    const now = Date.now();
    const hasOnline = [...states.values()].some((entry) => entry.active && now - entry.lastActiveAt <= 60_000);
    return hasOnline ? "online" : "afk";
  }

  private async persistPresence(userId: string, presence: PresenceValue) {
    await db.update(users).set({ presence }).where(eq(users.id, userId));
    this.emitUserUpdate(userId, "presence.updated", {
      userId,
      presence,
      updatedAt: new Date().toISOString()
    });
  }

  public async trackActivity(userId: string, socketId: string, tabId: string, active: boolean, timestamp: string) {
    const existing = this.connections.get(userId) ?? new Map<string, SocketState>();
    const previousPresence = this.computePresence(userId);
    existing.set(socketId, {
      socketId,
      tabId,
      lastActiveAt: Number.isNaN(Date.parse(timestamp)) ? Date.now() : Date.parse(timestamp),
      active
    });
    this.connections.set(userId, existing);
    const nextPresence = this.computePresence(userId);
    if (previousPresence !== nextPresence) {
      await this.persistPresence(userId, nextPresence);
    }
  }

  public async dropSocket(userId: string, socketId: string) {
    const existing = this.connections.get(userId);
    const previousPresence = this.computePresence(userId);
    if (!existing) {
      return;
    }
    existing.delete(socketId);
    if (existing.size === 0) {
      this.connections.delete(userId);
    }
    const nextPresence = this.computePresence(userId);
    if (previousPresence !== nextPresence) {
      await this.persistPresence(userId, nextPresence);
    }
  }

  private syncSocketConversationRooms(socket: Socket, conversationIds: string[]) {
    const targetRooms = new Set(conversationIds.map((conversationId) => `conversation:${conversationId}`));

    for (const room of socket.rooms) {
      if (room.startsWith("conversation:") && !targetRooms.has(room)) {
        socket.leave(room);
      }
    }

    for (const room of targetRooms) {
      socket.join(room);
    }
  }

  public async syncUserConversationMembership(userId: string) {
    const sockets = this.connections.get(userId);
    if (!sockets || sockets.size === 0) {
      return;
    }

    const accessibleConversationIds = await listAccessibleConversationIds(userId);
    for (const socketId of sockets.keys()) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (!socket) {
        continue;
      }
      this.syncSocketConversationRooms(socket, accessibleConversationIds);
    }
  }

  public async emitConversationUpdate(conversationId: string, type: string, payload: unknown) {
    const recipientUserIds = await listRealtimeRecipientUserIds(conversationId);
    for (const userId of recipientUserIds) {
      this.io.to(`user:${userId}`).emit("chat:event", { type, payload });
    }
  }

  public emitUserUpdate(userId: string, type: string, payload: unknown) {
    this.io.to(`user:${userId}`).emit("chat:event", { type, payload });
  }
}
