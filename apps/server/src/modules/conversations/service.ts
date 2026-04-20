import { randomUUID } from "node:crypto";
import { and, eq, ne, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  conversationBans,
  conversationInvites,
  conversationMembers,
  conversations,
  friendships,
  readCursors,
  userBlocks,
  users
} from "../../db/schema.js";
import type { AuthSession } from "../../lib/auth.js";
import { deleteAttachmentsByConversationId } from "../../lib/attachments.js";
import { HttpError } from "../../lib/http.js";

const normalizePair = (left: string, right: string): [string, string] => left < right ? [left, right] : [right, left];

const canUsersAccessDirectConversation = async (leftUserId: string, rightUserId: string) => {
  const [userAId, userBId] = normalizePair(leftUserId, rightUserId);
  const [friendship, block] = await Promise.all([
    db.select().from(friendships).where(and(eq(friendships.userAId, userAId), eq(friendships.userBId, userBId))),
    db.select().from(userBlocks).where(
      or(
        and(eq(userBlocks.blockerId, leftUserId), eq(userBlocks.blockedId, rightUserId)),
        and(eq(userBlocks.blockerId, rightUserId), eq(userBlocks.blockedId, leftUserId))
      )
    )
  ]);

  return friendship.length > 0 && block.length === 0;
};

const getDirectConversationPeerId = async (conversationId: string, userId: string) => {
  const [peer] = await db
    .select({ userId: conversationMembers.userId })
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.status, "active"),
        ne(conversationMembers.userId, userId)
      )
    );

  return peer?.userId ?? null;
};

export const listAccessibleConversationIds = async (userId: string) => {
  const memberships = await db
    .select({
      conversationId: conversationMembers.conversationId,
      kind: conversations.kind
    })
    .from(conversationMembers)
    .innerJoin(conversations, eq(conversations.id, conversationMembers.conversationId))
    .where(and(eq(conversationMembers.userId, userId), eq(conversationMembers.status, "active")));

  const accessibleIds = await Promise.all(memberships.map(async (membership) => {
    if (membership.kind === "room") {
      return membership.conversationId;
    }

    const peerUserId = await getDirectConversationPeerId(membership.conversationId, userId);
    if (!peerUserId) {
      return null;
    }

    return await canUsersAccessDirectConversation(userId, peerUserId) ? membership.conversationId : null;
  }));

  return accessibleIds.filter((conversationId): conversationId is string => Boolean(conversationId));
};

export const listRealtimeRecipientUserIds = async (conversationId: string) => {
  const [conversation] = await db
    .select({ kind: conversations.kind })
    .from(conversations)
    .where(eq(conversations.id, conversationId));

  if (!conversation) {
    return [];
  }

  const members = await db
    .select({ userId: conversationMembers.userId })
    .from(conversationMembers)
    .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.status, "active")));

  if (conversation.kind === "room") {
    return members.map((member) => member.userId);
  }

  if (members.length !== 2) {
    return [];
  }

  const [left, right] = members;
  if (!left || !right) {
    return [];
  }

  return await canUsersAccessDirectConversation(left.userId, right.userId)
    ? members.map((member) => member.userId)
    : [];
};

export const ensureConversationAccess = async (conversationId: string, userId: string) => {
  const [membership] = await db
    .select()
    .from(conversationMembers)
    .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, userId), eq(conversationMembers.status, "active")));

  if (!membership) {
    throw new HttpError(403, "Conversation access denied");
  }

  const [conversation] = await db
    .select({ kind: conversations.kind })
    .from(conversations)
    .where(eq(conversations.id, conversationId));

  if (!conversation) {
    throw new HttpError(404, "Conversation not found");
  }

  if (conversation.kind === "direct") {
    const peerUserId = await getDirectConversationPeerId(conversationId, userId);
    if (!peerUserId || !(await canUsersAccessDirectConversation(userId, peerUserId))) {
      throw new HttpError(403, "Conversation access denied");
    }
  }

  return membership;
};

export const ensureRoomAdmin = async (conversationId: string, userId: string) => {
  const membership = await ensureConversationAccess(conversationId, userId);
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new HttpError(403, "Admin access required");
  }
  return membership;
};

