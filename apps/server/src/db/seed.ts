import argon2 from "argon2";
import { eq, or } from "drizzle-orm";
import { db, pool } from "./client.js";
import { conversations, conversationMembers, friendships, users } from "./schema.js";

const seed = async () => {
  const passwordHash = await argon2.hash("password123");

  const demoUsers = [
    { email: "alice@example.com", username: "alice", passwordHash },
    { email: "bob@example.com", username: "bob", passwordHash },
    { email: "carol@example.com", username: "carol", passwordHash }
  ];

  for (const user of demoUsers) {
    const existing = await db.select().from(users).where(eq(users.email, user.email));
    if (existing.length === 0) {
      await db.insert(users).values(user);
    }
  }

  const knownUsers = await db.select().from(users).where(or(
    eq(users.username, "alice"),
    eq(users.username, "bob"),
    eq(users.username, "carol")
  ));

  const alice = knownUsers.find((item) => item.username === "alice");
  const bob = knownUsers.find((item) => item.username === "bob");
  const carol = knownUsers.find((item) => item.username === "carol");

  if (alice && bob && carol) {
    await db.insert(friendships).values([
      { userAId: alice.id, userBId: bob.id },
      { userAId: alice.id < carol.id ? alice.id : carol.id, userBId: alice.id < carol.id ? carol.id : alice.id }
    ]).onConflictDoNothing();

    const existingRoom = await db.select().from(conversations).where(eq(conversations.name, "general"));
    if (existingRoom.length === 0) {
      const [room] = await db.insert(conversations).values({
        kind: "room",
        name: "general",
        description: "Seeded public room",
        visibility: "public",
        ownerId: alice.id
      }).returning();

      if (room) {
        await db.insert(conversationMembers).values([
          { conversationId: room.id, userId: alice.id, role: "owner" },
          { conversationId: room.id, userId: bob.id, role: "member" },
          { conversationId: room.id, userId: carol.id, role: "member" }
        ]);
      }
    }
  }
};

seed().then(async () => {
  await pool.end();
}).catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
