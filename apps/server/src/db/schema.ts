import {
  type AnyPgColumn,
  boolean,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const presenceStateEnum = pgEnum("presence_state", ["online", "afk", "offline"]);
export const conversationKindEnum = pgEnum("conversation_kind", ["room", "direct"]);
export const roomVisibilityEnum = pgEnum("room_visibility", ["public", "private"]);
export const membershipRoleEnum = pgEnum("membership_role", ["owner", "admin", "member"]);
export const conversationMemberStatusEnum = pgEnum("conversation_member_status", ["active", "left", "banned"]);
export const attachmentKindEnum = pgEnum("attachment_kind", ["image", "file"]);
export const friendRequestStatusEnum = pgEnum("friend_request_status", ["pending", "accepted"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  presence: presenceStateEnum("presence").notNull().default("offline"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userAgent: text("user_agent").notNull(),
  ipAddress: varchar("ip_address", { length: 128 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow()
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true })
});

export const friendRequests = pgTable("friend_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  requesterId: uuid("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: uuid("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: varchar("message", { length: 280 }),
  status: friendRequestStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  respondedAt: timestamp("responded_at", { withTimezone: true })
});

export const friendships = pgTable("friendships", {
  userAId: uuid("user_a_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userBId: uuid("user_b_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  pk: primaryKey({ columns: [table.userAId, table.userBId] })
}));

export const userBlocks = pgTable("user_blocks", {
  blockerId: uuid("blocker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  blockedId: uuid("blocked_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  pk: primaryKey({ columns: [table.blockerId, table.blockedId] })
}));

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: conversationKindEnum("kind").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  description: varchar("description", { length: 500 }),
  visibility: roomVisibilityEnum("visibility"),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  isFrozen: boolean("is_frozen").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const conversationMembers = pgTable("conversation_members", {
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: membershipRoleEnum("role").notNull().default("member"),
  status: conversationMemberStatusEnum("status").notNull().default("active"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  pk: primaryKey({ columns: [table.conversationId, table.userId] })
}));

export const conversationInvites = pgTable("conversation_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  inviterId: uuid("inviter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  inviteeId: uuid("invitee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const conversationBans = pgTable("conversation_bans", {
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bannedById: uuid("banned_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  pk: primaryKey({ columns: [table.conversationId, table.userId] })
}));

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  replyToMessageId: uuid("reply_to_message_id").references((): AnyPgColumn => messages.id, { onDelete: "set null" }),
  body: varchar("body", { length: 3072 }),
  isEdited: boolean("is_edited").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  messageId: uuid("message_id").references(() => messages.id, { onDelete: "cascade" }),
  uploaderId: uuid("uploader_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: attachmentKindEnum("kind").notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  storedName: varchar("stored_name", { length: 255 }).notNull().unique(),
  mimeType: varchar("mime_type", { length: 255 }).notNull(),
  byteSize: integer("byte_size").notNull(),
  comment: varchar("comment", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const readCursors = pgTable("read_cursors", {
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastReadMessageId: uuid("last_read_message_id").references((): AnyPgColumn => messages.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  pk: primaryKey({ columns: [table.conversationId, table.userId] })
}));