export const listConversations = async (auth: AuthSession) => {
  const result = await db.execute(sql`
    with latest_messages as (
      select conversation_id, max(created_at) as last_message_at
      from messages
      where deleted_at is null
      group by conversation_id
    )
    select
      c.id,
      c.kind,
      c.name,
      c.description,
      c.visibility,
      c.owner_id,
      c.is_frozen,
      c.updated_at,
      coalesce(latest.last_message_at, c.updated_at) as last_message_at,
      (
        select count(*)
        from conversation_members cm_count
        where cm_count.conversation_id = c.id
          and cm_count.status = 'active'
      )::int as member_count,
      (
        select count(*)
        from messages m
        left join read_cursors rc
          on rc.conversation_id = c.id
         and rc.user_id = ${auth.user.id}
        where m.conversation_id = c.id
          and m.deleted_at is null
          and m.author_id <> ${auth.user.id}
          and (rc.updated_at is null or m.created_at > rc.updated_at)
      )::int as unread_count
    from conversations c
    join conversation_members cm
      on cm.conversation_id = c.id
     and cm.user_id = ${auth.user.id}
     and cm.status = 'active'
    left join latest_messages latest on latest.conversation_id = c.id
    order by coalesce(latest.last_message_at, c.updated_at) desc, c.name asc
  `);

  const accessibleIds = new Set(await listAccessibleConversationIds(auth.user.id));
  const visibleRows = result.rows.filter((row: Record<string, unknown>) => accessibleIds.has(String(row.id)));

  const directIds = visibleRows
    .filter((row: Record<string, unknown>) => row.kind === "direct")
    .map((row: Record<string, unknown>) => String(row.id));

  const directPeerMap = new Map<string, { id: string; username: string; presence: "online" | "afk" | "offline" }>();
  if (directIds.length > 0) {
    const peerRows = await db.execute(sql`
      select
        cm.conversation_id,
        u.id,
        u.username,
        u.presence
      from conversation_members cm
      join users u on u.id = cm.user_id
      where cm.conversation_id in ${sql.raw(`(${directIds.map((value: string) => `'${value}'`).join(",")})`)}
        and cm.user_id <> ${auth.user.id}
    `);
    for (const row of peerRows.rows as Array<{ conversation_id: string; id: string; username: string; presence: "online" | "afk" | "offline" }>) {
      directPeerMap.set(row.conversation_id, { id: row.id, username: row.username, presence: row.presence });
    }
  }

  return visibleRows.map((row: Record<string, unknown>) => ({
    id: String(row.id),
    kind: row.kind,
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    visibility: row.visibility ? row.visibility : null,
    ownerId: row.owner_id ? String(row.owner_id) : null,
    unreadCount: Number(row.unread_count ?? 0),
    memberCount: Number(row.member_count ?? 0),
    lastMessageAt: row.last_message_at ? new Date(String(row.last_message_at)).toISOString() : null,
    directPeer: directPeerMap.get(String(row.id)) ?? null,
    isFrozen: Boolean(row.is_frozen)
  }));
};

export const listPublicRooms = async (auth: AuthSession, search: string | undefined) => {
  const safeSearch = `%${(search ?? "").trim().toLowerCase()}%`;
  const rows = await db.execute(sql`
    select
      c.id,
      c.name,
      c.description,
      (
        select count(*) from conversation_members cm
        where cm.conversation_id = c.id and cm.status = 'active'
      )::int as member_count,
      exists(
        select 1 from conversation_members cm
        where cm.conversation_id = c.id and cm.user_id = ${auth.user.id} and cm.status = 'active'
      ) as is_member
    from conversations c
    where c.kind = 'room'
      and c.visibility = 'public'
      and lower(c.name) like ${safeSearch}
    order by c.name asc
  `);

  return rows.rows;
};

export const createRoom = async (auth: AuthSession, input: { name: string; description?: string | null; visibility: "public" | "private" }) => {
  const existing = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.kind, "room"), sql`lower(${conversations.name}) = lower(${input.name})`));
  if (existing.length > 0) {
    throw new HttpError(409, "Room name already exists");
  }

  const [room] = await db.insert(conversations).values({
    kind: "room",
    name: input.name,
    description: input.description ?? null,
    visibility: input.visibility,
    ownerId: auth.user.id
  }).returning();

  if (!room) {
    throw new HttpError(500, "Failed to create room");
  }

  await db.insert(conversationMembers).values({
    conversationId: room.id,
    userId: auth.user.id,
    role: "owner"
  });

  return room.id;
};

export const updateRoom = async (auth: AuthSession, conversationId: string, input: { name?: string; description?: string | null; visibility?: "public" | "private" }) => {
  const membership = await ensureConversationAccess(conversationId, auth.user.id);
  if (membership.role !== "owner") {
    throw new HttpError(403, "Only room owner can update room settings");
  }
  await db.update(conversations).set({
    name: input.name,
    description: input.description,
    visibility: input.visibility,
    updatedAt: new Date()
  }).where(eq(conversations.id, conversationId));
};

