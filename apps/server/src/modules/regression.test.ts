import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import net from "node:net";
import process from "node:process";
import { after, test } from "node:test";
import { and, eq } from "drizzle-orm";

process.env.DATABASE_URL ??= "postgres://chat:chat@127.0.0.1:5432/chat";
process.env.SESSION_SECRET ??= "test-session-secret";
process.env.UPLOAD_DIR ??= "uploads";

type UserRow = {
  id: string;
  email: string;
  username: string;
  presence: "online" | "afk" | "offline";
  createdAt: Date;
};

type AuthSession = {
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

type ServerDeps = {
  db: typeof import("../db/client.js").db;
  pool: typeof import("../db/client.js").pool;
  schema: typeof import("../db/schema.js");
  messagesService: typeof import("./messages/service.js");
  conversationsService: typeof import("./conversations/service.js");
  HttpError: typeof import("../lib/http.js").HttpError;
};

let depsPromise: Promise<ServerDeps> | null = null;
let databaseReachablePromise: Promise<boolean> | null = null;

const getDatabaseTarget = () => {
  const databaseUrl = new URL(process.env.DATABASE_URL ?? "postgres://chat:chat@127.0.0.1:5432/chat");
  return {
    host: databaseUrl.hostname,
    port: databaseUrl.port ? Number(databaseUrl.port) : 5432
  };
};

const isDatabaseReachable = async () => {
  databaseReachablePromise ??= new Promise<boolean>((resolve) => {
    const { host, port } = getDatabaseTarget();
    const socket = net.createConnection({ host, port });

    const finish = (reachable: boolean) => {
      socket.destroy();
      resolve(reachable);
    };

    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(1_000, () => finish(false));
  });

  return databaseReachablePromise;
};

const ensureDatabaseAvailable = async (t: { skip: (message?: string) => void }) => {
  if (await isDatabaseReachable()) {
    return true;
  }

  const { host, port } = getDatabaseTarget();
  t.skip(`Postgres required for regression tests at ${host}:${port}. Start local database, then rerun @chat/server test.`);
  return false;
};

const loadDeps = async (): Promise<ServerDeps> => {
  depsPromise ??= (async () => {
    const [{ db, pool }, schema, messagesService, conversationsService, { HttpError }] = await Promise.all([
      import("../db/client.js"),
      import("../db/schema.js"),
      import("./messages/service.js"),
      import("./conversations/service.js"),
      import("../lib/http.js")
    ]);

    return {
      db,
      pool,
      schema,
      messagesService,
      conversationsService,
      HttpError
    };
  })();

  return depsPromise;
};

const toAuthSession = (user: UserRow): AuthSession => ({
  sessionId: randomUUID(),
  user: {
    canViewXmppAdmin: false,
    id: user.id,
    email: user.email,
    username: user.username,
    presence: user.presence,
    createdAt: user.createdAt.toISOString()
  }
});

const expectHttpError = async (
  promise: Promise<unknown>,
  HttpError: typeof import("../lib/http.js").HttpError,
  statusCode: number,
  message: string
) => {
  await assert.rejects(
    promise,
    (error: unknown) => error instanceof HttpError
      && error.statusCode === statusCode
      && error.message === message
  );
};

const createScenario = async () => {
  const deps = await loadDeps();
  const { db, schema } = deps;
  const trackedConversationIds: string[] = [];
  const trackedUserIds: string[] = [];

  const createUser = async (label: string) => {
    const suffix = randomUUID().slice(0, 8);
    const username = `w6_${label}_${suffix}`;
    const email = `${username}@example.com`;
    const [user] = await db.insert(schema.users).values({
      email,
      username,
      passwordHash: "test-password-hash"
    }).returning();

    if (!user) {
      throw new Error(`Failed to create test user ${label}.`);
    }

    trackedUserIds.push(user.id);
    return {
      record: user,
      auth: toAuthSession(user)
    };
  };

  const createRoom = async (owner: { id: string }, visibility: "public" | "private" = "private") => {
    const [room] = await db.insert(schema.conversations).values({
      kind: "room",
      name: `w6_room_${randomUUID().slice(0, 8)}`,
      description: "W6 regression test room",
      visibility,
      ownerId: owner.id
    }).returning();

    if (!room) {
      throw new Error("Failed to create test room.");
    }

    trackedConversationIds.push(room.id);
    await db.insert(schema.conversationMembers).values({
      conversationId: room.id,
      userId: owner.id,
      role: "owner",
      status: "active"
    });

    return room;
  };

  const addMember = async (
    conversationId: string,
    userId: string,
    role: "owner" | "admin" | "member" = "member",
    status: "active" | "left" | "banned" = "active"
  ) => {
    await db.insert(schema.conversationMembers).values({
      conversationId,
      userId,
      role,
      status
    });
  };

  const createFriendship = async (leftUserId: string, rightUserId: string) => {
    const [userAId, userBId] = leftUserId < rightUserId ? [leftUserId, rightUserId] : [rightUserId, leftUserId];
    await db.insert(schema.friendships).values({
      userAId,
      userBId
    }).onConflictDoNothing();
  };

  const createMessage = async (
    conversationId: string,
    authorId: string,
    body: string,
    createdAt: Date,
    overrides?: Partial<typeof schema.messages.$inferInsert>
  ) => {
    const [message] = await db.insert(schema.messages).values({
      conversationId,
      authorId,
      body,
      createdAt,
      updatedAt: createdAt,
      ...overrides
    }).returning();

    if (!message) {
      throw new Error("Failed to create test message.");
    }

    return message;
  };

  const cleanup = async () => {
    for (const conversationId of [...trackedConversationIds].reverse()) {
      await db.delete(schema.conversations).where(eq(schema.conversations.id, conversationId));
    }

    for (const userId of [...trackedUserIds].reverse()) {
      await db.delete(schema.users).where(eq(schema.users.id, userId));
    }
  };

  return {
    ...deps,
    createUser,
    createRoom,
    addMember,
    createFriendship,
    createMessage,
    trackConversationId: (conversationId: string) => {
      trackedConversationIds.push(conversationId);
    },
    cleanup
  };
};

after(async () => {
  if (!depsPromise) {
    return;
  }

  const deps = await loadDeps();
  await deps.pool.end();
});

test("listMessages keeps edited older messages reachable through cursor pagination", async (t) => {
  if (!(await ensureDatabaseAvailable(t))) {
    return;
  }
  const scenario = await createScenario();

  try {
    const owner = await scenario.createUser("owner");
    const room = await scenario.createRoom(owner.record);
    const older = await scenario.createMessage(room.id, owner.record.id, "older draft", new Date("2026-01-01T00:00:00.000Z"));
    const newer = await scenario.createMessage(room.id, owner.record.id, "newer message", new Date("2026-01-01T00:05:00.000Z"));

    await scenario.messagesService.editMessage(owner.auth, older.id, "older edited");

    const firstPage = await scenario.messagesService.listMessages(owner.auth, room.id, undefined, 1);
    assert.equal(firstPage.items.length, 1);
    assert.equal(firstPage.items[0]?.id, newer.id);
    assert.ok(firstPage.nextCursor);

    const secondPage = await scenario.messagesService.listMessages(owner.auth, room.id, firstPage.nextCursor ?? undefined, 1);
    assert.deepEqual(secondPage.items.map((item) => item.id), [older.id]);
    assert.equal(secondPage.items[0]?.body, "older edited");
    assert.equal(secondPage.items[0]?.isEdited, true);
  } finally {
    await scenario.cleanup();
  }
});

test("createMessage and markConversationRead reject reply and cursor targets outside visible active messages", async (t) => {
  if (!(await ensureDatabaseAvailable(t))) {
    return;
  }
  const scenario = await createScenario();

  try {
    const owner = await scenario.createUser("author");
    const other = await scenario.createUser("other");
    const room = await scenario.createRoom(owner.record);
    const secondRoom = await scenario.createRoom(owner.record);

    await scenario.addMember(room.id, other.record.id);
    await scenario.addMember(secondRoom.id, other.record.id);

    const validMessage = await scenario.createMessage(room.id, owner.record.id, "room message", new Date("2026-01-02T00:00:00.000Z"));
    const foreignMessage = await scenario.createMessage(secondRoom.id, owner.record.id, "other room message", new Date("2026-01-02T00:05:00.000Z"));
    const deletedMessage = await scenario.createMessage(
      room.id,
      owner.record.id,
      "deleted room message",
      new Date("2026-01-02T00:10:00.000Z"),
      { deletedAt: new Date("2026-01-02T00:11:00.000Z") }
    );

    await expectHttpError(
      scenario.messagesService.createMessage(owner.auth, room.id, {
        body: "bad foreign reply",
        replyToMessageId: foreignMessage.id,
        attachmentIds: []
      }),
      scenario.HttpError,
      400,
      "Reply target not found in conversation"
    );

    await expectHttpError(
      scenario.messagesService.createMessage(owner.auth, room.id, {
        body: "bad deleted reply",
        replyToMessageId: deletedMessage.id,
        attachmentIds: []
      }),
      scenario.HttpError,
      400,
      "Reply target not found in conversation"
    );

    await expectHttpError(
      scenario.messagesService.markConversationRead(owner.auth, room.id, foreignMessage.id),
      scenario.HttpError,
      400,
      "Read cursor target not found in conversation"
    );

    await expectHttpError(
      scenario.messagesService.markConversationRead(owner.auth, room.id, deletedMessage.id),
      scenario.HttpError,
      400,
      "Read cursor target not found in conversation"
    );

    await scenario.messagesService.markConversationRead(owner.auth, room.id, validMessage.id);
    const [cursor] = await scenario.db.select().from(scenario.schema.readCursors).where(and(
      eq(scenario.schema.readCursors.conversationId, room.id),
      eq(scenario.schema.readCursors.userId, owner.record.id)
    ));
    assert.equal(cursor?.lastReadMessageId, validMessage.id);
  } finally {
    await scenario.cleanup();
  }
});

test("room admin and ban flows keep owner-only and admin-only edges enforced", async (t) => {
  if (!(await ensureDatabaseAvailable(t))) {
    return;
  }
  const scenario = await createScenario();

  try {
    const owner = await scenario.createUser("room_owner");
    const admin = await scenario.createUser("room_admin");
    const member = await scenario.createUser("room_member");
    const room = await scenario.createRoom(owner.record);

    await scenario.addMember(room.id, admin.record.id, "admin");
    await scenario.addMember(room.id, member.record.id, "member");

    await expectHttpError(
      scenario.conversationsService.setAdminRole(admin.auth, room.id, member.record.id, true),
      scenario.HttpError,
      403,
      "Only owner can grant admin"
    );

    await expectHttpError(
      scenario.conversationsService.banMember(admin.auth, room.id, admin.record.id),
      scenario.HttpError,
      400,
      "Cannot ban yourself"
    );

    await expectHttpError(
      scenario.conversationsService.banMember(admin.auth, room.id, owner.record.id),
      scenario.HttpError,
      400,
      "Cannot ban target member"
    );

    await scenario.conversationsService.banMember(owner.auth, room.id, member.record.id);

    const [membership] = await scenario.db.select().from(scenario.schema.conversationMembers).where(and(
      eq(scenario.schema.conversationMembers.conversationId, room.id),
      eq(scenario.schema.conversationMembers.userId, member.record.id)
    ));
    const [ban] = await scenario.db.select().from(scenario.schema.conversationBans).where(and(
      eq(scenario.schema.conversationBans.conversationId, room.id),
      eq(scenario.schema.conversationBans.userId, member.record.id)
    ));

    assert.equal(membership?.status, "banned");
    assert.equal(membership?.role, "member");
    assert.equal(ban?.bannedById, owner.record.id);
  } finally {
    await scenario.cleanup();
  }
});

test("realtime recipients drop blocked direct conversations even if membership rows still exist", async (t) => {
  if (!(await ensureDatabaseAvailable(t))) {
    return;
  }
  const scenario = await createScenario();

  try {
    const left = await scenario.createUser("direct_left");
    const right = await scenario.createUser("direct_right");

    await scenario.createFriendship(left.record.id, right.record.id);
    const directConversationId = await scenario.conversationsService.getOrCreateDirectConversation(left.auth, right.record.id);
    scenario.trackConversationId(directConversationId);

    const beforeBlock = await scenario.conversationsService.listRealtimeRecipientUserIds(directConversationId);
    assert.deepEqual(beforeBlock.sort(), [left.record.id, right.record.id].sort());

    await scenario.db.insert(scenario.schema.userBlocks).values({
      blockerId: right.record.id,
      blockedId: left.record.id
    });

    const afterBlock = await scenario.conversationsService.listRealtimeRecipientUserIds(directConversationId);
    assert.deepEqual(afterBlock, []);
  } finally {
    await scenario.cleanup();
  }
});
