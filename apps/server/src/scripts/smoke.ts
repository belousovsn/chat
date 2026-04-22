import { eq, or } from "drizzle-orm";
import { buildApp } from "../app.js";
import { db, pool } from "../db/client.js";
import { conversations, users } from "../db/schema.js";

const requiredUsernames = ["alice", "bob", "carol"] as const;

const run = async () => {
  const seededUsers = await db.select({
    username: users.username
  }).from(users).where(or(
    eq(users.username, "alice"),
    eq(users.username, "bob"),
    eq(users.username, "carol")
  ));

  const missingUsers = requiredUsernames.filter((username) => !seededUsers.some((user) => user.username === username));
  if (missingUsers.length > 0) {
    throw new Error(`Seed missing demo users: ${missingUsers.join(", ")}. Run 'corepack pnpm --filter @chat/server seed'.`);
  }

  const generalRoom = await db.select({
    id: conversations.id
  }).from(conversations).where(eq(conversations.name, "general"));

  if (generalRoom.length === 0) {
    throw new Error("Seed missing 'general' room. Run 'corepack pnpm --filter @chat/server seed'.");
  }

  const app = await buildApp();

  try {
    const healthResponse = await app.inject({
      method: "GET",
      url: "/api/health"
    });

    if (healthResponse.statusCode !== 200) {
      throw new Error(`Health check failed with status ${healthResponse.statusCode}.`);
    }

    const healthPayload = healthResponse.json() as { ok?: boolean };
    if (!healthPayload.ok) {
      throw new Error("Health check payload missing ok=true.");
    }

    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: "alice@example.com",
        password: "password123"
      }
    });

    if (loginResponse.statusCode !== 200) {
      throw new Error(`Seeded login failed with status ${loginResponse.statusCode}: ${loginResponse.body}`);
    }

    const loginPayload = loginResponse.json() as { user?: { username?: string } };
    if (loginPayload.user?.username !== "alice") {
      throw new Error("Seeded login returned unexpected session payload.");
    }

    console.log("Smoke OK: health route, seeded users, general room, and demo login verified.");
  } finally {
    await app.close();
  }
};

run().then(async () => {
  await pool.end();
}).catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
