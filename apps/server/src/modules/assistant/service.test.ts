import assert from "node:assert/strict";
import process from "node:process";
import { test } from "node:test";

process.env.DATABASE_URL ??= "postgres://chat:chat@127.0.0.1:5432/chat";
process.env.SESSION_SECRET ??= "test-session-secret";
process.env.UPLOAD_DIR ??= "uploads";

test("extractAssistantTrigger strips mention and keeps remaining prompt", async () => {
  const { extractAssistantTrigger } = await import("./service.js");

  assert.deepEqual(
    extractAssistantTrigger("hey @assistant summarize this thread", "assistant"),
    { prompt: "hey summarize this thread" }
  );
  assert.equal(extractAssistantTrigger("no bot here", "assistant"), null);
});

test("buildAssistantUserPrompt uses replied-to message when mention has no extra text", async () => {
  const { buildAssistantUserPrompt } = await import("./service.js");

  const prompt = buildAssistantUserPrompt({
    attachments: [],
    author: {
      id: "9a3965dd-cae5-4539-9c46-a6e8cb0134dd",
      presence: "online",
      username: "alice"
    },
    body: "@assistant",
    replyTo: {
      id: "8a74384f-53c1-484b-8937-9e7d1bc6e7d5",
      authorUsername: "bob",
      body: "Need launch copy for this feature."
    }
  }, "assistant");

  assert.ok(prompt);
  assert.match(prompt ?? "", /Referenced message from bob: Need launch copy for this feature\./);
  assert.match(prompt ?? "", /Respond mainly about the referenced message\./);
});
