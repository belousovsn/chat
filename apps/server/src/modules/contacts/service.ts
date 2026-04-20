import { and, eq, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  conversations,
  friendRequests,
  friendships,
  userBlocks,
  users
} from "../../db/schema.js";
import type { AuthSession } from "../../lib/auth.js";
import { HttpError } from "../../lib/http.js";

const normalizePair = (left: string, right: string): [string, string] => left < right ? [left, right] : [right, left];

export const listContacts = async (auth: AuthSession) => {
  const friendshipsRows = await db.execute(sql`
    select
      u.id,
      u.username,
      u.presence,
      f.created_at as "since"
    from friendships f
    join users u
      on u.id = case
        when f.user_a_id = ${auth.user.id} then f.user_b_id
        else f.user_a_id
      end
    where f.user_a_id = ${auth.user.id} or f.user_b_id = ${auth.user.id}
    order by u.username asc
  `);

  const pendingRows = await db.execute(sql`
    select
      fr.id,
      fr.message,
      fr.created_at,
      req.username as requester_username,
      recv.username as receiver_username,
      fr.requester_id,
      fr.receiver_id
    from friend_requests fr
    join users req on req.id = fr.requester_id
    join users recv on recv.id = fr.receiver_id
    where fr.status = 'pending'
      and (fr.requester_id = ${auth.user.id} or fr.receiver_id = ${auth.user.id})
    order by fr.created_at desc
  `);

  return {
    friends: friendshipsRows.rows,
    requests: pendingRows.rows
  };
};

export const sendFriendRequest = async (auth: AuthSession, username: string, message?: string | null) => {
  const [target] = await db.select().from(users).where(eq(users.username, username));
  if (!target || target.id === auth.user.id) {
    throw new HttpError(404, "Target user not found");
  }
  const existingBlock = await db.select().from(userBlocks).where(
    or(
      and(eq(userBlocks.blockerId, auth.user.id), eq(userBlocks.blockedId, target.id)),
      and(eq(userBlocks.blockerId, target.id), eq(userBlocks.blockedId, auth.user.id))
    )
  );
  if (existingBlock.length > 0) {
    throw new HttpError(400, "Contact blocked");
  }

  const [userAId, userBId] = normalizePair(auth.user.id, target.id);
  const existingFriendship = await db.select().from(friendships).where(and(eq(friendships.userAId, userAId), eq(friendships.userBId, userBId)));
  if (existingFriendship.length > 0) {
    throw new HttpError(409, "Already friends");
  }

  await db.insert(friendRequests).values({
    requesterId: auth.user.id,
    receiverId: target.id,
    message: message ?? null
  }).onConflictDoNothing();
};

export const acceptFriendRequest = async (auth: AuthSession, requestId: string) => {
  const [row] = await db.select().from(friendRequests).where(and(eq(friendRequests.id, requestId), eq(friendRequests.receiverId, auth.user.id)));
  if (!row) {
    throw new HttpError(404, "Friend request not found");
  }

  const [userAId, userBId] = normalizePair(row.requesterId, row.receiverId);
  await db.update(friendRequests).set({ status: "accepted", respondedAt: new Date() }).where(eq(friendRequests.id, row.id));
  await db.insert(friendships).values([{ userAId, userBId }]).onConflictDoNothing();
};

export const removeFriend = async (auth: AuthSession, userId: string) => {
  const [userAId, userBId] = normalizePair(auth.user.id, userId);
  await db.delete(friendships).where(and(eq(friendships.userAId, userAId), eq(friendships.userBId, userBId)));
};

export const blockUser = async (auth: AuthSession, userId: string) => {
  if (userId === auth.user.id) {
    throw new HttpError(400, "Cannot block yourself");
  }
  await db.insert(userBlocks).values({ blockerId: auth.user.id, blockedId: userId }).onConflictDoNothing();
  const [userAId, userBId] = normalizePair(auth.user.id, userId);
  await db.delete(friendships).where(and(eq(friendships.userAId, userAId), eq(friendships.userBId, userBId)));

  const directConversations = await db.execute(sql`
    select c.id
    from conversations c
    join conversation_members cm1 on cm1.conversation_id = c.id and cm1.user_id = ${auth.user.id}
    join conversation_members cm2 on cm2.conversation_id = c.id and cm2.user_id = ${userId}
    where c.kind = 'direct'
  `);

  for (const row of directConversations.rows as Array<{ id: string }>) {
    await db.update(conversations).set({ isFrozen: true, updatedAt: new Date() }).where(eq(conversations.id, row.id));
  }
};
