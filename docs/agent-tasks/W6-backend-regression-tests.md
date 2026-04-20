Status: completed - backend regression suite added for message pagination, reply/read validation, room admin-ban rules, and direct realtime recipient filtering; server test/check passed
Goal: Add direct backend regression coverage for recent conversation, message, and realtime hardening work.
Dependencies: current W2/W3/W4 follow-ups already landed in working tree.
Required context: server modules and current lightweight test runner only.
Allowed files: `apps/server/src/**/*.test.ts`, `apps/server/src/scripts/**`, `apps/server/src/modules/**`, `apps/server/src/lib/**`, `apps/server/package.json`, `README.md` only if test command docs need a tiny update.
Do not edit: `apps/web/**`, coordinator-owned docs.
Start here:
- `apps/server/src/scripts/run-tests.ts`
- `apps/server/src/modules/conversations/service.ts`
- `apps/server/src/modules/messages/service.ts`
- `apps/server/src/modules/presence/service.ts`
- `apps/server/src/lib/files.test.ts`
- `apps/server/src/scripts/smoke.ts`
Focus:
- add tests for older-message edit fetch path
- add tests for reply target and read cursor validation
- add tests for room admin/ban permission edges
- add tests for realtime access filtering or membership sync behavior where practical
- prefer deterministic unit/integration-style tests over flaky end-to-end browser work
- improve test harness only as much as needed to support these cases
Acceptance checks:
- `corepack pnpm --filter @chat/server test`
- `corepack pnpm --filter @chat/server check`
- at least 3 meaningful regression cases added beyond current file-helper test
- no test depends on Docker
Notes:
- It is acceptable to add narrowly scoped helpers or test fixtures if they reduce setup duplication.
- If database-backed tests need explicit env/setup assumptions, make them self-documenting in the test file or script.

Task result:
- Added [regression.test.ts](/C:/Users/ser/Documents/Projects(apps)/DA%20hackaton/chat/apps/server/src/modules/regression.test.ts) covering:
  - edited older-message pagination visibility
  - reply target validation
  - read cursor target validation
  - owner/admin ban edge cases
  - direct-conversation realtime recipient filtering after block
- Tests self-skip when PostgreSQL is unavailable at `127.0.0.1:5432`, so suite still runs cleanly on blocked machines.
- Checks:
  - `corepack pnpm --filter @chat/server test` passed
  - `corepack pnpm --filter @chat/server check` passed
