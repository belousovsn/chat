import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./client.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.resolve(currentDir, "../../src/db/migrations");
const distDir = path.resolve(currentDir, "./migrations");

const resolveMigrationDir = async () => {
  try {
    await mkdir(sourceDir, { recursive: true });
    return sourceDir;
  } catch {
    return distDir;
  }
};

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (id serial primary key, filename text not null unique, applied_at timestamptz not null default now())"
    );

    const migrationDir = await resolveMigrationDir();
    const files = (await readdir(migrationDir)).filter((file) => file.endsWith(".sql")).sort();
    for (const file of files) {
      const existing = await client.query("SELECT 1 FROM schema_migrations WHERE filename = $1", [file]);
      if (existing.rowCount) {
        continue;
      }
      const sql = await readFile(path.join(migrationDir, file), "utf8");
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