export const getConversationDetails = async (auth: AuthSession, conversationId: string) => {
  await ensureConversationAccess(conversationId, auth.user.id);

  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
  if (!conversation) {
    throw new HttpError(404, "Conversation not found");
  }

  const members = await db.execute(sql`
    select
      cm.user_id,
      u.username,
      cm.role,
      u.presence,
      cm.joined_at
    from conversation_members cm
    join users u on u.id = cm.user_id
    where cm.conversation_id = ${conversationId}
      and cm.status = 'active'
    order by
      case cm.role
        when 'owner' then 0
        when 'admin' then 1
        else 2
      end,
      u.username asc
  `);

  const summaries = await listConversations(auth);
  const summary = summaries.find((item: { id: string }) => item.id === conversationId);
  if (!summary) {
    throw new HttpError(404, "Conversation not visible");
  }

  return {
    ...summary,
    members: members.rows.map((row) => ({
      userId: String(row.user_id),
      username: String(row.username),
      role: row.role as "owner" | "admin" | "member",
      presence: row.presence as "online" | "afk" | "offline",
      joinedAt: new Date(String(row.joined_at)).toISOString()
    }))
  };
};

export const joinPublicRoom = async (auth: AuthSession, conversationId: string) => {
  const [room] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
  if (!room || room.kind !== "room" || room.visibility !== "public") {
    throw new HttpError(404, "Public room not found");
  }

  const banned = await db.select().from(conversationBans).where(and(eq(conversationBans.conversationId, conversationId), eq(conversationBans.userId, auth.user.id)));
  if (banned.length > 0) {
    throw new HttpError(403, "You are banned from this room");
  }

  await db.insert(conversationMembers).values({
    conversationId,
    userId: auth.user.id,
    role: "member",
    status: "active"
  }).onConflictDoUpdate({
    target: [conversationMembers.conversationId, conversationMembers.userId],
    set: { status: "active", joinedAt: new Date(), role: "member" }
  });
};

export const leaveRoom = async (auth: AuthSession, conversationId: string) => {
  const membership = await ensureConversationAccess(conversationId, auth.user.id);
  if (membership.role === "owner") {
    throw new HttpError(400, "Owner cannot leave own room");
  }
  await db.update(conversationMembers).set({ status: "left" }).where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, auth.user.id)));
};

export const deleteRoom = async (auth: AuthSession, conversationId: string) => {
  const membership = await ensureConversationAccess(conversationId, auth.user.id);
  if (membership.role !== "owner") {
    throw new HttpError(403, "Only owner can delete room");
  }
  await deleteAttachmentsByConversationId(conversationId);
  await db.delete(conversations).where(eq(conversations.id, conversationId));
};

export const inviteToPrivateRoom = async (auth: AuthSession, conversationId: string, username: string) => {
  const membership = await ensureRoomAdmin(conversationId, auth.user.id);
  const [room] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
  if (!room || room.visibility !== "private" || room.kind !== "room") {
    throw new HttpError(400, "Invites are only for private rooms");
  }
  const [user] = await db.select().from(users).where(eq(users.username, username));
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  if (user.id === auth.user.id && membership.role) {
    return;
  }

  await db.insert(conversationInvites).values({
    conversationId,
    inviterId: auth.user.id,
    inviteeId: user.id
  }).onConflictDoNothing();
};

export const acceptInvite = async (auth: AuthSession, inviteId: string) => {
  const [invite] = await db.select().from(conversationInvites).where(and(eq(conversationInvites.id, inviteId), eq(conversationInvites.inviteeId, auth.user.id)));
  if (!invite) {
    throw new HttpError(404, "Invite not found");
  }
  await db.insert(conversationMembers).values({
    conversationId: invite.conversationId,
    userId: auth.user.id,
    role: "member"
  }).onConflictDoUpdate({
    target: [conversationMembers.conversationId, conversationMembers.userId],
    set: { status: "active", role: "member", joinedAt: new Date() }
  });
  await db.delete(conversationInvites).where(eq(conversationInvites.id, invite.id));
};

export const setAdminRole = async (auth: AuthSession, conversationId: string, targetUserId: string, makeAdmin: boolean) => {
  const membership = await ensureRoomAdmin(conversationId, auth.user.id);
  const [target] = await db.select().from(conversationMembers).where(
    and(
      eq(conversationMembers.conversationId, conversationId),
      eq(conversationMembers.userId, targetUserId),
      eq(conversationMembers.status, "active")
    )
  );
  if (!target) {
    throw new HttpError(404, "Member not found");
  }
  if (target.role === "owner") {
    throw new HttpError(400, "Owner role cannot change");
  }
  if (makeAdmin) {
    if (membership.role !== "owner") {
      throw new HttpError(403, "Only owner can grant admin");
    }
  } else {
    if (target.role !== "admin") {
      throw new HttpError(400, "Target user is not an admin");
    }
    if (membership.role === "admin" && targetUserId === auth.user.id) {
      throw new HttpError(403, "Admin cannot remove own admin role");
    }
  }
  await db.update(conversationMembers).set({ role: makeAdmin ? "admin" : "member" }).where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, targetUserId)));
};

