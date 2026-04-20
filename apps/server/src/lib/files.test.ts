import assert from "node:assert/strict";
import { access, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("deleteStoredFiles removes unique files and ignores empty entries", async () => {
  process.env.DATABASE_URL ??= "postgres://chat:chat@127.0.0.1:5432/chat";
  process.env.SESSION_SECRET ??= "test-session-secret";
  process.env.UPLOAD_DIR = await mkdtemp(path.join(os.tmpdir(), "chat-files-test-"));

  const { deleteStoredFiles, resolveUploadPath } = await import("./files.js");
  const firstPath = resolveUploadPath("first.txt");
  const secondPath = resolveUploadPath("second.txt");

  await writeFile(firstPath, "first");
  await writeFile(secondPath, "second");

  await deleteStoredFiles(["first.txt", null, "first.txt", undefined, "second.txt"]);

  await assert.rejects(access(firstPath));
  await assert.rejects(access(secondPath));
});
