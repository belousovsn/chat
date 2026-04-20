Status: queued
Goal: Improve chat UI maintainability after W1 by separating panels, queries, and modal triggers.
Dependencies: W1.
Required context: W1 result plus current web app.
Allowed files: `apps/web/src/**`.
Do not edit: `apps/server/**`, coordinator-owned docs.
Start here:
- modules created by W1
- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/socket.ts`
Acceptance checks:
- `corepack pnpm --filter @chat/web check`
- `corepack pnpm --filter @chat/web build`
- no giant replacement file reappears
