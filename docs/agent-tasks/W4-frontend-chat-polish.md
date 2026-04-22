Status: completed - root scripts fixed for Windows shell, attachment cleanup helpers added to delete flows, server tests now run through wrapper, backend check/build/test passed
Goal: Improve backend verification and file lifecycle safety without broad product changes.
Dependencies: none.
Required context: server delete flows, upload helpers, root workflow scripts, and existing smoke path.
Allowed files: `package.json`, `README.md`, `docs/**`, `apps/server/package.json`, `apps/server/src/modules/uploads/**`, `apps/server/src/modules/messages/**`, `apps/server/src/modules/conversations/**`, `apps/server/src/modules/auth/**`, `apps/server/src/lib/**`, `apps/server/src/scripts/**`, `apps/server/src/**/*.test.ts`.
Do not edit: `apps/web/**`, `docs/progress-history.md`, `docs/agent-workboard.md`.
Start here:
- `package.json`
- `apps/server/src/modules/uploads/routes.ts`
- `apps/server/src/lib/files.ts`
- `apps/server/src/modules/auth/service.ts`
- `apps/server/src/modules/conversations/service.ts`
- `apps/server/src/modules/messages/service.ts`
- `apps/server/src/scripts/smoke.ts`
Focus:
- make attachment disk cleanup consistent for deleted messages, deleted rooms, account deletion, and orphaned uploads where current code leaves files behind
- add first backend regression tests for recent hardening paths where practical
- fix root workspace scripts so `corepack pnpm -r check`, `build`, and `test` do not fail on this Windows shell because nested scripts call plain `pnpm`
- keep test/docs/tooling changes narrow and reproducible
Acceptance checks:
- `corepack pnpm --filter @chat/server check`
- `corepack pnpm --filter @chat/server build`
- root `corepack pnpm -r check` no longer fails because `pnpm` is missing inside package scripts
- if test files are added, `corepack pnpm --filter @chat/server test` runs without the current missing-glob failure
Notes:
- If lifecycle cleanup needs a shared helper, put it in `apps/server/src/lib/**`.
- It is fine to replace the empty-glob test command with a safer pattern if actual tests are not added yet.

Task result:
- root `package.json` scripts now call `corepack pnpm`, so recursive `check`/`build`/`test` no longer fail because plain `pnpm` is missing in nested shells.
- server test script now runs through `src/scripts/run-tests.ts`, which safely handles empty or present test files.
- attachment cleanup helpers added in `apps/server/src/lib/attachments.ts` and wired into room delete, message delete, account delete, and orphan attachment cleanup paths.
- initial backend test added for file cleanup helper in `apps/server/src/lib/files.test.ts`.
- Checks:
  - `corepack pnpm --filter @chat/server check` passed
  - `corepack pnpm --filter @chat/server build` passed
  - `corepack pnpm --filter @chat/server test` passed
  - `corepack pnpm -r check` passed
  - `corepack pnpm -r build` passed
  - `corepack pnpm -r test` passed
- Follow-up gap:
  - backend regression coverage now runs, but still only covers file cleanup helper; conversation/realtime edge cases still need direct tests

Previous result kept for history:
- Extracted dashboard query keys plus dedicated dashboard data, realtime, and modal-state hooks.
- Added `DashboardToolbar.tsx` and trimmed `Dashboard.tsx` into a smaller assembly component.
- Reused shared uploaded-attachment typing in chat state so chat panel boundaries are cleaner.
- `@chat/web` check/build previously passed.