export const banMember = async (auth: AuthSession, conversationId: string, targetUserId: string) => {
  const membership = await ensureRoomAdmin(conversationId, auth.user.id);
  if (targetUserId === auth.user.id) {
    throw new HttpError(400, "Cannot ban yourself");
  }
  const [targetMembership] = await db.select().from(conversationMembers).where(
    and(
      eq(conversationMembers.conversationId, conversationId),
      eq(conversationMembers.userId, targetUserId),
      eq(conversationMembers.status, "active")
    )
  );
  if (!targetMembership || targetMembership.role === "owner") {
    throw new HttpError(400, "Cannot ban target member");
  }
  if (membership.role === "admin" && targetMembership.role !== "member") {
    throw new HttpError(403, "Admins can only ban regular members");
  }

  await db.update(conversationMembers)
    .set({ status: "banned", role: "member" })
    .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, targetUserId)));
  await db.insert(conversationBans).values({
    conversationId,
    userId: targetUserId,
    bannedById: auth.user.id
  }).onConflictDoNothing();
};

export const listBans = async (auth: AuthSession, conversationId: string) => {
  await ensureRoomAdmin(conversationId, auth.user.id);
  const rows = await db.execute(sql`
    select
      cb.user_id,
      target.username,
      cb.banned_by_id,
      actor.username as banned_by_username,
      cb.created_at
    from conversation_bans cb
    join users target on target.id = cb.user_id
    join users actor on actor.id = cb.banned_by_id
    where cb.conversation_id = ${conversationId}
    order by cb.created_at desc
  `);
  return rows.rows.map((row: Record<string, unknown>) => row);
};

export const unbanUser = async (auth: AuthSession, conversationId: string, targetUserId: string) => {
  await ensureRoomAdmin(conversationId, auth.user.id);
  await db.delete(conversationBans).where(and(eq(conversationBans.conversationId, conversationId), eq(conversationBans.userId, targetUserId)));
  await db.update(conversationMembers).set({ status: "left", role: "member" }).where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, targetUserId)));
};

export const getOrCreateDirectConversation = async (auth: AuthSession, targetUserId: string) => {
  if (targetUserId === auth.user.id) {
    throw new HttpError(400, "Direct chat target invalid");
  }

  const [userAId, userBId] = normalizePair(auth.user.id, targetUserId);
  const friendship = await db.select().from(friendships).where(and(eq(friendships.userAId, userAId), eq(friendships.userBId, userBId)));
  if (friendship.length === 0) {
    throw new HttpError(403, "Direct messages require friendship");
  }

  const block = await db.select().from(userBlocks).where(
    or(
      and(eq(userBlocks.blockerId, auth.user.id), eq(userBlocks.blockedId, targetUserId)),
      and(eq(userBlocks.blockerId, targetUserId), eq(userBlocks.blockedId, auth.user.id))
    )
  );
  if (block.length > 0) {
    throw new HttpError(403, "Direct chat blocked");
  }

  const existing = await db.execute(sql`
    select c.id
    from conversations c
    join conversation_members cm_a on cm_a.conversation_id = c.id and cm_a.user_id = ${auth.user.id}
    join conversation_members cm_b on cm_b.conversation_id = c.id and cm_b.user_id = ${targetUserId}
    where c.kind = 'direct'
    limit 1
  `);

  const existingId = existing.rows[0]?.id;
  if (existingId) {
    return String(existingId);
  }

  const [target] = await db.select().from(users).where(eq(users.id, targetUserId));
  if (!target) {
    throw new HttpError(404, "User not found");
  }

  const [conversation] = await db.insert(conversations).values({
    id: randomUUID(),
    kind: "direct",
    name: `${auth.user.username} / ${target.username}`,
    description: null,
    visibility: null
  }).returning();

  if (!conversation) {
    throw new HttpError(500, "Failed to create direct conversation");
  }

  await db.insert(conversationMembers).values([
    { conversationId: conversation.id, userId: auth.user.id, role: "member" },
    { conversationId: conversation.id, userId: targetUserId, role: "member" }
  ]);

  await db.insert(readCursors).values([
    { conversationId: conversation.id, userId: auth.user.id },
    { conversationId: conversation.id, userId: targetUserId }
  ]).onConflictDoNothing();

  return conversation.id;
};
